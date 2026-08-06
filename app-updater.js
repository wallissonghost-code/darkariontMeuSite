const LOCAL_VERSION='3.52.0';
const VERSION_KEY='wd-app-version';
const CHECK_INTERVAL=10*60*1000;
let updateAvailable=false;
async function clearLegacyCaches(){if(!('caches' in window))return;const keys=await caches.keys();await Promise.all(keys.filter(key=>key.startsWith('wd-founder-')&&!key.includes(LOCAL_VERSION)).map(key=>caches.delete(key)))}
async function publishedVersion(){const response=await fetch(`./version.json?t=${Date.now()}`,{cache:'no-store'});if(!response.ok)throw new Error(`version ${response.status}`);return response.json()}
async function checkForUpdate(){try{const remote=await publishedVersion(),version=String(remote.version||'').trim();if(!version)return false;localStorage.setItem(VERSION_KEY,version);updateAvailable=version!==LOCAL_VERSION;return updateAvailable}catch{return false}}
window.WDAppVersion={version:LOCAL_VERSION,check:checkForUpdate,clearCaches:clearLegacyCaches,get updateAvailable(){return updateAvailable}};
function loadRuntimeScript(src,id){if(document.getElementById(id))return;const script=document.createElement('script');script.id=id;script.src=`${src}?v=${LOCAL_VERSION}`;script.defer=true;document.head.append(script)}
function loadRuntimeStyle(href,id){if(document.getElementById(id))return;const link=document.createElement('link');link.id=id;link.rel='stylesheet';link.href=`${href}?v=${LOCAL_VERSION}`;document.head.append(link)}
loadRuntimeStyle('./splash-lite.css','wd-splash-lite-style');
loadRuntimeStyle('./mobile-nav-fixed.css','wd-mobile-nav-fixed-style');
loadRuntimeStyle('./mobile-nav-account-premium.css','wd-mobile-nav-account-style');
loadRuntimeStyle('./member-commerce.css','wd-member-commerce-style');
loadRuntimeStyle('./mobile-pwa.css','wd-mobile-pwa-style');
async function registerWorker(){if(!('serviceWorker' in navigator))return null;return navigator.serviceWorker.register(`./sw.js?v=${LOCAL_VERSION}`,{scope:'./',updateViaCache:'none'})}
requestAnimationFrame(()=>requestAnimationFrame(()=>{loadRuntimeScript('./navigation-state.js','wd-navigation-state-runtime');setTimeout(()=>{loadRuntimeScript('./mobile-pwa.js','wd-mobile-pwa-runtime');loadRuntimeScript('./system-status.js','wd-system-status-runtime');loadRuntimeScript('./system-status-bootstrap.js','wd-system-status-bootstrap')},500);setTimeout(()=>{registerWorker().then(registration=>registration?.update().catch(()=>{})).catch(()=>{});clearLegacyCaches().catch(()=>{});checkForUpdate()},1400)}));
setInterval(checkForUpdate,CHECK_INTERVAL);window.addEventListener('online',()=>setTimeout(checkForUpdate,800));
