import { initMemberCommerce,getCommerceState,removeFromWaiting,markNotificationsRead } from './member-commerce.js';

const esc=value=>String(value??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const root=document.querySelector('[data-view="home"]');

function ensureCommerceUi(){
  if(!root||document.getElementById('openWaitingCart'))return;
  root.insertAdjacentHTML('afterbegin',`<div class="home-commerce-bar" aria-label="Atalhos de compras"><button type="button" id="openWaitingCart" class="home-commerce-action"><span aria-hidden="true">🛍</span><strong>Carrinho</strong><b id="waitingCartCount">0</b></button><button type="button" id="openNotifications" class="home-commerce-action"><span aria-hidden="true">🔔</span><strong>Notificações</strong><b id="notificationCount" hidden>0</b></button></div><section class="home-commerce-panel" id="waitingCartPanel" hidden><div class="home-commerce-panel-head"><div><span>PRODUTOS SALVOS</span><h2>Carrinho de espera</h2></div><button type="button" data-close-commerce>×</button></div><div id="waitingCartList" class="home-commerce-list"></div></section><section class="home-commerce-panel" id="notificationsPanel" hidden><div class="home-commerce-panel-head"><div><span>ATUALIZAÇÕES</span><h2>Notificações</h2></div><button type="button" data-close-commerce>×</button></div><div id="notificationsList" class="home-commerce-list"></div></section>`);
}
ensureCommerceUi();

const cartButton=document.getElementById('openWaitingCart');
const notifyButton=document.getElementById('openNotifications');
const cartPanel=document.getElementById('waitingCartPanel');
const notifyPanel=document.getElementById('notificationsPanel');
const cartList=document.getElementById('waitingCartList');
const notifyList=document.getElementById('notificationsList');
const cartCount=document.getElementById('waitingCartCount');
const notifyCount=document.getElementById('notificationCount');

function closePanels(){if(cartPanel)cartPanel.hidden=true;if(notifyPanel)notifyPanel.hidden=true}
function productFor(id,state){return state.products.find(item=>item.id===id)}
function render(){
  const state=getCommerceState();
  if(!state.ready)return;
  const unread=state.notifications.filter(item=>!item.read).length;
  if(cartCount)cartCount.textContent=String(state.waiting.length);
  if(notifyCount){notifyCount.textContent=String(unread);notifyCount.hidden=unread===0}
  if(cartList)cartList.innerHTML=state.waiting.length?state.waiting.map(item=>{
    const product=productFor(item.productId,state),available=Math.max(0,Number(product?.estoque)||0)>0;
    return `<article class="commerce-list-item ${available?'is-available':'is-waiting'}">${item.image?`<img src="${esc(item.image)}" alt="">`:'<span class="commerce-item-placeholder">WD</span>'}<div><strong>${esc(product?.nome||item.nome)}</strong><small>${available?'Disponível agora':'Aguardando reposição'}</small></div><button type="button" data-remove-waiting="${esc(item.productId)}">Remover</button></article>`;
  }).join(''):'<div class="commerce-empty">Seu carrinho de espera está vazio.</div>';
  if(notifyList)notifyList.innerHTML=state.notifications.length?state.notifications.map(item=>`<article class="commerce-list-item notification-item ${item.read?'':'is-unread'}">${item.image?`<img src="${esc(item.image)}" alt="">`:'<span class="commerce-item-placeholder">!</span>'}<div><strong>${esc(item.title)}</strong><small>${esc(item.message)}</small></div>${item.productId?`<a href="app.html?page=store" data-spa-route="store">Ver item</a>`:''}</article>`).join(''):'<div class="commerce-empty">Nenhuma notificação por enquanto.</div>';
}

cartButton?.addEventListener('click',()=>{const open=cartPanel?.hidden!==false;closePanels();if(cartPanel)cartPanel.hidden=!open});
notifyButton?.addEventListener('click',async()=>{const open=notifyPanel?.hidden!==false;closePanels();if(notifyPanel)notifyPanel.hidden=!open;if(open)await markNotificationsRead()});
document.querySelectorAll('[data-close-commerce]').forEach(button=>button.addEventListener('click',closePanels));
cartList?.addEventListener('click',async event=>{const button=event.target.closest('[data-remove-waiting]');if(button)await removeFromWaiting(button.dataset.removeWaiting)});
document.addEventListener('wd-commerce-change',render);

initMemberCommerce().then(render).catch(error=>{
  console.error('Falha ao carregar carrinho e notificações:',error);
  if(cartList)cartList.innerHTML='<div class="commerce-empty">Não foi possível carregar agora.</div>';
  if(notifyList)notifyList.innerHTML='<div class="commerce-empty">Não foi possível carregar agora.</div>';
});
