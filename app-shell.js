import { auth, db } from './firebase.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { doc, getDoc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

if(!document.querySelector('link[href="shell-fixes.css"]')){
  const style=document.createElement('link');
  style.rel='stylesheet';
  style.href='shell-fixes.css';
  document.head.append(style);
}

const body=document.body;
const menu=document.querySelector('.menu');

function fecharMenu(){
  body.classList.remove('menu-open');
  document.querySelector('.mobile-menu-trigger')?.setAttribute('aria-expanded','false');
}

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
    menu.insertBefore(link,menu.querySelector('.logout-btn, button[onclick]')||null);
  }
  link.dataset.adminLink='true';
  link.classList.add('admin-only');
}

async function garantirDocumentoUsuario(user){
  const referencia=doc(db,'usuarios',user.uid);
  const snap=await getDoc(referencia);
  if(snap.exists())return snap.data();

  const novoUsuario={
    nome:user.displayName||user.email?.split('@')[0]||'Cliente Founder',
    email:user.email||'',
    telefone:'',
    role:'cliente',
    vip:0,
    carimbos:0,
    creditos:0,
    criadoEm:serverTimestamp(),
    atualizadoEm:serverTimestamp()
  };
  await setDoc(referencia,novoUsuario);
  return novoUsuario;
}

async function sair(event){
  event?.preventDefault?.();
  const botoes=document.querySelectorAll('.logout-btn, [data-action="logout"]');
  botoes.forEach(botao=>{botao.disabled=true;botao.textContent='Saindo...'});
  try{
    body.classList.add('is-signing-out');
    await signOut(auth);
  }catch(error){
    console.error('Erro ao sair:',error);
  }finally{
    location.replace('index.html');
  }
}
window.sair=sair;

function ligarLogout(){
  document.querySelectorAll('.logout-btn, .menu button[onclick*="sair"], [data-action="logout"]').forEach(botao=>{
    botao.removeAttribute('onclick');
    botao.type='button';
    botao.addEventListener('click',sair);
  });
}

montarMenuMobile();
garantirLinkAdmin();
ligarLogout();

onAuthStateChanged(auth,async user=>{
  if(!user){location.replace('index.html');return}
  let dados;
  try{
    dados=await garantirDocumentoUsuario(user);
  }catch(error){
    console.error('Não foi possível carregar ou criar o perfil:',error);
    document.dispatchEvent(new CustomEvent('wd-profile-error',{detail:{user,error}}));
    return;
  }
  const role=String(dados?.role||'cliente').toLowerCase();
  const admin=['admin','administrador','master'].includes(role);
  document.querySelectorAll('.admin-only').forEach(el=>el.classList.toggle('is-visible',admin));
  document.documentElement.dataset.role=admin?'admin':'cliente';
  if(body.dataset.adminPage==='true'&&!admin){location.replace('home.html');return}
  document.dispatchEvent(new CustomEvent('wd-role-ready',{detail:{user,role,admin,dados}}));
});
