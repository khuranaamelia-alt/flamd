import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { Link } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/useAuth';

function getFirebaseErrorMessage(error: unknown) {
  const code = (error as { code?: string })?.code;
  switch (code) {
    case 'auth/invalid-email':
      return 'Please enter a valid email.';
    case 'auth/user-not-found':
      return 'No account found for this email.';
    case 'auth/wrong-password':
      return 'Incorrect password.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later.';
    default:
      return 'Login failed. Please try again.';
  }
}

export default function LoginScreen() {
  const { signIn } = useAuth();
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
      await signIn(email, password);
    } catch (e) {
      setError(getFirebaseErrorMessage(e));
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
          Log in
        </ThemedText>

        <ThemedText style={styles.subtitle}>Welcome back. Please sign in.</ThemedText>

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
            <ThemedText style={styles.buttonText}>Sign in</ThemedText>
          )}
        </TouchableOpacity>

        <ThemedView style={styles.footerContainer}>
          <ThemedText style={styles.footerText}>Don&apos;t have an account?</ThemedText>
          <Link href={'/signup' as any} style={styles.link}>
            <ThemedText style={styles.linkText}>Sign up</ThemedText>
          </Link>
        </ThemedView>
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
    textAlign: 'center',
    opacity: 0.95,
  },
  footerContainer: {
    marginTop: 8,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  link: {
    alignSelf: 'center',
  },
  linkText: {
    color: '#0a7ea4',
    fontWeight: '700',
  },
});

