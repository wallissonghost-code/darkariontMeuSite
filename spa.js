const BUILD='3.54.0';
const routes={
  home:{title:'Início',view:'views/home.html',modules:['./home.js','./home-commerce.js']},
  store:{title:'Mercadorias',view:'views/store.html',modules:['./store-fast.js']},
  rank:{title:'Rank',view:'views/rank.html',modules:['./rank.js']},
  card:{title:'Meu cartão',view:'views/card.html',modules:['./cartao.js','./offers.js']},
  account:{title:'Minha conta',view:'views/account.html',modules:['./perfil.js','./profile-frames.js']}
};
const aliases={'home.html':'home','mercadorias.html':'store','rank.html':'rank','cartao.html':'card','ofertas.html':'card','perfil.html':'account'};
const criticalStyle=document.createElement('style');
criticalStyle.dataset.wdCriticalShell='true';
criticalStyle.textContent=`
.nav-icon-svg,.spa-nav-icon{display:block;width:24px!important;height:24px!important;max-width:24px!important;max-height:24px!important;fill:none;stroke:currentColor;stroke-width:1.8}
.spa-bottom-nav svg{width:24px!important;height:24px!important}
@media(min-width:901px){.spa-bottom-nav{display:none!important}}
@media(max-width:900px){.spa-sidebar{display:none!important}}
html[data-ui-ready="true"] .spa-shell,html[data-ui-ready="true"] .spa-main,html[data-ui-ready="true"] .spa-bottom-nav{visibility:visible!important}
html[data-ui-ready="true"] .spa-loader{opacity:0!important;visibility:hidden!important;pointer-events:none!important}
`;
document.head.append(criticalStyle);

const content=document.getElementById('conteudo');
const loader=document.getElementById('spaLoader');
const views=new Map();
const viewPromises=new Map();
const modulePromises=new Map();
let currentRoute='';
let navigationId=0;

