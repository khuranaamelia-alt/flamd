import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function PlusTabScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        +
      </ThemedText>
      <ThemedText style={styles.subtitle}>Create (dummy tab)</ThemedText>
      <TouchableOpacity style={styles.button} onPress={() => {}}>
        <ThemedText style={styles.buttonText}>Coming soon</ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 20 },
  title: { fontWeight: '900' },
  subtitle: { textAlign: 'center', opacity: 0.9 },
  button: {
    marginTop: 14,
    backgroundColor: '#FF4B1F',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
  buttonText: { color: '#FFFFFF', fontWeight: '800' },
});

