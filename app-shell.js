import './app-session.js';
import { auth, isAdminContext } from './firebase.js';
import { signOut } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';

const BUILD='2.2.0';
const body=document.body;
const isSpaShell=body.dataset.spaShell==='true';
const FIXED_ADMIN_UIDS=new Set(['WAPN8cPkPGP2mwiQ8FNbIGyUaUl1']);
const ADMIN_ROLES=new Set(['admin','administrador','master']);
const ADMIN_TOOLS=[
  ['perfil-admin.html','Painel Admin','Configurações, clientes, níveis e benefícios','✦'],
  ['registrar-compra.html','Registrar compra','Lançar vendas, bônus e evolução VIP','＋'],
  ['historico-vendas.html','Histórico de vendas','Consultar movimentos e realizar estornos','◷'],
  ['estoque.html','Estoque & Produtos','Produtos, custos, preços e quantidades','▦'],
  ['mercadorias-admin.html','Publicar mercadorias','Gerenciar a vitrine exibida aos membros','◇'],
  ['desempenho.html','Desempenho','Indicadores, vendas e distribuição VIP','⌁'],
  ['excluir-cliente.html','Excluir conta','Remover perfis cadastrados com segurança','×']
];
let saindo=false;

function carregarCss(href){
  if(document.querySelector(`link[href^="${href}"]`))return;
  const link=document.createElement('link');
  link.rel='stylesheet';
  link.href=`${href}?v=${BUILD}`;
  document.head.append(link);
}
if(!isSpaShell){carregarCss('app-ui.css');carregarCss('dark-mode.css');carregarCss('navigation.css')}

const temaValido=value=>value==='dark'||value==='light';
function aplicarTema(tema,uid=''){
  const valor=tema==='dark'?'dark':'light';
  document.documentElement.dataset.theme=valor;
  document.documentElement.style.colorScheme=valor;
  localStorage.setItem('wd-theme',valor);
  if(uid)localStorage.setItem(`wd-theme:${uid}`,valor);
  document.dispatchEvent(new CustomEvent('wd-theme-ready',{detail:{theme:valor,uid}}));
}
window.aplicarTemaWD=(tema,uid='')=>aplicarTema(tema,uid||window.WDSession?.user?.uid||'');
const temaInicial=localStorage.getItem('wd-theme');
if(temaValido(temaInicial))aplicarTema(temaInicial);

