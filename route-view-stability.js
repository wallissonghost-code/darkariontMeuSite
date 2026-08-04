function enforceActiveView(route){
  if(!route)return;
  document.querySelectorAll('#conteudo > .spa-view').forEach(view=>{
    const active=view.dataset.route===route;
    view.hidden=!active;
    view.style.display=active?'':'none';
    view.setAttribute('aria-hidden',active?'false':'true');
  });
  document.querySelectorAll('[data-spa-route]').forEach(link=>{
    const active=link.dataset.spaRoute===route;
    link.classList.toggle('is-active',active);
    if(active)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
  });
}
function routeFromLocation(){
  const value=new URL(location.href).searchParams.get('page');
  return ['home','store','rank','card','account'].includes(value)?value:'home';
}
document.addEventListener('wd-spa-route',event=>requestAnimationFrame(()=>enforceActiveView(event.detail?.route)));
window.addEventListener('popstate',()=>requestAnimationFrame(()=>enforceActiveView(routeFromLocation())));
document.addEventListener('click',event=>{
  const link=event.target.closest('[data-spa-route]');
  if(!link)return;
  const route=link.dataset.spaRoute;
  setTimeout(()=>enforceActiveView(route),120);
});
new MutationObserver(()=>enforceActiveView(routeFromLocation())).observe(document.getElementById('conteudo')||document.body,{childList:true,subtree:false});
