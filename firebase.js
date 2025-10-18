// firebase.js - template config for fadstore-firebase
// IMPORTANT: Replace the placeholder values with your real Firebase project's web SDK config
// (From Firebase console > Project settings > Your apps > SDK config)

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "fadstore-firebase.firebaseapp.com",
  projectId: "fadstore-firebase",
  storageBucket: "fadstore-firebase.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// initialize firebase app and globals
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
