import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { increment } from 'firebase/firestore';

import { useAuthContext } from '@/contexts/AuthProvider';
import { createPost, getUser, updateStreak, updateUser } from '@/lib/firestore';

export const options = { headerShown: false };

const BG = '#0D0D0D';
const CARD = '#1A1A1A';
const ACCENT = '#FF4B1F';
const BORDER = '#2a2a2a';

const ACTIVITIES: { emoji: string; name: string }[] = [
  { emoji: '🏃', name: 'Run' },
  { emoji: '🚴', name: 'Cycle' },
  { emoji: '🏊', name: 'Swim' },
  { emoji: '🚶', name: 'Walk' },
  { emoji: '⚽', name: 'Football' },
  { emoji: '🏀', name: 'Basketball' },
  { emoji: '🎾', name: 'Tennis' },
  { emoji: '🏸', name: 'Badminton' },
  { emoji: '🥊', name: 'Boxing' },
  { emoji: '🏇', name: 'Horse Riding' },
  { emoji: '🎱', name: 'Squash' },
  { emoji: '🏋️', name: 'HIIT' },
  { emoji: '🧘', name: 'Yoga' },
  { emoji: '🤸', name: 'Gymnastics' },
  { emoji: '🏐', name: 'Volleyball' },
  { emoji: '🏓', name: 'Table Tennis' },
  { emoji: '🥋', name: 'Martial Arts' },
  { emoji: '🚣', name: 'Rowing' },
  { emoji: '⛷️', name: 'Skiing' },
  { emoji: '🏄', name: 'Surfing' },
  { emoji: '🧗', name: 'Climbing' },
  { emoji: '🤾', name: 'Handball' },
  { emoji: '🏑', name: 'Hockey' },
  { emoji: '🏉', name: 'Rugby' },
  { emoji: '🎿', name: 'Snowboarding' },
  { emoji: '🚵', name: 'Mountain Bike' },
  { emoji: '🤽', name: 'Water Polo' },
  { emoji: '🏌️', name: 'Golf' },
];

