// Firebase Web SDK — configuração do projeto WD Founder
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getAuth, setPersistence, browserLocalPersistence, browserSessionPersistence } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
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
const isAdminContext = document.body?.dataset.adminPage === 'true'
  || document.body?.dataset.adminLogin === 'true'
  || path.endsWith('/admin-login.html');

const appName = isAdminContext ? 'wd-founder-admin' : '[DEFAULT]';
const app = appName === '[DEFAULT]'
  ? (getApps().some(item => item.name === '[DEFAULT]') ? getApp() : initializeApp(firebaseConfig))
  : (getApps().some(item => item.name === appName) ? getApp(appName) : initializeApp(firebaseConfig, appName));

const auth = getAuth(app);
const db = getFirestore(app);

// O membro permanece conectado no navegador. O administrador usa uma sessão
// independente por aba, impedindo que um login substitua o outro.
const authReady = setPersistence(
  auth,
  isAdminContext ? browserSessionPersistence : browserLocalPersistence
).catch(error => {
  console.error('Não foi possível configurar a persistência da sessão:', error);
});

const sessionScope = isAdminContext ? 'admin' : 'member';

export { app, auth, db, authReady, isAdminContext, sessionScope };
