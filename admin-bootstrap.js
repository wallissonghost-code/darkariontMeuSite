import './app-session.js';
import { auth } from './firebase.js';
import { signOut } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { requireAdmin } from './admin-guard.js?v=2.3.1';

const body=document.body;
let signingOut=false;

function applyTheme(profile,user){
  const saved=localStorage.getItem(`wd-theme:${user.uid}`)||localStorage.getItem('wd-theme');
  const theme=profile?.tema==='dark'||profile?.tema==='light'?profile.tema:(saved==='dark'?'dark':'light');
  document.documentElement.dataset.theme=theme;
  document.documentElement.style.colorScheme=theme;
}

async function logout(event){
  event?.preventDefault?.();
  if(signingOut)return;
  signingOut=true;
  const button=event?.target?.closest?.('[data-action="logout"]');
  if(button){button.disabled=true;button.textContent='Saindo...'}
  try{
    window.WDSession?.resetClientState?.();
    await signOut(auth);
  }finally{
    location.replace('index.html?logout=1');
  }
}

document.addEventListener('click',event=>{
  if(event.target.closest('[data-action="logout"]'))logout(event);
});

try{
  const {user,profile}=await requireAdmin();
  applyTheme(profile,user);
  document.documentElement.dataset.authState='ready';
  document.documentElement.dataset.role='admin';
  body.classList.add('wd-auth-ready','admin-authorized');
  document.dispatchEvent(new CustomEvent('wd-role-ready',{detail:{user,profile,admin:true}}));
}catch(error){
  console.error('Não foi possível abrir o painel administrativo:',error);
}
