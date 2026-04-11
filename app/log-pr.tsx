import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
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

import { useAuthContext } from '@/contexts/AuthProvider';
import {
  createPost,
  getUser,
  getUserPRs,
  updatePR,
  updateStreak,
} from '@/lib/firestore';

export const options = { headerShown: false };

const BG = '#0D0D0D';
const CARD = '#1A1A1A';
const ACCENT = '#FF4B1F';
const BORDER = '#2a2a2a';

const PRESET_EXERCISES = [
  'Bench Press',
  'Squat',
  'Deadlift',
  'OHP',
  'Pull Up',
  'Row',
  'Shoulder Press',
  'Curl',
];

export default function LogPRScreen() {
  const router = useRouter();
  const { user } = useAuthContext();

  const [selectedExercise, setSelectedExercise] = useState('Bench Press');
  const [customExercise, setCustomExercise] = useState('');
  const [weight, setWeight] = useState('');
  const [postToFeed, setPostToFeed] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingPRs, setExistingPRs] = useState<any[]>([]);
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [prs, u] = await Promise.all([getUserPRs(user.uid), getUser(user.uid)]);
        setExistingPRs(prs);
        setUserData(u);
      } catch (e) {
        console.error('[LogPR] load', e);
      }
    })();
  }, [user]);

  const resolvedExercise = useMemo(() => {
    const c = customExercise.trim();
    return c.length > 0 ? c : selectedExercise;
  }, [customExercise, selectedExercise]);

  const existingPR = useMemo(() => {
    return existingPRs.find((p) => p.exercise === resolvedExercise);
  }, [existingPRs, resolvedExercise]);

  const weightNum = parseFloat(weight.replace(',', '.'));
  const diffPreview = useMemo(() => {
    if (existingPR?.weight == null || !Number.isFinite(weightNum) || weightNum <= 0) {
      return null;
    }
    return weightNum - existingPR.weight;
  }, [existingPR, weightNum]);

  const onSelectPill = (name: string) => {
    setSelectedExercise(name);
    setCustomExercise('');
  };

  const onLogPR = async () => {
    if (!user) return;

    const ex = resolvedExercise.trim();
    if (!ex) {
      Alert.alert('', 'Select or enter an exercise.');
      return;
    }

    const w = parseFloat(weight.replace(',', '.'));
    if (Number.isNaN(w) || w <= 0) {
      Alert.alert('', 'Enter a weight greater than 0.');
      return;
    }

    const previousBest = existingPR?.weight ?? 0;

    setSaving(true);
    try {
      const updated = await updatePR(user.uid, ex, w);
      if (!updated) {
        Alert.alert('', 'New weight must be greater than your current PR.');
        return;
      }

      await createPost({
        userId: user.uid,
        type: 'pr',
        exercise: ex,
        weight: w,
        previousBest,
        isPublic: postToFeed,
        username: userData?.username,
        userInitials: userData?.displayName?.slice(0, 2).toUpperCase() ?? 'YO',
      });

      await updateStreak(user.uid);

      router.replace('/(tabs)/' as any);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <View style={styles.topBarSide}>
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <Text style={styles.backText}>‹ Back</Text>
            </Pressable>
          </View>
          <View style={styles.topBarCenter}>
            <Text style={styles.topTitle}>New PR</Text>
          </View>
          <View style={styles.topBarSide} />
        </View>

        {/* Exercise */}
        <Text style={styles.sectionLabel}>Exercise</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillRow}
          style={styles.pillScroll}>
          {PRESET_EXERCISES.map((name) => {
            const active = !customExercise.trim() && selectedExercise === name;
            return (
              <Pressable
                key={name}
                onPress={() => onSelectPill(name)}
                style={[styles.pill, active ? styles.pillActive : styles.pillInactive]}>
                <Text style={[styles.pillText, active ? styles.pillTextActive : styles.pillTextInactive]}>
                  {name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <TextInput
          value={customExercise}
          onChangeText={setCustomExercise}
          placeholder="Or type a custom exercise..."
          placeholderTextColor="#666666"
          style={styles.customInput}
        />

        {/* Weight */}
        <Text style={styles.sectionLabel}>New PR weight</Text>
        <View style={styles.weightCard}>
          <View style={styles.weightRow}>
            <TextInput
              value={weight}
              onChangeText={setWeight}
              placeholder="0"
              placeholderTextColor="#444444"
              keyboardType="decimal-pad"
              style={styles.weightInput}
            />
            <Text style={styles.kgLabel}>kg</Text>
          </View>
          <View style={styles.prevRow}>
            <Text style={styles.prevGrey}>Previous best: </Text>
            {existingPR?.weight != null ? (
              <Text style={styles.prevOrange}>{existingPR.weight}kg</Text>
            ) : (
              <Text style={styles.prevGrey}>— kg</Text>
            )}
            {diffPreview != null ? (
              <Text style={styles.prevGrey}> · </Text>
            ) : null}
            {diffPreview != null ? (
              <Text style={styles.prevOrange}>
                {diffPreview >= 0 ? '+' : ''}
                {diffPreview % 1 === 0 ? String(diffPreview) : diffPreview.toFixed(1)}kg
              </Text>
            ) : null}
          </View>
        </View>

        {/* Post to feed */}
        <View style={styles.feedCard}>
          <Text style={styles.feedEmoji}>📢</Text>
          <View style={styles.feedTextCol}>
            <Text style={styles.feedTitle}>Post to feed</Text>
            <Text style={styles.feedSub}>Friends will see this PR</Text>
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
          style={[styles.logBtn, saving && styles.logBtnDisabled]}
          onPress={onLogPR}
          disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.logBtnText}>🏆 Log PR</Text>
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
    marginBottom: 20,
  },
  topBarSide: {
    flex: 1,
    minHeight: 24,
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
  },
  pillScroll: {
    marginBottom: 12,
    maxHeight: 44,
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 99,
    borderWidth: 1,
    marginRight: 8,
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
    fontWeight: '900',
    fontSize: 13,
  },
  pillTextActive: {
    color: '#FFFFFF',
  },
  pillTextInactive: {
    color: '#666666',
  },
  customInput: {
    backgroundColor: CARD,
    borderRadius: 12,
    padding: 12,
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
    marginBottom: 22,
  },
  weightCard: {
    backgroundColor: CARD,
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: BORDER,
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 12,
  },
  weightInput: {
    fontSize: 64,
    fontWeight: '900',
    color: '#FFFFFF',
    minWidth: 80,
    textAlign: 'center',
    paddingVertical: 0,
  },
  kgLabel: {
    color: '#888888',
    fontSize: 20,
    fontWeight: '700',
    marginLeft: 6,
  },
  prevRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
  },
  prevGrey: {
    color: '#888888',
    fontSize: 12,
    fontWeight: '600',
  },
  prevOrange: {
    color: ACCENT,
    fontSize: 12,
    fontWeight: '800',
  },
  feedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    marginBottom: 20,
    gap: 12,
  },
  feedEmoji: {
    fontSize: 24,
  },
  feedTextCol: {
    flex: 1,
  },
  feedTitle: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 15,
  },
  feedSub: {
    color: '#888888',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  logBtn: {
    backgroundColor: ACCENT,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logBtnDisabled: {
    opacity: 0.85,
  },
  logBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 15,
  },
});
