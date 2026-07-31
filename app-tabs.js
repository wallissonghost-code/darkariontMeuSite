const BUILD='20260731-1925';
const routes={home:'home.html',card:'cartao.html',store:'mercadorias.html',account:'perfil.html'};
const stage=document.getElementById('appStage');
const loader=document.getElementById('appLoader');
const nav=document.getElementById('appBottomNav');
let currentRoute='';
let currentFrame=null;
let navigationToken=0;
let firstPaintDone=false;

const temaValido=value=>value==='dark'||value==='light';
const normalizeRoute=value=>routes[value]?value:'home';
const routeFromHash=()=>normalizeRoute(location.hash.replace('#',''));
const temaAtual=()=>{
  const pageTheme=document.documentElement.dataset.theme;
  const savedTheme=localStorage.getItem('wd-theme');
  return temaValido(pageTheme)?pageTheme:(temaValido(savedTheme)?savedTheme:'light');
};

function routeUrl(route){
  return `${routes[route]}?embedded=1&tabActive=1&v=${BUILD}`;
}

function aplicarTemaNoFrame(frame,theme=temaAtual()){
  if(!frame)return;
  try{
    const doc=frame.contentDocument;
    if(doc){
      doc.documentElement.dataset.theme=theme;
      doc.documentElement.style.colorScheme=theme;
    }
    frame.contentWindow?.postMessage({type:'wd-theme-change',theme},location.origin);
  }catch(error){
    console.warn('Não foi possível sincronizar o tema da tela:',error);
  }
}

function sincronizarTema(theme){
  if(!temaValido(theme))return;
  document.documentElement.dataset.theme=theme;
  document.documentElement.style.colorScheme=theme;
  localStorage.setItem('wd-theme',theme);
  aplicarTemaNoFrame(currentFrame,theme);
}

function limparMenuExterno(){
  const menu=document.querySelector('.menu');
  if(!menu)return;
  menu.querySelectorAll('[data-app-route],.logout-btn,[data-action="logout"]').forEach(element=>element.remove());
  const hasAdmin=[...menu.querySelectorAll('.admin-only.is-visible')].some(element=>getComputedStyle(element).display!=='none');
  document.body.classList.toggle('app-menu-has-admin',hasAdmin);
}

function prepararFrame(frame){
  try{
    const doc=frame.contentDocument;
    if(!doc)return;
    doc.documentElement.dataset.embedded='true';
    doc.documentElement.dataset.tabActive='true';
    doc.querySelectorAll('.menu,.mobile-menu-trigger,.menu-backdrop,.client-bottom-nav,.app-bottom-nav,.app-loader').forEach(element=>element.remove());
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
    aplicarTemaNoFrame(frame);
  }catch(error){
    console.warn('Não foi possível preparar a tela:',error);
  }
}

function encerrarFrame(frame){
  if(!frame)return;
  try{
    frame.contentWindow?.postMessage({type:'wd-tab-lifecycle',active:false},location.origin);
    frame.contentWindow?.AppFirebase?.destroy?.();
  }catch(error){
    console.warn('Não foi possível encerrar completamente a tela anterior:',error);
  }
  frame.src='about:blank';
  frame.remove();
}

function updateNav(route){
  nav.querySelectorAll('[data-route]').forEach(link=>{
    const active=link.dataset.route===route;
    link.classList.toggle('is-active',active);
    if(active)link.setAttribute('aria-current','page');
    else link.removeAttribute('aria-current');
  });
}

function createFrame(route,token){
  const frame=document.createElement('iframe');
  frame.className='app-view is-active';
  frame.title=route;
  frame.dataset.route=route;
  frame.setAttribute('aria-hidden','false');
  frame.src=routeUrl(route);

  frame.addEventListener('load',()=>{
    if(token!==navigationToken||frame!==currentFrame)return;
    prepararFrame(frame);
    loader.classList.add('is-hidden');
    if(!firstPaintDone){
      firstPaintDone=true;
      document.body.classList.add('app-ready');
    }
  });

  stage.append(frame);
  return frame;
}

function showRoute(route,{push=true}={}){
  route=normalizeRoute(route);
  if(route===currentRoute&&currentFrame)return;

  const token=++navigationToken;
  const previousFrame=currentFrame;
  currentRoute=route;
  updateNav(route);

  // Cada rota possui somente um documento ativo. Remover o iframe anterior
  // encerra onSnapshot, onAuthStateChanged, timers e MutationObservers dele.
  currentFrame=createFrame(route,token);
  if(previousFrame)encerrarFrame(previousFrame);

  // O carregador aparece somente na primeira abertura do aplicativo.
  if(!firstPaintDone)loader.classList.remove('is-hidden');
  else loader.classList.add('is-hidden');

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
  const name=event.detail?.dados?.nome||event.detail?.user?.displayName||'WD';
  const avatar=String(name).trim().split(/\s+/).slice(0,2).map(part=>part[0]||'').join('').toUpperCase()||'WD';
  const avatarElement=document.getElementById('appNavAvatar');
  if(avatarElement)avatarElement.textContent=avatar;
  limparMenuExterno();
  sincronizarTema(event.detail?.dados?.tema||temaAtual());
});

window.addEventListener('pagehide',()=>encerrarFrame(currentFrame),{once:true});
window.addEventListener('beforeunload',()=>encerrarFrame(currentFrame),{once:true});

const menu=document.querySelector('.menu');
const menuObserver=new MutationObserver(limparMenuExterno);
if(menu)menuObserver.observe(menu,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style']});

sincronizarTema(temaAtual());
limparMenuExterno();
showRoute(routeFromHash(),{push:false});
