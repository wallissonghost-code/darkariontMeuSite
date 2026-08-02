const ADMIN_ROUTES={
  panel:'perfil-admin.html',
  purchase:'registrar-compra.html',
  history:'historico-vendas.html',
  stock:'estoque.html',
  store:'mercadorias-admin.html',
  performance:'desempenho.html',
  delete:'excluir-cliente.html'
};

const BUILD='3.2.0';
const ACTIVE_TOOL_KEY='wd-active-admin-tool';
const main=document.querySelector('.spa-main');
let frame=null;
let loader=null;
let currentTool='';
let memberNavigationRequested=false;
let recoveryAttempts=0;

function validTool(value){return ADMIN_ROUTES[value]?value:''}
function toolFromLink(link){
  if(!link)return '';
  try{
    const url=new URL(link.href,location.href);
    if(!url.pathname.endsWith('/admin.html')&&!url.pathname.endsWith('admin.html'))return '';
    return validTool(url.searchParams.get('tool')||'panel');
  }catch{return ''}
}

function requestedAdminTool(){
  const urlTool=validTool(new URL(location.href).searchParams.get('admin'));
  if(urlTool)return urlTool;
  return validTool(sessionStorage.getItem(ACTIVE_TOOL_KEY));
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
    let loadedFile='';
    try{loadedFile=frame.contentWindow.location.pathname.split('/').pop()||''}catch{}
    const expected=currentTool?ADMIN_ROUTES[currentTool]:'';
    if(expected&&loadedFile&&loadedFile!==expected){
      if(recoveryAttempts<2){
        recoveryAttempts+=1;
        frame.classList.remove('is-ready');
        loader.classList.remove('is-hidden');
        setTimeout(()=>{frame.src=`${expected}?embeddedAdmin=1&v=${BUILD}&retry=${recoveryAttempts}`},350);
        return;
      }
    }else recoveryAttempts=0;
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

function showMemberArea({explicit=false}={}){
  memberNavigationRequested=false;
  if(explicit)sessionStorage.removeItem(ACTIVE_TOOL_KEY);
  if(frame){
    const workspace=frame.closest('.unified-admin-workspace');
    workspace.hidden=true;
    frame.classList.remove('is-ready');
  }
  document.body.classList.remove('unified-admin-active');
  currentTool='';
  setAdminActive('');
}

function openTool(tool,{push=true}={}){
  tool=validTool(tool)||'panel';
  memberNavigationRequested=false;
  sessionStorage.setItem(ACTIVE_TOOL_KEY,tool);
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
    recoveryAttempts=0;
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

document.addEventListener('click',event=>{
  const link=event.target.closest('a[href]');
  const tool=toolFromLink(link);
  if(tool){
    event.preventDefault();
    event.stopImmediatePropagation();
    openTool(tool);
    return;
  }

  const memberLink=event.target.closest('[data-spa-route]');
  if(memberLink&&currentTool){
    memberNavigationRequested=true;
    showMemberArea({explicit:true});
  }
},true);

document.addEventListener('wd-spa-route',()=>{
  if(memberNavigationRequested){
    showMemberArea({explicit:true});
    return;
  }
  const requested=requestedAdminTool();
  if(currentTool)requestAnimationFrame(()=>openTool(currentTool,{push:false}));
  else if(requested)requestAnimationFrame(()=>openTool(requested,{push:false}));
});

window.addEventListener('popstate',event=>{
  const stateTool=validTool(event.state?.adminTool);
  const urlTool=validTool(new URL(location.href).searchParams.get('admin'));
  if(stateTool)openTool(stateTool,{push:false});
  else if(urlTool)openTool(urlTool,{push:false});
  else showMemberArea({explicit:true});
});

function openInitialAdmin(){
  const tool=requestedAdminTool();
  if(tool)setTimeout(()=>openTool(tool,{push:false}),0);
}

if(document.documentElement.dataset.authState==='ready')openInitialAdmin();
else document.addEventListener('wd-role-ready',openInitialAdmin,{once:true});
