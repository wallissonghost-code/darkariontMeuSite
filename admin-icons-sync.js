/* Ícones administrativos únicos e sincronizados entre desktop, tablet e mobile */
const ICONS={
  panel:'<path d="M12 3.5l1.45 4.05L17.5 9l-4.05 1.45L12 14.5l-1.45-4.05L6.5 9l4.05-1.45L12 3.5Z"/><path d="M18.5 15.5l.7 2 .0 0 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2Z"/>',
  purchase:'<path d="M12 5v14M5 12h14"/>',
  history:'<path d="M4 7v5h5"/><path d="M5.3 16.5A8 8 0 1 0 4.4 9"/><path d="M12 7.5V12l3 2"/>',
  stock:'<rect x="4" y="4" width="6" height="6" rx="1.2"/><rect x="14" y="4" width="6" height="6" rx="1.2"/><rect x="4" y="14" width="6" height="6" rx="1.2"/><rect x="14" y="14" width="6" height="6" rx="1.2"/>',
  store:'<path d="M12 3 21 12 12 21 3 12 12 3Z"/><path d="M12 8v8M8 12h8"/>',
  performance:'<path d="m4 17 5-5 3 3 7-8"/><path d="M15 7h4v4"/>',
  delete:'<path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"/>'
};
const ORDER=['panel','purchase','history','stock','store','performance','delete'];
function svgFor(key){return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[key]||ICONS.panel}</svg>`}
function syncIcons(root=document){
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
