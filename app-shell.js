import { auth, db } from './firebase.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

const body = document.body;
const menu = document.querySelector('.menu');

function montarMenuMobile(){
  if(!menu) return;
  const trigger=document.createElement('button');
  trigger.className='mobile-menu-trigger';
  trigger.type='button';
  trigger.setAttribute('aria-label','Abrir menu');
  trigger.innerHTML='<span></span><span></span><span></span>';
  const backdrop=document.createElement('div');
  backdrop.className='menu-backdrop';
  trigger.addEventListener('click',()=>body.classList.toggle('menu-open'));
  backdrop.addEventListener('click',()=>body.classList.remove('menu-open'));
  document.body.append(trigger,backdrop);
  menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>body.classList.remove('menu-open')));
}

function garantirLinkAdmin(){
  if(!menu || menu.querySelector('[data-admin-link]')) return;
  const link=document.createElement('a');
  link.href='perfil-admin.html';
  link.textContent='Administração';
  link.dataset.adminLink='true';
  link.className='admin-only';
  const sair=menu.querySelector('button');
  menu.insertBefore(link,sair || null);
}

async function sair(){
  await signOut(auth);
  location.href='index.html';
}
window.sair=sair;

montarMenuMobile();
garantirLinkAdmin();

onAuthStateChanged(auth, async user=>{
  if(!user){ location.href='index.html'; return; }
  let role='cliente';
  try{
    const snap=await getDoc(doc(db,'usuarios',user.uid));
    if(snap.exists()) role=(snap.data().role || 'cliente').toLowerCase();
  }catch(e){ console.error('Falha ao carregar perfil',e); }
  const admin=role==='admin' || role==='administrador' || role==='master';
  document.querySelectorAll('.admin-only').forEach(el=>el.classList.toggle('is-visible',admin));
  document.documentElement.dataset.role=admin?'admin':'cliente';
  if(document.body.dataset.adminPage==='true' && !admin){
    location.replace('home.html');
  }
  document.dispatchEvent(new CustomEvent('wd-role-ready',{detail:{user,role,admin}}));
});