/* WD Founder — sincronização imediata da navegação */
function routeFromLocation(){const page=new URL(location.href).searchParams.get('page');return ['home','store','rank','card','account'].includes(page)?page:'home'}
function setActiveRoute(route){document.querySelectorAll('[data-spa-route]').forEach(link=>{const active=link.dataset.spaRoute===route;link.classList.toggle('is-active',active);active?link.setAttribute('aria-current','page'):link.removeAttribute('aria-current')})}
function syncActiveRoute(){setActiveRoute(routeFromLocation())}
document.addEventListener('pointerdown',event=>{const link=event.target.closest('[data-spa-route]');if(link)setActiveRoute(link.dataset.spaRoute)},{capture:true,passive:true});
document.addEventListener('click',event=>{const link=event.target.closest('[data-spa-route]');if(link)setActiveRoute(link.dataset.spaRoute)},{capture:true,passive:true});
document.addEventListener('wd-spa-route',event=>setActiveRoute(event.detail?.route||routeFromLocation()));
document.addEventListener('wd-navigation-ready',event=>setActiveRoute(event.detail?.route||routeFromLocation()));
window.addEventListener('popstate',()=>requestAnimationFrame(syncActiveRoute));window.addEventListener('pageshow',()=>requestAnimationFrame(syncActiveRoute));
function prefetchRoutes(){['home','store','rank','card','account'].forEach(route=>fetch(`./views/${route}.html?v=3.41.0`,{cache:'force-cache'}).catch(()=>{}))}
syncActiveRoute();'requestIdleCallback'in window?requestIdleCallback(prefetchRoutes,{timeout:500}):setTimeout(prefetchRoutes,120);
