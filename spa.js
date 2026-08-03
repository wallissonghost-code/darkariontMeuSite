const BUILD='3.2.0';
const routes={home:{title:'Início',view:'views/home.html',modules:['./home.js','./home-commerce.js']},card:{title:'Meu cartão',view:'views/card.html',modules:['./cartao.js','./offers.js']},store:{title:'Mercadorias',view:'views/store.html',modules:['./mercadorias.js','./stock-waiting-enhancer.js','./product-focus.js']},account:{title:'Minha conta',view:'views/account.html',modules:['./perfil.js']}};
const aliases={'home.html':'home','cartao.html':'card','ofertas.html':'card','mercadorias.html':'store','perfil.html':'account'};
const content=document.getElementById('conteudo'),loader=document.getElementById('spaLoader'),views=new Map(),loading=new Map(),htmlCache=new Map(),modulePreloads=new Set();let currentRoute='',navigationId=0,loaderTimer=null,sessionReady=false;
function normalizeRoute(value){return routes[value]?value:'home'}
function routeFromUrl(url=new URL(location.href)){const query=url.searchParams.get('page');if(routes[query])return query;const file=url.pathname.split('/').pop();return aliases[file]||'home'}
function routeUrl(route){const url=new URL('app.html',location.href);url.searchParams.set('page',route);return `${url.pathname}${url.search}`}
function setLoader(show,delayed=false){clearTimeout(loaderTimer);if(!show){loader.hidden=true;return}if(delayed)loaderTimer=setTimeout(()=>loader.hidden=false,260);else loader.hidden=false}
function updateNavigation(route){document.querySelectorAll('[data-spa-route]').forEach(link=>{const active=link.dataset.spaRoute===route;link.classList.toggle('is-active',active);if(active)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current')})}
function showPreparedRoute(route){const existing=views.get(route);if(!existing)return false;views.forEach((view,key)=>{const visible=key===route;view.hidden=!visible;view.setAttribute('aria-hidden',visible?'false':'true')});updateNavigation(route);document.getElementById('spaError')?.remove();document.body.classList.remove('unified-admin-active');return true}
function preloadModule(modulePath){const href=new URL(`${modulePath}?v=${BUILD}`,location.href).href;if(modulePreloads.has(href))return;modulePreloads.add(href);const link=document.createElement('link');link.rel='modulepreload';link.href=href;document.head.append(link)}
function preloadRouteModules(route){routes[route]?.modules.forEach(preloadModule)}
async function importModules(route){await Promise.all(routes[route].modules.map(modulePath=>import(`${modulePath}?v=${BUILD}`)))}
async function fetchViewHtml(route){if(htmlCache.has(route))return htmlCache.get(route);const response=await fetch(`${routes[route].view}?v=${BUILD}`,{cache:'force-cache'});if(!response.ok)throw new Error(`Tela não encontrada (${response.status})`);const html=await response.text();htmlCache.set(route,html);return html}
async function createView(route){if(views.has(route))return views.get(route);if(loading.has(route))return loading.get(route);const promise=(async()=>{preloadRouteModules(route);const html=await fetchViewHtml(route),section=document.createElement('section');section.className='spa-view';section.dataset.route=route;section.hidden=true;section.innerHTML=html;content.append(section);views.set(route,section);await importModules(route);section.dataset.ready='true';return section})().finally(()=>loading.delete(route));loading.set(route,promise);return promise}
function showError(route,error){console.error(`Falha ao abrir ${route}:`,error);document.getElementById('spaError')?.remove();const box=document.createElement('section');box.id='spaError';box.className='spa-error';box.innerHTML='<h2>Não foi possível abrir esta tela</h2><p>Verifique sua conexão e tente novamente.</p><button type="button">Tentar novamente</button>';box.querySelector('button').addEventListener('click',()=>{box.remove();navigate(route,{replace:true,force:true})});content.append(box)}
async function navigate(route,{push=false,replace=false,force=false}={}){
  if(!sessionReady)return;
  route=normalizeRoute(route);
  const sameRoute=route===currentRoute;
  const prepared=views.get(route);
  const needsRestore=sameRoute&&(prepared?.hidden||document.body.classList.contains('unified-admin-active'));
  if(sameRoute&&!force&&!needsRestore){updateNavigation(route);return}
  if(needsRestore&&!force){
    showPreparedRoute(route);
    document.title=`${routes[route].title} — WD Founder`;
    if(push)history.pushState({route},'',routeUrl(route));else if(replace)history.replaceState({route},'',routeUrl(route));
    window.scrollTo(0,0);
    document.dispatchEvent(new CustomEvent('wd-spa-route',{detail:{route,restored:true}}));
    return;
  }
  const id=++navigationId,alreadyPrepared=views.has(route)||htmlCache.has(route);
  updateNavigation(route);
  document.body.dataset.spaNavigating='true';
  setLoader(true,alreadyPrepared||views.size>0);
  try{
    const next=await createView(route);
    if(id!==navigationId)return;
    views.forEach((view,key)=>{const visible=key===route;view.hidden=!visible;view.setAttribute('aria-hidden',visible?'false':'true')});
    document.getElementById('spaError')?.remove();
    currentRoute=route;
    document.body.classList.remove('unified-admin-active');
    document.title=`${routes[route].title} — WD Founder`;
    if(push)history.pushState({route},'',routeUrl(route));else if(replace)history.replaceState({route},'',routeUrl(route));
    window.scrollTo(0,0);
    document.dispatchEvent(new CustomEvent('wd-spa-route',{detail:{route}}));
  }catch(error){if(id===navigationId)showError(route,error)}finally{if(id===navigationId){setLoader(false);delete document.body.dataset.spaNavigating}}
}
document.addEventListener('click',event=>{const routeLink=event.target.closest('[data-spa-route]');if(routeLink){event.preventDefault();navigate(routeLink.dataset.spaRoute,{push:true});return}const link=event.target.closest('a[href]');if(!link||link.target==='_blank'||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;const url=new URL(link.href,location.href);if(url.origin!==location.origin)return;const route=aliases[url.pathname.split('/').pop()];if(route){event.preventDefault();navigate(route,{push:true})}});
document.addEventListener('pointerdown',event=>{const link=event.target.closest('[data-spa-route]');if(!link)return;const route=normalizeRoute(link.dataset.spaRoute);preloadRouteModules(route);if(!htmlCache.has(route))fetchViewHtml(route).catch(()=>{});document.querySelectorAll('[data-spa-route].is-pressed').forEach(item=>item.classList.remove('is-pressed'));link.classList.add('is-pressed')},{passive:true});
document.addEventListener('pointerup',()=>document.querySelectorAll('[data-spa-route].is-pressed').forEach(item=>item.classList.remove('is-pressed')),{passive:true});
document.addEventListener('pointercancel',()=>document.querySelectorAll('[data-spa-route].is-pressed').forEach(item=>item.classList.remove('is-pressed')),{passive:true});
window.addEventListener('popstate',event=>navigate(event.state?.route||routeFromUrl()));
document.addEventListener('wd-role-ready',event=>{const name=event.detail?.dados?.nome||event.detail?.user?.displayName||'WD',initials=String(name).trim().split(/\s+/).slice(0,2).map(part=>part[0]||'').join('').toUpperCase()||'WD';document.querySelectorAll('[data-spa-avatar]').forEach(el=>el.textContent=initials)});
function carregarEstilo(href,attr){if(document.querySelector(`link[${attr}]`))return;const link=document.createElement('link');link.rel='stylesheet';link.href=href;link.setAttribute(attr,'true');document.head.append(link)}
function ativarVisualPremium(){carregarEstilo('mobile-nav-account-premium.css?v=1.0.0','data-mobile-premium');carregarEstilo('mobile-nav-fixed.css?v=1.0.0','data-mobile-fixed');carregarEstilo('store-sale-premium.css?v=1.0.0','data-store-sale-premium');carregarEstilo('store-pagination.css?v=1.0.0','data-store-pagination');carregarEstilo('store-luxury-v2.css?v=1.0.0','data-store-luxury-v2');carregarEstilo('size-stock-public.css?v=1.0.0','data-size-stock-public');carregarEstilo('member-commerce.css?v=1.0.5','data-member-commerce');carregarEstilo('theme-coherence.css?v=1.0.0','data-theme-coherence')}
ativarVisualPremium();
(async()=>{const state=await window.WDSession.ready;if(state.status!=='ready')return;sessionReady=true;document.documentElement.dataset.authState='ready';document.body.classList.add('wd-auth-ready');const initialRoute=routeFromUrl();preloadRouteModules(initialRoute);await navigate(initialRoute,{replace:true});setLoader(false)})().catch(error=>showError('home',error));