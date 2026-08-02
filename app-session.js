import { auth, db, authReady, isAdminContext } from './firebase.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { doc, onSnapshot } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

const subscribers=new Set();
let authStop=null,profileStop=null,starting=false;
let current=Object.freeze({status:'loading',user:null,profile:null,error:null});
let readyResolve;
const ready=new Promise(resolve=>{readyResolve=resolve});
let readySettled=false;
const terminalStates=new Set(['ready','signed-out','missing-profile','error']);

function publish(next){
  current=Object.freeze(next);
  window.WDSession.state=current;
  subscribers.forEach(listener=>{try{listener(current)}catch(error){console.error('Erro em assinante da sessão:',error)}});
  document.dispatchEvent(new CustomEvent('wd-session-change',{detail:current}));
  if(!readySettled&&terminalStates.has(next.status)){
    readySettled=true;
    readyResolve(current);
  }
}

function stopProfile(){profileStop?.();profileStop=null}

async function start(){
  if(starting||authStop)return;
  starting=true;
  try{
    await authReady;
    authStop=onAuthStateChanged(auth,user=>{
      stopProfile();
      if(!user){publish({status:'signed-out',user:null,profile:null,error:null});return}
      publish({status:'loading-profile',user,profile:null,error:null});
      profileStop=onSnapshot(doc(db,'usuarios',user.uid),snapshot=>{
        if(!snapshot.exists()){publish({status:'missing-profile',user,profile:null,error:null});return}
        publish({status:'ready',user,profile:snapshot.data(),error:null});
      },error=>publish({status:'error',user,profile:null,error}));
    });
  }finally{
    starting=false;
  }
}

function subscribe(listener,{immediate=true}={}){
  subscribers.add(listener);
  if(immediate)listener(current);
  return()=>subscribers.delete(listener);
}

function resetClientState(){
  const preservedTheme=localStorage.getItem('wd-theme');
  Object.keys(localStorage).forEach(key=>{if(key.startsWith('wd-user:')||key.startsWith('wd-profile:')||key.startsWith('currentUser_'))localStorage.removeItem(key)});
  if(preservedTheme)localStorage.setItem('wd-theme',preservedTheme);
  if(isAdminContext)sessionStorage.removeItem('currentUser_admin');
  else sessionStorage.removeItem('currentUser_member');
}

function destroy(){
  stopProfile();
  authStop?.();
  authStop=null;
}

window.WDSession={state:current,ready,subscribe,resetClientState,destroy,restart:start,get user(){return current.user},get profile(){return current.profile},get isReady(){return current.status==='ready'}};
start().catch(error=>publish({status:'error',user:null,profile:null,error}));

// Não encerra a sessão em pagehide. Safari/iPadOS pode disparar esse evento ao
// suspender a aba, abrir o teclado ou mover a página para o cache de navegação.
// O navegador libera os listeners naturalmente quando o documento é descartado.
window.addEventListener('pageshow',event=>{
  if(event.persisted&&!authStop)start().catch(error=>publish({status:'error',user:null,profile:null,error}));
});
