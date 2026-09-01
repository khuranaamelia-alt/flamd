import { MaterialIcons } from '@expo/vector-icons';
import { Timestamp } from 'firebase/firestore';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAuthContext } from '@/contexts/AuthProvider';
import {
  getLeaderboard,
  getUser,
  getUserAllRecentPosts,
  getUserPostsThisMonth,
  getUserPRs,
  type PostDocument,
  type PRRecord,
  type UserDocument,
} from '@/lib/firestore';

const BG = '#0D0D0D';
const CARD = '#1A1A1A';
const ACCENT = '#FF4B1F';

const sectionLabel = {
  fontSize: 10,
  color: '#444444',
  letterSpacing: 2,
  textTransform: 'uppercase' as const,
  marginBottom: 9,
  marginTop: 16,
  fontWeight: '800' as const,
};

function formatPrDate(ts?: Timestamp): string {
  if (!ts || !(ts instanceof Timestamp)) return '';
  const d = ts.toDate();
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatPostDate(ts?: Timestamp): string {
  if (!ts || !(ts instanceof Timestamp)) return '';
  const d = ts.toDate();
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function postSummary(post: PostDocument & { id: string }): { name: string; meta: string; emoji: string; isCardio: boolean } {
  if (post.type === 'workout') {
    const exCount = Array.isArray(post.exercises) ? (post.exercises as unknown[]).length : 0;
    return {
      name: (post.workoutName as string) || 'Workout',
      meta: `${formatPostDate(post.createdAt as Timestamp)} · ${exCount} exercise${exCount !== 1 ? 's' : ''}`,
      emoji: '💪',
      isCardio: false,
    };
  }
  if (post.type === 'cardio') {
    const dur = post.duration as number | undefined;
    const mins = dur != null ? `${Math.floor(dur / 60)} min` : '';
    const dist = post.distance as number | undefined;
    const distStr = dist && dist > 0 ? ` · ${dist.toFixed(1)}km` : '';
    return {
      name: (post.cardioType as string) || 'Cardio',
      meta: `${formatPostDate(post.createdAt as Timestamp)}${mins ? ` · ${mins}` : ''}${distStr}`,
      emoji: '🏃',
      isCardio: true,
    };
  }
  if (post.type === 'pr') {
    return {
      name: `PR — ${(post.exercise as string) || 'Lift'}`,
      meta: `${formatPostDate(post.createdAt as Timestamp)} · ${post.weight as number}kg`,
      emoji: '🏆',
      isCardio: false,
    };
  }
  return { name: 'Activity', meta: formatPostDate(post.createdAt as Timestamp), emoji: '🔥', isCardio: false };
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user } = useAuthContext();
  const [userData, setUserData] = useState<any>(null);
  const [prs, setPrs] = useState<any[]>([]);
  const [recentPosts, setRecentPosts] = useState<(PostDocument & { id: string })[]>([]);
  const [monthStats, setMonthStats] = useState({ workouts: 0, cardio: 0, prs: 0, restDays: 0 });
  const [userRank, setUserRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!user) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const load = async () => {
        try {
          const [u, p, recent, monthPosts] = await Promise.all([
            getUser(user.uid),
            getUserPRs(user.uid),
            getUserAllRecentPosts(user.uid, 5),
            getUserPostsThisMonth(user.uid),
          ]);
          setUserData(u as UserDocument | null);
          setPrs(p as (PRRecord & { exercise: string })[]);
          setRecentPosts(recent);

          // Month stats
          const workouts = monthPosts.filter((p) => p.type === 'workout').length;
          const cardio = monthPosts.filter((p) => p.type === 'cardio').length;
          const prsCount = monthPosts.filter((p) => p.type === 'pr').length;
          const restDaysUsed = u?.restDaysUsedThisWeek ?? 0;
          setMonthStats({ workouts, cardio, prs: prsCount, restDays: restDaysUsed });

          // Real rank from leaderboard (friends + self)
          const following = u?.following ?? [];
          const leaderUsers = await getLeaderboard([...following, user.uid]);
          const streakSorted = [...leaderUsers].sort(
            (a, b) => (b.currentStreak ?? 0) - (a.currentStreak ?? 0),
          );
          const rankIdx = streakSorted.findIndex((lu) => lu.uid === user.uid);
          setUserRank(rankIdx >= 0 ? rankIdx + 1 : null);
        } finally {
          setLoading(false);
        }
      };
      void load();
    }, [user]),
  );

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0D0D0D', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#FF4B1F" size="large" />
      </View>
    );
  }

  const initials = userData?.displayName?.slice(0, 2).toUpperCase() ?? 'YO';
  const restDaysLeft = Math.max(0, 2 - (userData?.restDaysUsedThisWeek ?? 0));

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <Text style={styles.topTitle}>Profile</Text>
          <Pressable hitSlop={12} style={styles.gearWrap} onPress={() => router.push('/settings' as any)}>
            <MaterialIcons name="settings" size={24} color="#888888" />
          </Pressable>
        </View>

        {/* Profile header */}
        <View style={styles.headerRow}>
          <View style={styles.avatarWrap}>
            {userData?.avatarUrl ? (
              <Image
                source={{ uri: userData.avatarUrl }}
                style={{ width: 70, height: 70, borderRadius: 35 }}
              />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
            )}
            <View style={styles.editBadge}>
              <Text style={styles.editPencil}>✎</Text>
            </View>
          </View>
          <View style={styles.headerTextCol}>
            <Text style={styles.displayName}>{userData?.displayName ?? 'Your Name'}</Text>
            <Text style={styles.handle}>@{userData?.username ?? 'yourhandle'}</Text>
            {userData?.bio ? <Text style={styles.bio}>{userData.bio}</Text> : null}
            <Pressable style={styles.editPill} onPress={() => router.push('/edit-profile' as any)}>
              <Text style={styles.editPillText}>Edit profile</Text>
            </Pressable>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{userData?.following?.length ?? 0}</Text>
            <Text style={styles.statLabel}>Friends</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{userData?.totalWorkouts ?? 0}</Text>
            <Text style={styles.statLabel}>Workouts</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNum, userRank != null ? styles.statNumAccent : null]}>
              {userRank != null ? `#${userRank}` : '—'}
            </Text>
            <Text style={styles.statLabel}>Rank</Text>
          </View>
        </View>

        {/* Streak */}
        <View style={styles.streakCard}>
          <Text style={styles.streakEmoji}>🔥</Text>
          <View style={styles.streakMid}>
            <Text style={styles.streakDays}>{userData?.currentStreak ?? 0} days</Text>
            <Text style={styles.streakSub}>current streak</Text>
            <Text style={styles.streakBest}>Best ever: {userData?.bestStreak ?? 0} days 🏆</Text>
          </View>
          <View style={styles.streakCounter}>
            <Text style={styles.streakCounterNum}>{restDaysLeft}</Text>
            <Text style={styles.streakCounterLabel}>rest days{'\n'}left</Text>
          </View>
        </View>

        {/* PRs */}
        <Text style={styles.sectionLabel}>Personal records</Text>
        <View style={styles.prGrid}>
          {prs.length === 0 ? (
            <View style={[styles.prCard, styles.prCardEmpty]}>
              <Text style={styles.prEmptyText}>No PRs yet — log your first lift 🏋️</Text>
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

        {/* This month */}
        <Text style={styles.sectionLabel}>This month</Text>
        <View style={styles.monthCard}>
          <View style={styles.monthRow}>
            <Text style={styles.monthLeft}>Workouts completed</Text>
            <Text style={styles.monthRight}>{monthStats.workouts}</Text>
          </View>
          <View style={styles.monthRow}>
            <Text style={styles.monthLeft}>Cardio sessions</Text>
            <Text style={styles.monthRight}>{monthStats.cardio}</Text>
          </View>
          <View style={styles.monthRow}>
            <Text style={styles.monthLeft}>PRs set</Text>
            <Text style={styles.monthRight}>{monthStats.prs}</Text>
          </View>
          <View style={[styles.monthRow, styles.monthRowLast]}>
            <Text style={styles.monthLeft}>Rest days used this week</Text>
            <Text style={styles.monthRight}>{monthStats.restDays} of 2</Text>
          </View>
        </View>

        {/* Recent activity */}
        <Text style={styles.sectionLabel}>Recent activity</Text>
        {recentPosts.length === 0 ? (
          <View style={styles.emptyActivity}>
            <Text style={styles.emptyActivityText}>
              No activity yet — log a workout to get started 🔥
            </Text>
          </View>
        ) : (
          <View style={styles.recentList}>
            {recentPosts.map((post) => {
              const { name, meta, emoji, isCardio } = postSummary(post);
              const isPublic = post.isPublic as boolean | undefined;
              return (
                <View key={post.id} style={styles.workoutRow}>
                  <View style={[styles.workoutIcon, isCardio ? styles.iconCardio : styles.iconWeights]}>
                    <Text style={styles.workoutEmoji}>{emoji}</Text>
                  </View>
                  <View style={styles.workoutMid}>
                    <Text style={styles.workoutName}>{name}</Text>
                    <Text style={styles.workoutMeta}>{meta}</Text>
                  </View>
                  <Text style={isPublic ? styles.statusPosted : styles.statusPrivate}>
                    {isPublic ? 'Posted' : 'Private'}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG, paddingTop: 55 },
  scroll: { paddingHorizontal: 16, paddingBottom: 30 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  topTitle: { color: '#FFFFFF', fontWeight: '900', fontSize: 22 },
  gearWrap: { padding: 4 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 18 },
  avatarWrap: { position: 'relative', marginRight: 14 },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: { color: '#FFFFFF', fontWeight: '900', fontSize: 22 },
  editBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: BG,
  },
  editPencil: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  headerTextCol: { flex: 1, paddingTop: 2 },
  displayName: { color: '#FFFFFF', fontWeight: '900', fontSize: 17 },
  handle: { color: '#888888', fontSize: 12, marginTop: 2, fontWeight: '600' },
  bio: { color: '#888888', fontSize: 12, marginTop: 5, fontWeight: '600' },
  editPill: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: ACCENT,
  },
  editPillText: { color: ACCENT, fontSize: 11, fontWeight: '800' },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  statCard: {
    flex: 1,
    backgroundColor: CARD,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  statNum: { color: '#FFFFFF', fontWeight: '900', fontSize: 20 },
  statNumAccent: { color: ACCENT },
  statLabel: { color: '#888888', fontSize: 10, fontWeight: '700', marginTop: 4 },
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111111',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,75,31,0.3)',
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  streakEmoji: { fontSize: 32, marginRight: 10 },
  streakMid: { flex: 1 },
  streakDays: { color: '#FFFFFF', fontWeight: '900', fontSize: 26, letterSpacing: -1 },
  streakSub: { color: '#888888', fontSize: 10, fontWeight: '700', marginTop: 2 },
  streakBest: { color: ACCENT, fontSize: 11, fontWeight: '600', marginTop: 4 },
  streakCounter: {
    backgroundColor: CARD,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
    minWidth: 56,
  },
  streakCounterNum: { color: '#FFFFFF', fontWeight: '900', fontSize: 18 },
  streakCounterLabel: {
    color: '#888888',
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 2,
    lineHeight: 11,
  },
  sectionLabel: { ...sectionLabel },
  prGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  prCard: { width: '48%', marginBottom: 8, backgroundColor: CARD, borderRadius: 12, padding: 11 },
  prCardEmpty: { width: '100%' },
  prEmptyText: { color: '#888888', fontSize: 13, fontWeight: '700', textAlign: 'center' },
  prExercise: { color: '#888888', fontSize: 11, fontWeight: '700', marginBottom: 3 },
  prWeightRow: { flexDirection: 'row', alignItems: 'baseline' },
  prWeight: { color: '#FFFFFF', fontSize: 19, fontWeight: '900' },
  prKg: { color: '#888888', fontSize: 11, fontWeight: '700' },
  prDate: { color: '#888888', fontSize: 10, fontWeight: '600', marginTop: 3 },
  monthCard: { backgroundColor: CARD, borderRadius: 14, padding: 13 },
  monthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#222222',
  },
  monthRowLast: { borderBottomWidth: 0 },
  monthLeft: { color: '#888888', fontSize: 12, fontWeight: '600' },
  monthRight: { color: '#FFFFFF', fontWeight: '900', fontSize: 13 },
  emptyActivity: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 16 },
  emptyActivityText: {
    color: '#555555',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  recentList: { gap: 10, marginBottom: 8 },
  workoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 12,
    padding: 11,
    gap: 11,
  },
  workoutIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWeights: { backgroundColor: 'rgba(255,75,31,0.22)' },
  iconCardio: { backgroundColor: 'rgba(29,158,117,0.25)' },
  workoutEmoji: { fontSize: 16 },
  workoutMid: { flex: 1 },
  workoutName: { color: '#FFFFFF', fontWeight: '900', fontSize: 13 },
  workoutMeta: { color: '#888888', fontSize: 11, fontWeight: '600', marginTop: 2 },
  statusPosted: { color: ACCENT, fontSize: 10, fontWeight: '900' },
  statusPrivate: { color: '#444444', fontSize: 10, fontWeight: '900' },
});
