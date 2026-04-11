import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useAuthContext } from '@/contexts/AuthProvider';
import { createPost, getUser, useRestDay as applyRestDay } from '@/lib/firestore';

const BG = '#0D0D0D';
const CARD = '#1A1A1A';
const ACCENT = '#FF4B1F';

export default function PostScreen() {
  const router = useRouter();
  const { user } = useAuthContext();

  const [restDaysLeft, setRestDaysLeft] = useState(2);
  const [userData, setUserData] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const u = await getUser(user.uid);
      setUserData(u);
      setRestDaysLeft(Math.max(0, 2 - (u?.restDaysUsedThisWeek ?? 0)));
    };
    load();
  }, [user]);

  const handleRestDay = useCallback(async () => {
    if (!user) return;
    if (restDaysLeft <= 0) {
      Alert.alert(
        'No rest days left',
        'You have used both rest days this week. Resets every Monday.',
      );
      return;
    }
    setSaving(true);
    try {
      await applyRestDay(user.uid);
      const latest = await getUser(user.uid);
      setUserData(latest);
      await createPost({
        type: 'rest',
        userId: user.uid,
        username: latest?.username ?? '',
        userInitials: latest?.displayName?.slice(0, 2).toUpperCase() ?? '',
        isPublic: true,
        restDayNumber: 2 - restDaysLeft + 1,
      });
      router.push('/(tabs)/' as any);
    } catch {
      Alert.alert('Error', 'Could not post rest day. Try again.');
    } finally {
      setSaving(false);
    }
  }, [user, restDaysLeft, router]);

  const onCancel = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }, [router]);

  const openProgressPhoto = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to pick an image.');
      return;
    }
    await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.85,
    });
  }, []);

  const restBorderStyle =
    restDaysLeft === 1
      ? { borderColor: '#FF4B1F55' as const }
      : restDaysLeft === 0
        ? { borderColor: '#333333', opacity: 0.45 }
        : { borderColor: '#333333' as const };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {/* Top bar */}
        <View style={styles.topBar}>
          <Pressable onPress={onCancel} hitSlop={12} style={styles.topBarSide}>
            <Text style={styles.cancel}>Cancel</Text>
          </Pressable>
          <Text style={styles.title}>New post</Text>
          <View style={styles.topBarSide} />
        </View>

        {/* Streak bar */}
        <View style={styles.streakCard}>
          <Text style={styles.streakEmoji}>🔥</Text>
          <View style={styles.streakMid}>
            <Text style={styles.streakDays}>14 days</Text>
            <Text style={styles.streakSub}>current streak</Text>
          </View>
          <Text style={styles.streakRight}>
            Post today{'\n'}to keep it
          </Text>
        </View>

        {/* WORKOUT */}
        <Text style={styles.sectionLabel}>WORKOUT</Text>

        <View style={styles.grid}>
          <TouchableOpacity
            style={[styles.typeCard, styles.weightsCard]}
            activeOpacity={0.85}
            onPress={() => router.push('/log-workout')}>
            <View style={styles.weightsIconBox}>
              <Text style={styles.weightsEmoji}>💪</Text>
            </View>
            <Text style={styles.cardTitle}>Weights</Text>
            <Text style={styles.cardDesc}>Log exercises, sets, reps and weight</Text>
            <View style={styles.pillOrange}>
              <Text style={styles.pillOrangeText}>⏱ in-app timer</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.typeCard, styles.cardioCard]}
            activeOpacity={0.85}
            onPress={() => router.push('/log-cardio')}>
            <View style={styles.cardioIconBox}>
              <Text style={styles.cardioEmoji}>🏃</Text>
            </View>
            <Text style={styles.cardTitle}>Cardio</Text>
            <Text style={styles.cardDesc}>Run, cycle, swim or any cardio</Text>
            <View style={styles.pillGreen}>
              <Text style={styles.pillGreenText}>📍 GPS tracking</Text>
            </View>
            <View style={styles.chipRow}>
              <Text style={styles.chip}>🏃 Run</Text>
              <Text style={styles.chip}>🚴 Cycle</Text>
              <Text style={styles.chip}>🏊 Swim</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.typeCard}
            activeOpacity={0.85}
            onPress={openProgressPhoto}>
            <View style={styles.photoIconBox}>
              <Text style={styles.photoEmoji}>📸</Text>
            </View>
            <Text style={styles.cardTitle}>Progress photo</Text>
            <Text style={styles.cardDesc}>Upload a photo with caption</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.typeCard}
            activeOpacity={0.85}
            onPress={() => router.push('/log-pr')}>
            <View style={styles.prIconBox}>
              <Text style={styles.prEmoji}>🏆</Text>
            </View>
            <Text style={styles.cardTitle}>New PR</Text>
            <Text style={styles.cardDesc}>Log a personal record lift</Text>
          </TouchableOpacity>
        </View>

        {/* REST DAY */}
        <Text style={[styles.sectionLabel, styles.restSectionLabel]}>REST DAY</Text>

        <TouchableOpacity
          style={[styles.restButton, restBorderStyle]}
          onPress={handleRestDay}
          activeOpacity={restDaysLeft === 0 || saving ? 1 : 0.85}
          disabled={restDaysLeft === 0 || saving}
          accessibilityLabel={
            userData ? `Post rest day, ${restDaysLeft} left` : 'Post rest day'
          }>
          {saving ? (
            <View style={styles.restSavingWrap}>
              <ActivityIndicator color={ACCENT} size="large" />
            </View>
          ) : (
            <>
              <Text style={styles.restEmoji}>💤</Text>
              <View style={styles.restTextCol}>
                <Text style={styles.restTitle}>Post rest day</Text>
                <Text style={styles.restSub}>Keeps your streak alive. Resets every Monday.</Text>
              </View>
              <View style={[styles.counterBox, restDaysLeft === 1 && styles.counterBoxWarn]}>
                <Text
                  style={[
                    styles.counterNum,
                    restDaysLeft === 1 && styles.counterNumOrange,
                    restDaysLeft === 0 && styles.counterNumDisabled,
                  ]}>
                  {restDaysLeft}
                </Text>
                {restDaysLeft === 1 ? (
                  <Text style={styles.useWisely}>use wisely</Text>
                ) : (
                  <Text style={styles.counterLeft}>left</Text>
                )}
              </View>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BG,
    paddingTop: 52,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  topBarSide: {
    width: 72,
  },
  cancel: {
    color: '#555555',
    fontWeight: '800',
    fontSize: 16,
  },
  title: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 18,
  },
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111111',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,75,31,0.3)',
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 22,
  },
  streakEmoji: {
    fontSize: 36,
    marginRight: 12,
  },
  streakMid: {
    flex: 1,
  },
  streakDays: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 26,
  },
  streakSub: {
    color: '#888888',
    fontWeight: '700',
    fontSize: 11,
    marginTop: 2,
  },
  streakRight: {
    color: ACCENT,
    fontWeight: '800',
    fontSize: 11,
    textAlign: 'right',
    lineHeight: 15,
  },
  sectionLabel: {
    color: '#444444',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 10,
  },
  restSectionLabel: {
    marginTop: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  typeCard: {
    width: '48%',
    minWidth: '47%',
    backgroundColor: CARD,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  weightsCard: {
    borderColor: ACCENT,
    borderWidth: 1.5,
  },
  cardioCard: {
    borderColor: '#1D9E75',
    borderWidth: 1.5,
  },
  weightsIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: 'rgba(255,75,31,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  weightsEmoji: {
    fontSize: 22,
  },
  cardioIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: 'rgba(29,158,117,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  cardioEmoji: {
    fontSize: 22,
  },
  photoIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: 'rgba(168,85,247,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  photoEmoji: {
    fontSize: 22,
  },
  prIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: 'rgba(234,179,8,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  prEmoji: {
    fontSize: 22,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 15,
    marginBottom: 4,
  },
  cardDesc: {
    color: '#888888',
    fontWeight: '700',
    fontSize: 11,
    lineHeight: 15,
    marginBottom: 10,
  },
  pillOrange: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,75,31,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pillOrangeText: {
    color: ACCENT,
    fontWeight: '900',
    fontSize: 11,
  },
  pillGreen: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(29,158,117,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 8,
  },
  pillGreenText: {
    color: '#1D9E75',
    fontWeight: '900',
    fontSize: 11,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    color: '#AAAAAA',
    fontWeight: '800',
    fontSize: 10,
    backgroundColor: 'rgba(29,158,117,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  restButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: CARD,
    marginTop: 4,
  },
  restEmoji: {
    fontSize: 28,
    marginRight: 10,
  },
  restTextCol: {
    flex: 1,
  },
  restTitle: {
    color: '#888888',
    fontWeight: '900',
    fontSize: 15,
  },
  restSub: {
    color: '#444444',
    fontWeight: '700',
    fontSize: 11,
    marginTop: 4,
    lineHeight: 15,
  },
  counterBox: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#222222',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 52,
  },
  counterBoxWarn: {
    borderWidth: 1,
    borderColor: 'rgba(255,75,31,0.35)',
  },
  counterNum: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 22,
  },
  counterNumOrange: {
    color: ACCENT,
  },
  counterNumDisabled: {
    color: '#444444',
  },
  counterLeft: {
    color: '#888888',
    fontWeight: '800',
    fontSize: 9,
    marginTop: 2,
  },
  useWisely: {
    color: ACCENT,
    fontWeight: '800',
    fontSize: 8,
    marginTop: 2,
    textAlign: 'center',
  },
  restSavingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    minHeight: 56,
  },
});
