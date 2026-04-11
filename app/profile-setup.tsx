import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';

import { collection, doc, getDoc, getDocs, limit, query, serverTimestamp, setDoc, where } from 'firebase/firestore';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/hooks/useAuth';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { uploadToCloudinary } from '@/lib/cloudinaryUpload';
import { db } from '@/lib/firebase';

function normalizeUsername(input: string) {
  // Case-insensitive uniqueness: store + check lowercase.
  return input.trim().toLowerCase();
}

export default function ProfileSetupScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const scheme = useColorScheme() ?? 'light';

  const [checkingProfile, setCheckingProfile] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');

  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const ui = useMemo(() => {
    return {
      inputTextColor: scheme === 'dark' ? '#ECEDEE' : '#11181C',
      placeholderTextColor: scheme === 'dark' ? '#9BA1A6' : '#687076',
      inputBackground: scheme === 'dark' ? '#1b1d20' : '#ffffff',
      inputBorder: scheme === 'dark' ? '#2A2D30' : '#D7DDE0',
    };
  }, [scheme]);

  useEffect(() => {
    (async () => {
      // If somehow unauthenticated, send back to login.
      if (!user) {
        router.replace('/login' as any);
        return;
      }

      try {
        setCheckingProfile(true);
        const existing = await getDoc(doc(db, 'users', user.uid));
        if (existing.exists()) {
          // Returning user: skip setup.
          router.replace('/(tabs)' as any);
          return;
        }
      } finally {
        setCheckingProfile(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const pickAvatar = async () => {
    setError(null);
    setAvatarUploading(false);

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Permission denied: cannot access photo library.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.85,
      exif: false,
    });

    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset?.uri) return;
    setAvatarUri(asset.uri);
  };

  const uploadAvatarAndGetUrl = async () => {
    if (!avatarUri) return '';

    setAvatarUploading(true);
    try {
      return await uploadToCloudinary(avatarUri);
    } finally {
      setAvatarUploading(false);
    }
  };

  const onSubmit = async () => {
    if (!user) return;
    setError(null);
    setSubmitting(true);

    try {
      const normalizedUsername = normalizeUsername(username);
      const trimmedDisplayName = displayName.trim();
      const trimmedBio = bio.trim();

      if (!normalizedUsername) throw new Error('Username is required.');
      if (!trimmedDisplayName) throw new Error('Display name is required.');
      if (trimmedBio.length > 100) throw new Error('Bio must be 100 characters or less.');

      // Enforce username uniqueness (case-insensitive by storing lowercase).
      const usernameQuery = query(
        collection(db, 'users'),
        where('username', '==', normalizedUsername),
        limit(1)
      );
      const usernameSnap = await getDocs(usernameQuery);
      if (!usernameSnap.empty) {
        const docData = usernameSnap.docs[0];
        if (docData.id !== user.uid) {
          throw new Error('Username is already taken.');
        }
      }

      // Avatar is optional: if no photo was picked, save an empty string
      // and don't attempt any Storage upload.
      const avatarUrl = avatarUri ? await uploadAvatarAndGetUrl() : '';

      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        username: normalizedUsername,
        displayName: trimmedDisplayName,
        bio: trimmedBio,
        avatarUrl,
        createdAt: serverTimestamp(),
        currentStreak: 0,
        bestStreak: 0,
        restDaysUsedThisWeek: 0,
        totalWorkouts: 0,
        lastPostDate: '',
        weekStartDate: '',
        following: [],
        followers: [],
      });

      router.replace('/(tabs)' as any);
    } catch (e) {
      const msg = (e as { message?: string })?.message ?? String(e);
      console.log('Profile setup error:', msg);
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (checkingProfile) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  if (!user) {
    // Should not happen (redirected in effect), but keeps types safe.
    return <Redirect href="/login" />;
  }

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <ThemedText type="title" style={styles.title}>
            Set up your profile
          </ThemedText>
          <ThemedText style={styles.subtitle}>Just a few details to personalize your experience.</ThemedText>

          <ThemedText style={styles.label}>Username</ThemedText>
          <TextInput
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="e.g. amelia.fit"
            placeholderTextColor={ui.placeholderTextColor}
            style={[
              styles.input,
              {
                color: ui.inputTextColor,
                backgroundColor: ui.inputBackground,
                borderColor: ui.inputBorder,
              },
            ]}
          />

          <ThemedText style={styles.label}>Display name</ThemedText>
          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="e.g. Amelia"
            placeholderTextColor={ui.placeholderTextColor}
            style={[
              styles.input,
              {
                color: ui.inputTextColor,
                backgroundColor: ui.inputBackground,
                borderColor: ui.inputBorder,
              },
            ]}
          />

          <ThemedText style={styles.label}>
            Bio <ThemedText style={styles.charCount}>{bio.length}/100</ThemedText>
          </ThemedText>
          <TextInput
            value={bio}
            onChangeText={setBio}
            placeholder="A short bio (max 100 characters)"
            placeholderTextColor={ui.placeholderTextColor}
            style={[
              styles.input,
              {
                color: ui.inputTextColor,
                backgroundColor: ui.inputBackground,
                borderColor: ui.inputBorder,
              },
            ]}
            maxLength={100}
          />

          <ThemedText style={styles.label}>Profile photo</ThemedText>
          <TouchableOpacity style={styles.avatarButton} onPress={pickAvatar} disabled={avatarUploading}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarPreview} />
            ) : (
              <ThemedView style={styles.avatarPlaceholder}>
                <ThemedText style={styles.avatarPlaceholderText}>Pick photo</ThemedText>
              </ThemedView>
            )}
          </TouchableOpacity>

          {!!error && <ThemedText style={styles.errorText}>{error}</ThemedText>}

          <TouchableOpacity
            style={[styles.button, { opacity: submitting ? 0.7 : 1 }]}
            onPress={onSubmit}
            disabled={submitting || avatarUploading}>
            {submitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <ThemedText style={styles.buttonText}>Save profile</ThemedText>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 40,
    alignItems: 'center',
    gap: 12,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    opacity: 0.9,
  },
  label: {
    alignSelf: 'stretch',
    marginTop: 10,
    fontWeight: '600',
    marginBottom: -2,
  },
  charCount: {
    fontWeight: '600',
    opacity: 0.8,
    fontSize: 14,
  },
  input: {
    width: '100%',
    alignSelf: 'stretch',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  avatarButton: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 12,
    borderColor: 'transparent',
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingVertical: 14,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholderText: {
    opacity: 0.9,
    fontWeight: '600',
  },
  avatarPreview: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  errorText: {
    marginTop: 4,
    textAlign: 'center',
    color: '#ff6b6b',
  },
  button: {
    marginTop: 6,
    width: '100%',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0a7ea4',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});

