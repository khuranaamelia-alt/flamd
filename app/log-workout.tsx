import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { createPost, getUser, updateStreak, updateUser, type UserDocument } from '@/lib/firestore';

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
  const [userData, setUserData] = useState<UserDocument | null>(null);

  const [workoutName, setWorkoutName] = useState('');
  const [exercises, setExercises] = useState<Exercise[]>([
    { id: '1', name: '', sets: [{ kg: '', reps: '', done: false }] },
  ]);
  const [postToFeed, setPostToFeed] = useState(true);
  const [saving, setSaving] = useState(false);

  const [addExerciseOpen, setAddExerciseOpen] = useState(false);
  const [addExerciseName, setAddExerciseName] = useState('');

  useEffect(() => {
    if (!user) return;
    getUser(user.uid).then(setUserData);
  }, [user]);

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

  const finishWorkout = useCallback(async () => {
    if (!user) return;

    if (!hasCompletedSets) {
      Alert.alert('', 'Add at least one completed set');
      return;
    }

    setSaving(true);
    try {
      const initials =
        userData?.displayName?.trim().slice(0, 2).toUpperCase() ?? 'YO';

      await createPost({
        userId: user.uid,
        type: 'workout',
        workoutName: workoutName.trim() || 'Workout',
        exercises,
        isPublic: postToFeed,
        username: userData?.username ?? '',
        userInitials: initials,
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
              onPress={finishWorkout}
              disabled={!hasCompletedSets || saving}
              hitSlop={12}>
              <Text
                style={[
                  styles.finishHeader,
                  (!hasCompletedSets || saving) && styles.finishHeaderDisabled,
                ]}>
                Finish
              </Text>
            </Pressable>
          </View>
        </View>

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
  finishHeader: {
    color: ACCENT,
    fontWeight: '900',
    fontSize: 16,
    textAlign: 'right',
  },
  finishHeaderDisabled: {
    color: '#555555',
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
