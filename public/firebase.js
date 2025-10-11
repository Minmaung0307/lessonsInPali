import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, addDoc, collection, query, where, orderBy, getDocs, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

export const firebaseApp = initializeApp({
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_BUCKET",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
});

export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);

export const api = { auth, db, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut,
  doc, getDoc, setDoc, addDoc, collection, query, where, orderBy, getDocs, updateDoc, serverTimestamp };
