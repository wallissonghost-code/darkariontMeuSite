import { auth, db } from './firebase.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

const body=document.body;
const menu=document.querySelector('.menu');

function fecharMenu(){body.classList.remove('menu-open')}

function montarMenuMobile(){
  if(!menu||document.querySelector('.mobile-menu-trigger'))return;
  const trigger=document.createElement('button');
  trigger.className='mobile-menu-trigger';
  trigger.type='button';
  trigger.setAttribute('aria-label','Abrir menu');
  trigger.setAttribute('aria-expanded','false');
  trigger.innerHTML='<span></span><span></span><span></span>';
  const backdrop=document.createElement('button');
  backdrop.className='menu-backdrop';
  backdrop.type='button';
  backdrop.setAttribute('aria-label','Fechar menu');
  const close=document.createElement('button');
  close.className='menu-close';
  close.type='button';
  close.setAttribute('aria-label','Fechar menu');
  close.textContent='×';
  menu.prepend(close);
  trigger.addEventListener('click',()=>{
    const aberto=!body.classList.contains('menu-open');
    body.classList.toggle('menu-open',aberto);
    trigger.setAttribute('aria-expanded',String(aberto));
  });
  close.addEventListener('click',fecharMenu);
  backdrop.addEventListener('click',fecharMenu);
  menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',fecharMenu));
  const conteudo=document.querySelector('.conteudo');
  (conteudo||document.body).prepend(trigger);
  document.body.append(backdrop);
  window.addEventListener('pageshow',fecharMenu);
  window.addEventListener('resize',()=>{if(innerWidth>768)fecharMenu()});
}

function garantirLinkAdmin(){
  if(!menu)return;
  const links=[...menu.querySelectorAll('a')].filter(a=>a.getAttribute('href')==='perfil-admin.html');
  links.slice(1).forEach(a=>a.remove());
  let link=links[0];
  if(!link){
    link=document.createElement('a');
    link.href='perfil-admin.html';
    link.textContent='Administração';
    menu.insertBefore(link,menu.querySelector('button[onclick]')||null);
  }
  link.dataset.adminLink='true';
  link.classList.add('admin-only');
}

async function sair(){await signOut(auth);location.href='index.html'}
window.sair=sair;
montarMenuMobile();
garantirLinkAdmin();

onAuthStateChanged(auth,async user=>{
  if(!user){location.href='index.html';return}
  let role='cliente';
  try{
    const snap=await getDoc(doc(db,'usuarios',user.uid));
    if(snap.exists())role=(snap.data().role||'cliente').toLowerCase();
  }catch(e){console.error(e)}
  const admin=['admin','administrador','master'].includes(role);
  document.querySelectorAll('.admin-only').forEach(el=>el.classList.toggle('is-visible',admin));
  document.documentElement.dataset.role=admin?'admin':'cliente';
  if(body.dataset.adminPage==='true'&&!admin)location.replace('home.html');
  document.dispatchEvent(new CustomEvent('wd-role-ready',{detail:{user,role,admin}}));
});