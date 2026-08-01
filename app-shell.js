import './app-session.js';
import { auth, isAdminContext } from './firebase.js';
import { signOut } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';

const BUILD='2.1.0';
const body=document.body;
const isSpaShell=body.dataset.spaShell==='true';
const FIXED_ADMIN_UIDS=new Set(['WAPN8cPkPGP2mwiQ8FNbIGyUaUl1']);
const ADMIN_ROLES=new Set(['admin','administrador','master']);
let saindo=false;

function carregarCss(href){if(document.querySelector(`link[href^="${href}"]`))return;const link=document.createElement('link');link.rel='stylesheet';link.href=`${href}?v=${BUILD}`;document.head.append(link)}
if(!isSpaShell){carregarCss('app-ui.css');carregarCss('dark-mode.css');carregarCss('navigation.css')}

const temaValido=value=>value==='dark'||value==='light';
function aplicarTema(tema,uid=''){const valor=tema==='dark'?'dark':'light';document.documentElement.dataset.theme=valor;document.documentElement.style.colorScheme=valor;localStorage.setItem('wd-theme',valor);if(uid)localStorage.setItem(`wd-theme:${uid}`,valor);document.dispatchEvent(new CustomEvent('wd-theme-ready',{detail:{theme:valor,uid}}))}
window.aplicarTemaWD=(tema,uid='')=>aplicarTema(tema,uid||window.WDSession?.user?.uid||'');
const temaInicial=localStorage.getItem('wd-theme');if(temaValido(temaInicial))aplicarTema(temaInicial);

function paginaAtual(){return location.pathname.split('/').pop()||'home.html'}
function iniciais(nome){return String(nome||'WD').trim().split(/\s+/).slice(0,2).map(parte=>parte[0]||'').join('').toUpperCase()||'WD'}
function isAdmin(user,profile){const role=String(profile?.role||'cliente').toLowerCase();return FIXED_ADMIN_UIDS.has(user?.uid)||ADMIN_ROLES.has(role)}
function limparNavegacaoAnterior(){document.querySelectorAll('.wd-member-nav,.wd-admin-sidebar,.wd-admin-mobile-trigger,.wd-admin-backdrop,.client-bottom-nav,.app-bottom-nav,.mobile-menu-trigger,.menu-backdrop').forEach(el=>el.remove());body.classList.remove('wd-member-layout','wd-admin-layout','wd-admin-menu-open','menu-open','client-menu-disabled')}
function montarMenuCliente(dados={}){if(isSpaShell)return;limparNavegacaoAnterior();body.classList.add('wd-member-layout');const current=paginaAtual(),avatar=iniciais(dados.nome||window.WDSession?.user?.displayName||'WD'),items=[['home.html','⌂','Início',''],['cartao.html','▣','Cartão',''],['mercadorias.html','◇','Mercadorias',''],['perfil.html',avatar,'Conta','avatar']];const nav=document.createElement('nav');nav.className='wd-member-nav';nav.setAttribute('aria-label','Navegação principal');nav.innerHTML=items.map(([href,icon,label,type])=>`<a href="${href}" class="${current===href?'is-active':''}" ${current===href?'aria-current="page"':''}><span class="${type==='avatar'?'wd-nav-avatar':''}">${icon}</span><small>${label}</small></a>`).join('');document.body.append(nav)}
function fecharAdminMenu(){body.classList.remove('wd-admin-menu-open')}
function montarMenuAdmin(){limparNavegacaoAnterior();body.classList.add('wd-admin-layout');const current=paginaAtual(),items=[['registrar-compra.html','Registrar compra'],['historico-vendas.html','Histórico de vendas'],['estoque.html','Estoque & Produtos'],['mercadorias-admin.html','Mercadorias da vitrine'],['desempenho.html','Desempenho'],['perfil-admin.html','Administração'],['excluir-cliente.html','Excluir conta']];const aside=document.createElement('aside');aside.className='wd-admin-sidebar';aside.setAttribute('aria-label','Painel administrativo');aside.innerHTML=`<div class="wd-admin-brand"><strong>WD</strong><span>FOUNDER ADMIN</span></div><nav class="wd-admin-links">${items.map(([href,label])=>`<a href="${href}" class="${current===href?'is-active':''}" ${current===href?'aria-current="page"':''}>${label}</a>`).join('')}</nav><div class="wd-admin-footer"><button type="button" data-action="logout">Sair do administrador</button></div>`;const trigger=document.createElement('button');trigger.className='wd-admin-mobile-trigger';trigger.type='button';trigger.setAttribute('aria-label','Abrir menu administrativo');trigger.textContent='☰';const backdrop=document.createElement('button');backdrop.className='wd-admin-backdrop';backdrop.type='button';backdrop.setAttribute('aria-label','Fechar menu administrativo');trigger.addEventListener('click',()=>body.classList.toggle('wd-admin-menu-open'));backdrop.addEventListener('click',fecharAdminMenu);aside.addEventListener('click',event=>{if(event.target.closest('a'))fecharAdminMenu()});document.body.prepend(aside);document.body.append(trigger,backdrop);document.querySelector('.menu')?.setAttribute('hidden','')}

async function sair(event){event?.preventDefault?.();event?.stopPropagation?.();if(saindo)return;saindo=true;document.querySelectorAll('[data-action="logout"],.logout-btn').forEach(button=>{button.disabled=true;button.textContent='Saindo...'});try{window.WDSession?.resetClientState?.();await signOut(auth)}catch(error){console.error('Erro ao sair:',error)}finally{const destino=isAdminContext?'admin-login.html':'index.html';location.replace(`${destino}?logout=1`)}}
window.sair=sair;document.addEventListener('click',event=>{const button=event.target.closest('[data-action="logout"],.logout-btn,button[onclick*="sair"]');if(button)sair(event)},true);

if(body.dataset.adminPage==='true'){try{const {requireAdmin}=await import(`./admin-guard.js?v=${BUILD}`);await requireAdmin()}catch(error){console.error('Rota administrativa bloqueada:',error);throw error}}

function renderReady(state){const {user,profile}=state,admin=isAdmin(user,profile),role=String(profile?.role||'cliente').toLowerCase(),temaLocal=localStorage.getItem(`wd-theme:${user.uid}`)||localStorage.getItem('wd-theme'),tema=temaValido(profile?.tema)?profile.tema:(temaValido(temaLocal)?temaLocal:'light');aplicarTema(tema,user.uid);document.documentElement.dataset.role=admin?'admin':'cliente';if(body.dataset.adminPage==='true'&&!admin){location.replace('app.html?page=home');return}if(body.dataset.adminPage==='true'||isAdminContext)montarMenuAdmin();else montarMenuCliente(profile);if(isSpaShell){const avatar=iniciais(profile?.nome||user.displayName||'WD');document.querySelectorAll('[data-spa-avatar]').forEach(element=>element.textContent=avatar)}body.classList.add('wd-auth-ready');document.documentElement.dataset.authState='ready';document.dispatchEvent(new CustomEvent('wd-role-ready',{detail:{user,role,admin,dados:profile}}))}

window.WDSession.subscribe(state=>{document.documentElement.dataset.authState=state.status;if(state.status==='signed-out'){location.replace(isAdminContext?'admin-login.html':'index.html');return}if(state.status==='missing-profile'){signOut(auth).finally(()=>location.replace(isAdminContext?'admin-login.html':'index.html'));return}if(state.status==='error'){console.error('Falha ao inicializar sessão:',state.error);body.classList.add('wd-auth-error');return}if(state.status==='ready')renderReady(state)});
