import { auth, db } from './firebase.js';
import { onAuthStateChanged, getIdTokenResult } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

const FIXED_ADMIN_UIDS = new Set([
  'WAPN8cPkPGP2mwiQ8FNbIGyUaUl1'
]);

const ADMIN_ROLES = new Set(['admin', 'administrador', 'master']);
const REDIRECT_URL = 'app.html#home';

function redirectOut() {
  if (window.top && window.top !== window.self) {
    window.top.location.replace(REDIRECT_URL);
  } else {
    window.location.replace(REDIRECT_URL);
  }
}

function waitForAuth() {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

async function hasAdminAccess(user) {
  if (!user) return false;
  if (FIXED_ADMIN_UIDS.has(user.uid)) return true;

  try {
    const token = await getIdTokenResult(user, true);
    if (token.claims.admin === true || token.claims.role === 'admin') return true;
  } catch (error) {
    console.error('Não foi possível validar as claims administrativas:', error);
  }

  try {
    const snapshot = await getDoc(doc(db, 'usuarios', user.uid));
    const role = String(snapshot.data()?.role || '').trim().toLowerCase();
    return ADMIN_ROLES.has(role);
  } catch (error) {
    console.error('Não foi possível validar o perfil administrativo:', error);
    return false;
  }
}

export const adminReady = (async () => {
  document.documentElement.dataset.adminGuard = 'checking';
  const user = await waitForAuth();

  if (!user) {
    window.location.replace('index.html');
    throw new Error('Usuário não autenticado.');
  }

  const authorized = await hasAdminAccess(user);
  if (!authorized) {
    document.documentElement.dataset.adminGuard = 'denied';
    redirectOut();
    throw new Error('Acesso administrativo negado.');
  }

  document.documentElement.dataset.adminGuard = 'granted';
  document.body?.classList.add('admin-authorized');
  return { user };
})();

export async function requireAdmin() {
  return adminReady;
}
