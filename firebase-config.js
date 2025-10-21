// firebase-config.js — importable Firebase setup for FADs by PHURAY (web)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

/* ===== REPLACE this object with the config you copied from Firebase console ===== */
const firebaseConfig = {
  apiKey: "AIzaSyCmT7vExpfDDo3k9B6wt6i2-we6hxNoBIQ",
  authDomain: "fadstore-firebase.firebaseapp.com",
  projectId: "fadstore-firebase",
  storageBucket: "fadstore-firebase.firebasestorage.app",
  messagingSenderId: "213541304355",
  appId: "1:213541304355:web:53692c600b0419b8c89996"
};
// Initialize Firebase
const app = initializeApp(firebaseConfig);
};
/* ============================================================================== */

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
