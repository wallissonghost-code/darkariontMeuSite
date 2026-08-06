const LOCAL_VERSION='3.45.0';
const VERSION_KEY='wd-app-version';
const CHECK_INTERVAL=10*60*1000;
let updateAvailable=false;
async function clearLegacyCaches(){if(!('caches' in window))return;const keys=await caches.keys();await Promise.all(keys.filter(key=>key.startsWith('wd-founder-')&&!key.includes(LOCAL_VERSION)).map(key=>caches.delete(key)))}
async function publishedVersion(){const response=await fetch(`./version.json?t=${Date.now()}`,{cache:'no-store'});if(!response.ok)throw new Error(`version ${response.status}`);return response.json()}
async function checkForUpdate(){try{const remote=await publishedVersion(),version=String(remote.version||'').trim();if(!version)return false;localStorage.setItem(VERSION_KEY,version);updateAvailable=version!==LOCAL_VERSION;return updateAvailable}catch(error){console.warn('Verificação de versão indisponível:',error);return false}}
window.WDAppVersion={version:LOCAL_VERSION,check:checkForUpdate,clearCaches:clearLegacyCaches,get updateAvailable(){return updateAvailable}};
function loadRuntimeScript(src,id){if(document.getElementById(id))return;const script=document.createElement('script');script.id=id;script.src=`${src}?v=${LOCAL_VERSION}`;script.defer=true;script.onerror=()=>console.warn(`Falha ao carregar ${src}`);document.head.append(script)}
function loadRuntimeStyle(href,id){if(document.getElementById(id))return;const link=document.createElement('link');link.id=id;link.rel='stylesheet';link.href=`${href}?v=${LOCAL_VERSION}`;document.head.append(link)}
loadRuntimeStyle('./mobile-pwa.css','wd-mobile-pwa-style');
loadRuntimeScript('./mobile-pwa.js','wd-mobile-pwa-runtime');
loadRuntimeScript('./navigation-state.js','wd-navigation-state-runtime');
loadRuntimeScript('./system-status.js','wd-system-status-runtime');
loadRuntimeScript('./system-status-bootstrap.js','wd-system-status-bootstrap');
async function registerWorker(){if(!('serviceWorker' in navigator))return null;const registration=await navigator.serviceWorker.register(`./sw.js?v=${LOCAL_VERSION}`,{scope:'./',updateViaCache:'none'});registration.update().catch(()=>{});return registration}
(async()=>{try{await clearLegacyCaches();registerWorker()}catch(error){console.warn('Service Worker não pôde ser ativado:',error)}checkForUpdate();setInterval(checkForUpdate,CHECK_INTERVAL);window.addEventListener('online',checkForUpdate)})();