// /js/firebase.js
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getAuth, GithubAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";

export const firebaseConfig = {
  apiKey: "AIzaSyD3LEGq0mYjMvHQ6T_bRiGt-9ihSlAq5h0",
  authDomain: "pali-lessons.firebaseapp.com",
  projectId: "pali-lessons",
  storageBucket: "pali-lessons.firebasestorage.app",
  messagingSenderId: "116545404151",
  appId: "1:116545404151:web:7b1453c8b2cd2a3ea767f2",
  measurementId: "G-3PZ5YXVFWG"
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Auth helpers exposed for app.js
export const providers = {
  github: new GithubAuthProvider()
};
export const authApi = {
  signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut, signInWithPopup
};
