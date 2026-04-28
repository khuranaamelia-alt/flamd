import { FeedPostCard, normalizeFirestorePost, type FeedPost } from '@/components/feed-post-card';
import { useAuthContext } from '@/contexts/AuthProvider';
import {
  followUser,
  getUser,
  getUserPosts,
  getUserPRs,
  unfollowUser,
  type PRRecord,
  type UserDocument,
} from '@/lib/firestore';
import { Timestamp } from 'firebase/firestore';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const BG = '#0D0D0D';
const CARD = '#1A1A1A';
const ACCENT = '#FF4B1F';

function formatPrDate(ts?: Timestamp): string {
  if (!ts || !(ts instanceof Timestamp)) return '';
  const d = ts.toDate();
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function initialsFromName(name: string): string {
  const t = name.trim();
  if (t.length >= 2) return t.slice(0, 2).toUpperCase();
  if (t.length === 1) return (t + t).toUpperCase();
  return 'YO';
}

export default function UserProfileScreen() {
  const router = useRouter();
  const { user } = useAuthContext();
  const params = useLocalSearchParams<{ uid?: string | string[] }>();
  const viewedUid = useMemo(() => {
    const u = params.uid;
    if (Array.isArray(u)) return u[0] ?? '';
    return u ?? '';
  }, [params.uid]);

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<(UserDocument & { uid?: string }) | null>(null);
  const [prs, setPrs] = useState<(PRRecord & { exercise: string })[]>([]);
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);

  const loadAll = useCallback(async () => {
    if (!user || !viewedUid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [p, prList, postsRaw, me] = await Promise.all([
        getUser(viewedUid),
        getUserPRs(viewedUid),
        getUserPosts(viewedUid),
        getUser(user.uid),
      ]);
      setProfile(p);
      setPrs(prList);
      setFeedPosts(
        postsRaw
          .map((raw) => normalizeFirestorePost({ ...raw, id: raw.id } as Record<string, unknown> & { id?: string }))
          .filter((x): x is FeedPost => x != null),
      );
      setIsFollowing((me?.following ?? []).includes(viewedUid));
    } catch (e) {
      console.error('[UserProfile]', e);
    } finally {
      setLoading(false);
    }
  }, [user, viewedUid]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const toggleFollow = useCallback(async () => {
    if (!user || !viewedUid) return;
    try {
      if (isFollowing) {
        await unfollowUser(user.uid, viewedUid);
        setIsFollowing(false);
      } else {
        await followUser(user.uid, viewedUid);
        setIsFollowing(true);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert(isFollowing ? 'Could not unfollow' : 'Could not follow', msg);
    }
  }, [user, viewedUid, isFollowing]);

  const displayName = profile?.displayName?.trim() || 'User';
  const handle = profile?.username ?? '';
  const isOwnProfile = !!(user && viewedUid && user.uid === viewedUid);

  if (loading) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <ActivityIndicator color={ACCENT} size="large" />
      </View>
    );
  }

  if (!viewedUid || !profile) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <Text style={styles.errorText}>User not found</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={styles.backLink}>‹ Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.topBar}>
        <View style={styles.topBarSide}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={styles.backText}>‹ Back</Text>
          </Pressable>
        </View>
        <View style={styles.topBarCenter}>
          <Text style={styles.topTitle} numberOfLines={1}>
            {handle || viewedUid}
          </Text>
        </View>
        <View style={styles.topBarSide} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <View style={styles.headerRow}>
          {profile.avatarUrl ? (
            <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarInitials}>{initialsFromName(displayName)}</Text>
            </View>
          )}
          <View style={styles.headerTextCol}>
            <Text style={styles.displayName}>{displayName}</Text>
            <Text style={styles.handle}>@{handle}</Text>
            <Text style={styles.bio}>{profile.bio ?? ''}</Text>
            {!isOwnProfile ? (
              <Pressable
                style={[styles.followBtn, isFollowing ? styles.followBtnOutline : styles.followBtnFill]}
                onPress={toggleFollow}>
                <Text style={[styles.followBtnText, isFollowing ? styles.followBtnTextOutline : null]}>
                  {isFollowing ? 'Following' : 'Follow'}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{profile.following?.length ?? 0}</Text>
            <Text style={styles.statLabel}>Friends</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{profile.totalWorkouts ?? 0}</Text>
            <Text style={styles.statLabel}>Workouts</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNum, styles.statNumMuted]}>#?</Text>
            <Text style={styles.statLabel}>Rank</Text>
          </View>
        </View>

        <View style={styles.streakCard}>
          <Text style={styles.streakEmoji}>🔥</Text>
          <View style={styles.streakMid}>
            <Text style={styles.streakDays}>{profile.currentStreak ?? 0} days</Text>
            <Text style={styles.streakSub}>current streak</Text>
            <Text style={styles.streakBest}>
              Best ever: {profile.bestStreak ?? 0} days 🏆
            </Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Personal records</Text>
        <View style={styles.prGrid}>
          {prs.length === 0 ? (
            <View style={[styles.prCard, styles.prCardEmpty]}>
              <Text style={styles.prEmptyText}>No PRs yet</Text>
            </View>
          ) : (
            prs.map((pr) => {
              const dateStr = formatPrDate(pr.date);
              return (
                <View key={pr.exercise} style={styles.prCard}>
                  <Text style={styles.prExercise}>{pr.exercise}</Text>
                  <View style={styles.prWeightRow}>
                    <Text style={styles.prWeight}>{pr.weight}</Text>
                    <Text style={styles.prKg}> kg</Text>
                  </View>
                  {dateStr ? <Text style={styles.prDate}>{dateStr}</Text> : null}
                </View>
              );
            })
          )}
        </View>

        <Text style={styles.sectionLabel}>Recent posts</Text>
        {feedPosts.length === 0 ? (
          <Text style={styles.emptyPosts}>No posts yet</Text>
        ) : (
          <View style={styles.postsList}>
            {feedPosts.map((p) => (
              <View key={p.id} style={styles.postWrap}>
                <FeedPostCard post={p} />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BG,
    paddingTop: 50,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#888888',
    fontWeight: '700',
    fontSize: 15,
  },
  backLink: {
    color: ACCENT,
    fontWeight: '800',
    fontSize: 16,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    paddingHorizontal: 16,
  },
  topBarSide: {
    flex: 1,
  },
  topBarCenter: {
    flex: 2,
    alignItems: 'center',
  },
  backText: {
    color: '#888888',
    fontWeight: '800',
    fontSize: 16,
  },
  topTitle: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 17,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginRight: 14,
  },
  avatarPlaceholder: {
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 22,
  },
  headerTextCol: {
    flex: 1,
    paddingTop: 2,
  },
  displayName: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 17,
  },
  handle: {
    color: '#888888',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600',
  },
  bio: {
    color: '#888888',
    fontSize: 12,
    marginTop: 5,
    fontWeight: '600',
  },
  followBtn: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  followBtnFill: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  followBtnOutline: {
    backgroundColor: 'transparent',
    borderColor: '#3a3a3a',
  },
  followBtnText: {
    fontWeight: '900',
    fontSize: 13,
    color: '#FFFFFF',
  },
  followBtnTextOutline: {
    color: '#888888',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  statCard: {
    flex: 1,
    backgroundColor: CARD,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  statNum: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 20,
  },
  statNumMuted: {
    color: '#888888',
  },
  statLabel: {
    color: '#888888',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
  },
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111111',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,75,31,0.3)',
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  streakEmoji: {
    fontSize: 32,
    marginRight: 10,
  },
  streakMid: {
    flex: 1,
  },
  streakDays: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 26,
    letterSpacing: -1,
  },
  streakSub: {
    color: '#888888',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  streakBest: {
    color: ACCENT,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  sectionLabel: {
    fontSize: 10,
    color: '#444444',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 9,
    marginTop: 8,
    fontWeight: '800',
  },
  prGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  prCard: {
    width: '48%',
    marginBottom: 8,
    backgroundColor: CARD,
    borderRadius: 12,
    padding: 11,
  },
  prCardEmpty: {
    width: '100%',
  },
  prEmptyText: {
    color: '#888888',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  prExercise: {
    color: '#888888',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 3,
  },
  prWeightRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  prWeight: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '900',
  },
  prKg: {
    color: '#888888',
    fontSize: 11,
    fontWeight: '700',
  },
  prDate: {
    color: '#888888',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 3,
  },
  emptyPosts: {
    color: '#888888',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 20,
  },
  postsList: {
    gap: 14,
  },
  postWrap: {
    borderRadius: 18,
  },
});
