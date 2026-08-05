/* Ícones administrativos únicos e sincronizados entre desktop, tablet e mobile */
const ICONS={
  panel:'<path d="M12 3.5l1.45 4.05L17.5 9l-4.05 1.45L12 14.5l-1.45-4.05L6.5 9l4.05-1.45L12 3.5Z"/><path d="M18.5 15.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2Z"/>',
  purchase:'<path d="M12 5v14M5 12h14"/>',
  history:'<path d="M4 7v5h5"/><path d="M5.3 16.5A8 8 0 1 0 4.4 9"/><path d="M12 7.5V12l3 2"/>',
  stock:'<rect x="4" y="4" width="6" height="6" rx="1.2"/><rect x="14" y="4" width="6" height="6" rx="1.2"/><rect x="4" y="14" width="6" height="6" rx="1.2"/><rect x="14" y="14" width="6" height="6" rx="1.2"/>',
  store:'<path d="M12 3 21 12 12 21 3 12 12 3Z"/><path d="M12 8v8M8 12h8"/>',
  performance:'<path d="m4 17 5-5 3 3 7-8"/><path d="M15 7h4v4"/>',
  delete:'<path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"/>'
};
const ORDER=['panel','purchase','history','stock','store','performance','delete'];
function ensureAdminIconStyle(){
  if(document.querySelector('style[data-wd-admin-icon-visibility]'))return;
  const style=document.createElement('style');
  style.dataset.wdAdminIconVisibility='true';
  style.textContent=`
    .spa-admin-tool-icon.wd-admin-icon-synced{
      display:grid!important;
      place-items:center!important;
      color:#e5c04b!important;
      background:#14161b!important;
      border:1px solid #34373d!important;
      box-shadow:inset 0 1px 0 rgba(255,255,255,.035),0 7px 18px rgba(0,0,0,.22)!important;
    }
    .spa-admin-tool-icon.wd-admin-icon-synced svg{
      display:block!important;
      fill:none!important;
      stroke:currentColor!important;
      stroke-width:2.5!important;
      stroke-linecap:round!important;
      stroke-linejoin:round!important;
      overflow:visible!important;
      filter:none!important;
    }
    .spa-admin-tool-icon.wd-admin-icon-synced svg *{
      fill:none!important;
      stroke:inherit!important;
      stroke-width:inherit!important;
      stroke-linecap:inherit!important;
      stroke-linejoin:inherit!important;
    }
    .spa-admin-tools-grid a:last-child .spa-admin-tool-icon.wd-admin-icon-synced{
      color:#ef5b67!important;
      background:#1b1114!important;
      border-color:rgba(205,68,79,.55)!important;
      box-shadow:inset 0 1px 0 rgba(255,255,255,.025),0 7px 18px rgba(0,0,0,.22)!important;
    }
    @media(max-width:900px){
      .spa-admin-tool-icon.wd-admin-icon-synced{width:76px!important;height:76px!important;min-width:76px!important;border-radius:22px!important}
      .spa-admin-tool-icon.wd-admin-icon-synced svg{width:32px!important;height:32px!important}
    }
    @media(max-width:380px){
      .spa-admin-tool-icon.wd-admin-icon-synced{width:66px!important;height:66px!important;min-width:66px!important;border-radius:19px!important}
      .spa-admin-tool-icon.wd-admin-icon-synced svg{width:28px!important;height:28px!important}
    }
  `;
  document.head.append(style);
}
function svgFor(key){return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[key]||ICONS.panel}</svg>`}
function syncIcons(root=document){
  ensureAdminIconStyle();
  root.querySelectorAll('.spa-admin-links').forEach(list=>{
    [...list.querySelectorAll('a')].forEach((link,index)=>{
      const holder=link.querySelector(':scope>span');
      if(!holder)return;
      const key=ORDER[index]||'panel';
      if(holder.dataset.iconKey===key)return;
      holder.dataset.iconKey=key;
      holder.classList.add('wd-admin-icon-synced');
      holder.innerHTML=svgFor(key);
    });
  });
  root.querySelectorAll('.spa-admin-tools-grid').forEach(list=>{
    [...list.querySelectorAll('a')].forEach((link,index)=>{
      const holder=link.querySelector('.spa-admin-tool-icon');
      if(!holder)return;
      const key=ORDER[index]||'panel';
      if(holder.dataset.iconKey===key)return;
      holder.dataset.iconKey=key;
      holder.classList.add('wd-admin-icon-synced');
      holder.innerHTML=svgFor(key);
    });
  });
}
syncIcons();
const observer=new MutationObserver(mutations=>{
  if(mutations.some(item=>item.addedNodes.length))syncIcons();
});
observer.observe(document.documentElement,{subtree:true,childList:true});
document.addEventListener('wd-role-ready',()=>syncIcons());
