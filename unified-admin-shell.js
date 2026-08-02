const ADMIN_ROUTES={
  panel:'perfil-admin.html',
  purchase:'registrar-compra.html',
  history:'historico-vendas.html',
  stock:'estoque.html',
  store:'mercadorias-admin.html',
  performance:'desempenho.html',
  delete:'excluir-cliente.html'
};

const BUILD='3.0.1';
const main=document.querySelector('.spa-main');
let frame=null;
let loader=null;
let currentTool='';

function toolFromLink(link){
  if(!link)return '';
  try{
    const url=new URL(link.href,location.href);
    if(!url.pathname.endsWith('/admin.html')&&!url.pathname.endsWith('admin.html'))return '';
    const tool=url.searchParams.get('tool')||'panel';
    return ADMIN_ROUTES[tool]?tool:'';
  }catch{return ''}
}

function requestedAdminTool(){
  const tool=new URL(location.href).searchParams.get('admin');
  return ADMIN_ROUTES[tool]?tool:'';
}

function ensureWorkspace(){
  if(frame)return;
  const workspace=document.createElement('section');
  workspace.className='unified-admin-workspace';
  workspace.hidden=true;
  workspace.innerHTML='<div class="unified-admin-loader"><span></span><strong>Carregando ferramenta</strong></div><iframe class="unified-admin-frame" title="Ferramenta administrativa" loading="eager"></iframe>';
  main.append(workspace);
  frame=workspace.querySelector('iframe');
  loader=workspace.querySelector('.unified-admin-loader');
  frame.addEventListener('load',()=>{
    frame.classList.add('is-ready');
    requestAnimationFrame(()=>loader.classList.add('is-hidden'));
  });
}

function setAdminActive(tool){
  document.querySelectorAll('.spa-admin-links a,.spa-admin-tools-grid a').forEach(link=>{
    const active=toolFromLink(link)===tool;
    link.classList.toggle('is-active',active);
    if(active)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
  });
}

function showMemberArea(){
  if(!frame)return;
  const workspace=frame.closest('.unified-admin-workspace');
  workspace.hidden=true;
  frame.classList.remove('is-ready');
  document.body.classList.remove('unified-admin-active');
  currentTool='';
  setAdminActive('');
}

function openTool(tool,{push=true}={}){
  if(!ADMIN_ROUTES[tool])tool='panel';
  ensureWorkspace();
  document.querySelectorAll('.spa-view').forEach(view=>{view.hidden=true;view.setAttribute('aria-hidden','true')});
  document.getElementById('spaError')?.remove();
  const workspace=frame.closest('.unified-admin-workspace');
  workspace.hidden=false;
  document.body.classList.add('unified-admin-active');
  setAdminActive(tool);
  document.body.classList.remove('spa-admin-open');
  document.querySelector('[data-admin-tools-trigger]')?.setAttribute('aria-expanded','false');
  if(currentTool!==tool){
    currentTool=tool;
    frame.classList.remove('is-ready');
    loader.classList.remove('is-hidden');
    frame.src=`${ADMIN_ROUTES[tool]}?embeddedAdmin=1&v=${BUILD}`;
  }
  if(push){
    const url=new URL('app.html',location.href);
    url.searchParams.set('admin',tool);
    history.pushState({adminTool:tool},'',`${url.pathname}${url.search}`);
  }
  window.scrollTo(0,0);
}

// Captura antes da navegação antiga para impedir a abertura de um segundo painel.
document.addEventListener('click',event=>{
  const link=event.target.closest('a[href]');
  const tool=toolFromLink(link);
  if(!tool)return;
  event.preventDefault();
  event.stopImmediatePropagation();
  openTool(tool);
},true);

// Ao navegar para uma tela de membro, fecha a ferramenta. Em abertura direta
// de rota administrativa, mantém a ferramenta como prioridade.
document.addEventListener('wd-spa-route',()=>{
  const tool=requestedAdminTool();
  if(tool)requestAnimationFrame(()=>openTool(tool,{push:false}));
  else showMemberArea();
});

window.addEventListener('popstate',()=>{
  const tool=requestedAdminTool();
  if(tool)openTool(tool,{push:false});
  else showMemberArea();
});

function openInitialAdmin(){
  const tool=requestedAdminTool();
  if(tool)setTimeout(()=>openTool(tool,{push:false}),0);
}

if(document.documentElement.dataset.authState==='ready')openInitialAdmin();
else document.addEventListener('wd-role-ready',openInitialAdmin,{once:true});
