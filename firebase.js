// Firebase Web SDK — configuração central do projeto WD Founder
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getAuth, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
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

const path = location.pathname.toLowerCase();
const page = path.split('/').pop() || 'index.html';
const isAdminContext = document.body?.dataset.adminPage === 'true'
  || document.body?.dataset.adminShell === 'true'
  || document.body?.dataset.adminLogin === 'true'
  || page === 'admin.html'
  || page === 'admin-login.html';

const app = getApps().some(item => item.name === '[DEFAULT]')
  ? getApp()
  : initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

// A persistência só é definida nas telas em que o usuário realmente entra.
// Reaplicar setPersistence durante cada navegação pode criar estados transitórios
// de logout no Safari/iOS. Nas demais páginas apenas aguardamos o Auth restaurar
// a sessão local existente.
const isLoginPage = page === 'index.html' || page === '' || page === 'cadastro.html' || page === 'admin-login.html';
const authReady = isLoginPage
  ? setPersistence(auth, browserLocalPersistence).then(() => auth.authStateReady())
  : auth.authStateReady();

const sessionScope = isAdminContext ? 'admin-page' : 'member-page';

export { app, auth, db, authReady, isAdminContext, sessionScope };
