(()=>{
  const close=()=>{
    document.body.classList.remove('spa-admin-open');
    document.querySelector('[data-admin-tools-trigger]')?.setAttribute('aria-expanded','false');
  };
  document.addEventListener('wd-spa-route',close);
  document.addEventListener('click',event=>{
    if(event.target.closest('[data-spa-route]'))close();
  },true);
  window.addEventListener('popstate',close);
  window.addEventListener('pageshow',close);
})();
