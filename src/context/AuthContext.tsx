import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  type User,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { getFirebase, googleProvider } from "../lib/firebase";

export type UserProfile = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: "admin" | "mod" | "user";
  language?: "en" | "bn";
  paymentMethods?: { provider: string; number: string; addedAt?: any }[];
  earnedSalary?: number;
  createdAt?: any;
};

type AuthCtx = {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isMod: boolean;
  isStaff: boolean;
  reloadProfile: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, language?: "en" | "bn") => Promise<void>;
  loginGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

async function loadProfile(user: User, language?: "en" | "bn"): Promise<UserProfile> {
  const { db } = getFirebase();
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    const profile: UserProfile = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      role: "user",
      language: language ?? "en",
      earnedSalary: 0,
      createdAt: serverTimestamp(),
    };
    await setDoc(ref, profile);
    return profile;
  }
  return snap.data() as UserProfile;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { auth } = getFirebase();
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          setProfile(await loadProfile(u));
        } catch (e) {
          console.error("loadProfile", e);
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const value: AuthCtx = {
    user,
    profile,
    loading,
    isAdmin: profile?.role === "admin",
    isMod: profile?.role === "mod",
    isStaff: profile?.role === "admin" || profile?.role === "mod",
    async reloadProfile() {
      if (!user) return;
      try { setProfile(await loadProfile(user)); } catch (e) { console.error(e); }
    },
    async login(email, password) {
      const { auth } = getFirebase();
      await signInWithEmailAndPassword(auth, email, password);
    },
    async register(email, password, name, language) {
      const { auth } = getFirebase();
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (name) await updateProfile(cred.user, { displayName: name });
      // ensure profile doc with language preference
      try { await loadProfile(cred.user, language); } catch {}
    },
    async loginGoogle() {
      const { auth } = getFirebase();
      await signInWithPopup(auth, googleProvider);
    },
    async logout() {
      const { auth } = getFirebase();
      await signOut(auth);
    },
    async resetPassword(email) {
      const { auth } = getFirebase();
      await sendPasswordResetEmail(auth, email);
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}