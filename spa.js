const BUILD='20260801-0830';
const routes={
  home:{title:'Início',view:'views/home.html',modules:['./home.js']},
  card:{title:'Meu cartão',view:'views/card.html',modules:['./cartao.js','./offers.js']},
  store:{title:'Mercadorias',view:'views/store.html',modules:['./mercadorias.js']},
  account:{title:'Minha conta',view:'views/account.html',modules:['./perfil.js']}
};
const aliases={'home.html':'home','cartao.html':'card','ofertas.html':'card','mercadorias.html':'store','perfil.html':'account'};
const content=document.getElementById('conteudo');
const loader=document.getElementById('spaLoader');
const views=new Map();
const loading=new Map();
let currentRoute='';
let navigationId=0;
let loaderTimer=null;

function normalizeRoute(value){return routes[value]?value:'home'}
function routeFromUrl(url=new URL(location.href)){
  const query=url.searchParams.get('page');
  if(routes[query])return query;
  const file=url.pathname.split('/').pop();
  return aliases[file]||'home';
}
function routeUrl(route){const url=new URL('app.html',location.href);url.searchParams.set('page',route);return `${url.pathname}${url.search}`}
function setLoader(show,delayed=false){
  clearTimeout(loaderTimer);
  if(!show){loader.hidden=true;return}
  if(delayed)loaderTimer=setTimeout(()=>loader.hidden=false,180);else loader.hidden=false;
}
function updateNavigation(route){
  document.querySelectorAll('[data-spa-route]').forEach(link=>{
    const active=link.dataset.spaRoute===route;
    link.classList.toggle('is-active',active);
    if(active)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
  });
}
async function importModules(route){
  const config=routes[route];
  for(const modulePath of config.modules){
    await import(`${modulePath}?spa=${BUILD}-${route}`);
  }
}
async function createView(route){
  if(views.has(route))return views.get(route);
  if(loading.has(route))return loading.get(route);
  const promise=(async()=>{
    const response=await fetch(`${routes[route].view}?v=${BUILD}`,{cache:'no-store'});
    if(!response.ok)throw new Error(`Tela não encontrada (${response.status})`);
    const html=await response.text();
    const section=document.createElement('section');
    section.className='spa-view';
    section.dataset.route=route;
    section.hidden=true;
    section.innerHTML=html;
    content.append(section);
    views.set(route,section);
    await importModules(route);
    section.dataset.ready='true';
    return section;
  })().finally(()=>loading.delete(route));
  loading.set(route,promise);
  return promise;
}
function showError(route,error){
  console.error(`Falha ao abrir ${route}:`,error);
  const old=document.getElementById('spaError');old?.remove();
  const box=document.createElement('section');box.id='spaError';box.className='spa-error';
  box.innerHTML='<h2>Não foi possível abrir esta tela</h2><p>Verifique sua conexão e tente novamente.</p><button type="button">Tentar novamente</button>';
  box.querySelector('button').addEventListener('click',()=>{box.remove();navigate(route,{replace:true,force:true})});
  content.append(box);
}
async function navigate(route,{push=false,replace=false,force=false}={}){
  route=normalizeRoute(route);
  if(route===currentRoute&&!force)return;
  const id=++navigationId;
  updateNavigation(route);
  setLoader(true,views.size>0);
  try{
    const next=await createView(route);
    if(id!==navigationId)return;
    views.forEach((view,key)=>{view.hidden=key!==route;view.setAttribute('aria-hidden',key===route?'false':'true')});
    document.getElementById('spaError')?.remove();
    currentRoute=route;
    document.title=`${routes[route].title} — WD Founder`;
    if(push)history.pushState({route},'',routeUrl(route));
    else if(replace)history.replaceState({route},'',routeUrl(route));
    window.scrollTo({top:0,left:0,behavior:'instant'});
    document.dispatchEvent(new CustomEvent('wd-spa-route',{detail:{route}}));
  }catch(error){if(id===navigationId)showError(route,error)}finally{if(id===navigationId)setLoader(false)}
}

document.addEventListener('click',event=>{
  const routeLink=event.target.closest('[data-spa-route]');
  if(routeLink){event.preventDefault();navigate(routeLink.dataset.spaRoute,{push:true});return}
  const link=event.target.closest('a[href]');
  if(!link||link.target==='_blank'||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  const url=new URL(link.href,location.href);
  if(url.origin!==location.origin)return;
  const route=aliases[url.pathname.split('/').pop()];
  if(route){event.preventDefault();navigate(route,{push:true})}
});
window.addEventListener('popstate',event=>navigate(event.state?.route||routeFromUrl(),{replace:false}));
document.addEventListener('wd-role-ready',event=>{
  const name=event.detail?.dados?.nome||event.detail?.user?.displayName||'WD';
  const initials=String(name).trim().split(/\s+/).slice(0,2).map(part=>part[0]||'').join('').toUpperCase()||'WD';
  document.querySelectorAll('[data-spa-avatar]').forEach(el=>el.textContent=initials);
});

navigate(routeFromUrl(),{replace:true});