const normalizeRoute=value=>routes[value]?value:'home';
function routeFromUrl(url=new URL(location.href)){const query=url.searchParams.get('page');if(routes[query])return query;return aliases[url.pathname.split('/').pop()]||'home'}
function routeUrl(route){const url=new URL('app.html',location.href);url.searchParams.set('page',route);url.searchParams.delete('_wd');return`${url.pathname}${url.search}`}
function hideLoader(){if(loader)loader.hidden=true}
function revealShell(){if(document.documentElement.dataset.uiReady==='true')return;document.documentElement.dataset.uiReady='true';requestAnimationFrame(hideLoader)}
function closeAdminPanel(){document.body.classList.remove('spa-admin-open');const trigger=document.querySelector('[data-admin-tools-trigger]');trigger?.setAttribute('aria-expanded','false');trigger?.classList.remove('is-active','active','selected','is-selected');trigger?.removeAttribute('aria-current')}
function updateNavigation(route){
  document.querySelectorAll('[data-spa-route]').forEach(link=>{
    const active=link.dataset.spaRoute===route;
    link.classList.toggle('is-active',active);
    link.classList.toggle('active',active);
    active?link.setAttribute('aria-current','page'):link.removeAttribute('aria-current');
  });
  document.dispatchEvent(new CustomEvent('wd-navigation-ready',{detail:{route}}));
}
async function ensureView(route){
  if(views.has(route))return views.get(route);
  if(viewPromises.has(route))return viewPromises.get(route);
  const task=(async()=>{
    const response=await fetch(`${routes[route].view}?v=${BUILD}`,{cache:'default'});
    if(!response.ok)throw new Error(`Tela não encontrada (${response.status})`);
    const section=document.createElement('section');
    section.className='spa-view';section.dataset.route=route;section.hidden=true;section.style.display='none';
    section.innerHTML=await response.text();content.append(section);views.set(route,section);return section;
  })().finally(()=>viewPromises.delete(route));
  viewPromises.set(route,task);return task;
}
function ensureModules(route){
  if(modulePromises.has(route))return modulePromises.get(route);
  const task=(async()=>{
    await ensureView(route);
    for(const path of routes[route].modules)await import(`${path}?v=${BUILD}`);
    views.get(route)?.setAttribute('data-ready','true');
  })().catch(error=>{modulePromises.delete(route);throw error});
  modulePromises.set(route,task);return task;
}
function displayRoute(route){views.forEach((view,key)=>{const visible=key===route;view.hidden=!visible;view.style.display=visible?'block':'none';view.setAttribute('aria-hidden',visible?'false':'true')})}
function showViewError(route,error){console.error(`Falha ao abrir ${route}:`,error);document.getElementById('spaError')?.remove();const box=document.createElement('section');box.id='spaError';box.className='spa-error';box.innerHTML='<h2>Não foi possível abrir esta tela</h2><p>Verifique sua conexão e tente novamente.</p><button type="button">Tentar novamente</button>';box.querySelector('button').onclick=()=>{box.remove();navigate(route,{replace:true,force:true})};content.append(box);revealShell()}
function reportModuleError(route,error){console.warn(`Conteúdo dinâmico de ${route} indisponível:`,error);views.get(route)?.setAttribute('data-module-error','true');document.dispatchEvent(new CustomEvent('wd-route-module-error',{detail:{route,error}}))}
async function paintRoute(value,{push=false,replace=false,force=false}={}){
  const route=normalizeRoute(value);
  if(route===currentRoute&&!force&&views.has(route)&&!document.body.classList.contains('unified-admin-active')){closeAdminPanel();updateNavigation(route);ensureModules(route).catch(error=>reportModuleError(route,error));return}
  const id=++navigationId;currentRoute=route;closeAdminPanel();updateNavigation(route);document.body.dataset.spaNavigating='true';
  try{
    await ensureView(route);if(id!==navigationId)return;
    displayRoute(route);document.getElementById('spaError')?.remove();document.body.classList.remove('unified-admin-active');document.title=`${routes[route].title} — WD Founder`;
    if(push)history.pushState({route},'',routeUrl(route));else if(replace)history.replaceState({route},'',routeUrl(route));
    window.scrollTo({top:0,left:0,behavior:'auto'});document.dispatchEvent(new CustomEvent('wd-spa-route',{detail:{route}}));revealShell();
    ensureModules(route).catch(error=>reportModuleError(route,error));
  }catch(error){if(id===navigationId)showViewError(route,error)}finally{if(id===navigationId)delete document.body.dataset.spaNavigating}
}
function navigate(value,options={}){return paintRoute(value,options)}
function warmView(route){if(route===currentRoute||views.has(route))return;ensureView(route).catch(()=>{})}
document.addEventListener('pointerdown',event=>{const link=event.target.closest('[data-spa-route]');if(!link)return;const route=normalizeRoute(link.dataset.spaRoute);closeAdminPanel();updateNavigation(route);warmView(route)},{capture:true,passive:true});
document.addEventListener('click',event=>{const link=event.target.closest('[data-spa-route]');if(link){event.preventDefault();navigate(link.dataset.spaRoute,{push:true});return}const anchor=event.target.closest('a[href]');if(!anchor||anchor.target==='_blank'||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;const url=new URL(anchor.href,location.href);if(url.origin!==location.origin)return;const route=aliases[url.pathname.split('/').pop()];if(route){event.preventDefault();navigate(route,{push:true})}});
window.addEventListener('popstate',event=>navigate(event.state?.route||routeFromUrl()));
window.addEventListener('pageshow',()=>requestAnimationFrame(()=>updateNavigation(routeFromUrl())),{passive:true});
document.addEventListener('wd-role-ready',event=>{const name=event.detail?.dados?.nome||event.detail?.user?.displayName||'WD',initials=String(name).trim().split(/\s+/).slice(0,2).map(part=>part[0]||'').join('').toUpperCase()||'WD';document.querySelectorAll('[data-spa-avatar]').forEach(element=>element.textContent=initials)});
function loadStyle(file,id){if(document.getElementById(id))return;const link=document.createElement('link');link.id=id;link.rel='stylesheet';link.href=`${file}?v=${BUILD}`;document.head.append(link)}
['mobile-nav-account-premium.css','mobile-nav-fixed.css','member-commerce.css'].forEach((file,index)=>loadStyle(file,`wd-critical-style-${index}`));
const initialRoute=routeFromUrl();paintRoute(initialRoute,{replace:true});setTimeout(revealShell,650);
