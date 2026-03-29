import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDxBy6gK2ScARaCupZbrcoYbIQg0ztJlPc",
  authDomain: "fitness-app-63e3e.firebaseapp.com",
  projectId: "fitness-app-63e3e",
  storageBucket: "fitness-app-63e3e.firebasestorage.app",
  messagingSenderId: "485166450737",
  appId: "1:485166450737:web:79ac2bfea5640be7c9ad10"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);