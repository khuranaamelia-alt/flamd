import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';

import { auth } from '@/lib/firebase';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOutUser: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let didResolve = false;

    // Safety fallback: if the auth state listener never fires for some reason,
    // don't leave the app in an indefinite loading state.
    const timeoutMs = 10000;
    const timeoutId = setTimeout(() => {
      if (didResolve) return;
      didResolve = true;
      console.log('[AuthProvider] onAuthStateChanged timeout; proceeding without auth state');
      setLoading(false);
    }, timeoutMs);

    console.log('[AuthProvider] subscribing to onAuthStateChanged');
    try {
      const unsubscribe = onAuthStateChanged(
        auth,
        (firebaseUser) => {
          console.log(
            '[AuthProvider] onAuthStateChanged fired:',
            firebaseUser ? { uid: firebaseUser.uid } : null
          );
          didResolve = true;
          setUser(firebaseUser);
          setLoading(false);
          clearTimeout(timeoutId);
        },
        (error) => {
          console.log('[AuthProvider] onAuthStateChanged error:', error);
          didResolve = true;
          setLoading(false);
          clearTimeout(timeoutId);
        }
      );

      return () => {
        clearTimeout(timeoutId);
        unsubscribe();
      };
    } catch (e) {
      console.log('[AuthProvider] onAuthStateChanged subscription failed:', e);
      didResolve = true;
      setLoading(false);
      clearTimeout(timeoutId);
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
  }, []);

  const signOutUser = useCallback(async () => {
    await signOut(auth);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      signIn,
      signUp,
      signOutUser,
    }),
    [user, loading, signIn, signUp, signOutUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return ctx;
}

