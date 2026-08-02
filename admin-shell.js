const routes={
  panel:'perfil-admin.html',
  purchase:'registrar-compra.html',
  history:'historico-vendas.html',
  stock:'estoque.html',
  store:'mercadorias-admin.html',
  performance:'desempenho.html',
  delete:'excluir-cliente.html'
};
const BUILD='2.3.7';
const nav=document.getElementById('adminAppNav'),frame=document.getElementById('adminAppFrame'),loader=document.getElementById('adminAppLoader'),trigger=document.getElementById('adminAppTrigger'),backdrop=document.getElementById('adminAppBackdrop');let currentRoute='',authorized=false,pendingRoute=null,readyTimer=null;
const normalize=value=>routes[value]?value:'panel',routeFromUrl=()=>normalize(new URLSearchParams(location.search).get('tool')),frameUrl=route=>`${routes[route]}?embeddedAdmin=1&v=${BUILD}`;
function closeMenu(){document.body.classList.remove('admin-menu-open')}
function updateActive(route){nav.querySelectorAll('[data-admin-route]').forEach(link=>{const active=link.dataset.adminRoute===route;link.classList.toggle('is-active',active);if(active)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current')})}
function prefetchRoute(route){const href=frameUrl(normalize(route));if(document.querySelector(`link[data-admin-prefetch="${route}"]`))return;const link=document.createElement('link');link.rel='prefetch';link.href=href;link.as='document';link.dataset.adminPrefetch=route;document.head.append(link)}
function prefetchTools(active){const work=()=>Object.keys(routes).filter(route=>route!==active).forEach(prefetchRoute);if('requestIdleCallback'in window)requestIdleCallback(work,{timeout:900});else setTimeout(work,250)}
function setFramePending(){clearTimeout(readyTimer);frame.classList.remove('is-ready');loader.classList.remove('is-hidden');readyTimer=setTimeout(()=>{console.warn('Ferramenta administrativa demorou para confirmar o layout pronto.');frame.classList.add('is-ready');loader.classList.add('is-hidden')},10000)}
function revealFrame(){clearTimeout(readyTimer);frame.classList.add('is-ready');requestAnimationFrame(()=>loader.classList.add('is-hidden'))}
function loadRoute(route,{push=true,force=false}={}){route=normalize(route);if(!authorized){pendingRoute={route,push,force};return}if(route===currentRoute&&!force)return;currentRoute=route;updateActive(route);closeMenu();setFramePending();frame.src=frameUrl(route);if(push){const url=new URL(location.href);url.searchParams.set('tool',route);history.pushState({route},'',url)}}
function startAuthorizedShell(){if(authorized)return;authorized=true;const next=pendingRoute||{route:routeFromUrl(),push:false};pendingRoute=null;loadRoute(next.route,{push:next.push,force:next.force});prefetchTools(next.route)}
nav.addEventListener('pointerdown',event=>{const link=event.target.closest('[data-admin-route]');if(!link)return;prefetchRoute(link.dataset.adminRoute);link.classList.add('is-pressed')},{passive:true});
nav.addEventListener('pointerup',()=>nav.querySelectorAll('.is-pressed').forEach(link=>link.classList.remove('is-pressed')),{passive:true});
nav.addEventListener('pointercancel',()=>nav.querySelectorAll('.is-pressed').forEach(link=>link.classList.remove('is-pressed')),{passive:true});
nav.addEventListener('click',event=>{const link=event.target.closest('[data-admin-route]');if(!link)return;event.preventDefault();loadRoute(link.dataset.adminRoute)});
frame.addEventListener('load',()=>{if(frame.contentWindow){try{frame.contentWindow.postMessage({type:'wd-admin-shell-request-ready'},location.origin)}catch(error){console.debug('Aguardando confirmação do iframe.',error)}}});
frame.addEventListener('error',()=>{clearTimeout(readyTimer);loader.classList.add('is-hidden');console.error('Falha ao carregar ferramenta administrativa.')});
trigger.addEventListener('click',()=>document.body.classList.toggle('admin-menu-open'));
backdrop.addEventListener('click',closeMenu);
window.addEventListener('popstate',()=>loadRoute(routeFromUrl(),{push:false}));
window.addEventListener('message',event=>{if(event.origin!==location.origin)return;if(event.data?.type==='wd-admin-return-member'){location.href='app.html?page=home';return}if(event.source===frame.contentWindow&&event.data?.type==='wd-admin-embedded-ready')revealFrame()});
document.addEventListener('wd-role-ready',event=>{if(event.detail?.admin===true)startAuthorizedShell()});
if(document.body.classList.contains('admin-authorized'))startAuthorizedShell();