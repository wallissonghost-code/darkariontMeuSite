import { auth, db, authReady } from './firebase.js';
import { signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

const ADMIN_UIDS = new Set(['WAPN8cPkPGP2mwiQ8FNbIGyUaUl1']);
const ADMIN_ROLES = new Set(['admin', 'administrador', 'master']);
const form = document.getElementById('adminLoginForm');
const message = document.getElementById('adminMessage');

function show(text, error = false) {
  message.textContent = text;
  message.className = error ? 'mensagem erro' : 'mensagem sucesso';
}

async function authorized(user) {
  if (ADMIN_UIDS.has(user.uid)) return true;
  const snapshot = await getDoc(doc(db, 'usuarios', user.uid));
  const role = String(snapshot.data()?.role || '').trim().toLowerCase();
  return ADMIN_ROLES.has(role);
}

await authReady;

form.addEventListener('submit', async event => {
  event.preventDefault();
  const button = form.querySelector('button[type="submit"]');
  const email = document.getElementById('adminEmail').value.trim();
  const password = document.getElementById('adminPassword').value;
  button.disabled = true;
  button.textContent = 'Validando...';
  show('');
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    if (!(await authorized(credential.user))) {
      await signOut(auth);
      throw new Error('Esta conta não possui permissão administrativa.');
    }
    sessionStorage.setItem('currentUser_admin', credential.user.uid);
    location.replace('registrar-compra.html');
  } catch (error) {
    console.error(error);
    show(error.message || 'Não foi possível entrar no painel.', true);
    button.disabled = false;
    button.innerHTML = '<span>Acessar administração</span><b>→</b>';
  }
});
