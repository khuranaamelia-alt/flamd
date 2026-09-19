import { useAuthContext } from '@/contexts/AuthProvider';
import {
  type UserDocument,
  getLeaderboard,
  getUser,
} from '@/lib/firestore';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';

type GroupTab = { id: string; label: string; emoji?: string; active?: boolean };
type CategoryTab = { id: 'Streak' | 'Sessions' | 'PRs'; label: string; emoji: string };

const FLAMD = {
  bg: '#0D0D0D',
  card: '#1A1A1A',
  accent: '#FF4B1F',
};

function initialsFromDisplayName(name: string): string {
  const t = name.trim();
  if (t.length >= 2) return t.slice(0, 2).toUpperCase();
  if (t.length === 1) return (t + t).toUpperCase();
  return '?';
}

function displayLabel(u: UserDocument & { uid?: string }): string {
  return String(u.displayName ?? u.username ?? 'User');
}

function AvatarCircle({
  initials,
  fill,
  borderColor,
  size = 68,
}: {
  initials: string;
  fill: string;
  borderColor?: string;
  size?: number;
}) {
  return (
    <View
      style={[
        styles.avatarCircle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: fill,
          borderColor: borderColor ?? 'transparent',
        },
      ]}>
      <Text style={styles.avatarInitials}>{initials}</Text>
    </View>
  );
}

const PODIUM_VISUAL: Record<
  1 | 2 | 3,
  { podiumHeight: number; size: number; avatarFill: string; borderColor: string }
> = {
  2: { podiumHeight: 86, size: 48, avatarFill: '#2A2A2A', borderColor: '#A3A3A3' },
  1: { podiumHeight: 112, size: 56, avatarFill: '#0D0D0D', borderColor: '#D7A21E' },
  3: { podiumHeight: 70, size: 44, avatarFill: '#2B1B12', borderColor: '#B06E2C' },
};

