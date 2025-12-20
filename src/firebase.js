// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBXQTKvrBw1qOO49U8V4hKAVq8k0ghZejk",
  authDomain: "ignitionswitch-3d71b.firebaseapp.com",
  projectId: "ignitionswitch-3d71b",
  storageBucket: "ignitionswitch-3d71b.firebasestorage.app",
  messagingSenderId: "912805717390",
  appId: "1:912805717390:web:7b11053d2a395e5fda30df",
  measurementId: "G-S0SM9W7QVS",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { db, storage, functions, auth, googleProvider };
