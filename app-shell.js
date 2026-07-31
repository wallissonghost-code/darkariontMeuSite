import { auth, db, isAdminContext } from './firebase.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

const BUILD='20260731-2020';
const body=document.body;
const FIXED_ADMIN_UIDS=new Set(['WAPN8cPkPGP2mwiQ8FNbIGyUaUl1']);
const ADMIN_ROLES=new Set(['admin','administrador','master']);
let saindo=false;
let authUnsubscribe=null;

function carregarCss(href){
  if(document.querySelector(`link[href^="${href}"]`))return;
  const link=document.createElement('link');
  link.rel='stylesheet';
  link.href=`${href}?v=${BUILD}`;
  document.head.append(link);
}
carregarCss('app-ui.css');
carregarCss('dark-mode.css');
carregarCss('navigation.css');

const temaValido=value=>value==='dark'||value==='light';
function aplicarTema(tema,uid=''){
  const valor=tema==='dark'?'dark':'light';
  document.documentElement.dataset.theme=valor;
  document.documentElement.style.colorScheme=valor;
  localStorage.setItem('wd-theme',valor);
  if(uid)localStorage.setItem(`wd-theme:${uid}`,valor);
  document.dispatchEvent(new CustomEvent('wd-theme-ready',{detail:{theme:valor,uid}}));
}
window.aplicarTemaWD=(tema,uid='')=>aplicarTema(tema,uid||auth.currentUser?.uid||'');
const temaInicial=localStorage.getItem('wd-theme');
if(temaValido(temaInicial))aplicarTema(temaInicial);

function paginaAtual(){return location.pathname.split('/').pop()||'home.html'}
function iniciais(nome){return String(nome||'WD').trim().split(/\s+/).slice(0,2).map(parte=>parte[0]||'').join('').toUpperCase()||'WD'}
function limparNavegacaoAnterior(){
  document.querySelectorAll('.wd-member-nav,.wd-admin-sidebar,.wd-admin-mobile-trigger,.wd-admin-backdrop,.client-bottom-nav,.app-bottom-nav,.mobile-menu-trigger,.menu-backdrop').forEach(el=>el.remove());
  body.classList.remove('wd-member-layout','wd-admin-layout','wd-admin-menu-open','menu-open','client-menu-disabled');
}

function montarMenuCliente(dados={}){
  limparNavegacaoAnterior();
  body.classList.add('wd-member-layout');
  const current=paginaAtual();
  const avatar=iniciais(dados.nome||auth.currentUser?.displayName||'WD');
  const items=[
    ['home.html','⌂','Início',''],
    ['cartao.html','▣','Cartão',''],
    ['mercadorias.html','◇','Mercadorias',''],
    ['perfil.html',avatar,'Conta','avatar']
  ];
  const nav=document.createElement('nav');
  nav.className='wd-member-nav';
  nav.setAttribute('aria-label','Navegação principal');
  nav.innerHTML=items.map(([href,icon,label,type])=>`<a href="${href}" class="${current===href?'is-active':''}" ${current===href?'aria-current="page"':''}><span class="${type==='avatar'?'wd-nav-avatar':''}">${icon}</span><small>${label}</small></a>`).join('');
  document.body.append(nav);

  const menu=document.querySelector('.menu');
  if(menu){
    menu.hidden=false;
    menu.innerHTML=`<div class="marca"><h2>WD</h2><p>FOUNDER</p></div>${items.map(([href,,label])=>`<a href="${href}" class="${current===href?'ativo':''}">${label}</a>`).join('')}<button class="logout-btn" data-action="logout" type="button">Sair da conta</button>`;
  }
}

