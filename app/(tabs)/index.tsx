import { MaterialIcons } from '@expo/vector-icons';
import { Timestamp } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useAuthContext } from '@/contexts/AuthProvider';
import { getFeedPosts, getUser } from '@/lib/firestore';

const COLORS = {
  bg: '#0D0D0D',
  card: '#1A1A1A',
  accent: '#FF4B1F',
  text: '#FFFFFF',
};

type Story = { id: string; name: string; postedToday: boolean; initials: string };
type FlameMeta = { likes: number; comments: number };

type PRPost = {
  id: string;
  type: 'pr';
  author: { name: string; initials: string; ringColor: string };
  headline: string;
  prText: string;
  exercise: string;
  detail: string;
  previousBest: string;
  meta: FlameMeta;
  leaderboardRank?: string;
};

type WorkoutPost = {
  id: string;
  type: 'workout';
  author: { name: string; initials: string; ringColor: string };
  title: string;
  duration: string;
  items: { label: string; detail: string }[];
  caption: string;
  meta: FlameMeta;
  leaderboardRank?: string;
  avatarRightText?: string;
};

type RestPost = {
  id: string;
  type: 'rest';
  author: { name: string; initials: string; ringColor: string };
  text: string;
  streakText: string;
  meta: FlameMeta;
  avatarRightText?: string;
};

