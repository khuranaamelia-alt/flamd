import { Redirect, Stack } from 'expo-router';
import React from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/hooks/useAuth';

export default function AuthLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  if (user) {
    return <Redirect href="/" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

