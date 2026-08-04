const RANK_ICON='<svg class="nav-icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20v-6h4v6"></path><path d="M10 20V9h4v11"></path><path d="M15 20V4h4v16"></path><path d="M3 20h18"></path></svg>';

function rankLink(sidebar=false){
  const link=document.createElement('a');
  link.href='app.html?page=rank';
  link.dataset.spaRoute='rank';
  link.innerHTML=`${sidebar?RANK_ICON:RANK_ICON}<small>Rank</small>`;
  return link;
}

function ensureRank(){
  const desktop=document.querySelector('.spa-sidebar .spa-nav');
  const mobile=document.querySelector('.spa-bottom-nav');
  if(desktop&&!desktop.querySelector('[data-spa-route="rank"]')){
    const card=desktop.querySelector('[data-spa-route="card"]');
    const link=rankLink(true);
    card?desktop.insertBefore(link,card):desktop.append(link);
  }
  if(mobile&&!mobile.querySelector('[data-spa-route="rank"]')){
    const card=mobile.querySelector('[data-spa-route="card"]');
    const link=rankLink(false);
    card?mobile.insertBefore(link,card):mobile.append(link);
  }
}

ensureRank();
document.addEventListener('wd-role-ready',ensureRank);
document.addEventListener('wd-spa-route',ensureRank);
new MutationObserver(ensureRank).observe(document.body,{childList:true,subtree:true});
