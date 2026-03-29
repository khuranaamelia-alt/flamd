import { getApps, initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, type Auth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

import { firebaseConfig } from './firebaseConfig';

declare const require: any;

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

let auth: Auth;
try {
  // Firebase's `getReactNativePersistence` exists in the React Native build of
  // `@firebase/auth`, but isn't exposed by typings from `firebase/auth`.
  // We load it from the RN bundle at runtime.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rnAuth = require('@firebase/auth/dist/rn/index.js') as any;
  const persistence = rnAuth.getReactNativePersistence(ReactNativeAsyncStorage);
  auth = initializeAuth(app, {
    persistence,
  });
} catch {
  // Fallback for environments where RN persistence isn't available.
  auth = getAuth(app);
}

export { auth };

export const db = getFirestore(app);
export const storage = getStorage(app);

