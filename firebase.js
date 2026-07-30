// Firebase Web SDK — configuração do projeto WD Founder
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCi9ZE7vqI5SmolqFmXVRxl7jmVsssGiGE",
  authDomain: "wd-founder.firebaseapp.com",
  projectId: "wd-founder",
  storageBucket: "wd-founder.firebasestorage.app",
  messagingSenderId: "876289747017",
  appId: "1:876289747017:web:3696cb04d859c394c1f798",
  measurementId: "G-0WBQZPS5Z1"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
