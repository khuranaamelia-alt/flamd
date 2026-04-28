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
import { getUser, getUserPRs, type PRRecord, type UserDocument } from '@/lib/firestore';

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

export default function ProfileScreen() {
  const router = useRouter();
  const { user } = useAuthContext();
  const [userData, setUserData] = useState<any>(null);
  const [prs, setPrs] = useState<any[]>([]);
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
          const [u, p] = await Promise.all([getUser(user.uid), getUserPRs(user.uid)]);
          setUserData(u as UserDocument | null);
          setPrs(p as (PRRecord & { exercise: string })[]);
        } finally {
          setLoading(false);
        }
      };
      void load();
    }, [user]),
  );

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#0D0D0D',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <ActivityIndicator color="#FF4B1F" size="large" />
      </View>
    );
  }

  const initials =
    userData?.displayName?.slice(0, 2).toUpperCase() ?? 'YO';
  const restDaysLeft = Math.max(0, 2 - (userData?.restDaysUsedThisWeek ?? 0));

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <Text style={styles.topTitle}>Profile</Text>
          <Pressable hitSlop={12} style={styles.gearWrap}>
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
            <Text style={styles.bio}>{userData?.bio ?? ''}</Text>
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
            <Text style={[styles.statNum, styles.statNumAccent]}>#4</Text>
            <Text style={styles.statLabel}>Rank</Text>
          </View>
        </View>

        {/* Streak */}
        <View style={styles.streakCard}>
          <Text style={styles.streakEmoji}>🔥</Text>
          <View style={styles.streakMid}>
            <Text style={styles.streakDays}>{userData?.currentStreak ?? 0} days</Text>
            <Text style={styles.streakSub}>current streak</Text>
            <Text style={styles.streakBest}>
              Best ever: {userData?.bestStreak ?? 0} days 🏆
            </Text>
          </View>
          <View style={styles.streakCounter}>
            <Text style={styles.streakCounterNum}>{restDaysLeft}</Text>
            <Text style={styles.streakCounterLabel}>
              rest days{'\n'}left
            </Text>
          </View>
        </View>

        {/* PRs */}
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

        {/* This month */}
        <Text style={styles.sectionLabel}>This month</Text>
        <View style={styles.monthCard}>
          <View style={styles.monthRow}>
            <Text style={styles.monthLeft}>Workouts completed</Text>
            <Text style={styles.monthRight}>18</Text>
          </View>
          <View style={styles.monthRow}>
            <Text style={styles.monthLeft}>Rest days used</Text>
            <Text style={styles.monthRight}>4 of 8</Text>
          </View>
          <View style={styles.monthRow}>
            <Text style={styles.monthLeft}>PRs set</Text>
            <Text style={styles.monthRight}>3</Text>
          </View>
          <View style={[styles.monthRow, styles.monthRowLast]}>
            <Text style={styles.monthLeft}>Cardio sessions</Text>
            <Text style={styles.monthRight}>5</Text>
          </View>
        </View>

        {/* Recent workouts */}
        <Text style={styles.sectionLabel}>Recent workouts</Text>
        <View style={styles.recentList}>
          <View style={styles.workoutRow}>
            <View style={[styles.workoutIcon, styles.iconWeights]}>
              <Text style={styles.workoutEmoji}>💪</Text>
            </View>
            <View style={styles.workoutMid}>
              <Text style={styles.workoutName}>Chest & Triceps</Text>
              <Text style={styles.workoutMeta}>Today · 52 min · 4 exercises</Text>
            </View>
            <Text style={styles.statusPosted}>Posted</Text>
          </View>
          <View style={styles.workoutRow}>
            <View style={[styles.workoutIcon, styles.iconCardio]}>
              <Text style={styles.workoutEmoji}>🏃</Text>
            </View>
            <View style={styles.workoutMid}>
              <Text style={styles.workoutName}>Morning Run</Text>
              <Text style={styles.workoutMeta}>Yesterday · 34 min · 5.2km</Text>
            </View>
            <Text style={styles.statusPosted}>Posted</Text>
          </View>
          <View style={styles.workoutRow}>
            <View style={[styles.workoutIcon, styles.iconWeights]}>
              <Text style={styles.workoutEmoji}>💪</Text>
            </View>
            <View style={styles.workoutMid}>
              <Text style={styles.workoutName}>Back & Biceps</Text>
              <Text style={styles.workoutMeta}>Mar 21 · 48 min · 5 exercises</Text>
            </View>
            <Text style={styles.statusPrivate}>Private</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BG,
    paddingTop: 55,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  topTitle: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 22,
  },
  gearWrap: {
    padding: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  avatarWrap: {
    position: 'relative',
    marginRight: 14,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 22,
  },
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
  editPencil: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
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
  editPill: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: ACCENT,
  },
  editPillText: {
    color: ACCENT,
    fontSize: 11,
    fontWeight: '800',
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
  statNumAccent: {
    color: ACCENT,
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
    marginBottom: 4,
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
  streakCounterNum: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 18,
  },
  streakCounterLabel: {
    color: '#888888',
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 2,
    lineHeight: 11,
  },
  sectionLabel: {
    ...sectionLabel,
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
  newPrPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#FF4B1F15',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 3,
  },
  newPrPillText: {
    color: ACCENT,
    fontSize: 9,
    fontWeight: '900',
  },
  monthCard: {
    backgroundColor: CARD,
    borderRadius: 14,
    padding: 13,
  },
  monthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#222222',
  },
  monthRowLast: {
    borderBottomWidth: 0,
  },
  monthLeft: {
    color: '#888888',
    fontSize: 12,
    fontWeight: '600',
  },
  monthRight: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
  },
  recentList: {
    gap: 10,
    marginBottom: 8,
  },
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
  iconWeights: {
    backgroundColor: 'rgba(255,75,31,0.22)',
  },
  iconCardio: {
    backgroundColor: 'rgba(29,158,117,0.25)',
  },
  workoutEmoji: {
    fontSize: 16,
  },
  workoutMid: {
    flex: 1,
  },
  workoutName: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
  },
  workoutMeta: {
    color: '#888888',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  statusPosted: {
    color: ACCENT,
    fontSize: 10,
    fontWeight: '900',
  },
  statusPrivate: {
    color: '#444444',
    fontSize: 10,
    fontWeight: '900',
  },
});
