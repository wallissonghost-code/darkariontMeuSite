import { initMemberCommerce,getCommerceState,removeFromWaiting,removeNotification,markNotificationsRead } from './member-commerce.js';

const esc=value=>String(value??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const root=document.querySelector('[data-view="home"]');
const cartIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16l-1.4 9H6z"></path><path d="M8 7a4 4 0 0 1 8 0"></path><circle cx="8" cy="19" r="1"></circle><circle cx="17" cy="19" r="1"></circle></svg>';
const bellIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 17h12l-1.5-2.2V10a4.5 4.5 0 0 0-9 0v4.8z"></path><path d="M10 20h4"></path></svg>';
const trashIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16"></path><path d="M9 7V4h6v3"></path><path d="m7 7 1 13h8l1-13"></path><path d="M10 11v5M14 11v5"></path></svg>';

function ensureCommerceUi(){
  if(!root||document.getElementById('openWaitingCart'))return;
  root.insertAdjacentHTML('afterbegin',`<div class="home-commerce-bar" aria-label="Atalhos de compras"><button type="button" id="openWaitingCart" class="home-commerce-action">${cartIcon}<strong>Carrinho</strong><b id="waitingCartCount">0</b></button><button type="button" id="openNotifications" class="home-commerce-action">${bellIcon}<strong>Notificações</strong><b id="notificationCount" hidden>0</b></button></div><section class="home-commerce-panel" id="waitingCartPanel" hidden><div class="home-commerce-panel-head"><div><span>PRODUTOS SALVOS</span><h2>Carrinho de espera</h2></div><button type="button" data-close-commerce aria-label="Fechar">×</button></div><div id="waitingCartList" class="home-commerce-list"></div></section><section class="home-commerce-panel" id="notificationsPanel" hidden><div class="home-commerce-panel-head"><div><span>ATUALIZAÇÕES</span><h2>Notificações</h2></div><button type="button" data-close-commerce aria-label="Fechar">×</button></div><div id="notificationsList" class="home-commerce-list"></div></section>`);
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
    const product=productFor(item.productId,state);
    return `<article class="commerce-list-item is-waiting">${item.image?`<img src="${esc(item.image)}" alt="">`:'<span class="commerce-item-placeholder">WD</span>'}<div><strong>${esc(product?.nome||item.nome)}</strong><small>Aguardando reposição</small></div><button type="button" class="commerce-trash" data-remove-waiting="${esc(item.productId)}" aria-label="Remover do carrinho">${trashIcon}</button></article>`;
  }).join(''):'<div class="commerce-empty">Seu carrinho de espera está vazio.</div>';
  if(notifyList)notifyList.innerHTML=state.notifications.length?state.notifications.map(item=>`<article class="commerce-list-item notification-item ${item.read?'':'is-unread'}"><a class="notification-open" href="app.html?page=store&product=${encodeURIComponent(item.productId||'')}" data-notification-product="${esc(item.productId||'')}">${item.image?`<img src="${esc(item.image)}" alt="">`:'<span class="commerce-item-placeholder">WD</span>'}<span class="notification-copy"><strong>${esc(item.title)}</strong><small>${esc(item.message)}</small></span></a><button type="button" class="commerce-trash" data-remove-notification="${esc(item.id)}" aria-label="Excluir notificação">${trashIcon}</button></article>`).join(''):'<div class="commerce-empty">Nenhuma notificação por enquanto.</div>';
}

cartButton?.addEventListener('click',()=>{const open=cartPanel?.hidden!==false;closePanels();if(cartPanel)cartPanel.hidden=!open});
notifyButton?.addEventListener('click',async()=>{const open=notifyPanel?.hidden!==false;closePanels();if(notifyPanel)notifyPanel.hidden=!open;if(open)await markNotificationsRead()});
document.querySelectorAll('[data-close-commerce]').forEach(button=>button.addEventListener('click',closePanels));
cartList?.addEventListener('click',async event=>{const button=event.target.closest('[data-remove-waiting]');if(button)await removeFromWaiting(button.dataset.removeWaiting)});
notifyList?.addEventListener('click',async event=>{const remove=event.target.closest('[data-remove-notification]');if(remove){event.preventDefault();event.stopPropagation();await removeNotification(remove.dataset.removeNotification)}});
document.addEventListener('wd-commerce-change',render);

initMemberCommerce().then(render).catch(error=>{
  console.error('Falha ao carregar carrinho e notificações:',error);
  if(cartList)cartList.innerHTML='<div class="commerce-empty">Não foi possível carregar agora.</div>';
  if(notifyList)notifyList.innerHTML='<div class="commerce-empty">Não foi possível carregar agora.</div>';
});
