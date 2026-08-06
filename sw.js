const RELEASE='wd-founder-3.54.0';
const STATIC_CACHE=`${RELEASE}-static`;
const RUNTIME_CACHE=`${RELEASE}-runtime`;
const OFFLINE_FALLBACK='./index.html';
const PRECACHE=['./app.html','./views/home.html','./views/store.html','./splash-lite.css','./mobile-nav-fixed.css','./mobile-nav-account-premium.css','./member-commerce.css','./mobile-pwa.css','./app-updater.js','./app-session.js','./app-shell.js','./spa.js','./store-fast.js','./firebase.js','./manifest.webmanifest','./index.html'];

async function precacheSafely(){
  const cache=await caches.open(STATIC_CACHE);
  await Promise.allSettled(PRECACHE.map(async url=>{
    try{const response=await fetch(url,{cache:'reload'});if(response.ok)await cache.put(url,response)}catch{}
  }));
}
self.addEventListener('install',event=>event.waitUntil(precacheSafely().then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(key=>key.startsWith('wd-founder-')&&!key.startsWith(RELEASE)).map(key=>caches.delete(key)));
  await self.clients.claim();
})()));

async function staleWhileRevalidate(request){
  const cache=await caches.open(RUNTIME_CACHE);
  const cached=(await cache.match(request))||(await caches.match(request,{ignoreSearch:true}));
  const network=fetch(request,{cache:'no-cache'}).then(response=>{
    if(response?.ok)cache.put(request,response.clone()).catch(()=>{});
    return response;
  });
  if(cached){network.catch(()=>{});return cached}
  try{return await network}catch{return request.mode==='navigate'?(await caches.match(OFFLINE_FALLBACK))||Response.error():Response.error()}
}
async function networkFresh(request){
  try{
    const response=await fetch(request,{cache:'no-store'});
    if(response?.ok){const cache=await caches.open(RUNTIME_CACHE);cache.put(request,response.clone()).catch(()=>{})}
    return response;
  }catch{return(await caches.match(request,{ignoreSearch:true}))||Response.error()}
}
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;
  const critical=/\/(version\.json|sw\.js|app-updater\.js|app-session\.js|app-shell\.js|spa\.js|store-fast\.js)$/.test(url.pathname);
  event.respondWith(critical?networkFresh(request):staleWhileRevalidate(request));
});
self.addEventListener('message',event=>{
  if(event.data?.type==='SKIP_WAITING')self.skipWaiting();
  if(event.data?.type==='CLEAR_OLD_CACHES')event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('wd-founder-')&&!key.startsWith(RELEASE)).map(key=>caches.delete(key)))));
});
