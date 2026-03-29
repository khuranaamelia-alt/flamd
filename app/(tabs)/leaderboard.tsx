import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

type GroupTab = { id: string; label: string; emoji?: string; active?: boolean };
type CategoryTab = { id: string; label: string; emoji: string; active?: boolean };

type PodiumUser = {
  place: 1 | 2 | 3;
  name: string;
  initials: string;
  streakText: string;
  avatarFill: string;
  borderColor: string;
  podiumHeight: number;
  crown?: boolean;
};

type RankedRow = {
  id: string;
  rank: number;
  name: string;
  initials: string;
  statsLine: string;
  streakNumber: string;
  avatarFill: string;
  highlight?: boolean;
};

const FLAMD = {
  bg: '#0D0D0D',
  card: '#1A1A1A',
  accent: '#FF4B1F',
};

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

export default function LeaderboardScreen() {
  const groupTabs: GroupTab[] = [
    { id: 'all', label: 'All friends', active: true },
    { id: 'gym', label: 'Gym Bros', emoji: '🏋️' },
    { id: 'morning', label: 'Morning Crew', emoji: '🏃' },
    { id: 'new', label: '+ New group' },
  ];

  const categoryTabs: CategoryTab[] = [
    { id: 'streak', label: 'Streak', emoji: '🔥', active: true },
    { id: 'sessions', label: 'Sessions', emoji: '💪' },
    { id: 'prs', label: 'PRs', emoji: '🏆' },
  ];

  const podium: PodiumUser[] = [
    {
      place: 2,
      name: 'Arjun',
      initials: 'AR',
      streakText: '🔥 18d',
      avatarFill: '#2A2A2A',
      borderColor: '#A3A3A3',
      podiumHeight: 86,
    },
    {
      place: 1,
      name: 'Siddharth',
      initials: 'SK',
      streakText: '🔥 21d',
      avatarFill: '#0D0D0D',
      borderColor: '#D7A21E',
      podiumHeight: 112,
      crown: true,
    },
    {
      place: 3,
      name: 'Priya',
      initials: 'PV',
      streakText: '🔥 16d',
      avatarFill: '#2B1B12',
      borderColor: '#B06E2C',
      podiumHeight: 70,
    },
  ];

  const getFlamdBanner = {
    username: 'Siddharth',
    prevUser: 'Arjun',
  };

  const rankedRows: RankedRow[] = [
    {
      id: 'you',
      rank: 4,
      name: 'You',
      initials: 'YO',
      statsLine: '🔥 14d streak · 4 sessions · 280kg PRs',
      streakNumber: '14',
      avatarFill: '#2A2A2A',
      highlight: true,
    },
    {
      id: 'rahul',
      rank: 5,
      name: 'Rahul',
      initials: 'RK',
      statsLine: '🔥 14d streak · 3 sessions · 240kg PRs',
      streakNumber: '14',
      avatarFill: '#2A2A2A',
    },
    {
      id: 'karan',
      rank: 6,
      name: 'Karan',
      initials: 'KS',
      statsLine: '🔥 2d streak · 2 sessions · 310kg PRs',
      streakNumber: '8',
      avatarFill: '#2A2A2A',
    },
    {
      id: 'arjun',
      rank: 7,
      name: 'Arjun',
      initials: 'AR',
      statsLine: '🔥 7d streak · 1 sessions · 180kg PRs',
      streakNumber: '8',
      avatarFill: '#2A2A2A',
    },
  ];

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <Text style={styles.topBarTitle}>Leaderboard</Text>
          <Text style={styles.topBarWeek}>Week 12</Text>
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
            const active = !!t.active;
            return (
              <View
                key={t.id}
                style={[
                  styles.categoryTab,
                  active ? styles.categoryTabActive : styles.categoryTabInactive,
                ]}>
                <Text style={[styles.categoryTabText, active ? styles.categoryTabTextActive : styles.categoryTabTextInactive]}>
                  {t.emoji} {t.label}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Podium */}
        <View style={styles.podiumRow}>
          {podium.map((u) => {
            const position = u.place;
            return (
              <View key={u.place} style={styles.podiumCol}>
                <View style={[styles.podiumStack, { height: u.podiumHeight }]}>
                  {u.crown ? <Text style={styles.crown}>👑</Text> : <View style={{ height: 16 }} />}
                  <AvatarCircle
                    initials={u.initials}
                    fill={u.avatarFill}
                    borderColor={u.borderColor}
                    size={u.place === 1 ? 56 : u.place === 2 ? 48 : 44}
                  />
                  <Text style={styles.podiumName}>{u.name}</Text>
                  <Text style={styles.podiumStreak}>{u.streakText}</Text>
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

        {/* Get Flamd banner */}
        <View style={styles.getFlamdBanner}>
          <View style={styles.getFlamdLeft}>
            <Text style={styles.getFlamdFlame}>🔥</Text>
          </View>
          <View style={styles.getFlamdTextWrap}>
            <Text style={styles.getFlamdLine1}>
              {getFlamdBanner.username} just took #1
            </Text>
            <Text style={styles.getFlamdLine2}>
              {getFlamdBanner.prevUser} just got Flamd
            </Text>
          </View>
        </View>

        {/* Ranked list */}
        <View style={styles.listCard}>
          {rankedRows.map((row) => (
            <View key={row.id} style={[styles.rankRow, row.highlight ? styles.rankRowYou : styles.rankRowDefault]}>
              <Text style={[styles.rankNumber, row.highlight ? styles.rankNumberYou : null]}>{row.rank}</Text>
              <View style={styles.rankAvatarWrap}>
                <AvatarCircle initials={row.initials} fill={row.avatarFill} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rankName, row.highlight ? styles.rankNameYou : null]}>{row.name}</Text>
                <Text style={[styles.rankStats, row.highlight ? styles.rankStatsYou : null]}>{row.statsLine}</Text>
              </View>
              <View style={styles.rankFlameRight}>
                <Text style={styles.rankFlame}>🔥</Text>
                <Text style={styles.rankFlameNum}>{row.streakNumber}</Text>
              </View>
            </View>
          ))}
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
  screen: {
    flex: 1,
    backgroundColor: FLAMD.bg,
    paddingTop: 55,
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