function paginaAtual(){return location.pathname.split('/').pop()||'home.html'}
function iniciais(nome){return String(nome||'WD').trim().split(/\s+/).slice(0,2).map(parte=>parte[0]||'').join('').toUpperCase()||'WD'}
function isAdmin(user,profile){const role=String(profile?.role||'cliente').toLowerCase();return FIXED_ADMIN_UIDS.has(user?.uid)||ADMIN_ROLES.has(role)}
function limparNavegacaoAnterior(){
  document.querySelectorAll('.wd-member-nav,.wd-admin-sidebar,.wd-admin-mobile-trigger,.wd-admin-backdrop,.client-bottom-nav,.app-bottom-nav,.mobile-menu-trigger,.menu-backdrop').forEach(el=>el.remove());
  body.classList.remove('wd-member-layout','wd-admin-layout','wd-admin-menu-open','menu-open','client-menu-disabled');
}
function montarMenuCliente(dados={}){
  if(isSpaShell)return;
  limparNavegacaoAnterior();
  body.classList.add('wd-member-layout');
  const current=paginaAtual();
  const avatar=iniciais(dados.nome||window.WDSession?.user?.displayName||'WD');
  const items=[['home.html','⌂','Início',''],['cartao.html','▣','Cartão',''],['mercadorias.html','◇','Mercadorias',''],['perfil.html',avatar,'Conta','avatar']];
  const nav=document.createElement('nav');
  nav.className='wd-member-nav';
  nav.setAttribute('aria-label','Navegação principal');
  nav.innerHTML=items.map(([href,icon,label,type])=>`<a href="${href}" class="${current===href?'is-active':''}" ${current===href?'aria-current="page"':''}><span class="${type==='avatar'?'wd-nav-avatar':''}">${icon}</span><small>${label}</small></a>`).join('');
  document.body.append(nav);
}
function fecharAdminMenu(){body.classList.remove('wd-admin-menu-open')}
function montarMenuAdmin(){
  limparNavegacaoAnterior();
  body.classList.add('wd-admin-layout');
  const current=paginaAtual();
  const aside=document.createElement('aside');
  aside.className='wd-admin-sidebar';
  aside.setAttribute('aria-label','Painel administrativo');
  aside.innerHTML=`<div class="wd-admin-brand"><strong>WD</strong><span>FOUNDER ADMIN</span></div><nav class="wd-admin-links">${ADMIN_TOOLS.map(([href,label])=>`<a href="${href}" class="${current===href?'is-active':''}" ${current===href?'aria-current="page"':''}>${label}</a>`).join('')}</nav><div class="wd-admin-footer"><button type="button" data-action="logout">Sair do administrador</button></div>`;
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

function fecharFerramentasAdmin(){
  body.classList.remove('spa-admin-open');
  document.querySelector('[data-admin-tools-trigger]')?.setAttribute('aria-expanded','false');
}
function abrirFerramentasAdmin(){
  body.classList.add('spa-admin-open');
  document.querySelector('[data-admin-tools-trigger]')?.setAttribute('aria-expanded','true');
}
function alternarFerramentasAdmin(){body.classList.contains('spa-admin-open')?fecharFerramentasAdmin():abrirFerramentasAdmin()}
function montarAcessosAdminSpa(){
  if(!isSpaShell||document.querySelector('[data-spa-admin-tools]'))return;
  const desktopNav=document.querySelector('.spa-sidebar .spa-nav');
  const bottomNav=document.querySelector('.spa-bottom-nav');
  if(!desktopNav||!bottomNav)return;

  const desktopSection=document.createElement('section');
  desktopSection.className='spa-admin-section';
  desktopSection.dataset.spaAdminTools='true';
  desktopSection.innerHTML=`<div class="spa-admin-section-title"><span>ADMINISTRAÇÃO</span><b>Acesso autorizado</b></div><div class="spa-admin-links">${ADMIN_TOOLS.map(([href,label,,icon])=>`<a href="${href}"><span>${icon}</span><small>${label}</small></a>`).join('')}</div>`;
  desktopNav.insertAdjacentElement('afterend',desktopSection);

  const mobileTrigger=document.createElement('button');
  mobileTrigger.type='button';
  mobileTrigger.className='spa-admin-nav-button';
  mobileTrigger.dataset.adminToolsTrigger='true';
  mobileTrigger.setAttribute('aria-label','Abrir ferramentas administrativas');
  mobileTrigger.setAttribute('aria-expanded','false');
  mobileTrigger.innerHTML='<span>✦</span><small>Admin</small>';
  mobileTrigger.addEventListener('click',alternarFerramentasAdmin);
  bottomNav.append(mobileTrigger);
  bottomNav.classList.add('has-admin');

  const panel=document.createElement('section');
  panel.className='spa-admin-tools-panel';
  panel.dataset.spaAdminTools='true';
  panel.setAttribute('aria-label','Ferramentas administrativas');
  panel.innerHTML=`<div class="spa-admin-tools-head"><div><span>WD FOUNDER</span><h2>Ferramentas administrativas</h2><p>Acesso exclusivo da conta autorizada.</p></div><button type="button" data-close-admin-tools aria-label="Fechar">×</button></div><div class="spa-admin-tools-grid">${ADMIN_TOOLS.map(([href,label,description,icon])=>`<a href="${href}"><span class="spa-admin-tool-icon">${icon}</span><div><strong>${label}</strong><small>${description}</small></div><b>›</b></a>`).join('')}</div>`;
  const backdrop=document.createElement('button');
  backdrop.type='button';
  backdrop.className='spa-admin-tools-backdrop';
  backdrop.dataset.spaAdminTools='true';
  backdrop.setAttribute('aria-label','Fechar ferramentas administrativas');
  panel.querySelector('[data-close-admin-tools]').addEventListener('click',fecharFerramentasAdmin);
  backdrop.addEventListener('click',fecharFerramentasAdmin);
  panel.addEventListener('click',event=>{if(event.target.closest('a'))fecharFerramentasAdmin()});
  document.body.append(panel,backdrop);
  document.addEventListener('keydown',event=>{if(event.key==='Escape')fecharFerramentasAdmin()});
}
function removerAcessosAdminSpa(){
  document.querySelectorAll('[data-spa-admin-tools],[data-admin-tools-trigger]').forEach(element=>element.remove());
  document.querySelector('.spa-bottom-nav')?.classList.remove('has-admin');
  fecharFerramentasAdmin();
}

async function sair(event){
  event?.preventDefault?.();
  event?.stopPropagation?.();
  if(saindo)return;
  saindo=true;
  document.querySelectorAll('[data-action="logout"],.logout-btn').forEach(button=>{button.disabled=true;button.textContent='Saindo...'});
  try{
    window.WDSession?.resetClientState?.();
    await signOut(auth);
  }catch(error){
    console.error('Erro ao sair:',error);
  }finally{
    const destino=isAdminContext?'admin-login.html':'index.html';
    location.replace(`${destino}?logout=1`);
  }
}
window.sair=sair;
document.addEventListener('click',event=>{const button=event.target.closest('[data-action="logout"],.logout-btn,button[onclick*="sair"]');if(button)sair(event)},true);

if(body.dataset.adminPage==='true'){
  try{const {requireAdmin}=await import(`./admin-guard.js?v=${BUILD}`);await requireAdmin()}
  catch(error){console.error('Rota administrativa bloqueada:',error);throw error}
}

function renderReady(state){
  const {user,profile}=state;
  const admin=isAdmin(user,profile);
  const role=String(profile?.role||'cliente').toLowerCase();
  const temaLocal=localStorage.getItem(`wd-theme:${user.uid}`)||localStorage.getItem('wd-theme');
  const tema=temaValido(profile?.tema)?profile.tema:(temaValido(temaLocal)?temaLocal:'light');
  aplicarTema(tema,user.uid);
  document.documentElement.dataset.role=admin?'admin':'cliente';
  if(body.dataset.adminPage==='true'&&!admin){location.replace('app.html?page=home');return}
  if(body.dataset.adminPage==='true'||isAdminContext)montarMenuAdmin();else montarMenuCliente(profile);
  if(isSpaShell){
    const avatar=iniciais(profile?.nome||user.displayName||'WD');
    document.querySelectorAll('[data-spa-avatar]').forEach(element=>element.textContent=avatar);
    if(admin)montarAcessosAdminSpa();else removerAcessosAdminSpa();
  }
  body.classList.add('wd-auth-ready');
  document.documentElement.dataset.authState='ready';
  document.dispatchEvent(new CustomEvent('wd-role-ready',{detail:{user,role,admin,dados:profile}}));
}

window.WDSession.subscribe(state=>{
  document.documentElement.dataset.authState=state.status;
  if(state.status==='signed-out'){location.replace(isAdminContext?'admin-login.html':'index.html');return}
  if(state.status==='missing-profile'){signOut(auth).finally(()=>location.replace(isAdminContext?'admin-login.html':'index.html'));return}
  if(state.status==='error'){console.error('Falha ao inicializar sessão:',state.error);body.classList.add('wd-auth-error');return}
  if(state.status==='ready')renderReady(state);
});
