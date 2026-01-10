// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDYWiFfSOCFPwC_rcToQpC6SxPfuUF611E",
  authDomain: "buybin-493ca.firebaseapp.com",
  projectId: "buybin-493ca",
  storageBucket: "buybin-493ca.firebasestorage.app",
  messagingSenderId: "224003996631",
  appId: "1:224003996631:web:5e4a792d1f460fa3436992",
  measurementId: "G-FNQ51B3PTF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app); // Export auth instance
export const googleProvider = new GoogleAuthProvider(); // Export GoogleAuthProvider for sign-in
export const analytics = getAnalytics(app); // Export analytics
export const db = getFirestore(app); // Export Firestore instance