import { db } from './firebase.js';
import { collection,getDocs } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import { initMemberCommerce,getCommerceState,addToWaiting,removeFromWaiting } from './member-commerce.js';

const grid=document.getElementById('productsGrid');
let products=new Map();
let busy=false;

function waitingIds(){return new Set(getCommerceState().waiting.map(item=>item.productId))}
function enhance(){
  if(!grid||!products.size)return;
  const saved=waitingIds();
  grid.querySelectorAll('[data-open-product]').forEach(card=>{
    const id=card.dataset.openProduct,product=products.get(id),stock=Math.max(0,Number(product?.estoque)||0);
    card.classList.toggle('is-out-of-stock',stock===0);
    card.dataset.stock=String(stock);
    card.querySelector('.out-stock-layer')?.remove();
    if(stock===0){
      card.setAttribute('aria-label',`${product?.nome||'Produto'} fora de estoque`);
      card.insertAdjacentHTML('beforeend',`<div class="out-stock-layer"><span>🔒</span><strong>Fora de estoque</strong><button type="button" data-wait-product="${id}">${saved.has(id)?'No carrinho de espera':'Avise-me quando voltar'}</button></div>`);
    }
  });
}

async function toggleWaiting(id,button){
  if(busy)return;const product=products.get(id);if(!product)return;
  busy=true;button.disabled=true;
  try{
    const exists=getCommerceState().waiting.some(item=>item.productId===id);
    if(exists)await removeFromWaiting(id);else await addToWaiting(product);
    enhance();
  }catch(error){console.error(error);button.textContent='Não foi possível salvar';setTimeout(enhance,1500)}finally{busy=false}
}

grid?.addEventListener('click',event=>{
  const waitButton=event.target.closest('[data-wait-product]');
  if(waitButton){event.preventDefault();event.stopImmediatePropagation();toggleWaiting(waitButton.dataset.waitProduct,waitButton);return}
  const card=event.target.closest('[data-open-product][data-stock="0"]');
  if(card){event.preventDefault();event.stopImmediatePropagation()}
},true);
grid?.addEventListener('keydown',event=>{const card=event.target.closest('[data-open-product][data-stock="0"]');if(card&&(event.key==='Enter'||event.key===' ')){event.preventDefault();event.stopImmediatePropagation();card.querySelector('[data-wait-product]')?.focus()}},true);

document.addEventListener('wd-commerce-change',enhance);
const observer=new MutationObserver(enhance);if(grid)observer.observe(grid,{childList:true,subtree:true});

try{
  const [snapshot]=await Promise.all([getDocs(collection(db,'ofertas')),initMemberCommerce()]);
  products=new Map(snapshot.docs.map(item=>({id:item.id,...item.data()})).filter(item=>item.tipo==='produto').map(item=>[item.id,item]));
  enhance();
}catch(error){console.error('Falha ao ativar controle de estoque:',error)}
