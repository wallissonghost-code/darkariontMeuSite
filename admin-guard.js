import { auth, db, authReady } from './firebase.js';
import { onAuthStateChanged, getIdTokenResult } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

const FIXED_ADMIN_UIDS = new Set(['WAPN8cPkPGP2mwiQ8FNbIGyUaUl1']);
const ADMIN_ROLES = new Set(['admin', 'administrador', 'master']);
let stopAuthListener = null;

function redirectOut() {
  window.location.replace('admin-login.html');
}

async function waitForAuth() {
  await authReady;
  return new Promise((resolve) => {
    stopAuthListener?.();
    stopAuthListener = onAuthStateChanged(auth, (user) => {
      stopAuthListener?.();
      stopAuthListener = null;
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
    console.error('Falha ao validar claims administrativas:', error);
  }
  try {
    const snapshot = await getDoc(doc(db, 'usuarios', user.uid));
    const role = String(snapshot.data()?.role || '').trim().toLowerCase();
    return ADMIN_ROLES.has(role);
  } catch (error) {
    console.error('Falha ao validar perfil administrativo:', error);
    return false;
  }
}

function cleanup() {
  stopAuthListener?.();
  stopAuthListener = null;
}

window.addEventListener('pagehide', cleanup, { once: true });
window.addEventListener('beforeunload', cleanup, { once: true });

export const adminReady = (async () => {
  document.documentElement.dataset.adminGuard = 'checking';
  const user = await waitForAuth();
  if (!user) {
    redirectOut();
    throw new Error('Sessão administrativa não autenticada.');
  }
  if (!(await hasAdminAccess(user))) {
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
