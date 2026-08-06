import { auth, db, authReady, isAdminContext } from './firebase.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { doc, onSnapshot, getDoc } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

const subscribers=new Set();
const SESSION_HINT='wd-session-hint';
const SIGNED_OUT_GRACE_MS=1800;
const PROFILE_CONFIRM_MS=1500;
const FIXED_ADMIN_UIDS=new Set(['WAPN8cPkPGP2mwiQ8FNbIGyUaUl1']);
let authStop=null,profileStop=null,starting=false,signedOutTimer=0,profileMissingTimer=0;
let current=Object.freeze({status:'loading',user:null,profile:null,error:null});
let readyResolve;const ready=new Promise(resolve=>{readyResolve=resolve});let readySettled=false;
const terminalStates=new Set(['ready','signed-out','missing-profile','error']);
const profileCacheKey=uid=>`wd-profile-cache:${uid}`;
function publish(next){current=Object.freeze(next);window.WDSession.state=current;subscribers.forEach(listener=>{try{listener(current)}catch(error){console.error('Erro em assinante da sessão:',error)}});document.dispatchEvent(new CustomEvent('wd-session-change',{detail:current}));if(!readySettled&&terminalStates.has(next.status)){readySettled=true;readyResolve(current)}}
function readCachedProfile(uid){try{const raw=localStorage.getItem(profileCacheKey(uid));if(!raw)return null;const parsed=JSON.parse(raw);return parsed&&typeof parsed==='object'?parsed:null}catch{return null}}
function cacheProfile(uid,profile){try{localStorage.setItem(profileCacheKey(uid),JSON.stringify(profile))}catch{}}
function readSessionHint(){try{const raw=localStorage.getItem(SESSION_HINT);return raw?JSON.parse(raw):null}catch{return null}}
function saveSessionHint(user){try{localStorage.setItem(SESSION_HINT,JSON.stringify({uid:user.uid,email:user.email||'',at:Date.now()}))}catch{}}
function clearSessionHint(){try{localStorage.removeItem(SESSION_HINT)}catch{}}
function stopProfile(){profileStop?.();profileStop=null;clearTimeout(profileMissingTimer);profileMissingTimer=0}
function cancelSignedOut(){clearTimeout(signedOutTimer);signedOutTimer=0}
function provisionalProfile(user,cached){if(FIXED_ADMIN_UIDS.has(user.uid))return {...(cached||{}),nome:cached?.nome||user.displayName||'Administrador',email:cached?.email||user.email||'',role:'admin'};return cached}
function publishSignedOutWithGrace(){cancelSignedOut();const hint=readSessionHint();if(!hint){publish({status:'signed-out',user:null,profile:null,error:null});return}publish({status:'restoring',user:null,profile:null,error:null});signedOutTimer=setTimeout(()=>{signedOutTimer=0;if(auth.currentUser)return;clearSessionHint();publish({status:'signed-out',user:null,profile:null,error:null})},SIGNED_OUT_GRACE_MS)}
async function confirmMissingProfile(user,cachedProfile){clearTimeout(profileMissingTimer);profileMissingTimer=setTimeout(async()=>{try{const snapshot=await getDoc(doc(db,'usuarios',user.uid));if(snapshot.exists()){const profile=snapshot.data();cacheProfile(user.uid,profile);publish({status:'ready',user,profile,error:null,cached:false});return}if(cachedProfile){publish({status:'ready',user,profile:cachedProfile,error:null,cached:true,degraded:true});return}publish({status:'missing-profile',user,profile:null,error:null})}catch(error){if(cachedProfile){publish({status:'ready',user,profile:cachedProfile,error:null,cached:true,degraded:true});return}publish({status:'error',user,profile:null,error})}},PROFILE_CONFIRM_MS)}
async function start(){if(starting||authStop)return;starting=true;try{await authReady;authStop=onAuthStateChanged(auth,user=>{stopProfile();if(!user){publishSignedOutWithGrace();return}cancelSignedOut();saveSessionHint(user);const cachedProfile=provisionalProfile(user,readCachedProfile(user.uid));if(cachedProfile)publish({status:'ready',user,profile:cachedProfile,error:null,cached:true,provisional:FIXED_ADMIN_UIDS.has(user.uid)});else publish({status:'loading-profile',user,profile:null,error:null});profileStop=onSnapshot(doc(db,'usuarios',user.uid),snapshot=>{if(!snapshot.exists()){confirmMissingProfile(user,cachedProfile);return}clearTimeout(profileMissingTimer);profileMissingTimer=0;const profile=FIXED_ADMIN_UIDS.has(user.uid)?{...snapshot.data(),role:'admin'}:snapshot.data();cacheProfile(user.uid,profile);publish({status:'ready',user,profile,error:null,cached:false})},error=>{if(cachedProfile){publish({status:'ready',user,profile:cachedProfile,error:null,cached:true,degraded:true});return}publish({status:'error',user,profile:null,error})})})}finally{starting=false}}
function subscribe(listener,{immediate=true}={}){subscribers.add(listener);if(immediate)listener(current);return()=>subscribers.delete(listener)}
function resetClientState(){const preservedTheme=localStorage.getItem('wd-theme');Object.keys(localStorage).forEach(key=>{if(key.startsWith('wd-user:')||key.startsWith('wd-profile:')||key.startsWith('currentUser_')||key.startsWith('wd-profile-cache:')||key===SESSION_HINT)localStorage.removeItem(key)});if(preservedTheme)localStorage.setItem('wd-theme',preservedTheme);if(isAdminContext)sessionStorage.removeItem('currentUser_admin');else sessionStorage.removeItem('currentUser_member')}
function destroy(){cancelSignedOut();stopProfile();authStop?.();authStop=null}
window.WDSession={state:current,ready,subscribe,resetClientState,destroy,restart:start,get user(){return current.user},get profile(){return current.profile},get isReady(){return current.status==='ready'}};
start().catch(error=>publish({status:'error',user:null,profile:null,error}));
window.addEventListener('pageshow',event=>{if(event.persisted&&!authStop)start().catch(error=>publish({status:'error',user:null,profile:null,error}))});
