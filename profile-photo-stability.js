const LOCAL_PREFIX='wd-profile-photo:';
let observer=null;
let activeUid='';
let canonicalPhoto='';
let applying=false;

function state(){return window.WDSession?.state||{}}
function localKey(uid){return `${LOCAL_PREFIX}${uid}`}
function clean(value){return String(value||'').trim()}
function accountVisible(){const root=document.querySelector('[data-view="account"]');return root&&!root.closest('.spa-view')?.hidden?root:null}
function elements(){return{root:document.querySelector('[data-view="account"]'),image:document.getElementById('profileAvatarImage'),fallback:document.getElementById('profileAvatarInitials'),wrap:document.querySelector('.profile-avatar-wrap')}}
function initials(name){return String(name||'WD').trim().split(/\s+/).slice(0,2).map(part=>part[0]||'').join('').toUpperCase()||'WD'}
function canonicalFor(session){if(session?.status!=='ready'||!session.user)return'';const uid=session.user.uid;const local=clean(localStorage.getItem(localKey(uid)));const remote=clean(session.profile?.foto);const auth=clean(session.user.photoURL);if(local)return local;if(remote){try{localStorage.setItem(localKey(uid),remote)}catch{}return remote}return auth}
function applyPhoto({force=false}={}){const session=state();if(session?.status!=='ready'||!session.user)return;const {root,image,fallback,wrap}=elements();if(!root||!image||!fallback)return;const name=session.profile?.nome||session.user.displayName||'WD';const source=canonicalFor(session);activeUid=session.user.uid;canonicalPhoto=source;fallback.textContent=initials(name);if(!source){image.hidden=true;fallback.hidden=false;wrap?.classList.remove('photo-pending');return}const current=clean(image.getAttribute('src'));if(!force&&current===source&&image.complete&&image.naturalWidth>0){image.hidden=false;fallback.hidden=true;wrap?.classList.remove('photo-pending');return}applying=true;wrap?.classList.add('photo-pending');const probe=new Image();probe.decoding='async';probe.onload=()=>{image.src=source;image.hidden=false;fallback.hidden=true;wrap?.classList.remove('photo-pending');applying=false};probe.onerror=()=>{const local=clean(localStorage.getItem(localKey(session.user.uid)));if(local&&local!==source){canonicalPhoto=local;image.src=local;image.hidden=false;fallback.hidden=true}else if(image.complete&&image.naturalWidth>0){image.hidden=false;fallback.hidden=true}else{image.hidden=true;fallback.hidden=false}wrap?.classList.remove('photo-pending');applying=false};probe.src=source}
function guardMutations(){observer?.disconnect();const {root,image,fallback}=elements();if(!root||!image)return;observer=new MutationObserver(()=>{if(applying||!canonicalPhoto)return;const src=clean(image.getAttribute('src'));if(src!==canonicalPhoto||image.hidden||!fallback.hidden)requestAnimationFrame(()=>applyPhoto({force:true}))});observer.observe(image,{attributes:true,attributeFilter:['src','hidden']});observer.observe(fallback,{attributes:true,attributeFilter:['hidden']})}
function install(){const session=state();if(session?.status!=='ready'||!session.user||!accountVisible())return;applyPhoto();guardMutations()}

document.addEventListener('wd-profile-photo-updated',event=>{const session=state();const photo=clean(event.detail?.foto);if(session?.user&&photo){try{localStorage.setItem(localKey(session.user.uid),photo)}catch{}canonicalPhoto=photo;applyPhoto({force:true})}});
document.addEventListener('wd-session-change',()=>{const session=state();if(session?.status==='ready'&&session.user){if(activeUid&&activeUid!==session.user.uid){observer?.disconnect();canonicalPhoto=''}install()}});
document.addEventListener('wd-spa-route',event=>{if(event.detail?.route==='account')requestAnimationFrame(install)});
document.addEventListener('wd-theme-ready',()=>{if(accountVisible())requestAnimationFrame(()=>applyPhoto())});
install();
