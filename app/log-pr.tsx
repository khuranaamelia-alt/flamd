import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export const options = { headerShown: false };

export default function LogPRScreen() {
  const router = useRouter();

  return (
    <View style={styles.screen}>
      <Pressable onPress={() => router.back()} hitSlop={12}>
        <Text style={styles.back}>Back</Text>
      </Pressable>
      <Text style={styles.title}>Log PR</Text>
      <Text style={styles.sub}>Placeholder — connect your PR flow here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0D0D0D',
    paddingTop: 56,
    paddingHorizontal: 20,
  },
  back: {
    color: '#888888',
    fontWeight: '800',
    marginBottom: 24,
  },
  title: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 22,
    marginBottom: 8,
  },
  sub: {
    color: '#666666',
    fontWeight: '600',
    fontSize: 14,
  },
});
