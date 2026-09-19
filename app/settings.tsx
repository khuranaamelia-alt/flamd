import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';

import { Text } from '@/components/ui/text';
import { useAuthContext } from '@/contexts/AuthProvider';

export const options = { headerShown: false };

const BG = '#0D0D0D';
const CARD = '#1A1A1A';
const ACCENT = '#FF4B1F';
const BORDER = '#2a2a2a';

function SettingRow({
  icon,
  label,
  sublabel,
  onPress,
  right,
  danger,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  sublabel?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && onPress ? styles.rowPressed : null]}
      onPress={onPress}
      disabled={!onPress && !right}>
      <View style={[styles.rowIconWrap, danger ? styles.rowIconDanger : styles.rowIconDefault]}>
        <MaterialIcons name={icon} size={18} color={danger ? '#FF4B1F' : '#FFFFFF'} />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, danger ? styles.rowLabelDanger : null]}>{label}</Text>
        {sublabel ? <Text style={styles.rowSublabel}>{sublabel}</Text> : null}
      </View>
      {right ?? (
        onPress ? <MaterialIcons name="chevron-right" size={20} color="#444444" /> : null
      )}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { user, signOutUser } = useAuthContext();
  const [notifications, setNotifications] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          try {
            await signOutUser();
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            Alert.alert('Error', msg);
            setSigningOut(false);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.screen}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
        <Text style={styles.topTitle}>Settings</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Account section */}
        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.card}>
          <View style={styles.accountRow}>
            <View style={styles.accountAvatar}>
              <Text style={styles.accountAvatarText}>
                {user?.email?.slice(0, 2).toUpperCase() ?? 'ME'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.accountEmail}>{user?.email ?? 'Not signed in'}</Text>
              <Text style={styles.accountUid}>UID: {user?.uid?.slice(0, 12) ?? '—'}…</Text>
            </View>
          </View>
        </View>

        {/* Profile section */}
        <Text style={styles.sectionLabel}>Profile</Text>
        <View style={styles.card}>
          <SettingRow
            icon="person"
            label="Edit profile"
            sublabel="Name, bio, photo"
            onPress={() => router.push('/edit-profile' as any)}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="person-add"
            label="Find friends"
            sublabel="Search by username"
            onPress={() => router.push('/search' as any)}
          />
        </View>

        {/* Notifications section */}
        <Text style={styles.sectionLabel}>Notifications</Text>
        <View style={styles.card}>
          <SettingRow
            icon="notifications"
            label="Push notifications"
            sublabel="Get Flamd alerts and streak reminders"
            right={
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ false: '#333333', true: ACCENT }}
                thumbColor="#FFFFFF"
                ios_backgroundColor="#333333"
              />
            }
          />
        </View>

        {/* Privacy section */}
        <Text style={styles.sectionLabel}>Privacy</Text>
        <View style={styles.card}>
          <SettingRow
            icon="lock"
            label="Account privacy"
            sublabel="Public — anyone can find you"
          />
        </View>

        {/* About section */}
        <Text style={styles.sectionLabel}>About</Text>
        <View style={styles.card}>
          <SettingRow
            icon="info"
            label="App version"
            sublabel="1.0.0 (MVP)"
          />
          <View style={styles.divider} />
          <SettingRow
            icon="shield"
            label="Privacy policy"
            sublabel="flamd.app/privacy"
          />
          <View style={styles.divider} />
          <SettingRow
            icon="description"
            label="Terms of service"
            sublabel="flamd.app/terms"
          />
        </View>

        {/* Sign out */}
        <Text style={styles.sectionLabel}>Account actions</Text>
        <View style={styles.card}>
          <Pressable
            style={({ pressed }) => [styles.signOutRow, pressed ? styles.rowPressed : null]}
            onPress={handleSignOut}
            disabled={signingOut}>
            {signingOut ? (
              <ActivityIndicator color={ACCENT} size="small" />
            ) : (
              <>
                <View style={styles.rowIconDanger}>
                  <MaterialIcons name="logout" size={18} color={ACCENT} />
                </View>
                <Text style={styles.signOutText}>Sign out</Text>
              </>
            )}
          </Pressable>
        </View>

        <Text style={styles.footer}>🔥 Flamd · Built for the gym generation</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG, paddingTop: 55 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  backText: { color: '#555555', fontWeight: '800', fontSize: 16, width: 48 },
  topTitle: { color: '#FFFFFF', fontWeight: '900', fontSize: 18 },
  scroll: { paddingHorizontal: 16, paddingBottom: 40 },
  sectionLabel: {
    fontSize: 10,
    color: '#444444',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 20,
    fontWeight: '800',
  },
  card: {
    backgroundColor: CARD,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  accountAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountAvatarText: { color: '#FFFFFF', fontWeight: '900', fontSize: 14 },
  accountEmail: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  accountUid: { color: '#555555', fontWeight: '600', fontSize: 11, marginTop: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  rowPressed: { opacity: 0.7 },
  rowIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconDefault: { backgroundColor: '#2a2a2a' },
  rowIconDanger: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255,75,31,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1 },
  rowLabel: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  rowLabelDanger: { color: ACCENT },
  rowSublabel: { color: '#666666', fontWeight: '600', fontSize: 11, marginTop: 2 },
  divider: { height: 1, backgroundColor: BORDER, marginLeft: 58 },
  signOutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
    minHeight: 56,
  },
  signOutText: { color: ACCENT, fontWeight: '900', fontSize: 15 },
  footer: {
    textAlign: 'center',
    color: '#333333',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 28,
  },
});
