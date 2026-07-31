const BUILD='20260731-1950';
const routes={home:'home.html',card:'cartao.html',store:'mercadorias.html',account:'perfil.html'};
const stage=document.getElementById('appStage');
const loader=document.getElementById('appLoader');
const nav=document.getElementById('appBottomNav');
const frames=new Map();
let currentRoute='';
let navigationToken=0;
let firstPaintDone=false;

const temaValido=value=>value==='dark'||value==='light';
const normalizeRoute=value=>routes[value]?value:'home';
const routeFromHash=()=>normalizeRoute(location.hash.replace('#',''));
const temaAtual=()=>{const pageTheme=document.documentElement.dataset.theme,savedTheme=localStorage.getItem('wd-theme');return temaValido(pageTheme)?pageTheme:(temaValido(savedTheme)?savedTheme:'light')};
const routeUrl=(route,active=false)=>`${routes[route]}?embedded=1&tabActive=${active?'1':'0'}&theme=${temaAtual()}&v=${BUILD}`;

function aplicarTemaNoFrame(frame,theme=temaAtual()){
  if(!frame)return;
  try{
    const doc=frame.contentDocument;
    if(doc){doc.documentElement.dataset.theme=theme;doc.documentElement.style.colorScheme=theme;doc.body?.style.setProperty('background',theme==='dark'?'#090a0c':'#f5f2eb')}
    frame.contentWindow?.postMessage({type:'wd-theme-change',theme},location.origin);
  }catch(error){console.warn('Não foi possível sincronizar o tema da tela:',error)}
}
function sincronizarTema(theme){if(!temaValido(theme))return;document.documentElement.dataset.theme=theme;document.documentElement.style.colorScheme=theme;localStorage.setItem('wd-theme',theme);frames.forEach(frame=>aplicarTemaNoFrame(frame,theme))}
function limparMenuExterno(){const menu=document.querySelector('.menu');if(!menu)return;menu.querySelectorAll('[data-app-route],.logout-btn,[data-action="logout"]').forEach(element=>element.remove());const hasAdmin=[...menu.querySelectorAll('.admin-only.is-visible')].some(element=>getComputedStyle(element).display!=='none');document.body.classList.toggle('app-menu-has-admin',hasAdmin)}

function prepararFrame(frame){
  try{
    const doc=frame.contentDocument;if(!doc)return;
    doc.documentElement.dataset.embedded='true';
    doc.querySelectorAll('.menu,.mobile-menu-trigger,.menu-backdrop,.client-bottom-nav,.app-bottom-nav,.app-loader').forEach(element=>element.remove());
    const main=doc.querySelector('.conteudo');if(main){main.style.paddingTop='24px';main.style.paddingBottom='34px';main.style.minHeight='100%';main.style.width='100%'}
    doc.body.style.paddingBottom='0';doc.body.style.overflowX='hidden';doc.body.style.overflowY='auto';doc.body.style.minHeight='100%';
    aplicarTemaNoFrame(frame);
  }catch(error){console.warn('Não foi possível preparar a tela:',error)}
}

