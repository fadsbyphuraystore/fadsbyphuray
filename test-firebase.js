import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";

try {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  alert("✅ Firebase connected successfully!");
} catch (e) {
  alert("❌ Firebase error: " + e.message);
}
