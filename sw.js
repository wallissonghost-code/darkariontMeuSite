const RELEASE='wd-founder-3.7.1';
const STATIC_CACHE=`${RELEASE}-static`;
const RUNTIME_CACHE=`${RELEASE}-runtime`;
const OFFLINE_FALLBACK='index.html';
const PRECACHE=['./','./index.html','./app.html','./version.json'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(STATIC_CACHE).then(cache=>cache.addAll(PRECACHE)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(key=>key.startsWith('wd-founder-')&&!key.startsWith(RELEASE)).map(key=>caches.delete(key)));await self.clients.claim()})())});
function isHtmlRequest(request,url){return request.mode==='navigate'||request.destination==='document'||url.pathname.endsWith('.html')||url.pathname.includes('/views/')}
async function networkFirst(request){const cache=await caches.open(RUNTIME_CACHE);try{const response=await fetch(request,{cache:'no-store'});if(response?.ok)await cache.put(request,response.clone());return response}catch(error){return(await cache.match(request))||(await caches.match(OFFLINE_FALLBACK))||Response.error()}}
async function staleWhileRevalidate(request){const cache=await caches.open(RUNTIME_CACHE);const cached=await cache.match(request);const network=fetch(request,{cache:'no-cache'}).then(async response=>{if(response?.ok)await cache.put(request,response.clone());return response}).catch(()=>null);return cached||(await network)||Response.error()}
self.addEventListener('fetch',event=>{const request=event.request;if(request.method!=='GET')return;const url=new URL(request.url);if(url.origin!==self.location.origin)return;if(url.pathname.endsWith('/version.json')||url.pathname.endsWith('/sw.js')||isHtmlRequest(request,url)){event.respondWith(networkFirst(request));return}event.respondWith(staleWhileRevalidate(request))});
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();if(event.data?.type==='CLEAR_OLD_CACHES'){event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('wd-founder-')&&!key.startsWith(RELEASE)).map(key=>caches.delete(key)))))} });