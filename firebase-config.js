// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-storage.js";

// TODO: Replace with your actual Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyBHNfUHK4KoBCWElFn_Fb4IxrsJ7lttWvU",
  authDomain: "voting-app-3d27f.firebaseapp.com",
  projectId: "voting-app-3d27f",
  storageBucket: "voting-app-3d27f.appspot.com",
  messagingSenderId: "375811827685",
  appId: "1:375811827685:web:af4da7cb198f28bd3bb10c"
};

// Initialize Firebase
let app, db, storage;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  storage = getStorage(app);
} catch (error) {
  console.error("Firebase initialization failed. Please check your config.", error);
}

export { db, storage };