function setLifecycle(frame,active){
  if(!frame)return;
  try{frame.contentWindow?.postMessage({type:'wd-tab-lifecycle',active},location.origin);frame.contentWindow?.AppFirebase?.setActive?.(active)}catch(error){console.warn('Não foi possível alterar o ciclo da tela:',error)}
}
function destroyFrame(frame){
  if(!frame)return;
  setLifecycle(frame,false);
  try{frame.contentWindow?.AppFirebase?.destroy?.()}catch(error){console.warn('Não foi possível destruir o ciclo da tela:',error)}
  frame.src='about:blank';frame.remove();
}
function updateNav(route){nav.querySelectorAll('[data-route]').forEach(link=>{const active=link.dataset.route===route;link.classList.toggle('is-active',active);if(active)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current')})}
function showFrame(frame){frame.hidden=false;frame.classList.add('is-active');frame.setAttribute('aria-hidden','false');frame.style.visibility='visible';frame.style.pointerEvents='auto'}
function hideFrame(frame){frame.classList.remove('is-active');frame.hidden=true;frame.setAttribute('aria-hidden','true');frame.style.visibility='hidden';frame.style.pointerEvents='none'}

function ensureFrame(route){
  if(frames.has(route))return frames.get(route);
  const frame=document.createElement('iframe');
  frame.className='app-view';frame.title=route;frame.dataset.route=route;frame.dataset.ready='false';frame.hidden=true;frame.setAttribute('aria-hidden','true');frame.style.visibility='hidden';frame.style.pointerEvents='none';frame.src=routeUrl(route,false);
  frame.addEventListener('load',()=>{prepararFrame(frame);frame.dataset.ready='true';frame.dispatchEvent(new CustomEvent('wd-frame-ready'))},{once:true});
  stage.append(frame);frames.set(route,frame);return frame;
}

function activateWhenReady(route,token){
  const nextFrame=ensureFrame(route);
  const previousFrame=currentRoute?frames.get(currentRoute):null;
  const commitSwap=()=>{
    if(token!==navigationToken)return;
    aplicarTemaNoFrame(nextFrame);
    setLifecycle(nextFrame,true);
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      if(token!==navigationToken)return;
      if(previousFrame&&previousFrame!==nextFrame){setLifecycle(previousFrame,false);hideFrame(previousFrame)}
      showFrame(nextFrame);
      currentRoute=route;
      loader.classList.add('is-hidden');
      if(!firstPaintDone){firstPaintDone=true;document.body.classList.add('app-ready')}
    }));
  };
  if(nextFrame.dataset.ready==='true')commitSwap();
  else nextFrame.addEventListener('wd-frame-ready',commitSwap,{once:true});
}

function showRoute(route,{push=true}={}){
  route=normalizeRoute(route);
  if(route===currentRoute&&frames.get(route)?.dataset.ready==='true')return;
  const token=++navigationToken;
  updateNav(route);
  activateWhenReady(route,token);
  if(!firstPaintDone)loader.classList.remove('is-hidden');
  if(push&&location.hash!==`#${route}`)history.pushState({route},'',`#${route}`);
}

nav.addEventListener('click',event=>{const link=event.target.closest('[data-route]');if(!link)return;event.preventDefault();showRoute(link.dataset.route)});
window.addEventListener('popstate',()=>showRoute(routeFromHash(),{push:false}));
window.addEventListener('hashchange',()=>showRoute(routeFromHash(),{push:false}));
window.addEventListener('message',event=>{if(event.origin!==location.origin||event.data?.type!=='wd-theme-change'||!temaValido(event.data?.theme))return;sincronizarTema(event.data.theme)});
window.addEventListener('storage',event=>{if(event.key==='wd-theme'&&temaValido(event.newValue))sincronizarTema(event.newValue)});
document.addEventListener('wd-theme-ready',event=>sincronizarTema(event.detail?.theme));
document.addEventListener('wd-role-ready',event=>{const name=event.detail?.dados?.nome||event.detail?.user?.displayName||'WD',avatar=String(name).trim().split(/\s+/).slice(0,2).map(part=>part[0]||'').join('').toUpperCase()||'WD',avatarElement=document.getElementById('appNavAvatar');if(avatarElement)avatarElement.textContent=avatar;limparMenuExterno();sincronizarTema(event.detail?.dados?.tema||temaAtual())});
window.addEventListener('pagehide',()=>frames.forEach(destroyFrame),{once:true});
window.addEventListener('beforeunload',()=>frames.forEach(destroyFrame),{once:true});
const menu=document.querySelector('.menu'),menuObserver=new MutationObserver(limparMenuExterno);if(menu)menuObserver.observe(menu,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style']});
sincronizarTema(temaAtual());limparMenuExterno();showRoute(routeFromHash(),{push:false});
