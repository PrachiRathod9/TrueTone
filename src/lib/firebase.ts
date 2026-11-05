import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  type User,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  type Firestore,
} from "firebase/firestore";

// Firebase Configuration:
// When configuring in production, set these VITE_FIREBASE_* variables in your .env
// Note: Frontend API keys identify the project, but security is enforced via Firestore Security Rules
// and Firebase Auth tokens. Secret Admin credentials must NEVER be placed here.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyMockKeyForDevelopmentMode-ReplaceInProd",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "truetone.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "truetone",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "truetone.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789012",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123456789012:android:abcdef1234567890",
};

let app: FirebaseApp | undefined;
let auth: ReturnType<typeof getAuth> | undefined;
let db: Firestore | undefined;

export function isFirebaseConfigured(): boolean {
  return Boolean(
    import.meta.env.VITE_FIREBASE_API_KEY &&
    import.meta.env.VITE_FIREBASE_PROJECT_ID &&
    import.meta.env.VITE_FIREBASE_API_KEY !== "AIzaSyMockKeyForDevelopmentMode-ReplaceInProd"
  );
}

export function getFirebaseApp(): FirebaseApp {
  if (!app) {
    app = getApps().length > 0 ? getApps()[0]! : initializeApp(firebaseConfig);
  }
  return app;
}

export function getFirebaseAuth() {
  if (!auth) {
    auth = getAuth(getFirebaseApp());
  }
  return auth;
}

export function getFirebaseDb(): Firestore {
  if (!db) {
    db = getFirestore(getFirebaseApp());
  }
  return db;
}

// -------------------------------------------------------------
// Authentication: Primary Email / Password + Optional Phone OTP
// -------------------------------------------------------------

export async function loginWithEmail(email: string, pass: string): Promise<User> {
  const a = getFirebaseAuth();
  const credential = await signInWithEmailAndPassword(a, email, pass);
  return credential.user;
}

export async function registerWithEmail(email: string, pass: string): Promise<User> {
  const a = getFirebaseAuth();
  const credential = await createUserWithEmailAndPassword(a, email, pass);
  return credential.user;
}

export async function signOutUser(): Promise<void> {
  const a = getFirebaseAuth();
  await fbSignOut(a);
}

export function subscribeToAuth(callback: (user: User | null) => void) {
  const a = getFirebaseAuth();
  return onAuthStateChanged(a, callback);
}

// Phone Auth (Optional method)
export function setupRecaptcha(containerId: string): RecaptchaVerifier {
  const a = getFirebaseAuth();
  return new RecaptchaVerifier(a, containerId, {
    size: "invisible",
  });
}

export async function requestPhoneOtp(
  phoneNumber: string,
  verifier: RecaptchaVerifier
): Promise<ConfirmationResult> {
  const a = getFirebaseAuth();
  return await signInWithPhoneNumber(a, phoneNumber, verifier);
}

// -------------------------------------------------------------
// Firestore: Secure User Profiles and Incident History
// -------------------------------------------------------------

export interface AnalysisRecord {
  id?: string;
  userId: string;
  callerNumber: string;
  callerName?: string;
  timestamp: string | number;
  voiceAuthenticityScore: number; // e.g. 89%
  behaviorRiskScore: number;      // e.g. 80%
  combinedRiskScore: number;      // e.g. 85%
  verdict: "Safe" | "High Risk";
  blocked: boolean;
  behaviorFlags: string[];
  rawAiProbability?: number;      // from Wav2Vec2 model (kathakundra/truetone-voice-model)
}

export function getCurrentUser(): User | null {
  const a = getFirebaseAuth();
  return a.currentUser;
}

export async function getCurrentUserToken(): Promise<string | null> {
  const user = getCurrentUser();
  if (!user) return null;
  try {
    return await user.getIdToken();
  } catch (err) {
    console.warn("[Firebase Auth] Failed to retrieve ID token:", err);
    return null;
  }
}

export async function saveAnalysisResult(record: Omit<AnalysisRecord, "id">): Promise<string> {
  const firestore = getFirebaseDb();
  const a = getFirebaseAuth();
  const currentUid = a.currentUser?.uid || record.userId;
  if (!a.currentUser) {
    throw new Error("User must be authenticated with Firebase to sync records to Firestore.");
  }
  const col = collection(firestore, "analyses");
  const docRef = doc(col);
  await setDoc(docRef, {
    ...record,
    userId: currentUid,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function fetchUserAnalyses(userId?: string): Promise<AnalysisRecord[]> {
  const firestore = getFirebaseDb();
  const a = getFirebaseAuth();
  const currentUid = userId || a.currentUser?.uid;
  if (!currentUid) return [];
  const col = collection(firestore, "analyses");
  const q = query(col, where("userId", "==", currentUid), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AnalysisRecord, "id">) }));
}

export async function saveUserProfile(userId: string, data: { name: string; phone: string; email?: string }): Promise<void> {
  const firestore = getFirebaseDb();
  const userRef = doc(firestore, "users", userId);
  await setDoc(userRef, { ...data, updatedAt: serverTimestamp() }, { merge: true });
}

export async function getUserProfile(userId: string) {
  const firestore = getFirebaseDb();
  const userRef = doc(firestore, "users", userId);
  const snap = await getDoc(userRef);
  return snap.exists() ? snap.data() : null;
}
