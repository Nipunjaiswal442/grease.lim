import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import type { Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Object.values(firebaseConfig).every((value) => Boolean(value));

let firebaseAuth: Auth | null = null;
let googleProvider: GoogleAuthProvider | null = null;

if (isFirebaseConfigured) {
  try {
    // Re-use the existing app if already initialized (e.g. React StrictMode double-mount)
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    firebaseAuth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
  } catch (e) {
    console.error("[Firebase] Failed to initialise:", e);
  }
}

export const auth = firebaseAuth;

function requireAuth() {
  if (!auth) {
    throw new Error("Firebase Auth is not configured for this deployment. Add the VITE_FIREBASE_* variables in Vercel, then redeploy.");
  }
  return auth;
}

export async function signInWithGoogle() {
  if (!googleProvider) {
    throw new Error("Google sign-in is not configured yet. Add the Firebase VITE_* variables in Vercel, then redeploy.");
  }
  const result = await signInWithPopup(requireAuth(), googleProvider);
  return result.user;
}

export async function signInWithEmail(email: string, password: string) {
  const result = await signInWithEmailAndPassword(requireAuth(), email, password);
  return result.user;
}

export async function registerWithEmail(email: string, password: string) {
  const result = await createUserWithEmailAndPassword(requireAuth(), email, password);
  return result.user;
}

export async function resetPassword(email: string) {
  await sendPasswordResetEmail(requireAuth(), email);
}

export async function signOutUser() {
  await signOut(requireAuth());
}
