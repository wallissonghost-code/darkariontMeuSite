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
const profileCacheKey=uid=>`wd-profile-cache:${uid}`;

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

function readCachedProfile(uid){
  try{
    const raw=localStorage.getItem(profileCacheKey(uid));
    if(!raw)return null;
    const parsed=JSON.parse(raw);
    return parsed&&typeof parsed==='object'?parsed:null;
  }catch{return null}
}

function cacheProfile(uid,profile){
  try{localStorage.setItem(profileCacheKey(uid),JSON.stringify(profile))}catch{}
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

      const cachedProfile=readCachedProfile(user.uid);
      if(cachedProfile){
        publish({status:'ready',user,profile:cachedProfile,error:null,cached:true});
      }else{
        publish({status:'loading-profile',user,profile:null,error:null});
      }

      profileStop=onSnapshot(doc(db,'usuarios',user.uid),snapshot=>{
        if(!snapshot.exists()){
          localStorage.removeItem(profileCacheKey(user.uid));
          publish({status:'missing-profile',user,profile:null,error:null});
          return;
        }
        const profile=snapshot.data();
        cacheProfile(user.uid,profile);
        publish({status:'ready',user,profile,error:null,cached:false});
      },error=>{
        if(cachedProfile){
          console.warn('Perfil online indisponível; mantendo dados locais:',error);
          return;
        }
        publish({status:'error',user,profile:null,error});
      });
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
  Object.keys(localStorage).forEach(key=>{
    if(key.startsWith('wd-user:')||key.startsWith('wd-profile:')||key.startsWith('currentUser_')||key.startsWith('wd-profile-cache:'))localStorage.removeItem(key)
  });
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

window.addEventListener('pageshow',event=>{
  if(event.persisted&&!authStop)start().catch(error=>publish({status:'error',user:null,profile:null,error}));
});
