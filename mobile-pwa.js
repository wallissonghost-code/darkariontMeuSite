/* WD Founder — runtime PWA mobile/iPhone 3.43.0 */
(()=>{
  const standalone=window.matchMedia?.('(display-mode: standalone)').matches||window.navigator.standalone===true;
  document.body.dataset.pwaStandalone=standalone?'true':'false';
  document.documentElement.classList.toggle('wd-pwa-standalone',standalone);

  const setViewport=()=>document.documentElement.style.setProperty('--wd-vh',`${window.visualViewport?.height||window.innerHeight}px`);
  setViewport();
  let viewportTimer=0;
  const scheduleViewport=()=>{clearTimeout(viewportTimer);viewportTimer=setTimeout(setViewport,60)};
  window.addEventListener('resize',scheduleViewport,{passive:true});
  window.addEventListener('orientationchange',scheduleViewport,{passive:true});
  window.visualViewport?.addEventListener('resize',scheduleViewport,{passive:true});

  let lastTouchEnd=0;
  document.addEventListener('touchend',event=>{const now=Date.now();if(now-lastTouchEnd<320&&!event.target.closest('input,textarea,select'))event.preventDefault();lastTouchEnd=now},{passive:false});

  const syncRoute=()=>{
    const page=new URL(location.href).searchParams.get('page')||'home';
    document.querySelectorAll('[data-spa-route]').forEach(link=>{
      const active=link.dataset.spaRoute===page;
      link.classList.toggle('is-active',active);
      active?link.setAttribute('aria-current','page'):link.removeAttribute('aria-current');
    });
  };
  document.addEventListener('pointerdown',event=>{const link=event.target.closest('[data-spa-route]');if(!link)return;document.querySelectorAll('[data-spa-route]').forEach(item=>item.classList.toggle('is-active',item===link))},{capture:true,passive:true});
  document.addEventListener('wd-spa-route',syncRoute);
  window.addEventListener('pageshow',event=>{syncRoute();setViewport();if(event.persisted)document.dispatchEvent(new CustomEvent('wd-pwa-resume'))},{passive:true});

  let hiddenAt=0;
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){hiddenAt=Date.now();return}
    setViewport();syncRoute();
    if(hiddenAt&&Date.now()-hiddenAt>5*60*1000)window.WDAppVersion?.check?.().catch?.(()=>{});
  });

  document.addEventListener('click',event=>{
    const anchor=event.target.closest('a[href]');
    if(!standalone||!anchor||anchor.target==='_blank')return;
    const url=new URL(anchor.href,location.href);
    if(url.origin===location.origin)return;
    anchor.target='_blank';anchor.rel='noopener noreferrer';
  },true);

  if('serviceWorker'in navigator){navigator.serviceWorker.addEventListener('controllerchange',()=>{if(sessionStorage.getItem('wd-sw-reloaded')==='1')return;sessionStorage.setItem('wd-sw-reloaded','1');location.reload()});window.addEventListener('load',()=>setTimeout(()=>sessionStorage.removeItem('wd-sw-reloaded'),3000),{once:true})}
})();
