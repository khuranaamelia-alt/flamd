import { useAuthContext } from '@/contexts/AuthProvider';
import { uploadToCloudinary } from '@/lib/cloudinaryUpload';
import { getUser, isUsernameTakenByOther, updateUser } from '@/lib/firestore';
import { launchImageLibraryAsync, MediaTypeOptions, requestMediaLibraryPermissionsAsync } from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const BG = '#0D0D0D';
const CARD = '#1A1A1A';
const ACCENT = '#FF4B1F';

function initialsFrom(name: string): string {
  const t = name.trim();
  if (t.length >= 2) return t.slice(0, 2).toUpperCase();
  if (t.length === 1) return (t + t).toUpperCase();
  return 'YO';
}

export default function EditProfileScreen() {
  const router = useRouter();
  const { user } = useAuthContext();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const u = await getUser(user.uid);
        if (cancelled || !u) return;
        setDisplayName(u.displayName ?? '');
        setUsername(u.username ?? '');
        setBio(u.bio ?? '');
        setAvatarUrl(u.avatarUrl);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const pickAndUploadPhoto = useCallback(async () => {
    if (!user) return;
    const { status } = await requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo library access to change your photo.');
      return;
    }

    const result = await launchImageLibraryAsync({
      mediaTypes: MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;

    setUploadingPhoto(true);
    try {
      const uri = result.assets[0].uri;
      const url = await uploadToCloudinary(uri);
      setAvatarUrl(url);
      await updateUser(user.uid, { avatarUrl: url });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert('Upload failed', msg);
    } finally {
      setUploadingPhoto(false);
    }
  }, [user]);

  const handleSave = useCallback(async () => {
    if (!user) return;
    const trimmedName = displayName.trim();
    const normalizedUsername = username.trim().toLowerCase();
    const trimmedBio = bio.trim();

    if (!normalizedUsername) {
      Alert.alert('Username required', 'Please enter a username.');
      return;
    }
    if (trimmedBio.length > 100) {
      Alert.alert('Bio too long', 'Bio must be 100 characters or less.');
      return;
    }

    setSaving(true);
    try {
      const taken = await isUsernameTakenByOther(normalizedUsername, user.uid);
      if (taken) {
        Alert.alert('That username is already taken');
        return;
      }

      await updateUser(user.uid, {
        displayName: trimmedName,
        username: normalizedUsername,
        bio: trimmedBio,
        avatarUrl: avatarUrl ?? '',
      });

      Alert.alert('Profile updated!', '', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert('Could not save', msg);
    } finally {
      setSaving(false);
    }
  }, [user, displayName, username, bio, avatarUrl, router]);

  if (loading) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <ActivityIndicator color={ACCENT} size="large" />
      </View>
    );
  }

  const bioLen = bio.length;

  return (
    <KeyboardAvoidingView
      style={styles.screen}
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
            <Text style={styles.topTitle}>Edit profile</Text>
          </View>
          <View style={[styles.topBarSide, styles.topBarRight]}>
            <Pressable onPress={handleSave} hitSlop={12} disabled={saving}>
              <Text style={styles.saveText}>{saving ? '…' : 'Save'}</Text>
            </Pressable>
          </View>
        </View>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarInitials}>{initialsFrom(displayName || username || 'YO')}</Text>
            </View>
          )}
          {uploadingPhoto ? (
            <ActivityIndicator color={ACCENT} style={{ marginTop: 12 }} />
          ) : (
            <Pressable onPress={pickAndUploadPhoto} hitSlop={8}>
              <Text style={styles.changePhoto}>Change photo</Text>
            </Pressable>
          )}
        </View>

        {/* Display name */}
        <Text style={styles.fieldLabel}>Display name</Text>
        <View style={styles.card}>
          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Your name"
            placeholderTextColor="#666666"
            style={styles.input}
            autoCapitalize="words"
          />
        </View>

        {/* Username */}
        <Text style={styles.fieldLabel}>Username</Text>
        <View style={styles.card}>
          <TextInput
            value={username}
            onChangeText={setUsername}
            placeholder="username"
            placeholderTextColor="#666666"
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
        <Text style={styles.hint}>Usernames must be unique</Text>

        {/* Bio */}
        <Text style={styles.fieldLabel}>Bio</Text>
        <View style={styles.card}>
          <TextInput
            value={bio}
            onChangeText={(t) => setBio(t.slice(0, 100))}
            placeholder="Write a short bio"
            placeholderTextColor="#666666"
            style={[styles.input, styles.bioInput]}
            multiline
            maxLength={100}
          />
        </View>
        <Text style={styles.charCount}>{bioLen}/100</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BG,
    paddingTop: 50,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  topBarSide: {
    flex: 1,
  },
  topBarCenter: {
    flex: 2,
    alignItems: 'center',
  },
  topBarRight: {
    alignItems: 'flex-end',
  },
  backText: {
    color: '#888888',
    fontWeight: '800',
    fontSize: 16,
  },
  topTitle: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 17,
  },
  saveText: {
    color: ACCENT,
    fontWeight: '900',
    fontSize: 16,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  avatarPlaceholder: {
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 28,
  },
  changePhoto: {
    color: ACCENT,
    fontWeight: '800',
    fontSize: 15,
    marginTop: 12,
  },
  fieldLabel: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
    marginBottom: 8,
  },
  card: {
    backgroundColor: CARD,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 4,
  },
  input: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: 0,
  },
  bioInput: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  hint: {
    color: '#888888',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 16,
    marginTop: 6,
  },
  charCount: {
    color: '#888888',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
    alignSelf: 'flex-end',
  },
});
