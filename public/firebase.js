// /firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, addDoc, collection, query, where, orderBy, getDocs, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

export const firebaseApp = initializeApp({
  apiKey: "AIzaSyD3LEGq0mYjMvHQ6T_bRiGt-9ihSlAq5h0",
  authDomain: "pali-lessons.firebaseapp.com",
  projectId: "pali-lessons",
  storageBucket: "pali-lessons.firebasestorage.app",
  messagingSenderId: "116545404151",
  appId: "1:116545404151:web:7b1453c8b2cd2a3ea767f2",
  measurementId: "G-3PZ5YXVFWG",
});

export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);

export const api = {
  auth, db,
  onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendPasswordResetEmail,
  doc, getDoc, setDoc, addDoc, collection, query, where, orderBy, getDocs, updateDoc, serverTimestamp
};