function formatRelativeTime(ts: Timestamp | undefined): string {
  if (!ts || !(ts instanceof Timestamp)) return '';
  const d = ts.toDate();
  const now = Date.now();
  const diffMs = now - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function summarizeExerciseSets(
  sets?: { kg?: string; reps?: string; done?: boolean }[],
): string {
  if (!sets?.length) return '—';
  return sets
    .map((s) => {
      const kg = s.kg?.trim() || '—';
      const r = s.reps?.trim() || '—';
      return `${kg}×${r}`;
    })
    .join(' · ');
}

function normalizeFirestorePost(raw: Record<string, unknown> & { id?: string }): PRPost | WorkoutPost | RestPost | null {
  const id = String(raw.id ?? '');
  const type = raw.type as string | undefined;
  const likes = Array.isArray(raw.likes) ? raw.likes.length : 0;
  const meta: FlameMeta = { likes, comments: 0 };
  const createdAt = raw.createdAt as Timestamp | undefined;

  const author = {
    name: String(raw.username ?? 'user'),
    initials: String(raw.userInitials ?? '??').slice(0, 2),
    ringColor: '#FF4B1F',
  };

  if (type === 'pr') {
    const w = raw.weight as number | undefined;
    const prev = raw.previousBest as number | undefined;
    return {
      id,
      type: 'pr',
      author,
      headline: `${author.name} just hit a new PR!`,
      prText: w != null ? `${w}kg` : '—',
      exercise: String(raw.exercise ?? ''),
      detail: '',
      previousBest: prev != null ? `Previous best: ${prev}kg` : '',
      meta,
      leaderboardRank: undefined,
    };
  }

  if (type === 'workout' || type === 'cardio') {
    const exercises = raw.exercises as
      | { id?: string; name?: string; sets?: { kg?: string; reps?: string; done?: boolean }[] }[]
      | undefined;
    const items =
      exercises?.map((ex, idx) => ({
        label: ex.name?.trim() || `Exercise ${idx + 1}`,
        detail: summarizeExerciseSets(ex.sets),
      })) ?? [];
    const workoutName = String(raw.workoutName ?? (type === 'cardio' ? 'Cardio' : 'Workout'));
    const duration = typeof raw.duration === 'string' ? raw.duration : '—';
    const caption = typeof raw.caption === 'string' ? raw.caption : '';
    return {
      id,
      type: 'workout',
      author,
      title: workoutName,
      duration,
      items: items.length ? items : [{ label: workoutName, detail: '—' }],
      caption,
      meta,
      leaderboardRank: undefined,
      avatarRightText: `${formatRelativeTime(createdAt)} · ${workoutName.toLowerCase()}`,
    };
  }

  if (type === 'rest') {
    return {
      id,
      type: 'rest',
      author,
      text: 'Rest day',
      streakText: typeof raw.streakText === 'string' ? raw.streakText : 'streak kept 🔥',
      meta,
      avatarRightText: `${formatRelativeTime(createdAt)} · rest`,
    };
  }

  return null;
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthContext();
  const [posts, setPosts] = useState<any[]>([]);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stories, setStories] = useState<Story[]>([]);

  const loadFeed = useCallback(async () => {
    if (!user) return;
    try {
      const u = await getUser(user.uid);
      setUserData(u);
      const followingIds = [...(u?.following ?? []), user.uid];
      const feedPosts = await getFeedPosts(followingIds);
      setPosts(feedPosts);

      const initialsFrom = (name: string) => {
        const t = name.trim();
        if (t.length >= 2) return t.slice(0, 2).toUpperCase();
        if (t.length === 1) return (t + t).toUpperCase();
        return 'YO';
      };

      const following = u?.following ?? [];
      if (following.length === 0) {
        setStories([
          {
            id: user.uid,
            name: u?.displayName ?? 'You',
            initials: initialsFrom(u?.displayName ?? 'YO'),
            postedToday: true,
          },
        ]);
      } else {
        const profiles = await Promise.all(following.map((fid) => getUser(fid)));
        const friendStories: Story[] = [];
        profiles.forEach((p, i) => {
          if (!p) return;
          const name = p.displayName ?? p.username ?? 'Friend';
          friendStories.push({
            id: following[i],
            name,
            initials: initialsFrom(p.displayName ?? p.username ?? 'FR'),
            postedToday: false,
          });
        });
        setStories(friendStories);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    void loadFeed();
  }, [user, loadFeed]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadFeed();
    setRefreshing(false);
  }, [loadFeed]);

  const StoryPill = ({ item }: { item: Story }) => {
    const ringColor = item.postedToday ? '#FF4B1F' : '#2a2a2a';
    return (
      <View style={styles.storyWrap}>
        <View style={[styles.storyRing, { borderColor: ringColor }]}>
          <View style={styles.storyAvatar}>
            <Text style={styles.storyInitials}>{item.initials}</Text>
          </View>
        </View>
        <Text style={styles.storyName} numberOfLines={1}>
          {item.name}
        </Text>
      </View>
    );
  };

  const AvatarRow = ({
    author,
    rightText,
  }: {
    author: { name: string; initials: string; ringColor: string };
    rightText?: string;
  }) => {
    return (
      <View style={styles.authorRow}>
        <View style={[styles.miniRing, { borderColor: author.ringColor }]}>
          <View style={styles.miniAvatar}>
            <Text style={styles.miniInitials}>{author.initials}</Text>
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.authorName}>{author.name}</Text>
          {rightText ? <Text style={styles.authorSubText}>{rightText}</Text> : null}
        </View>
      </View>
    );
  };

  const PostCard = ({ post }: { post: PRPost | WorkoutPost | RestPost }) => {
    if (post.type === 'pr') {
      return (
        <View style={[styles.card, styles.cardPR]} key={post.id}>
          <View style={styles.prTopLine}>
            <Text style={styles.prTopLineText}>{post.headline}</Text>
            <Text style={styles.prTopEmoji}>🔥</Text>
          </View>

          <View style={styles.prMain}>
            <Text style={styles.prNew}>NEW PR</Text>
            <Text style={styles.prValue}>{post.prText}</Text>
            <Text style={styles.prExercise}>{post.exercise}</Text>
            {post.detail ? <Text style={styles.prDetail}>{post.detail}</Text> : null}
            {post.previousBest ? <Text style={styles.prPrev}>{post.previousBest}</Text> : null}
          </View>

          {post.leaderboardRank ? (
            <View style={styles.leaderboardPill}>
              <Text style={styles.leaderboardPillText}>{post.leaderboardRank}</Text>
            </View>
          ) : null}

          <View style={styles.metaRow}>
            <Text style={styles.metaFlame}>🔥 {post.meta.likes}</Text>
            <Text style={styles.metaCount}>💬 {post.meta.comments}</Text>
          </View>
        </View>
      );
    }

    if (post.type === 'workout') {
      return (
        <View style={[styles.card, styles.cardDark]} key={post.id}>
          <AvatarRow author={post.author} rightText={post.avatarRightText ?? 'workout'} />

          <View style={styles.workoutHeader}>
            <Text style={styles.workoutTitle}>{post.title} ·</Text>
            <Text style={styles.workoutDuration}>{post.duration}</Text>
          </View>

          <View style={styles.workoutGrid}>
            {post.items.map((it, idx) => (
              <View key={`${post.id}-${it.label}-${idx}`} style={styles.workoutItem}>
                <Text style={styles.workoutItemLabel}>{it.label}</Text>
                <Text style={styles.workoutItemDetail}>{it.detail}</Text>
              </View>
            ))}
          </View>

          {post.leaderboardRank ? (
            <View style={styles.leaderboardPillDark}>
              <Text style={styles.leaderboardPillTextDark}>{post.leaderboardRank}</Text>
            </View>
          ) : null}

          {post.caption ? <Text style={styles.captionText}>{post.caption}</Text> : null}

          <View style={styles.metaRowDark}>
            <Text style={styles.metaFlameDark}>🔥 {post.meta.likes}</Text>
            <Text style={styles.metaCountDark}>💬 {post.meta.comments}</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.card, styles.cardDark]} key={post.id}>
        <AvatarRow author={post.author} rightText={post.avatarRightText ?? 'rest day'} />

        <View style={styles.restRow}>
          <Text style={styles.restZzz}>💤</Text>
          <Text style={styles.restText}>{post.text}</Text>
        </View>

        <Text style={styles.restStreak}>{post.streakText}</Text>

        <View style={styles.metaRowDark}>
          <Text style={styles.metaFlameDark}>🔥 {post.meta.likes}</Text>
          <Text style={styles.metaCountDark}>💬 {post.meta.comments}</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0D0D0D', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#FF4B1F" size="large" />
      </View>
    );
  }

  const normalizedPosts = posts
    .map((p) => normalizeFirestorePost(p as Record<string, unknown> & { id?: string }))
    .filter((p): p is PRPost | WorkoutPost | RestPost => p != null);

  return (
    <View style={styles.screen}>
      <View style={styles.safeArea}>
        <View style={styles.topBar}>
          <View style={styles.logo}>
            <Text style={styles.logoFl}>fl</Text>
            <Text style={styles.logoAmd}>amd</Text>
          </View>

          <View style={styles.topIcons}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => {}}>
              <MaterialIcons name="notifications" size={20} color={COLORS.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/search' as any)}>
              <MaterialIcons name="search" size={20} color={COLORS.text} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.storiesBannerGroup}>
          <FlatList
            data={stories}
            extraData={userData}
            horizontal
            style={{ flexShrink: 1 }}
            showsHorizontalScrollIndicator={false}
            keyExtractor={(s) => s.id}
            contentContainerStyle={styles.storiesRow}
            renderItem={({ item }) => <StoryPill item={item} />}
          />

          <View style={styles.bannerWrap}>
            <View style={styles.banner}>
              <Text style={styles.bannerText}>Get Flamd</Text>
            </View>
          </View>
        </View>

        <ScrollView
          style={styles.feed}
          contentContainerStyle={styles.feedContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF4B1F" />
          }>
          {normalizedPosts.length === 0 ? (
            <View style={{ alignItems: 'center', padding: 40 }}>
              <Text style={{ color: '#444', fontSize: 14, fontWeight: '600', textAlign: 'center' }}>
                No posts yet — log a workout or add friends to see their posts here
              </Text>
            </View>
          ) : (
            normalizedPosts.map((p) => (
              <View key={p.id} style={styles.postWrap}>
                <PostCard post={p} />
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0D0D0D',
    paddingTop: 50,
  },
  safeArea: {
    flex: 1,
  },
  topBar: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  logo: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  logoFl: {
    color: '#FF4B1F',
    fontWeight: '800',
    fontSize: 28,
    letterSpacing: 0.2,
  },
  logoAmd: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 28,
    letterSpacing: 0.2,
  },
  topIcons: {
    flexDirection: 'row',
    gap: 10,
  },
  iconBtn: {
    minWidth: 44,
    minHeight: 44,
    padding: 10,
    borderRadius: 999,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  storiesBannerGroup: {
    // Prevent any unexpected spacing between stories and the banner.
    padding: 0,
    margin: 0,
  },
  storiesRow: {
    paddingHorizontal: 14,
    gap: 14,
    paddingTop: 8,
    paddingBottom: 8,
  },
  storyWrap: {
    width: 72,
    alignItems: 'center',
    gap: 6,
  },
  storyRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyInitials: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  storyName: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 11,
    opacity: 0.95,
  },
  bannerWrap: {
    paddingHorizontal: 0,
    marginTop: 8,
    marginBottom: 0,
  },
  banner: {
    backgroundColor: '#FF4B1F',
    borderRadius: 0,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  bannerText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 16,
  },
  feed: {
    flex: 1,
  },
  feedContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
    gap: 14,
  },
  postWrap: {
    borderRadius: 18,
  },
  card: {
    borderRadius: 18,
    overflow: 'hidden',
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: '#1A1A1A',
  },
  cardDark: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  cardPR: {
    backgroundColor: '#FF4B1F',
    borderWidth: 0,
  },
  prTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  prTopLineText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
  },
  prTopEmoji: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
  },
  prMain: {
    gap: 2,
  },
  prNew: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 18,
    letterSpacing: 0.3,
  },
  prValue: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 40,
    lineHeight: 42,
    marginTop: 2,
  },
  prExercise: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
    marginTop: -2,
  },
  prDetail: {
    color: '#FFFFFF',
    fontWeight: '900',
    opacity: 0.95,
    fontSize: 12,
    marginTop: 2,
  },
  prPrev: {
    color: '#FFFFFF',
    fontWeight: '900',
    opacity: 0.95,
    fontSize: 12,
    marginTop: 8,
  },
  leaderboardPill: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  leaderboardPillText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingBottom: 2,
  },
  metaFlame: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
  },
  metaCount: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
    opacity: 0.95,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  miniRing: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#0D0D0D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniInitials: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 10,
  },
  authorName: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
  },
  authorSubText: {
    color: '#FF4B1F',
    fontWeight: '900',
    fontSize: 11,
    opacity: 0.95,
  },
  workoutHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 10,
  },
  workoutTitle: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 18,
  },
  workoutDuration: {
    color: '#FF4B1F',
    fontWeight: '900',
    fontSize: 16,
  },
  workoutGrid: {
    gap: 10,
  },
  workoutItem: {
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  workoutItemLabel: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
  },
  workoutItemDetail: {
    color: '#FF4B1F',
    fontWeight: '900',
    fontSize: 12,
    marginTop: 6,
  },
  leaderboardPillDark: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: '#0D0D0D',
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,75,31,0.45)',
  },
  leaderboardPillTextDark: {
    color: '#FF4B1F',
    fontWeight: '900',
    fontSize: 12,
  },
  captionText: {
    marginTop: 10,
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
    opacity: 0.95,
  },
  metaRowDark: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  metaFlameDark: {
    color: '#FF4B1F',
    fontWeight: '900',
    fontSize: 14,
  },
  metaCountDark: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
    opacity: 0.95,
  },
  restRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  restZzz: {
    color: '#FF4B1F',
    fontSize: 16,
    fontWeight: '900',
  },
  restText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 18,
  },
  restStreak: {
    marginTop: 10,
    color: '#FF4B1F',
    fontWeight: '900',
    fontSize: 12,
    opacity: 0.9,
  },
});
