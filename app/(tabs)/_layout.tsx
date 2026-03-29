import { Redirect, Tabs, usePathname, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import { MaterialIcons } from '@expo/vector-icons';

import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/hooks/useAuth';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { db } from '@/lib/firebase';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();

  const hideTabBar = pathname?.includes('/post');

  const [profileLoading, setProfileLoading] = useState(false);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      if (loading) return;

      if (!user) {
        // No logged-in user => we'll redirect to login.
        // Set hasProfile deterministically so we don't keep the loading spinner.
        setHasProfile(false);
        return;
      }

      setProfileLoading(true);
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        setHasProfile(snap.exists());
      } finally {
        setProfileLoading(false);
      }
    })();
  }, [user, loading]);

  // Only wait for `hasProfile` when we actually have a user.
  if (loading || profileLoading || (user && hasProfile === null)) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  if (!user) {
    return <Redirect href={'/login' as any} />;
  }

  if (!hasProfile) {
    return <Redirect href={'/profile-setup' as any} />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: hideTabBar ? { display: 'none' } : undefined,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <MaterialIcons name="home" size={26} color={color} />,
        }}
      />
      <Tabs.Screen
        name="plus"
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            router.push('/(tabs)/post');
          },
        }}
        options={{
          title: 'Create',
          tabBarLabel: '',
          tabBarIcon: () => (
            <View style={styles.plusIconCircle}>
              <MaterialIcons name="add" size={26} color="#FFFFFF" />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="post"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: 'Leaderboard',
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="emoji-events" size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <MaterialIcons name="person" size={26} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusIconCircle: {
    backgroundColor: '#FF4B1F',
    width: 58,
    height: 58,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
});
