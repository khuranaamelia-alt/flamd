import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
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

type SetRow = { kg: string; reps: string; done: boolean };
type Exercise = { id: string; name: string; sets: SetRow[] };

const BG = '#0D0D0D';
const CARD = '#1A1A1A';
const ACCENT = '#FF4B1F';
const BORDER = '#2a2a2a';

const EXERCISE_EMOJIS = ['🏋️', '💪'];

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function LogWorkoutScreen() {
  const router = useRouter();
  const { user } = useAuthContext();

  const [workoutName, setWorkoutName] = useState('');
  const [exercises, setExercises] = useState<Exercise[]>([
    { id: '1', name: '', sets: [{ kg: '', reps: '', done: false }] },
  ]);
  const [postToFeed, setPostToFeed] = useState(true);
  const [saving, setSaving] = useState(false);
  const [parsingVoice, setParsingVoice] = useState(false);
  const [voiceSuccess, setVoiceSuccess] = useState(false);
  const [parseModalOpen, setParseModalOpen] = useState(false);
  const [workoutDescription, setWorkoutDescription] = useState('');

  const [addExerciseOpen, setAddExerciseOpen] = useState(false);
  const [addExerciseName, setAddExerciseName] = useState('');
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

  const hasCompletedSets = useMemo(
    () => exercises.some((ex) => ex.sets.some((s) => s.done)),
    [exercises],
  );

  const updateExercise = useCallback((id: string, fn: (ex: Exercise) => Exercise) => {
    setExercises((prev) => prev.map((ex) => (ex.id === id ? fn(ex) : ex)));
  }, []);

  const deleteExercise = useCallback((id: string) => {
    setExercises((prev) => {
      const next = prev.filter((ex) => ex.id !== id);
      return next.length > 0 ? next : [{ id: newId(), name: '', sets: [{ kg: '', reps: '', done: false }] }];
    });
  }, []);

  const openExerciseMenu = useCallback(
    (id: string) => {
      Alert.alert('Exercise', undefined, [
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteExercise(id),
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
    },
    [deleteExercise],
  );

  const addSet = useCallback((exerciseId: string) => {
    updateExercise(exerciseId, (ex) => ({
      ...ex,
      sets: [...ex.sets, { kg: '', reps: '', done: false }],
    }));
  }, [updateExercise]);

  const toggleSetDone = useCallback(
    (exerciseId: string, setIndex: number) => {
      updateExercise(exerciseId, (ex) => {
        const sets = ex.sets.map((s, i) =>
          i === setIndex ? { ...s, done: !s.done } : s,
        );
        return { ...ex, sets };
      });
    },
    [updateExercise],
  );

  const updateSetField = useCallback(
    (exerciseId: string, setIndex: number, field: 'kg' | 'reps', value: string) => {
      updateExercise(exerciseId, (ex) => {
        const sets = ex.sets.map((s, i) =>
          i === setIndex ? { ...s, [field]: value } : s,
        );
        return { ...ex, sets };
      });
    },
    [updateExercise],
  );

  const openAddExercise = useCallback(() => {
    setAddExerciseName('');
    setAddExerciseOpen(true);
  }, []);

  const confirmAddExercise = useCallback(() => {
    const name = addExerciseName.trim();
    if (!name) {
      Alert.alert('Exercise name', 'Enter a name for the exercise.');
      return;
    }
    setExercises((prev) => [
      ...prev,
      {
        id: newId(),
        name,
        sets: [{ kg: '', reps: '', done: false }],
      },
    ]);
    setAddExerciseOpen(false);
    setAddExerciseName('');
  }, [addExerciseName]);

  const parseWorkoutWithAI = useCallback(async (spokenText: string) => {
    setParsingVoice(true);
    try {
      const preprocessSpeech = (text: string): string => {
        return text
          // Fix common speech-to-text mistakes
          .replace(/wraps/gi, 'reps')
          .replace(/wrap/gi, 'rep')
          .replace(/sets of raps/gi, 'sets reps')
          // Convert word numbers to digits
          .replace(/\bone\b/gi, '1')
          .replace(/\btwo\b/gi, '2')
          .replace(/\bthree\b/gi, '3')
          .replace(/\bfour\b/gi, '4')
          .replace(/\bfive\b/gi, '5')
          .replace(/\bsix\b/gi, '6')
          .replace(/\bseven\b/gi, '7')
          .replace(/\beight\b/gi, '8')
          .replace(/\bnine\b/gi, '9')
          .replace(/\bten\b/gi, '10')
          .replace(/\beleven\b/gi, '11')
          .replace(/\btwelve\b/gi, '12')
          .replace(/\bthirteen\b/gi, '13')
          .replace(/\bfourteen\b/gi, '14')
          .replace(/\bfifteen\b/gi, '15')
          .replace(/\bsixteen\b/gi, '16')
          .replace(/\bseventeen\b/gi, '17')
          .replace(/\beighteen\b/gi, '18')
          .replace(/\bnineteen\b/gi, '19')
          .replace(/\btwenty\b/gi, '20')
          .replace(/\bthirty\b/gi, '30')
          .replace(/\bforty\b/gi, '40')
          .replace(/\bfifty\b/gi, '50')
          .replace(/\bsixty\b/gi, '60')
          .replace(/\bseventy\b/gi, '70')
          .replace(/\beighty\b/gi, '80')
          .replace(/\bninety\b/gi, '90')
          .replace(/\bone hundred\b/gi, '100')
          .replace(/\bone twenty\b/gi, '120')
          .replace(/\bone fifty\b/gi, '150')
          .replace(/\btwo hundred\b/gi, '200')
          // Fix kilos/kilograms
          .replace(/kilograms/gi, 'kg')
          .replace(/kilos/gi, 'kg')
          .replace(/kilo/gi, 'kg')
          .replace(/pounds/gi, 'lbs');
      };

      const processedText = preprocessSpeech(spokenText);
      console.log('Processed text:', processedText);
      console.log('API key exists:', !!process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY);
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1000,
          messages: [
            {
              role: 'user',
              content: `You are an expert fitness AI that converts natural spoken workout descriptions into structured data. People speak casually and inconsistently - your job is to understand their intent no matter how they phrase it.

Input: "${processedText}"

Examples of what people might say and how to parse them:
- 'did bench today, 4 sets, started at 80 went up to 100, all 8 reps' -> bench press, 4 sets varying weights
- 'chest and tris, bench was 100 for like 5 sets of 8, then some tricep pushdowns 3 sets 12 reps 35 kilos' -> two exercises
- 'squat 5x5 at 120' -> squat, 5 sets of 5 reps at 120kg
- 'did legs, squats 4 sets then rdl 3 sets 80kg 10 reps, finished with leg press' -> 3 exercises
- 'bench press hundred kg eight reps four sets' -> bench press 4 sets 100kg 8 reps
- 'pullups 3 sets to failure' -> pullups 3 sets, reps empty
- 'morning workout - overhead press 60kg 4x8, lateral raises 15kg 3x12, face pulls 3x15' -> 3 exercises

Rules:
- NxM format means N sets of M reps (e.g. 4x8 = 4 sets 8 reps, 5x5 = 5 sets 5 reps)
- If someone says 'to failure' or doesn't mention reps, use empty string for reps
- If no weight mentioned, use empty string for kg
- Understand common exercise nicknames: OHP = overhead press, RDL = romanian deadlift, DB = dumbbell, BB = barbell
- If weight varies across sets (e.g. 'went up from 80 to 100') create sets with different weights
- Extract a workout name if mentioned (e.g. 'chest day', 'leg day', 'push day')
- If someone mentions just an exercise with no sets/reps, create 1 empty set for it
- All weights should be in kg - if someone says pounds convert to kg (divide by 2.2)
- Mark all sets as done: true
- The input has already been preprocessed to convert word numbers to digits and fix common speech errors. Parse it as accurately as possible.

Return ONLY a raw JSON object, no markdown, no backticks, no explanation:
{
  "workoutName": "extracted name or empty string",
  "exercises": [
    {
      "name": "full exercise name",
      "sets": [
        { "kg": "weight as string", "reps": "reps as string", "done": true }
      ]
    }
  ]
}`,
            },
          ],
        }),
      });
      const data = (await response.json()) as { content?: { text?: string }[] };
      console.log('API status:', response.status);
      console.log('API response:', JSON.stringify(data));
      const raw = data.content?.[0]?.text ?? '';
      console.log('Raw text:', raw);
      const clean = raw
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();
      const parsed = JSON.parse(clean) as {
        workoutName?: string;
        exercises?: { name?: string; sets?: { kg?: string; reps?: string; done?: boolean }[] }[];
      };

      if (parsed.workoutName) setWorkoutName(parsed.workoutName);
      if (parsed.exercises?.length) {
        setExercises(
          parsed.exercises.map((ex, i) => ({
            id: String(i + 1),
            name: ex.name ?? '',
            sets:
              ex.sets?.length
                ? ex.sets.map((s) => ({
                    kg: s.kg ?? '',
                    reps: s.reps ?? '',
                    done: s.done ?? true,
                  }))
                : [{ kg: '', reps: '', done: true }],
          })),
        );
        setParseModalOpen(false);
        setWorkoutDescription('');
        setVoiceSuccess(true);
        if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
        successTimeoutRef.current = setTimeout(() => {
          setVoiceSuccess(false);
        }, 3000);
      }
    } catch {
      Alert.alert(
        'Could not parse workout',
        'Try a clearer description or add exercises manually',
      );
    } finally {
      setParsingVoice(false);
    }
  }, []);

  const handleParseWorkoutFromModal = useCallback(() => {
    const t = workoutDescription.trim();
    if (!t) {
      Alert.alert('', 'Describe your workout first.');
      return;
    }
    void parseWorkoutWithAI(t);
  }, [workoutDescription, parseWorkoutWithAI]);

  const finishWorkout = useCallback(async () => {
    if (!user) return;

    if (!hasCompletedSets) {
      Alert.alert('', 'Add at least one completed set');
      return;
    }

    const freshUser = await getUser(user.uid);
    setSaving(true);
    try {
      await createPost({
        userId: user.uid,
        type: 'workout',
        workoutName: workoutName.trim() || 'Workout',
        exercises,
        isPublic: postToFeed,
        username: freshUser?.username ?? '',
        userInitials: freshUser?.displayName?.slice(0, 2).toUpperCase() ?? '',
        authorStreak: (freshUser?.currentStreak ?? 0) + 1,
      });

      await updateStreak(user.uid);
      await updateUser(user.uid, { totalWorkouts: increment(1) });

      router.replace('/(tabs)/' as any);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  }, [
    user,
    hasCompletedSets,
    workoutName,
    exercises,
    postToFeed,
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
        {/* Top bar */}
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <Text style={styles.backText}>‹ Back</Text>
            </Pressable>
          </View>
          <View style={styles.topBarCenter}>
            <Text style={styles.topTitle}>Log workout</Text>
          </View>
          <View style={styles.topBarRight}>
            <Pressable
              onPress={() => setParseModalOpen(true)}
              hitSlop={10}
              style={[styles.micBtn, styles.micBtnOff]}>
              <Text style={styles.micIcon}>🎤</Text>
            </Pressable>
          </View>
        </View>
        {parsingVoice ? (
          <View style={styles.voiceBannerParsing}>
            <ActivityIndicator color="#FFFFFF" size="small" />
            <Text style={styles.voiceBannerText}>⚡ Reading your workout...</Text>
          </View>
        ) : null}
        {voiceSuccess ? (
          <View style={styles.voiceBannerSuccess}>
            <Text style={styles.voiceBannerText}>✅ Workout logged — review and finish</Text>
          </View>
        ) : null}

        <TextInput
          value={workoutName}
          onChangeText={setWorkoutName}
          placeholder="Name this workout..."
          placeholderTextColor="#333333"
          style={styles.workoutNameInput}
        />

        {exercises.map((ex, exIdx) => (
          <View key={ex.id} style={styles.exerciseCard}>
            <View style={styles.exerciseHeader}>
              <Text style={styles.exerciseEmoji}>{EXERCISE_EMOJIS[exIdx % EXERCISE_EMOJIS.length]}</Text>
              <TextInput
                value={ex.name}
                onChangeText={(t) =>
                  updateExercise(ex.id, (e) => ({ ...e, name: t }))
                }
                placeholder="Exercise name"
                placeholderTextColor="#555555"
                style={styles.exerciseNameInput}
              />
              <Pressable onPress={() => openExerciseMenu(ex.id)} hitSlop={12}>
                <Text style={styles.ellipsis}>···</Text>
              </Pressable>
            </View>

            <View style={styles.colHeaderRow}>
              <Text style={styles.colHeader}>Set</Text>
              <Text style={[styles.colHeader, styles.colKg]}>kg</Text>
              <Text style={[styles.colHeader, styles.colReps]}>Reps</Text>
              <Text style={[styles.colHeader, styles.colDone]}>Done</Text>
            </View>

            {ex.sets.map((set, si) => (
              <View
                key={`${ex.id}-set-${si}`}
                style={[styles.setRow, set.done && styles.setRowDone]}>
                <Text style={styles.setNum}>{si + 1}</Text>
                <TextInput
                  value={set.kg}
                  onChangeText={(v) => updateSetField(ex.id, si, 'kg', v)}
                  placeholder="kg"
                  placeholderTextColor="#555555"
                  keyboardType="decimal-pad"
                  editable={!set.done}
                  style={[
                    styles.setInput,
                    styles.setInputKg,
                    set.done && styles.setInputDone,
                  ]}
                />
                <TextInput
                  value={set.reps}
                  onChangeText={(v) => updateSetField(ex.id, si, 'reps', v)}
                  placeholder="reps"
                  placeholderTextColor="#555555"
                  keyboardType="number-pad"
                  editable={!set.done}
                  style={[
                    styles.setInput,
                    styles.setInputReps,
                    set.done && styles.setInputDone,
                  ]}
                />
                <Pressable
                  onPress={() => toggleSetDone(ex.id, si)}
                  style={styles.doneBtn}
                  hitSlop={8}>
                  <View style={[styles.doneCircle, set.done && styles.doneCircleOn]}>
                    {set.done ? <Text style={styles.checkMark}>✓</Text> : null}
                  </View>
                </Pressable>
              </View>
            ))}

            <Pressable onPress={() => addSet(ex.id)} style={styles.addSetBtn}>
              <Text style={styles.addSetText}>+ Add set</Text>
            </Pressable>
          </View>
        ))}

        <Pressable style={styles.addExerciseOuter} onPress={openAddExercise}>
          <Text style={styles.addExerciseText}>+ Add exercise</Text>
        </Pressable>

        <View style={styles.feedCard}>
          <Text style={styles.feedEmoji}>📢</Text>
          <View style={styles.feedTextCol}>
            <Text style={styles.feedTitle}>Post to feed</Text>
            <Text style={styles.feedSub}>Friends will see this workout</Text>
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
          style={[styles.finishBig, saving && { opacity: 0.85 }]}
          onPress={finishWorkout}
          disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.finishBigText}>🔥 Finish workout</Text>
          )}
        </Pressable>
      </ScrollView>

      <Modal visible={addExerciseOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New exercise</Text>
            <TextInput
              value={addExerciseName}
              onChangeText={setAddExerciseName}
              placeholder="Exercise name"
              placeholderTextColor="#666666"
              autoFocus
              style={styles.modalInput}
            />
            <View style={styles.modalActions}>
              <Pressable onPress={() => setAddExerciseOpen(false)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </Pressable>
              <Pressable onPress={confirmAddExercise}>
                <Text style={styles.modalAdd}>Add</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={parseModalOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.parseModalCard}>
            <Text style={styles.modalTitle}>Describe workout</Text>
            <TextInput
              value={workoutDescription}
              onChangeText={setWorkoutDescription}
              placeholder="Describe your workout... e.g. bench press 4 sets 100kg 8 reps, squat 3 sets 80kg 10 reps"
              placeholderTextColor="#666666"
              multiline
              textAlignVertical="top"
              editable={!parsingVoice}
              style={styles.parseModalInput}
            />
            <Pressable
              style={[styles.parseModalPrimary, parsingVoice && styles.parseModalPrimaryDisabled]}
              onPress={handleParseWorkoutFromModal}
              disabled={parsingVoice}>
              {parsingVoice ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.parseModalPrimaryText}>Parse workout</Text>
              )}
            </Pressable>
            <Pressable
              style={styles.parseModalCancelWrap}
              onPress={() => {
                setParseModalOpen(false);
                setWorkoutDescription('');
              }}
              disabled={parsingVoice}>
              <Text style={styles.parseModalCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
    marginBottom: 16,
  },
  topBarLeft: {
    flex: 1,
    alignItems: 'flex-start',
  },
  topBarCenter: {
    flex: 2,
    alignItems: 'center',
  },
  topBarRight: {
    flex: 1,
    alignItems: 'flex-end',
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
    textAlign: 'center',
  },
  micBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micBtnOff: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
  },
  micIcon: {
    fontSize: 18,
  },
  voiceBannerParsing: {
    backgroundColor: CARD,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: BORDER,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  voiceBannerSuccess: {
    backgroundColor: 'rgba(29,158,117,0.25)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(29,158,117,0.5)',
  },
  voiceBannerText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  parseModalCard: {
    backgroundColor: CARD,
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: BORDER,
    width: '100%',
    maxWidth: 420,
  },
  parseModalInput: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
    minHeight: 160,
    marginBottom: 14,
  },
  parseModalPrimary: {
    backgroundColor: ACCENT,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  parseModalPrimaryDisabled: {
    opacity: 0.7,
  },
  parseModalPrimaryText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 16,
  },
  parseModalCancelWrap: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  parseModalCancelText: {
    color: '#888888',
    fontWeight: '800',
    fontSize: 16,
  },
  workoutNameInput: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingVertical: 10,
    marginBottom: 18,
    backgroundColor: 'transparent',
  },
  exerciseCard: {
    backgroundColor: CARD,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 12,
    marginBottom: 12,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  exerciseEmoji: {
    fontSize: 22,
  },
  exerciseNameInput: {
    flex: 1,
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 16,
    paddingVertical: 4,
  },
  ellipsis: {
    color: '#888888',
    fontSize: 20,
    fontWeight: '900',
    paddingHorizontal: 4,
  },
  colHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingRight: 4,
  },
  colHeader: {
    color: '#888888',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  colKg: { flex: 1, marginLeft: 8 },
  colReps: { flex: 1 },
  colDone: { width: 44, textAlign: 'center' },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  setRowDone: {
    backgroundColor: 'rgba(255,75,31,0.06)',
  },
  setNum: {
    width: 28,
    color: ACCENT,
    fontWeight: '900',
    fontSize: 15,
  },
  setInput: {
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
    borderWidth: 1,
    borderColor: BORDER,
  },
  setInputKg: {
    flex: 1,
    marginRight: 8,
  },
  setInputReps: {
    flex: 1,
    marginRight: 8,
  },
  setInputDone: {
    backgroundColor: '#2a2a2a',
    color: '#FFFFFF',
  },
  doneBtn: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#444444',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  doneCircleOn: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  checkMark: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
  },
  addSetBtn: {
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  addSetText: {
    color: ACCENT,
    fontWeight: '900',
    fontSize: 14,
  },
  addExerciseOuter: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: BORDER,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: BG,
  },
  addExerciseText: {
    color: '#888888',
    fontWeight: '800',
    fontSize: 15,
  },
  feedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    marginBottom: 16,
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
  finishBig: {
    backgroundColor: ACCENT,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  finishBigText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 15,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: CARD,
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: BORDER,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 17,
    marginBottom: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 20,
  },
  modalCancel: {
    color: '#888888',
    fontWeight: '800',
    fontSize: 16,
  },
  modalAdd: {
    color: ACCENT,
    fontWeight: '900',
    fontSize: 16,
  },
});
