const BUILD=sessionStorage.getItem('wd-build')||String(Date.now());
sessionStorage.setItem('wd-build',BUILD);
const routes={home:`home.html?embedded=1&v=${BUILD}`,card:`cartao.html?embedded=1&v=${BUILD}`,benefits:`ofertas.html?embedded=1&v=${BUILD}`,account:`perfil.html?embedded=1&v=${BUILD}`};
const stage=document.getElementById('appStage');
const loader=document.getElementById('appLoader');
const nav=document.getElementById('appBottomNav');
const frames=new Map();
let currentRoute='';

function normalizeRoute(value){return routes[value]?value:'home'}
function routeFromHash(){return normalizeRoute(location.hash.replace('#',''))}
function limparMenuExterno(){const menu=document.querySelector('.menu');if(!menu)return;menu.querySelectorAll('[data-app-route],.logout-btn,[data-action="logout"]').forEach(el=>el.remove());const temAdmin=[...menu.querySelectorAll('.admin-only.is-visible')].some(el=>getComputedStyle(el).display!=='none');document.body.classList.toggle('app-menu-has-admin',temAdmin)}
function cleanEmbeddedFrame(frame){try{const doc=frame.contentDocument;if(!doc)return;doc.documentElement.dataset.embedded='true';const hide=()=>{doc.querySelectorAll('.menu,.mobile-menu-trigger,.menu-backdrop,.client-bottom-nav,.app-bottom-nav').forEach(el=>el.remove());const main=doc.querySelector('.conteudo');if(main){main.style.paddingTop='24px';main.style.paddingBottom='34px';main.style.minHeight='100%';main.style.width='100%'}doc.body.style.paddingBottom='0';doc.body.style.overflowX='hidden';doc.body.style.overflowY='auto';doc.body.style.minHeight='100%'};hide();const observer=new MutationObserver(hide);observer.observe(doc.body,{childList:true,subtree:true});frame._wdObserver?.disconnect?.();frame._wdObserver=observer}catch(error){console.warn('Não foi possível preparar a aba:',error)}}
function ensureFrame(route){if(frames.has(route))return frames.get(route);const frame=document.createElement('iframe');frame.className='app-view';frame.title=route;frame.loading=route==='home'?'eager':'lazy';frame.src=routes[route];frame.dataset.route=route;frame.addEventListener('load',()=>{cleanEmbeddedFrame(frame);frame.dataset.ready='true';if(route===currentRoute)loader.classList.add('is-hidden')});stage.append(frame);frames.set(route,frame);return frame}
function updateNav(route){nav.querySelectorAll('[data-route]').forEach(link=>link.classList.toggle('is-active',link.dataset.route===route))}
function showRoute(route,{push=true}={}){route=normalizeRoute(route);if(route===currentRoute&&frames.get(route)?.dataset.ready==='true')return;currentRoute=route;updateNav(route);const frame=ensureFrame(route);loader.classList.toggle('is-hidden',frame.dataset.ready==='true');requestAnimationFrame(()=>frames.forEach((item,key)=>item.classList.toggle('is-active',key===route)));if(push&&location.hash!==`#${route}`)history.pushState({route},'',`#${route}`)}
nav.addEventListener('click',event=>{const link=event.target.closest('[data-route]');if(!link)return;event.preventDefault();showRoute(link.dataset.route)});
window.addEventListener('popstate',()=>showRoute(routeFromHash(),{push:false}));
window.addEventListener('hashchange',()=>showRoute(routeFromHash(),{push:false}));
document.addEventListener('wd-role-ready',event=>{const nome=event.detail?.dados?.nome||event.detail?.user?.displayName||'WD';const avatar=String(nome).trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase()||'WD';const el=document.getElementById('appNavAvatar');if(el)el.textContent=avatar;limparMenuExterno()});
const menuObserver=new MutationObserver(limparMenuExterno);if(document.querySelector('.menu'))menuObserver.observe(document.querySelector('.menu'),{childList:true,subtree:true,attributes:true,attributeFilter:['class','style']});
limparMenuExterno();showRoute(routeFromHash(),{push:false});
const preload=()=>Object.keys(routes).forEach((route,index)=>setTimeout(()=>ensureFrame(route),index*100));if('requestIdleCallback'in window)requestIdleCallback(preload,{timeout:800});else setTimeout(preload,350);