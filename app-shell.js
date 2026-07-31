import { auth, db } from './firebase.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

const BUILD = '20260731-1505';
const body = document.body;
const menu = document.querySelector('.menu');
const isClientApp = body.dataset.clientApp === 'true';
let scrollTravado = 0;
let saindo = false;

function carregarCss(href) {
  if (document.querySelector(`link[href^="${href}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `${href}?v=${BUILD}`;
  document.head.append(link);
}

carregarCss('shell-fixes.css');
carregarCss('dark-mode.css');
carregarCss('ui-fixes-v2.css');

function temaValido(value) {
  return value === 'dark' || value === 'light';
}

function aplicarTema(tema, uid = '') {
  const valor = tema === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.theme = valor;
  localStorage.setItem('wd-theme', valor);
  if (uid) localStorage.setItem(`wd-theme:${uid}`, valor);
  document.dispatchEvent(new CustomEvent('wd-theme-ready', { detail: { theme: valor, uid } }));
}

window.aplicarTemaWD = (tema, uid = '') => aplicarTema(tema, uid || auth.currentUser?.uid || '');
const temaInicial = localStorage.getItem('wd-theme');
if (temaValido(temaInicial)) aplicarTema(temaInicial);

function travarPagina() {
  scrollTravado = window.scrollY || 0;
  body.style.position = 'fixed';
  body.style.top = `-${scrollTravado}px`;
  body.style.left = '0';
  body.style.right = '0';
  body.style.width = '100%';
}

function destravarPagina() {
  body.style.position = '';
  body.style.top = '';
  body.style.left = '';
  body.style.right = '';
  body.style.width = '';
  window.scrollTo(0, scrollTravado);
}

function fecharMenu() {
  const aberta = body.classList.contains('menu-open');
  body.classList.remove('menu-open');
  document.querySelector('.mobile-menu-trigger')?.setAttribute('aria-expanded', 'false');
  if (aberta) destravarPagina();
}

function abrirMenu() {
  if (body.classList.contains('menu-open')) return;
  travarPagina();
  body.classList.add('menu-open');
  document.querySelector('.mobile-menu-trigger')?.setAttribute('aria-expanded', 'true');
}

function garantirLinksAdmin() {
  if (!menu) return;
  const current = location.pathname.split('/').pop() || 'home.html';
  const defs = [
    ['registrar-compra.html', 'Registrar compra'],
    ['historico-vendas.html', 'Histórico de vendas'],
    ['estoque.html', 'Estoque & Produtos'],
    ['desempenho.html', 'Desempenho'],
    ['perfil-admin.html', 'Administração'],
    ['excluir-cliente.html', 'Excluir conta']
  ];
  defs.forEach(([href, text]) => {
    const matches = [...menu.querySelectorAll('a')].filter(a => a.getAttribute('href') === href);
    matches.slice(1).forEach(a => a.remove());
    const link = matches[0] || document.createElement('a');
    link.href = href;
    link.textContent = text;
    link.dataset.adminLink = 'true';
    link.classList.add('admin-only');
    link.classList.toggle('ativo', current === href);
    menu.append(link);
  });
}

function montarEstruturaMenu() {
  if (!menu) return;
  let links = menu.querySelector('.menu-links');
  let footer = menu.querySelector('.menu-footer');
  if (!links) {
    links = document.createElement('div');
    links.className = 'menu-links';
  }
  if (!footer) {
    footer = document.createElement('div');
    footer.className = 'menu-footer';
  }

  const marca = menu.querySelector('.marca');
  const close = menu.querySelector('.menu-close');
  [...menu.children].forEach(el => {
    if ([marca, close, links, footer].includes(el)) return;
    if (el.matches('.logout-btn,[data-action="logout"],button[onclick*="sair"]')) footer.append(el);
    else if (el.matches('a')) links.append(el);
  });

  if (marca) menu.insertBefore(links, marca.nextSibling);
  else menu.prepend(links);
  menu.append(footer);

  footer.querySelectorAll('button').forEach((button, index) => {
    if (index > 0) button.remove();
  });
  let logout = footer.querySelector('button');
  if (!logout) {
    logout = document.createElement('button');
    footer.append(logout);
  }
  logout.className = 'logout-btn';
  logout.dataset.action = 'logout';
  logout.type = 'button';
  logout.textContent = 'Sair da conta';
  logout.hidden = false;
  logout.disabled = false;
  logout.removeAttribute('onclick');
  logout.removeAttribute('style');
}

function montarMenuMobile() {
  if (!menu || document.querySelector('.mobile-menu-trigger')) return;
  const trigger = document.createElement('button');
  trigger.className = 'mobile-menu-trigger';
  trigger.type = 'button';
  trigger.setAttribute('aria-label', 'Abrir menu');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.innerHTML = '<span></span><span></span><span></span>';

  const backdrop = document.createElement('button');
  backdrop.className = 'menu-backdrop';
  backdrop.type = 'button';
  backdrop.setAttribute('aria-label', 'Fechar menu');

  const close = document.createElement('button');
  close.className = 'menu-close';
  close.type = 'button';
  close.setAttribute('aria-label', 'Fechar menu');
  close.textContent = '×';
  menu.prepend(close);

  trigger.addEventListener('click', () => body.classList.contains('menu-open') ? fecharMenu() : abrirMenu());
  close.addEventListener('click', fecharMenu);
  backdrop.addEventListener('click', fecharMenu);
  menu.addEventListener('click', event => {
    if (event.target.closest('a')) fecharMenu();
  });

  (document.querySelector('.conteudo,.app-stage') || document.body).prepend(trigger);
  document.body.append(backdrop);
  window.addEventListener('pageshow', fecharMenu);
  window.addEventListener('resize', () => { if (innerWidth > 768) fecharMenu(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') fecharMenu(); });
}

function iniciais(nome) {
  return String(nome || 'WD').trim().split(/\s+/).slice(0, 2).map(p => p[0] || '').join('').toUpperCase() || 'WD';
}

function montarNavegacaoCliente(dados = {}) {
  if (isClientApp || window.self !== window.top) return;
  document.querySelector('.client-bottom-nav')?.remove();
  const current = location.pathname.split('/').pop() || 'home.html';
  const avatar = iniciais(dados.nome || auth.currentUser?.displayName || 'WD');
  const items = [
    ['home.html', '⌂', 'Início', ''],
    ['cartao.html', '▣', 'Meu cartão', ''],
    ['ofertas.html', '◇', 'Benefícios', ''],
    ['perfil.html', avatar, 'Conta', 'avatar']
  ];
  const nav = document.createElement('nav');
  nav.className = 'client-bottom-nav';
  nav.setAttribute('aria-label', 'Navegação principal');
  nav.innerHTML = items.map(([href, icon, label, tipo]) => `<a href="${href}" class="${current === href ? 'ativo' : ''}"><span class="${tipo === 'avatar' ? 'nav-avatar' : ''}">${icon}</span><small>${label}</small></a>`).join('');
  document.body.append(nav);
}

async function carregarDocumentoUsuario(user) {
  const snap = await getDoc(doc(db, 'usuarios', user.uid));
  if (snap.exists()) return snap.data();
  const error = new Error('Cadastro do clube não encontrado.');
  error.code = 'wd/missing-club-profile';
  throw error;
}

async function sair(event) {
  event?.preventDefault?.();
  event?.stopPropagation?.();
  if (saindo) return;
  saindo = true;
  fecharMenu();
  body.classList.add('is-signing-out');
  document.querySelectorAll('[data-action="logout"],.logout-btn').forEach(button => {
    button.disabled = true;
    button.textContent = 'Saindo...';
  });

  try {
    await signOut(auth);
  } catch (error) {
    console.error('Erro ao sair:', error);
  } finally {
    sessionStorage.clear();
    localStorage.removeItem('firebase:previous_websocket_failure');
    const destino = `index.html?logout=${Date.now()}`;
    if (window.top && window.top !== window.self) window.top.location.replace(destino);
    else window.location.replace(destino);
  }
}

window.sair = sair;

// Um único listener delegado controla todo logout, inclusive botões recriados.
document.addEventListener('click', event => {
  const button = event.target.closest('[data-action="logout"],.logout-btn,button[onclick*="sair"]');
  if (!button) return;
  sair(event);
}, true);

if (body.dataset.adminPage === 'true' && !document.getElementById('deleteDuplicateProfile')) {
  const button = document.createElement('button');
  button.id = 'deleteDuplicateProfile';
  button.type = 'button';
  button.hidden = true;
  document.body.append(button);
}

garantirLinksAdmin();
montarEstruturaMenu();
montarMenuMobile();

onAuthStateChanged(auth, async user => {
  if (!user) {
    if (window.top && window.top !== window.self) window.top.location.replace('index.html');
    else location.replace('index.html');
    return;
  }

  montarNavegacaoCliente({ nome: user.displayName || 'WD' });
  const chave = `wd-theme:${user.uid}`;
  const temaUsuario = localStorage.getItem(chave);
  if (temaValido(temaUsuario)) aplicarTema(temaUsuario, user.uid);

  let dados;
  try {
    dados = await carregarDocumentoUsuario(user);
  } catch (error) {
    console.error('Perfil do clube indisponível:', error);
    if (error.code === 'wd/missing-club-profile') {
      alert('Esta conta não possui mais cadastro ativo no WD Founder.');
      await signOut(auth).catch(() => {});
      if (window.top && window.top !== window.self) window.top.location.replace('index.html');
      else location.replace('index.html');
    }
    return;
  }

  const temaRemoto = temaValido(dados?.tema) ? dados.tema : null;
  if (temaRemoto) aplicarTema(temaRemoto, user.uid);
  else if (temaValido(temaUsuario)) aplicarTema(temaUsuario, user.uid);
  else aplicarTema('light', user.uid);

  const role = String(dados?.role || 'cliente').toLowerCase();
  const admin = ['admin', 'administrador', 'master'].includes(role);
  document.querySelectorAll('.admin-only').forEach(el => el.classList.toggle('is-visible', admin));
  document.documentElement.dataset.role = admin ? 'admin' : 'cliente';
  montarEstruturaMenu();
  montarNavegacaoCliente(dados);

  if (body.dataset.adminPage === 'true' && !admin) {
    location.replace(isClientApp ? 'app.html#home' : 'home.html');
    return;
  }

  document.dispatchEvent(new CustomEvent('wd-role-ready', { detail: { user, role, admin, dados } }));
});
