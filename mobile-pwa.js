/* WD Founder — runtime PWA móvel enxuto 3.54.0 */
(()=>{
  const standalone=window.matchMedia?.('(display-mode: standalone)').matches||window.navigator.standalone===true;
  document.body.dataset.pwaStandalone=standalone?'true':'false';
  document.documentElement.classList.toggle('wd-pwa-standalone',standalone);

  const setViewport=()=>{
    const height=Math.round(window.visualViewport?.height||window.innerHeight||0);
    if(height>0)document.documentElement.style.setProperty('--wd-app-height',`${height}px`);
  };
  let viewportFrame=0;
  const scheduleViewport=()=>{
    cancelAnimationFrame(viewportFrame);
    viewportFrame=requestAnimationFrame(setViewport);
  };
  setViewport();
  window.addEventListener('resize',scheduleViewport,{passive:true});
  window.addEventListener('orientationchange',scheduleViewport,{passive:true});
  window.visualViewport?.addEventListener('resize',scheduleViewport,{passive:true});

  // Links externos abrem fora do PWA. A navegação interna fica exclusivamente com spa.js.
  document.addEventListener('click',event=>{
    const anchor=event.target.closest('a[href]');
    if(!standalone||!anchor||anchor.target==='_blank')return;
    const url=new URL(anchor.href,location.href);
    if(url.origin===location.origin)return;
    anchor.target='_blank';anchor.rel='noopener noreferrer';
  },true);

  let hiddenAt=0;
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){hiddenAt=Date.now();return}
    scheduleViewport();
    if(hiddenAt&&Date.now()-hiddenAt>10*60*1000)window.WDAppVersion?.check?.().catch?.(()=>{});
  },{passive:true});
  window.addEventListener('pageshow',event=>{
    scheduleViewport();
    if(event.persisted)document.dispatchEvent(new CustomEvent('wd-pwa-resume'));
  },{passive:true});

  // Não recarrega automaticamente ao trocar o Service Worker: evita loop e perda de estado.
  if('serviceWorker'in navigator){
    navigator.serviceWorker.addEventListener('controllerchange',()=>{
      document.dispatchEvent(new CustomEvent('wd-update-controller-ready'));
    });
  }
})();
