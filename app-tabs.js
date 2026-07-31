const BUILD='20260731-1830';
const routes={
  home:`home.html?embedded=1&v=${BUILD}`,
  card:`cartao.html?embedded=1&v=${BUILD}`,
  store:`mercadorias.html?embedded=1&v=${BUILD}`,
  account:`perfil.html?embedded=1&v=${BUILD}`
};

const stage=document.getElementById('appStage');
const loader=document.getElementById('appLoader');
const nav=document.getElementById('appBottomNav');
const frames=new Map();
const readyPromises=new Map();
let currentRoute='';
let firstPaintDone=false;

const temaValido=v=>v==='dark'||v==='light';
const normalizeRoute=value=>routes[value]?value:'home';
const routeFromHash=()=>normalizeRoute(location.hash.replace('#',''));
const temaAtual=()=>{
  const data=document.documentElement.dataset.theme;
  const saved=localStorage.getItem('wd-theme');
  return temaValido(data)?data:(temaValido(saved)?saved:'light');
};

function aplicarTemaNoFrame(frame,tema=temaAtual()){
  try{
    const doc=frame.contentDocument;
    if(doc){
      doc.documentElement.dataset.theme=tema;
      doc.documentElement.style.colorScheme=tema;
    }
    frame.contentWindow?.postMessage({type:'wd-theme-change',theme:tema},location.origin);
  }catch(error){
    console.warn('Não foi possível sincronizar o tema da aba:',error);
  }
}

function sincronizarTema(tema){
  if(!temaValido(tema))return;
  document.documentElement.dataset.theme=tema;
  document.documentElement.style.colorScheme=tema;
  localStorage.setItem('wd-theme',tema);
  frames.forEach(frame=>aplicarTemaNoFrame(frame,tema));
}

function limparMenuExterno(){
  const menu=document.querySelector('.menu');
  if(!menu)return;
  menu.querySelectorAll('[data-app-route],.logout-btn,[data-action="logout"]').forEach(el=>el.remove());
  const temAdmin=[...menu.querySelectorAll('.admin-only.is-visible')].some(el=>getComputedStyle(el).display!=='none');
  document.body.classList.toggle('app-menu-has-admin',temAdmin);
}

function cleanEmbeddedFrame(frame){
  try{
    const doc=frame.contentDocument;
    if(!doc)return;
    doc.documentElement.dataset.embedded='true';
    const hide=()=>{
      doc.querySelectorAll('.menu,.mobile-menu-trigger,.menu-backdrop,.client-bottom-nav,.app-bottom-nav,.app-loader').forEach(el=>el.remove());
      const main=doc.querySelector('.conteudo');
      if(main){
        main.style.paddingTop='24px';
        main.style.paddingBottom='34px';
        main.style.minHeight='100%';
        main.style.width='100%';
      }
      doc.body.style.paddingBottom='0';
      doc.body.style.overflowX='hidden';
      doc.body.style.overflowY='auto';
      doc.body.style.minHeight='100%';
    };
    hide();
    aplicarTemaNoFrame(frame);
    const observer=new MutationObserver(()=>{
      hide();
      aplicarTemaNoFrame(frame);
    });
    observer.observe(doc.body,{childList:true,subtree:true});
    frame._wdObserver?.disconnect?.();
    frame._wdObserver=observer;
  }catch(error){
    console.warn('Não foi possível preparar a aba:',error);
  }
}

function ensureFrame(route){
  if(frames.has(route))return frames.get(route);

  let resolveReady;
  const ready=new Promise(resolve=>{resolveReady=resolve});
  readyPromises.set(route,ready);

  const frame=document.createElement('iframe');
  frame.className='app-view';
  frame.title=route;
  frame.loading='eager';
  frame.src=routes[route];
  frame.dataset.route=route;
  frame.dataset.ready='false';

  frame.addEventListener('load',()=>{
    cleanEmbeddedFrame(frame);
    frame.dataset.ready='true';
    resolveReady?.(frame);
    if(route===currentRoute&&!firstPaintDone){
      firstPaintDone=true;
      loader.classList.add('is-hidden');
      document.body.classList.add('app-ready');
    }
  },{once:true});

  stage.append(frame);
  frames.set(route,frame);
  return frame;
}

function preloadAll(){
  Object.keys(routes).forEach(ensureFrame);
}

function updateNav(route){
  nav.querySelectorAll('[data-route]').forEach(link=>{
    const active=link.dataset.route===route;
    link.classList.toggle('is-active',active);
    link.setAttribute('aria-current',active?'page':'false');
  });
}

function activateRoute(route){
  frames.forEach((frame,key)=>{
    const active=key===route;
    frame.classList.toggle('is-active',active);
    frame.hidden=!active;
    frame.setAttribute('aria-hidden',active?'false':'true');
  });
}

function showRoute(route,{push=true}={}){
  route=normalizeRoute(route);
  if(route===currentRoute)return;

  currentRoute=route;
  updateNav(route);
  ensureFrame(route);
  activateRoute(route);
  aplicarTemaNoFrame(frames.get(route));

  if(push&&location.hash!==`#${route}`){
    history.pushState({route},'',`#${route}`);
  }
}

nav.addEventListener('click',event=>{
  const link=event.target.closest('[data-route]');
  if(!link)return;
  event.preventDefault();
  showRoute(link.dataset.route);
});

window.addEventListener('popstate',()=>showRoute(routeFromHash(),{push:false}));
window.addEventListener('hashchange',()=>showRoute(routeFromHash(),{push:false}));
window.addEventListener('message',event=>{
  if(event.origin!==location.origin||event.data?.type!=='wd-theme-change'||!temaValido(event.data?.theme))return;
  sincronizarTema(event.data.theme);
});
window.addEventListener('storage',event=>{
  if(event.key==='wd-theme'&&temaValido(event.newValue))sincronizarTema(event.newValue);
});
document.addEventListener('wd-theme-ready',event=>sincronizarTema(event.detail?.theme));
document.addEventListener('wd-role-ready',event=>{
  const nome=event.detail?.dados?.nome||event.detail?.user?.displayName||'WD';
  const avatar=String(nome).trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase()||'WD';
  const el=document.getElementById('appNavAvatar');
  if(el)el.textContent=avatar;
  limparMenuExterno();
  sincronizarTema(event.detail?.dados?.tema||temaAtual());
});

const menu=document.querySelector('.menu');
const menuObserver=new MutationObserver(limparMenuExterno);
if(menu)menuObserver.observe(menu,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style']});

sincronizarTema(temaAtual());
limparMenuExterno();
preloadAll();
showRoute(routeFromHash(),{push:false});
