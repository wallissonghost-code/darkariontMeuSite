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
const isAdminContext = document.body?.dataset.adminPage === 'true'
  || document.body?.dataset.adminLogin === 'true'
  || path.endsWith('/admin-login.html');

// Uma única instância Firebase e uma única sessão persistente são utilizadas
// em todo o site. A autorização administrativa continua sendo validada pelo
// UID/role, pelo admin-guard.js e pelas regras do Firestore.
const app = getApps().some(item => item.name === '[DEFAULT]')
  ? getApp()
  : initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

const authReady = setPersistence(auth, browserLocalPersistence).catch(error => {
  console.error('Não foi possível configurar a persistência da sessão:', error);
});

// Indica apenas o tipo da página atual; não cria outra autenticação.
const sessionScope = isAdminContext ? 'admin-page' : 'member-page';

export { app, auth, db, authReady, isAdminContext, sessionScope };
