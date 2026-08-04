const LOCAL_VERSION='3.9.5';
const VERSION_KEY='wd-app-version';
const CHECK_INTERVAL=10*60*1000;
let updateAvailable=false;

async function clearLegacyCaches(){
  if(!('caches' in window))return;
  const keys=await caches.keys();
  await Promise.all(keys.filter(key=>key.startsWith('wd-founder-')&&!key.includes(LOCAL_VERSION)).map(key=>caches.delete(key)));
}

async function registerWorker(){
  if(!('serviceWorker' in navigator))return null;
  const registration=await navigator.serviceWorker.register(`./sw.js?v=${LOCAL_VERSION}`,{scope:'./',updateViaCache:'none'});
  await registration.update().catch(()=>{});
  return registration;
}

async function publishedVersion(){
  const response=await fetch(`./version.json?t=${Date.now()}`,{cache:'no-store'});
  if(!response.ok)throw new Error(`version ${response.status}`);
  return response.json();
}

async function checkForUpdate(){
  try{
    const remote=await publishedVersion();
    const version=String(remote.version||'').trim();
    if(!version)return false;
    localStorage.setItem(VERSION_KEY,version);
    updateAvailable=version!==LOCAL_VERSION;
    return updateAvailable;
  }catch(error){
    console.warn('Verificação de versão indisponível:',error);
    return false;
  }
}

(async()=>{
  try{
    await clearLegacyCaches();
    await registerWorker();
  }catch(error){
    console.warn('Service Worker não pôde ser ativado:',error);
  }
  await checkForUpdate();
  setInterval(checkForUpdate,CHECK_INTERVAL);
  window.addEventListener('online',checkForUpdate);
})();

window.WDAppVersion={
  version:LOCAL_VERSION,
  check:checkForUpdate,
  clearCaches:clearLegacyCaches,
  get updateAvailable(){return updateAvailable}
};
