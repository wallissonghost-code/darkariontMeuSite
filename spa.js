const BUILD='3.9.0';

const routes={
  home:{title:'Início',view:'views/home.html',modules:['./home.js','./home-commerce.js']},
  store:{title:'Mercadorias',view:'views/store.html',modules:['./store-controller.js']},
  rank:{title:'Rank',view:'views/rank.html',modules:['./rank.js']},
  card:{title:'Meu cartão',view:'views/card.html',modules:['./cartao.js','./offers.js']},
  account:{title:'Minha conta',view:'views/account.html',modules:['./perfil.js']}
};
const aliases={'home.html':'home','mercadorias.html':'store','rank.html':'rank','cartao.html':'card','ofertas.html':'card','perfil.html':'account'};
const content=document.getElementById('conteudo');
const loader=document.getElementById('spaLoader');
const views=new Map();
const viewPromises=new Map();
const modulePromises=new Map();
let currentRoute='';
let sessionReady=false;
let navigationId=0;
let loaderTimer=0;
function normalizeRoute(value){return routes[value]?value:'home'}
function routeFromUrl(url=new URL(location.href)){const query=url.searchParams.get('page');if(routes[query])return query;return aliases[url.pathname.split('/').pop()]||'home'}
function routeUrl(route){const url=new URL('app.html',location.href);url.searchParams.set('page',route);url.searchParams.delete('_wd');return `${url.pathname}${url.search}`}
function showLoaderDelayed(){clearTimeout(loaderTimer);loaderTimer=setTimeout(()=>{if(loader)loader.hidden=false},180)}
function hideLoader(){clearTimeout(loaderTimer);if(loader)loader.hidden=true}
function updateNavigation(route){document.querySelectorAll('[data-spa-route]').forEach(link=>{const active=link.dataset.spaRoute===route;link.classList.toggle('is-active',active);if(active)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current')});document.dispatchEvent(new CustomEvent('wd-navigation-ready',{detail:{route}}))}
async function fetchView(route){const response=await fetch(`${routes[route].view}?v=${BUILD}`,{cache:'force-cache'});if(!response.ok)throw new Error(`Tela não encontrada (${response.status})`);return response.text()}
async function ensureView(route){if(views.has(route))return views.get(route);if(viewPromises.has(route))return viewPromises.get(route);const task=(async()=>{const html=await fetchView(route);const section=document.createElement('section');section.className='spa-view';section.dataset.route=route;section.hidden=true;section.style.display='none';section.innerHTML=html;content.append(section);views.set(route,section);return section})().finally(()=>viewPromises.delete(route));viewPromises.set(route,task);return task}
function ensureModules(route){if(modulePromises.has(route))return modulePromises.get(route);const task=(async()=>{await ensureView(route);for(const modulePath of routes[route].modules)await import(`${modulePath}?v=${BUILD}`);const view=views.get(route);if(view)view.dataset.ready='true'})();modulePromises.set(route,task);return task}
function displayRoute(route){views.forEach((view,key)=>{const visible=key===route;view.hidden=!visible;view.style.display=visible?'block':'none';view.setAttribute('aria-hidden',visible?'false':'true')})}
function showError(route,error){console.error(`Falha ao abrir ${route}:`,error);document.getElementById('spaError')?.remove();const box=document.createElement('section');box.id='spaError';box.className='spa-error';box.innerHTML='<h2>Não foi possível abrir esta tela</h2><p>Verifique sua conexão e tente novamente.</p><button type="button">Tentar novamente</button>';box.querySelector('button').addEventListener('click',()=>{box.remove();navigate(route,{replace:true,force:true})});content.append(box)}
async function navigate(value,{push=false,replace=false,force=false}={}){if(!sessionReady)return;const route=normalizeRoute(value);if(route===currentRoute&&!force&&!document.body.classList.contains('unified-admin-active')){updateNavigation(route);return}const id=++navigationId;updateNavigation(route);document.body.dataset.spaNavigating='true';showLoaderDelayed();try{await ensureView(route);if(id!==navigationId)return;displayRoute(route);document.getElementById('spaError')?.remove();document.body.classList.remove('unified-admin-active');currentRoute=route;document.title=`${routes[route].title} — WD Founder`;if(push)history.pushState({route},'',routeUrl(route));else if(replace)history.replaceState({route},'',routeUrl(route));window.scrollTo({top:0,left:0,behavior:'auto'});hideLoader();document.dispatchEvent(new CustomEvent('wd-spa-route',{detail:{route}}));ensureModules(route).catch(error=>showError(route,error))}catch(error){if(id===navigationId)showError(route,error)}finally{if(id===navigationId){hideLoader();delete document.body.dataset.spaNavigating}}}
function warmRoute(route,{modules=false}={}){if(route===currentRoute)return Promise.resolve();return ensureView(route).then(()=>modules?ensureModules(route):null).catch(error=>console.warn(`Pré-carregamento de ${route} falhou:`,error))}
function scheduleWarmup(){const queue=Object.keys(routes).filter(route=>route!==currentRoute);Promise.allSettled(queue.map(route=>warmRoute(route)));const warmModules=()=>queue.forEach((route,index)=>setTimeout(()=>warmRoute(route,{modules:true}),index*160));if('requestIdleCallback'in window)requestIdleCallback(warmModules,{timeout:1200});else setTimeout(warmModules,500)}
document.addEventListener('pointerdown',event=>{const link=event.target.closest('[data-spa-route]');if(!link)return;const route=normalizeRoute(link.dataset.spaRoute);updateNavigation(route);warmRoute(route,{modules:true})},{capture:true,passive:true});
document.addEventListener('click',event=>{const routeLink=event.target.closest('[data-spa-route]');if(routeLink){event.preventDefault();navigate(routeLink.dataset.spaRoute,{push:true});return}const link=event.target.closest('a[href]');if(!link||link.target==='_blank'||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;const url=new URL(link.href,location.href);if(url.origin!==location.origin)return;const route=aliases[url.pathname.split('/').pop()];if(route){event.preventDefault();navigate(route,{push:true})}});
window.addEventListener('popstate',event=>navigate(event.state?.route||routeFromUrl()));
document.addEventListener('wd-role-ready',event=>{const name=event.detail?.dados?.nome||event.detail?.user?.displayName||'WD';const initials=String(name).trim().split(/\s+/).slice(0,2).map(part=>part[0]||'').join('').toUpperCase()||'WD';document.querySelectorAll('[data-spa-avatar]').forEach(element=>element.textContent=initials)});
function loadStyle(href,attribute){if(document.querySelector(`link[${attribute}]`))return;const link=document.createElement('link');link.rel='stylesheet';link.href=href;link.setAttribute(attribute,'true');document.head.append(link)}
function loadPremiumStyles(){loadStyle(`mobile-nav-account-premium.css?v=${BUILD}`,'data-mobile-premium');loadStyle(`mobile-nav-fixed.css?v=${BUILD}`,'data-mobile-fixed');loadStyle(`store-sale-premium.css?v=${BUILD}`,'data-store-sale-premium');loadStyle(`store-pagination.css?v=${BUILD}`,'data-store-pagination');loadStyle(`store-luxury-v2.css?v=${BUILD}`,'data-store-luxury-v2');loadStyle(`store-showcase-v3.css?v=${BUILD}`,'data-store-showcase-v3');loadStyle(`size-stock-public.css?v=${BUILD}`,'data-size-stock-public');loadStyle(`member-commerce.css?v=${BUILD}`,'data-member-commerce');loadStyle(`theme-coherence.css?v=${BUILD}`,'data-theme-coherence');loadStyle(`store-premium-v5.css?v=${BUILD}`,'data-store-premium-v5');loadStyle(`rank-premium.css?v=${BUILD}`,'data-rank-premium');loadStyle(`store-rank-final-376.css?v=${BUILD}`,'data-store-rank-final-376');loadStyle(`rank-access-rewards.css?v=${BUILD}`,'data-rank-access-rewards')}
loadPremiumStyles();
(async()=>{const state=await window.WDSession.ready;if(state.status!=='ready')return;sessionReady=true;document.documentElement.dataset.authState='ready';document.body.classList.add('wd-auth-ready');await navigate(routeFromUrl(),{replace:true});hideLoader();scheduleWarmup()})().catch(error=>showError('home',error));
