import { auth, db, authReady, isAdminContext } from './firebase.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { doc, onSnapshot } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

const subscribers=new Set();
let authStop=null,profileStop=null;
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
  await authReady;
  authStop?.();
  authStop=onAuthStateChanged(auth,user=>{
    stopProfile();
    if(!user){publish({status:'signed-out',user:null,profile:null,error:null});return}
    publish({status:'loading-profile',user,profile:null,error:null});
    profileStop=onSnapshot(doc(db,'usuarios',user.uid),snapshot=>{
      if(!snapshot.exists()){publish({status:'missing-profile',user,profile:null,error:null});return}
      publish({status:'ready',user,profile:snapshot.data(),error:null});
    },error=>publish({status:'error',user,profile:null,error}));
  });
}
function subscribe(listener,{immediate=true}={}){subscribers.add(listener);if(immediate)listener(current);return()=>subscribers.delete(listener)}
function resetClientState(){const preservedTheme=localStorage.getItem('wd-theme');Object.keys(localStorage).forEach(key=>{if(key.startsWith('wd-user:')||key.startsWith('wd-profile:')||key.startsWith('currentUser_'))localStorage.removeItem(key)});if(preservedTheme)localStorage.setItem('wd-theme',preservedTheme);if(isAdminContext)sessionStorage.removeItem('currentUser_admin');else sessionStorage.removeItem('currentUser_member')}
function destroy(){stopProfile();authStop?.();authStop=null;subscribers.clear()}
window.WDSession={state:current,ready,subscribe,resetClientState,destroy,get user(){return current.user},get profile(){return current.profile},get isReady(){return current.status==='ready'}};
start().catch(error=>publish({status:'error',user:null,profile:null,error}));
window.addEventListener('pagehide',destroy,{once:true});
