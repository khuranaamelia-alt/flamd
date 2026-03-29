import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { Link } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/useAuth';

export default function SignupScreen() {
  const { signUp } = useAuth();
  const scheme = useColorScheme() ?? 'light';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputTextColor = scheme === 'dark' ? '#ECEDEE' : '#11181C';
  const placeholderTextColor = scheme === 'dark' ? '#9BA1A6' : '#687076';
  const inputBackground = scheme === 'dark' ? '#1b1d20' : '#ffffff';
  const inputBorder = scheme === 'dark' ? '#2A2D30' : '#D7DDE0';

  const onSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await signUp(email, password);
    } catch (e) {
      // Show the exact Firebase error message for easier debugging.
      // Example: "Firebase: Error (auth/invalid-email)."
      const firebaseMessage = (e as { message?: string })?.message ?? String(e);
      console.log('Firebase signup error:', firebaseMessage);
      setError(firebaseMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ThemedText type="title" style={styles.title}>
          Sign up
        </ThemedText>

        <ThemedText style={styles.subtitle}>Create your account to get started.</ThemedText>

        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholder="Email"
          placeholderTextColor={placeholderTextColor}
          style={[
            styles.input,
            {
              color: inputTextColor,
              backgroundColor: inputBackground,
              borderColor: inputBorder,
            },
          ]}
        />

        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Password"
          placeholderTextColor={placeholderTextColor}
          style={[
            styles.input,
            {
              color: inputTextColor,
              backgroundColor: inputBackground,
              borderColor: inputBorder,
            },
          ]}
        />

        {!!error && <ThemedText style={styles.errorText}>{error}</ThemedText>}

        <TouchableOpacity
          style={[styles.button, { opacity: submitting ? 0.7 : 1 }]}
          onPress={onSubmit}
          disabled={submitting}>
          {submitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <ThemedText style={styles.buttonText}>Create account</ThemedText>
          )}
        </TouchableOpacity>

        <ThemedText style={styles.footerText}>Already have an account?</ThemedText>
        <Link href={'/login' as any} style={styles.link}>
          <ThemedText style={styles.linkText}>Log in</ThemedText>
        </Link>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  content: {
    width: '100%',
    maxWidth: 420,
    gap: 12,
  },
  title: {
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    opacity: 0.9,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
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
  footerText: {
    marginTop: 8,
    textAlign: 'center',
    opacity: 0.95,
  },
  link: {
    marginTop: 0,
    alignSelf: 'center',
  },
  linkText: {
    color: '#0a7ea4',
    fontWeight: '700',
  },
});

