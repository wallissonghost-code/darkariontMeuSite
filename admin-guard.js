import './app-session.js';
import { getIdTokenResult } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';

const FIXED_ADMIN_UIDS=new Set(['WAPN8cPkPGP2mwiQ8FNbIGyUaUl1']);
const ADMIN_ROLES=new Set(['admin','administrador','master']);

function redirectOut(){window.location.replace('admin-login.html')}

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

export const adminReady=(async()=>{
  document.documentElement.dataset.adminGuard='checking';
  const state=await window.WDSession.ready;
  if(state.status!=='ready'||!state.user){
    redirectOut();
    throw new Error('Sessão administrativa não autenticada.');
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
