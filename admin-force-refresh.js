/* WD Founder — atualização forçada e navegação imediata para administradores */
const REFRESH_ICON='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20 6v5h-5"/><path d="M4 18v-5h5"/><path d="M6.1 9a7 7 0 0 1 11.8-2.6L20 11"/><path d="M4 13l2.1 4.6A7 7 0 0 0 17.9 15"/></svg>';
let refreshing=false;

function desktopItem(){return `<a href="#forcar-atualizacao" data-force-app-update><span class="wd-admin-icon-synced" data-icon-key="refresh">${REFRESH_ICON}</span><small>Forçar atualização</small></a>`}
function mobileItem(){return `<a href="#forcar-atualizacao" data-force-app-update><span class="spa-admin-tool-icon wd-admin-icon-synced" data-icon-key="refresh">${REFRESH_ICON}</span><div><strong>Forçar atualização</strong><small>Limpar cache e carregar a versão mais recente</small></div><b>›</b></a>`}

function insertBeforeDelete(list,html){
  const deleteItem=[...list.children].find(item=>/Excluir conta/i.test(item.textContent||''));
  if(deleteItem)deleteItem.insertAdjacentHTML('beforebegin',html);
  else list.insertAdjacentHTML('beforeend',html);
}

function installRefreshOption(root=document){
  root.querySelectorAll('.spa-admin-links').forEach(list=>{
    if(!list.querySelector('[data-force-app-update]'))insertBeforeDelete(list,desktopItem());
  });
  root.querySelectorAll('.spa-admin-tools-grid').forEach(list=>{
    if(!list.querySelector('[data-force-app-update]'))insertBeforeDelete(list,mobileItem());
  });
}

function routeFromLocation(){
  const url=new URL(location.href);
  const page=url.searchParams.get('page');
  return ['home','store','rank','card','account'].includes(page)?page:'home';
}
function setActiveRoute(route){
  document.querySelectorAll('[data-spa-route]').forEach(link=>{
    const active=link.dataset.spaRoute===route;
    link.classList.toggle('is-active',active);
    active?link.setAttribute('aria-current','page'):link.removeAttribute('aria-current');
  });
}
function syncActiveRoute(){setActiveRoute(routeFromLocation())}

document.addEventListener('pointerdown',event=>{
  const link=event.target.closest('[data-spa-route]');
  if(!link)return;
  setActiveRoute(link.dataset.spaRoute);
},{capture:true,passive:true});
document.addEventListener('click',event=>{
  const link=event.target.closest('[data-spa-route]');
  if(link)setActiveRoute(link.dataset.spaRoute);
},{capture:true,passive:true});
document.addEventListener('wd-spa-route',event=>setActiveRoute(event.detail?.route||routeFromLocation()));
document.addEventListener('wd-navigation-ready',event=>setActiveRoute(event.detail?.route||routeFromLocation()));
window.addEventListener('popstate',()=>requestAnimationFrame(syncActiveRoute));
window.addEventListener('pageshow',()=>requestAnimationFrame(syncActiveRoute));

function prefetchRoutes(){
  ['home','store','rank','card','account'].forEach(route=>{
    fetch(`./views/${route==='store'?'store':route}.html?v=3.39.0`,{cache:'force-cache'}).catch(()=>{});
  });
}

async function forceUpdate(button){
  if(refreshing)return;
  const confirmed=window.confirm('Forçar a atualização do WD Founder agora? O cache será limpo e a página será recarregada.');
  if(!confirmed)return;
  refreshing=true;
  const title=button?.querySelector('strong')||button?.querySelector('small');
  const originalTitle=title?.textContent||'Forçar atualização';
  button?.setAttribute('aria-busy','true');
  if(title)title.textContent='Atualizando…';
  try{
    if(navigator.vibrate)navigator.vibrate(35);
    if('caches' in window){
      const keys=await caches.keys();
      await Promise.all(keys.map(key=>caches.delete(key)));
    }
    if('serviceWorker' in navigator){
      const registrations=await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(async registration=>{
        await registration.update().catch(()=>{});
        registration.waiting?.postMessage({type:'SKIP_WAITING'});
      }));
    }
    await fetch(`./version.json?force=${Date.now()}`,{cache:'no-store'}).catch(()=>null);
    const url=new URL(location.href);
    url.searchParams.set('_wd',Date.now().toString());
    location.replace(url.toString());
  }catch(error){
    console.error('Falha ao forçar atualização:',error);
    refreshing=false;
    button?.removeAttribute('aria-busy');
    if(title)title.textContent=originalTitle;
    alert('Não foi possível concluir a atualização. Verifique sua conexão e tente novamente.');
  }
}

document.addEventListener('click',event=>{
  const button=event.target.closest('[data-force-app-update]');
  if(!button)return;
  event.preventDefault();
  event.stopImmediatePropagation();
  forceUpdate(button);
},true);

document.addEventListener('wd-admin-tools-ready',()=>installRefreshOption());
document.addEventListener('wd-role-ready',event=>{if(event.detail?.admin)installRefreshOption()});
installRefreshOption();syncActiveRoute();
const observer=new MutationObserver(mutations=>{
  if(mutations.some(item=>item.addedNodes.length)){
    installRefreshOption();
    syncActiveRoute();
  }
});
observer.observe(document.documentElement,{subtree:true,childList:true});
'requestIdleCallback'in window?requestIdleCallback(prefetchRoutes,{timeout:500}):setTimeout(prefetchRoutes,120);
