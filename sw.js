const RELEASE='wd-founder-3.50.0';
const STATIC_CACHE=`${RELEASE}-static`;
const RUNTIME_CACHE=`${RELEASE}-runtime`;
const OFFLINE_FALLBACK='./index.html';
const PRECACHE=['./app.html','./views/home.html','./splash-lite.css','./app-updater.js','./app-session.js','./app-shell.js','./spa.js','./firebase.js','./manifest.webmanifest','./index.html'];
async function precacheSafely(){const cache=await caches.open(STATIC_CACHE);await Promise.allSettled(PRECACHE.map(async url=>{const response=await fetch(url,{cache:'reload'});if(response.ok)await cache.put(url,response)}))}
self.addEventListener('install',event=>event.waitUntil(precacheSafely().then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(key=>key.startsWith('wd-founder-')&&!key.startsWith(RELEASE)).map(key=>caches.delete(key)));await self.clients.claim()})()));
async function cacheFirst(request){const cache=await caches.open(RUNTIME_CACHE);const cached=(await cache.match(request))||(await caches.match(request,{ignoreSearch:true}));if(cached){eventualRefresh(request,cache);return cached}try{const response=await fetch(request);if(response?.ok)cache.put(request,response.clone()).catch(()=>{});return response}catch{return request.mode==='navigate'?(await caches.match(OFFLINE_FALLBACK))||Response.error():Response.error()}}
function eventualRefresh(request,cache){setTimeout(()=>fetch(request,{cache:'no-cache'}).then(response=>{if(response?.ok)return cache.put(request,response.clone())}).catch(()=>{}),0)}
async function networkOnlyFresh(request){try{return await fetch(request,{cache:'no-store'})}catch{return(await caches.match(request,{ignoreSearch:true}))||Response.error()}}
self.addEventListener('fetch',event=>{const request=event.request;if(request.method!=='GET')return;const url=new URL(request.url);if(url.origin!==self.location.origin)return;if(url.pathname.endsWith('/version.json')||url.pathname.endsWith('/sw.js')){event.respondWith(networkOnlyFresh(request));return}event.respondWith(cacheFirst(request))});
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();if(event.data?.type==='CLEAR_OLD_CACHES')event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('wd-founder-')&&!key.startsWith(RELEASE)).map(key=>caches.delete(key)))))});
