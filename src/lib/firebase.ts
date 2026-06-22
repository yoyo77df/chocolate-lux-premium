import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyD-Y9uEOYJ0ynWWpfX-LVBVNe_0f7l1E2U",
  authDomain: "chocolate-lux.firebaseapp.com",
  projectId: "chocolate-lux",
  storageBucket: "chocolate-lux.firebasestorage.app",
  messagingSenderId: "712542679678",
  appId: "1:712542679678:web:0443573abada1c34259e2f",
  measurementId: "G-NKC103P4CW",
};

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _storage: FirebaseStorage | null = null;

export function getFirebase() {
  if (!_app) {
    _app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
    _auth = getAuth(_app);
    _db = getFirestore(_app);
    _storage = getStorage(_app);
  }
  return { app: _app, auth: _auth!, db: _db!, storage: _storage! };
}

export const googleProvider = new GoogleAuthProvider();