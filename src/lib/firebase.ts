// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  "projectId": "sportspanel",
  "appId": "1:124500734578:web:a0dca7d8a0ac8041f5c8eb",
  "storageBucket": "sportspanel.appspot.com",
  "apiKey": "AIzaSyBS7HizRalY8xUroe0zXZNaPok9KL6EAjQ",
  "authDomain": "sportspanel.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "124500734578"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
