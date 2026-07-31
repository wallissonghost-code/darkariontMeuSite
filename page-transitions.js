const REDUCED_MOTION=window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function markReady(){
  document.documentElement.classList.add('wd-transitions-ready');
  document.body.classList.add('wd-page-visible');
}

// A navegação do app é controlada por app-tabs.js. Este arquivo não altera
// opacidade, visibilidade, display ou animação do documento inteiro.
document.addEventListener('click',event=>{
  const link=event.target.closest('a[href]');
  if(!link)return;

  const href=link.getAttribute('href')||'';
  const insideSpa=link.closest('#appBottomNav')||link.dataset.route||href.startsWith('#');
  if(insideSpa)return;

  if(link.closest('.client-bottom-nav')){
    document.querySelectorAll('.client-bottom-nav a').forEach(item=>item.classList.remove('ativo'));
    link.classList.add('ativo');
  }
},true);

window.addEventListener('pageshow',markReady);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',markReady,{once:true});
else markReady();

if(REDUCED_MOTION)document.documentElement.classList.add('wd-reduced-motion');