const formatTime = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export default function LogCardioScreen() {
  const router = useRouter();
  const { user } = useAuthContext();

  const [selectedActivity, setSelectedActivity] = useState('Run');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [distance, setDistance] = useState('');
  const [notes, setNotes] = useState('');
  const [postToFeed, setPostToFeed] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!user) return;
    getUser(user.uid).then(setUserData);
  }, [user]);

  useEffect(() => {
    return () => {
      if (intervalRef.current != null) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const toggleTimer = () => {
    if (isRunning) {
      if (intervalRef.current != null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setIsRunning(false);
    } else {
      intervalRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
      setIsRunning(true);
    }
  };

  const resetTimer = () => {
    if (intervalRef.current != null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRunning(false);
    setElapsedSeconds(0);
  };

  const finishCardio = useCallback(async () => {
    if (!user) return;
    if (elapsedSeconds < 60) {
      Alert.alert('', 'Session must be at least 1 minute');
      return;
    }
    if (isRunning && intervalRef.current != null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      setIsRunning(false);
    }

    const freshUser = await getUser(user.uid);
    setUserData(freshUser);
    setSaving(true);
    try {
      await createPost({
        type: 'cardio',
        cardioType: selectedActivity,
        duration: elapsedSeconds,
        distance: parseFloat(distance.replace(',', '.')) || 0,
        notes,
        isPublic: postToFeed,
        userId: user.uid,
        username: freshUser?.username ?? '',
        userInitials: freshUser?.displayName?.slice(0, 2).toUpperCase() ?? '',
        authorStreak: (freshUser?.currentStreak ?? 0) + 1,
      });
      await updateStreak(user.uid);
      await updateUser(user.uid, { totalWorkouts: increment(1) });
      router.push('/(tabs)/' as any);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  }, [
    user,
    elapsedSeconds,
    isRunning,
    selectedActivity,
    distance,
    notes,
    postToFeed,
    userData,
    router,
  ]);

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <View style={styles.topBarSide}>
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <Text style={styles.backText}>‹ Back</Text>
            </Pressable>
          </View>
          <View style={styles.topBarCenter}>
            <Text style={styles.topTitle}>Log cardio</Text>
          </View>
          <View style={styles.topBarSide} />
        </View>

        <Text style={styles.sectionLabel}>Activity</Text>
        <View style={styles.pillWrap}>
          {ACTIVITIES.map((a) => {
            const active = selectedActivity === a.name;
            return (
              <Pressable
                key={a.name}
                onPress={() => setSelectedActivity(a.name)}
                style={[styles.pill, active ? styles.pillActive : styles.pillInactive]}>
                <Text style={[styles.pillText, active ? styles.pillTextActive : styles.pillTextInactive]}>
                  {a.emoji} {a.name}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.timerCard}>
          <Text style={styles.timerBig}>{formatTime(elapsedSeconds)}</Text>
          <Text style={styles.timerSub}>Session timer</Text>
          <View style={styles.timerBtns}>
            <Pressable style={styles.btnStart} onPress={toggleTimer}>
              <Text style={styles.btnStartText}>{isRunning ? 'Pause' : 'Start'}</Text>
            </Pressable>
            <Pressable style={styles.btnReset} onPress={resetTimer}>
              <Text style={styles.btnResetText}>Reset</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Distance (optional)</Text>
        <View style={styles.distCard}>
          <TextInput
            value={distance}
            onChangeText={setDistance}
            placeholder="0.0"
            placeholderTextColor="#444444"
            keyboardType="decimal-pad"
            style={styles.distInput}
          />
          <Text style={styles.distKm}>km</Text>
        </View>

        <Text style={styles.sectionLabel}>Notes (optional)</Text>
        <View style={styles.notesCard}>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="How did it feel?"
            placeholderTextColor="#666666"
            multiline
            style={styles.notesInput}
          />
        </View>

        <View style={styles.feedCard}>
          <Text style={styles.feedEmoji}>📢</Text>
          <View style={styles.feedTextCol}>
            <Text style={styles.feedTitle}>Post to feed</Text>
            <Text style={styles.feedSub}>Friends will see this session</Text>
          </View>
          <Switch
            value={postToFeed}
            onValueChange={setPostToFeed}
            trackColor={{ false: '#333333', true: ACCENT }}
            thumbColor="#FFFFFF"
            ios_backgroundColor="#333333"
          />
        </View>

        <Pressable
          style={[styles.finishBtn, saving && styles.finishBtnDisabled]}
          onPress={finishCardio}
          disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.finishBtnText}>🏃 Finish cardio</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
    paddingTop: 50,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  topBarSide: {
    flex: 1,
  },
  topBarCenter: {
    flex: 2,
    alignItems: 'center',
  },
  backText: {
    color: '#555555',
    fontWeight: '800',
    fontSize: 16,
  },
  topTitle: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 17,
  },
  sectionLabel: {
    color: '#888888',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 4,
  },
  pillWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  pill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 99,
    borderWidth: 1,
  },
  pillActive: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  pillInactive: {
    backgroundColor: CARD,
    borderColor: BORDER,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '800',
  },
  pillTextActive: {
    color: '#FFFFFF',
  },
  pillTextInactive: {
    color: '#666666',
  },
  timerCard: {
    backgroundColor: CARD,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  timerBig: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 48,
    letterSpacing: -1,
  },
  timerSub: {
    color: '#888888',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  timerBtns: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    width: '100%',
    justifyContent: 'center',
  },
  btnStart: {
    flex: 1,
    backgroundColor: ACCENT,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnStartText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 15,
  },
  btnReset: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnResetText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  distCard: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    backgroundColor: CARD,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  distInput: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFFFFF',
    minWidth: 100,
    textAlign: 'center',
    paddingVertical: 0,
  },
  distKm: {
    color: '#888888',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },
  notesCard: {
    backgroundColor: CARD,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 12,
    marginBottom: 16,
    minHeight: 80,
  },
  notesInput: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  feedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    marginBottom: 20,
    gap: 12,
  },
  feedEmoji: {
    fontSize: 22,
  },
  feedTextCol: {
    flex: 1,
  },
  feedTitle: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
  },
  feedSub: {
    color: '#888888',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  finishBtn: {
    backgroundColor: ACCENT,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  finishBtnDisabled: {
    opacity: 0.85,
  },
  finishBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 15,
  },
});