function getIsoWeekNumber(date = new Date()): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export default function LeaderboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthContext();
  const [leaderboardUsers, setLeaderboardUsers] = useState<(UserDocument & { uid?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<'Streak' | 'Sessions' | 'PRs'>('Streak');

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const u = await getUser(user.uid);
      const followingIds = [...(u?.following ?? []), user.uid];
      const users = await getLeaderboard(followingIds);
      setLeaderboardUsers(users);
    } catch (e) {
      console.error('[leaderboard] load', e);
      setError("Couldn't load the leaderboard. Tap to retry.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const sortedUsers = useMemo(() => {
    return [...leaderboardUsers].sort((a, b) => {
      if (activeCategory === 'Streak') return (b.currentStreak ?? 0) - (a.currentStreak ?? 0);
      if (activeCategory === 'Sessions') return (b.totalWorkouts ?? 0) - (a.totalWorkouts ?? 0);
      return 0;
    });
  }, [leaderboardUsers, activeCategory]);

  const groupTabs: GroupTab[] = [
    { id: 'all', label: 'All friends', active: true },
  ];

  const categoryTabs: CategoryTab[] = [
    { id: 'Streak', label: 'Streak', emoji: '🔥' },
    { id: 'Sessions', label: 'Sessions', emoji: '💪' },
    { id: 'PRs', label: 'PRs', emoji: '🏆' },
  ];

  /** Visual order: 2nd, 1st, 3rd (columns left → center → right). */
  const podiumSlots = useMemo(() => {
    const first = sortedUsers[0];
    const second = sortedUsers[1];
    const third = sortedUsers[2];
    const slots: {
      place: 1 | 2 | 3;
      user: (typeof sortedUsers)[number];
      crown?: true;
    }[] = [];
    if (second) slots.push({ place: 2, user: second });
    if (first) slots.push({ place: 1, user: first, crown: true });
    if (third) slots.push({ place: 3, user: third });
    return slots;
  }, [sortedUsers]);

  const restRows = sortedUsers.slice(3);

  if (loading) {
    return (
      <View style={[styles.screen, styles.loadingScreen, { paddingTop: insets.top + 12 }]}>
        <ActivityIndicator color="#FF4B1F" size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.screen, styles.loadingScreen, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => void load()} hitSlop={12}>
          <Text style={styles.emptyFriendsText}>{error}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 12 }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <Text style={styles.topBarTitle}>Leaderboard</Text>
          <Text style={styles.topBarWeek}>Week {getIsoWeekNumber()}</Text>
        </View>

        {/* Group tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.groupTabsRow}>
          {groupTabs.map((t) => {
            const active = !!t.active;
            return (
              <View
                key={t.id}
                style={[
                  styles.groupTab,
                  active ? styles.groupTabActive : styles.groupTabInactive,
                ]}>
                <Text style={[styles.groupTabText, active ? styles.groupTabTextActive : styles.groupTabTextInactive]}>
                  {t.emoji ? `${t.emoji} ` : ''}
                  {t.label}
                </Text>
              </View>
            );
          })}
        </ScrollView>

        {/* Category tabs */}
        <View style={styles.categoryTabsRow}>
          {categoryTabs.map((t) => {
            const active = activeCategory === t.id;
            return (
              <Pressable
                key={t.id}
                onPress={() => setActiveCategory(t.id)}
                style={[
                  styles.categoryTab,
                  active ? styles.categoryTabActive : styles.categoryTabInactive,
                ]}>
                <Text style={[styles.categoryTabText, active ? styles.categoryTabTextActive : styles.categoryTabTextInactive]}>
                  {t.emoji} {t.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Podium */}
        <View
          style={[
            styles.podiumRow,
            sortedUsers.length === 1 ? { justifyContent: 'center' } : null,
          ]}>
          {podiumSlots.map((slot) => {
            const position = slot.place;
            const vis = PODIUM_VISUAL[position];
            const u = slot.user;
            const name = displayLabel(u);
            const streak = u.currentStreak ?? 0;
            const streakText =
              streak === 0 ? `💔 ${streak}d` : `🔥 ${streak}d`;
            const initials = initialsFromDisplayName(displayLabel(u));
            const fill = vis.avatarFill;
            const border = vis.borderColor;

            return (
              <View key={slot.place} style={styles.podiumCol}>
                <View style={[styles.podiumStack, { minHeight: vis.podiumHeight }]}>
                  {slot.crown ? <Text style={styles.crown}>👑</Text> : <View style={{ height: 16 }} />}
                  <AvatarCircle
                    initials={initials}
                    fill={fill}
                    borderColor={border}
                    size={vis.size}
                  />
                  <Text style={styles.podiumName}>{name}</Text>
                  <Text style={styles.podiumStreak}>{streakText}</Text>
                </View>
                <View
                  style={[
                    styles.podiumBlock,
                    position === 1 ? styles.podiumBlockTall : position === 2 ? styles.podiumBlockMed : styles.podiumBlockSmall,
                  ]}>
                  <Text style={styles.podiumBlockText}>{position}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {sortedUsers.length === 1 ? (
          <View style={styles.emptyFriendsWrap}>
            <Text style={styles.emptyFriendsText}>Add friends to compete on the leaderboard 🔥</Text>
          </View>
        ) : null}

        {/* Get Flamd banner */}
        {sortedUsers.length >= 2 && sortedUsers[0] && sortedUsers[1] ? (
          <View style={styles.getFlamdBanner}>
            <View style={styles.getFlamdLeft}>
              <Text style={styles.getFlamdFlame}>🔥</Text>
            </View>
            <View style={styles.getFlamdTextWrap}>
              <Text style={styles.getFlamdLine1}>
                {displayLabel(sortedUsers[0])} just took #1
              </Text>
              <Text style={styles.getFlamdLine2}>
                {displayLabel(sortedUsers[1])} just got Flamd
              </Text>
            </View>
          </View>
        ) : null}

        {/* Ranked list */}
        <View style={styles.listCard}>
          {restRows.map((rowUser, i) => {
            const rank = i + 4;
            const uid = rowUser.uid ?? '';
            const isYou = !!user && uid === user.uid;
            const streak = rowUser.currentStreak ?? 0;
            const sessions = rowUser.totalWorkouts ?? 0;
            const name = String(rowUser.username ?? rowUser.displayName ?? 'user');
            const statsIcon = streak === 0 ? '💔' : '🔥';
            const statsLine = `${statsIcon} ${streak}d streak · ${sessions} sessions`;

            return (
              <Pressable
                key={uid || `row-${rank}`}
                onPress={() =>
                  uid
                    ? router.push({ pathname: '/user-profile', params: { uid } } as any)
                    : undefined
                }
                style={[styles.rankRow, isYou ? styles.rankRowYou : styles.rankRowDefault]}>
                <Text style={[styles.rankNumber, isYou ? styles.rankNumberYou : null]}>{rank}</Text>
                <View style={styles.rankAvatarWrap}>
                  <AvatarCircle
                    initials={initialsFromDisplayName(displayLabel(rowUser))}
                    fill="#2A2A2A"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rankName, isYou ? styles.rankNameYou : null]}>{name}</Text>
                  <Text style={[styles.rankStats, isYou ? styles.rankStatsYou : null]}>{statsLine}</Text>
                </View>
                <View style={styles.rankFlameRight}>
                  <Text style={styles.rankFlame}>{streak === 0 ? '💔' : '🔥'}</Text>
                  <Text style={styles.rankFlameNum}>{streak}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Tiebreak rules */}
        <View style={styles.tieBreakCard}>
          <Text style={styles.tieBreakTitle}>TIEBREAK ORDER — SAME STREAK?</Text>

          <View style={styles.tieRuleRow}>
            <Text style={styles.tieRuleNum}>1</Text>
            <Text style={styles.tieRuleText}>Streak days — most consecutive days wins</Text>
          </View>
          <View style={styles.tieRuleRow}>
            <Text style={styles.tieRuleNum}>2</Text>
            <Text style={styles.tieRuleText}>Sessions this week — most posts wins</Text>
          </View>
          <View style={styles.tieRuleRow}>
            <Text style={styles.tieRuleNum}>3</Text>
            <Text style={styles.tieRuleText}>Combined PRs — heaviest total lifts wins</Text>
          </View>
          <View style={styles.tieRuleRow}>
            <Text style={styles.tieRuleNum}>4</Text>
            <Text style={styles.tieRuleText}>Join date — OG member wins the tie</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyFriendsWrap: {
    paddingVertical: 14,
    paddingHorizontal: 8,
    marginBottom: 6,
  },
  emptyFriendsText: {
    color: '#6F6F6F',
    fontWeight: '800',
    fontSize: 13,
    textAlign: 'center',
  },
  screen: {
    flex: 1,
    backgroundColor: FLAMD.bg,
  },
  scrollContent: {
    paddingTop: 16,
    paddingHorizontal: 14,
    paddingBottom: 30,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  topBarTitle: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 18,
  },
  topBarWeek: {
    color: '#6F6F6F',
    fontWeight: '800',
    fontSize: 12,
  },
  groupTabsRow: {
    marginBottom: 12,
  },
  groupTab: {
    marginRight: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  groupTabActive: {
    backgroundColor: FLAMD.accent,
    borderColor: FLAMD.accent,
  },
  groupTabInactive: {
    backgroundColor: 'rgba(26,26,26,0.6)',
    borderColor: 'rgba(255,255,255,0.14)',
  },
  groupTabText: {
    fontWeight: '900',
    fontSize: 13,
  },
  groupTabTextActive: {
    color: '#FFFFFF',
  },
  groupTabTextInactive: {
    color: '#9A9A9A',
  },
  categoryTabsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  categoryTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  categoryTabActive: {
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: '#1A1A1A',
  },
  categoryTabInactive: {
    borderColor: 'transparent',
    backgroundColor: 'transparent',
  },
  categoryTabText: {
    fontWeight: '900',
    fontSize: 14,
  },
  categoryTabTextActive: {
    color: '#FFFFFF',
  },
  categoryTabTextInactive: {
    color: '#6F6F6F',
  },
  podiumRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  podiumCol: {
    width: '33%',
    alignItems: 'center',
  },
  podiumStack: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingTop: 6,
    paddingBottom: 10,
  },
  crown: {
    color: '#FFCC33',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 6,
  },
  avatarCircle: {
    borderWidth: 3,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 16,
  },
  podiumName: {
    marginTop: 10,
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
    textAlign: 'center',
  },
  podiumStreak: {
    marginTop: 4,
    color: FLAMD.accent,
    fontWeight: '900',
    fontSize: 12,
    textAlign: 'center',
  },
  podiumBlock: {
    marginTop: 0,
    width: 84,
    borderRadius: 12,
    backgroundColor: '#141414',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  podiumBlockTall: {
    height: 50,
    marginTop: -6,
  },
  podiumBlockMed: {
    height: 36,
    marginTop: -4,
  },
  podiumBlockSmall: {
    height: 26,
    marginTop: -2,
  },
  podiumBlockText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 16,
  },
  getFlamdBanner: {
    backgroundColor: FLAMD.accent,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  getFlamdLeft: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  getFlamdFlame: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  getFlamdTextWrap: {
    flex: 1,
  },
  getFlamdLine1: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
  },
  getFlamdLine2: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12,
    opacity: 0.95,
    marginTop: 2,
  },
  listCard: {
    backgroundColor: '#141414',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    padding: 12,
    gap: 10,
    marginBottom: 12,
  },
  rankRow: {
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    gap: 10,
  },
  rankRowDefault: {
    backgroundColor: '#1A1A1A',
    borderColor: 'rgba(255,255,255,0.06)',
  },
  rankRowYou: {
    backgroundColor: 'rgba(255,75,31,0.07)',
    borderColor: 'rgba(255,75,31,0.45)',
  },
  rankNumber: {
    width: 30,
    textAlign: 'center',
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
  },
  rankNumberYou: {
    color: FLAMD.accent,
  },
  rankAvatarWrap: {
    width: 52,
    alignItems: 'center',
  },
  rankName: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
  },
  rankNameYou: {
    color: FLAMD.accent,
  },
  rankStats: {
    marginTop: 2,
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 11,
    opacity: 0.95,
  },
  rankStatsYou: {
    color: FLAMD.accent,
    opacity: 1,
  },
  rankFlameRight: {
    alignItems: 'center',
    width: 46,
  },
  rankFlame: {
    color: FLAMD.accent,
    fontWeight: '900',
    fontSize: 14,
    lineHeight: 14,
  },
  rankFlameNum: {
    color: FLAMD.accent,
    fontWeight: '900',
    fontSize: 12,
    marginTop: 2,
  },
  tieBreakCard: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  tieBreakTitle: {
    color: '#6F6F6F',
    fontWeight: '900',
    fontSize: 12,
    marginBottom: 10,
  },
  tieRuleRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  tieRuleNum: {
    width: 18,
    textAlign: 'left',
    color: '#FFFFFF',
    fontWeight: '900',
  },
  tieRuleText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
    flex: 1,
  },
});
