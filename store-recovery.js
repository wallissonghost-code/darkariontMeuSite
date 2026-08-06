import { db } from './firebase.js';
import { collection,getDocs } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

const CACHE_KEY='wd-store-products-cache-v1';
const MAX_WAIT=5500;
const money=value=>Number(value||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const stockOf=item=>item.estoquePorTamanho&&typeof item.estoquePorTamanho==='object'?Object.values(item.estoquePorTamanho).reduce((sum,value)=>sum+Math.max(0,Number(value)||0),0):Math.max(0,Number(item.estoque)||0);
const readCache=()=>{try{const parsed=JSON.parse(localStorage.getItem(CACHE_KEY)||'[]');return Array.isArray(parsed)?parsed:[]}catch{return[]}};
const writeCache=items=>{try{localStorage.setItem(CACHE_KEY,JSON.stringify(items.slice(0,100)))}catch{}}
function roots(){return[...document.querySelectorAll('[data-view="store"]')].filter(root=>root.offsetParent!==null||!root.closest('[hidden]'))}
function render(root,items){const grid=root.querySelector('#productsGrid'),count=root.querySelector('#storeResultCount');if(!grid||grid.dataset.recoveryRendered==='true')return;const active=items.filter(item=>item&&item.tipo==='produto'&&item.ativo!==false);if(count)count.textContent=active.length===1?'1 produto':`${active.length} produtos`;grid.innerHTML=active.length?active.map(item=>{const image=Array.isArray(item.imagens)&&item.imagens[0]||item.imagem||'';const stock=stockOf(item);return`<button class="product-card" type="button" data-product-id="${esc(item.id)}"><span class="product-media ${image?'':'no-image'}">${image?`<img src="${esc(image)}" alt="${esc(item.nome||'Mercadoria')}" loading="lazy">`:'<span class="product-placeholder">WD</span>'}</span><span class="product-body"><span class="product-category">${esc(item.categoria||'WD Founder')}</span><span class="product-title">${esc(item.nome||'Mercadoria')}</span><span class="product-price-row"><span class="product-price"><strong>${money(item.preco)}</strong></span><span class="product-stock">Estoque: ${stock}</span></span></span></button>`}).join(''):'<div class="store-empty">Nenhuma mercadoria disponível no momento.</div>';grid.dataset.recoveryRendered='true'}
async function fetchWithTimeout(){const request=getDocs(collection(db,'ofertas'));const timeout=new Promise((_,reject)=>setTimeout(()=>reject(new Error('Tempo limite da vitrine')),MAX_WAIT));const snapshot=await Promise.race([request,timeout]);return snapshot.docs.map(doc=>({id:doc.id,...doc.data()})).filter(item=>item.id!=='__config_loja')}
async function recover(root){const grid=root.querySelector('#productsGrid');if(!grid)return;const cached=readCache();if(cached.length)render(root,cached);try{const items=await fetchWithTimeout();writeCache(items);grid.dataset.recoveryRendered='false';render(root,items)}catch(error){console.warn('Vitrine usando dados locais:',error);if(!cached.length&&/Preparando vitrine/i.test(grid.textContent||''))grid.innerHTML='<div class="store-empty">A conexão está lenta. Toque novamente em Mercadorias para tentar de novo.</div>'}}
function schedule(){setTimeout(()=>roots().forEach(recover),180)}
document.addEventListener('wd-spa-route',event=>{if(event.detail?.route==='store')schedule()});
if(new URL(location.href).searchParams.get('page')==='store')schedule();
