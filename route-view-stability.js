function enforceActiveView(route){
  if(!route)return;
  document.querySelectorAll('#conteudo > .spa-view').forEach(view=>{
    const active=view.dataset.route===route;
    view.hidden=!active;
    view.style.display=active?'block':'none';
    view.setAttribute('aria-hidden',active?'false':'true');
  });
  document.querySelectorAll('[data-spa-route]').forEach(link=>{
    const active=link.dataset.spaRoute===route;
    link.classList.toggle('is-active',active);
    if(active)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
  });
}

document.addEventListener('wd-spa-route',event=>enforceActiveView(event.detail?.route));
