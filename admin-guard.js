import './app-session.js';
import { auth, authReady } from './firebase.js';
import { getIdTokenResult } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';

const FIXED_ADMIN_UIDS=new Set(['WAPN8cPkPGP2mwiQ8FNbIGyUaUl1']);
const ADMIN_ROLES=new Set(['admin','administrador','master']);

function redirectOut(){
  const target='app.html?page=home';
  if(window.top && window.top!==window) window.top.location.replace(target);
  else window.location.replace(target);
}

async function hasAdminAccess(user,profile){
  if(!user)return false;
  if(FIXED_ADMIN_UIDS.has(user.uid))return true;
  const role=String(profile?.role||'').trim().toLowerCase();
  if(ADMIN_ROLES.has(role))return true;
  try{
    const token=await getIdTokenResult(user,false);
    return token.claims.admin===true||token.claims.role==='admin';
  }catch(error){
    console.error('Falha ao validar permissão administrativa:',error);
    return false;
  }
}

async function waitForSession(){
  await authReady;
  await auth.authStateReady();

  const current=window.WDSession?.state;
  if(current?.status==='ready')return current;

  return new Promise(resolve=>{
    let settled=false;
    const finish=state=>{
      if(settled)return;
      if(!['ready','signed-out','missing-profile','error'].includes(state.status))return;
      settled=true;
      clearTimeout(timer);
      unsubscribe?.();
      resolve(state);
    };
    const unsubscribe=window.WDSession.subscribe(finish);
    const timer=setTimeout(()=>{
      if(settled)return;
      settled=true;
      unsubscribe?.();
      resolve(window.WDSession.state);
    },2500);
  });
}

export const adminReady=(async()=>{
  document.documentElement.dataset.adminGuard='checking';
  const state=await waitForSession();

  if(state.status!=='ready'||!state.user){
    document.documentElement.dataset.adminGuard='signed-out';
    redirectOut();
    throw new Error('Sessão não restaurada para a área administrativa.');
  }

  if(!(await hasAdminAccess(state.user,state.profile))){
    document.documentElement.dataset.adminGuard='denied';
    redirectOut();
    throw new Error('Acesso administrativo negado.');
  }

  document.documentElement.dataset.adminGuard='granted';
  document.body?.classList.add('admin-authorized');
  return {user:state.user,profile:state.profile};
})();

export async function requireAdmin(){return adminReady}
