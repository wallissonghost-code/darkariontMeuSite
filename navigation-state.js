/* WD Founder — controlador único do estado ativo da navegação */
(()=>{
  const ROUTES=new Set(['home','store','rank','card','account']);
  const routeFromUrl=()=>{
    const page=new URL(location.href).searchParams.get('page');
    return ROUTES.has(page)?page:'home';
  };
  function closeAdminPanel(){
    document.body.classList.remove('spa-admin-open');
    const trigger=document.querySelector('[data-admin-tools-trigger]');
    trigger?.setAttribute('aria-expanded','false');
    trigger?.classList.remove('is-active','active','selected','is-selected');
    trigger?.removeAttribute('aria-current');
  }
  function applyRoute(route=routeFromUrl()){
    const safeRoute=ROUTES.has(route)?route:'home';
    document.querySelectorAll('[data-spa-route]').forEach(link=>{
      const active=link.dataset.spaRoute===safeRoute;
      link.classList.toggle('is-active',active);
      link.classList.toggle('active',active);
      active?link.setAttribute('aria-current','page'):link.removeAttribute('aria-current');
    });
    if(!document.body.classList.contains('spa-admin-open')){
      const trigger=document.querySelector('[data-admin-tools-trigger]');
      trigger?.classList.remove('is-active','active','selected','is-selected');
      trigger?.removeAttribute('aria-current');
    }
  }
  document.addEventListener('pointerdown',event=>{
    const routeLink=event.target.closest('[data-spa-route]');
    if(routeLink){
      closeAdminPanel();
      applyRoute(routeLink.dataset.spaRoute);
      return;
    }
    const adminTrigger=event.target.closest('[data-admin-tools-trigger]');
    if(adminTrigger){
      document.querySelectorAll('[data-spa-route]').forEach(link=>{
        link.classList.remove('is-active','active');
        link.removeAttribute('aria-current');
      });
      adminTrigger.classList.add('is-active');
    }
  },{capture:true,passive:true});
  document.addEventListener('click',event=>{
    if(event.target.closest('[data-close-admin-tools],.spa-admin-tools-backdrop')){
      closeAdminPanel();
      requestAnimationFrame(()=>applyRoute(routeFromUrl()));
    }
  },true);
  document.addEventListener('wd-spa-route',event=>{
    closeAdminPanel();
    applyRoute(event.detail?.route||routeFromUrl());
  });
  document.addEventListener('wd-navigation-ready',event=>applyRoute(event.detail?.route||routeFromUrl()));
  window.addEventListener('popstate',()=>requestAnimationFrame(()=>applyRoute(routeFromUrl())));
  window.addEventListener('pageshow',()=>requestAnimationFrame(()=>applyRoute(routeFromUrl())));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)requestAnimationFrame(()=>applyRoute(routeFromUrl()))});
  const observer=new MutationObserver(()=>applyRoute(routeFromUrl()));
  observer.observe(document.querySelector('.spa-bottom-nav')||document.body,{childList:true,subtree:true});
  applyRoute(routeFromUrl());
})();