function fecharAdminMenu(){body.classList.remove('wd-admin-menu-open')}
function montarMenuAdmin(){
  limparNavegacaoAnterior();
  body.classList.add('wd-admin-layout');
  const current=paginaAtual();
  const items=[
    ['registrar-compra.html','Registrar compra'],
    ['historico-vendas.html','Histórico de vendas'],
    ['estoque.html','Estoque & Produtos'],
    ['mercadorias-admin.html','Mercadorias da vitrine'],
    ['desempenho.html','Desempenho'],
    ['perfil-admin.html','Administração'],
    ['excluir-cliente.html','Excluir conta']
  ];
  const aside=document.createElement('aside');
  aside.className='wd-admin-sidebar';
  aside.setAttribute('aria-label','Painel administrativo');
  aside.innerHTML=`<div class="wd-admin-brand"><strong>WD</strong><span>FOUNDER ADMIN</span></div><nav class="wd-admin-links">${items.map(([href,label])=>`<a href="${href}" class="${current===href?'is-active':''}" ${current===href?'aria-current="page"':''}>${label}</a>`).join('')}</nav><div class="wd-admin-footer"><button type="button" data-action="logout">Sair do administrador</button></div>`;
  const trigger=document.createElement('button');
  trigger.className='wd-admin-mobile-trigger';
  trigger.type='button';
  trigger.setAttribute('aria-label','Abrir menu administrativo');
  trigger.textContent='☰';
  const backdrop=document.createElement('button');
  backdrop.className='wd-admin-backdrop';
  backdrop.type='button';
  backdrop.setAttribute('aria-label','Fechar menu administrativo');
  trigger.addEventListener('click',()=>body.classList.toggle('wd-admin-menu-open'));
  backdrop.addEventListener('click',fecharAdminMenu);
  aside.addEventListener('click',event=>{if(event.target.closest('a'))fecharAdminMenu()});
  document.body.prepend(aside);
  document.body.append(trigger,backdrop);
  document.querySelector('.menu')?.setAttribute('hidden','');
}

async function carregarDocumentoUsuario(user){
  const snapshot=await getDoc(doc(db,'usuarios',user.uid));
  if(snapshot.exists())return snapshot.data();
  const error=new Error('Cadastro do clube não encontrado.');
  error.code='wd/missing-club-profile';
  throw error;
}

async function sair(event){
  event?.preventDefault?.();
  event?.stopPropagation?.();
  if(saindo)return;
  saindo=true;
  document.querySelectorAll('[data-action="logout"],.logout-btn').forEach(button=>{button.disabled=true;button.textContent='Saindo...'});
  try{await signOut(auth)}catch(error){console.error('Erro ao sair:',error)}
  finally{
    if(isAdminContext)sessionStorage.removeItem('currentUser_admin');
    else sessionStorage.removeItem('currentUser_member');
    const destino=isAdminContext?'admin-login.html':'index.html';
    location.replace(`${destino}?logout=${Date.now()}`);
  }
}
window.sair=sair;
document.addEventListener('click',event=>{const button=event.target.closest('[data-action="logout"],.logout-btn,button[onclick*="sair"]');if(button)sair(event)},true);

if(body.dataset.adminPage==='true'){
  try{
    const { requireAdmin }=await import(`./admin-guard.js?v=${BUILD}`);
    await requireAdmin();
  }catch(error){
    console.error('Rota administrativa bloqueada:',error);
    throw error;
  }
}

async function iniciarComUsuario(user){
  if(!user){
    location.replace(isAdminContext?'admin-login.html':'index.html');
    return;
  }
  let dados;
  try{dados=await carregarDocumentoUsuario(user)}catch(error){
    console.error('Perfil do clube indisponível:',error);
    if(error.code==='wd/missing-club-profile'){
      await signOut(auth).catch(()=>{});
      location.replace(isAdminContext?'admin-login.html':'index.html');
    }
    return;
  }
  const temaLocal=localStorage.getItem(`wd-theme:${user.uid}`)||localStorage.getItem('wd-theme');
  const tema=temaValido(dados.tema)?dados.tema:(temaValido(temaLocal)?temaLocal:'light');
  aplicarTema(tema,user.uid);
  const role=String(dados.role||'cliente').toLowerCase();
  const admin=FIXED_ADMIN_UIDS.has(user.uid)||ADMIN_ROLES.has(role);
  document.documentElement.dataset.role=admin?'admin':'cliente';
  if(body.dataset.adminPage==='true'&&!admin){location.replace('home.html');return}
  if(body.dataset.adminPage==='true'||isAdminContext)montarMenuAdmin();else montarMenuCliente(dados);
  document.dispatchEvent(new CustomEvent('wd-role-ready',{detail:{user,role,admin,dados}}));
}

authUnsubscribe=onAuthStateChanged(auth,user=>{iniciarComUsuario(user).catch(error=>console.error('Falha ao iniciar o shell:',error))});
window.addEventListener('pagehide',()=>{authUnsubscribe?.();authUnsubscribe=null},{once:true});
