import { db } from './firebase.js';
import { collection, getDocs, getDocsFromCache, getDocsFromServer } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

const root=document.querySelector('[data-view="store"]');
if(!root)throw new Error('Tela da vitrine não encontrada');
const grid=root.querySelector('#productsGrid');
const search=root.querySelector('#storeSearch');
const category=root.querySelector('#storeCategory');
const count=root.querySelector('#storeResultCount');
const CACHE_KEY='wd-store-cache-v2';
const money=value=>Number(value||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
let products=[];
let syncRunning=false;

function stockOf(product){if(product.estoquePorTamanho&&typeof product.estoquePorTamanho==='object')return Object.values(product.estoquePorTamanho).reduce((sum,value)=>sum+Math.max(0,Number(value)||0),0);return Math.max(0,Number(product.estoque)||0)}
function discountOf(product){const old=Number(product.precoAntigo||0),price=Number(product.preco||0);return old>price&&old>0?Math.round((1-price/old)*100):0}
function card(product){const image=product.imagem||(Array.isArray(product.imagens)?product.imagens[0]:'');const discount=discountOf(product),stock=stockOf(product);return `<article class="product-card" data-product-id="${esc(product.id)}"><span class="product-media ${image?'':'no-image'}">${image?`<img src="${esc(image)}" alt="${esc(product.nome||'Mercadoria')}" loading="lazy" decoding="async">`:'<span class="product-placeholder">WD</span>'}${product.selo?`<span class="product-badge">${esc(product.selo)}</span>`:''}</span><span class="product-body"><span class="product-category">${esc(product.categoria||'WD Founder')}</span><strong class="product-title">${esc(product.nome||'Mercadoria')}</strong><span class="product-price-row"><span class="product-price">${Number(product.precoAntigo||0)>Number(product.preco||0)?`<del>${money(product.precoAntigo)}</del>`:''}<span class="product-price-line"><strong>${money(product.preco)}</strong>${discount?`<span class="product-discount-inline">-${discount}%</span>`:''}</span></span><span class="product-stock">Estoque: ${stock}</span></span></span></article>`}
function filtered(){const term=String(search?.value||'').toLowerCase().trim(),cat=category?.value||'';return products.filter(product=>product.ativo!==false&&(!cat||product.categoria===cat)&&(!term||`${product.nome||''} ${product.categoria||''} ${product.descricao||''}`.toLowerCase().includes(term)))}
function render(){const list=filtered();count.textContent=list.length===1?'1 produto':`${list.length} produtos`;grid.innerHTML=list.length?list.map(card).join(''):'<div class="store-empty">Nenhuma mercadoria encontrada.</div>'}
function normalize(snapshot){return snapshot.docs.map(item=>({id:item.id,...item.data()})).filter(item=>item.tipo==='produto')}
function setProducts(list,{persist=true}={}){products=Array.isArray(list)?list:[];const selected=category?.value||'';const categories=[...new Set(products.map(item=>item.categoria).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'));category.innerHTML='<option value="">Todas as categorias</option>'+categories.map(item=>`<option value="${esc(item)}">${esc(item)}</option>`).join('');if(categories.includes(selected))category.value=selected;render();if(persist){try{localStorage.setItem(CACHE_KEY,JSON.stringify({at:Date.now(),products}))}catch{}}}
function readCache(){try{const parsed=JSON.parse(localStorage.getItem(CACHE_KEY)||'null');return Array.isArray(parsed?.products)?parsed.products:[]}catch{return[]}}
function timeout(ms){return new Promise((_,reject)=>setTimeout(()=>reject(new Error('Tempo limite da vitrine')),ms))}
async function firstAvailable(){
  try{const cachedSnapshot=await Promise.race([getDocsFromCache(collection(db,'ofertas')),timeout(900)]);const list=normalize(cachedSnapshot);if(list.length)return list}catch{}
  return null;
}
async function syncOnline(){
  if(syncRunning)return;syncRunning=true;
  try{
    let snapshot;
    try{snapshot=await Promise.race([getDocsFromServer(collection(db,'ofertas')),timeout(5500)])}
    catch{snapshot=await Promise.race([getDocs(collection(db,'ofertas')),timeout(2500)])}
    setProducts(normalize(snapshot));
    root.removeAttribute('data-store-offline');
  }catch(error){
    console.warn('Vitrine online indisponível:',error);
    root.dataset.storeOffline='true';
    if(!products.length){count.textContent='';grid.innerHTML='<div class="store-empty">Não foi possível carregar a vitrine agora.<br><button type="button" id="retryStore">Tentar novamente</button></div>';root.querySelector('#retryStore')?.addEventListener('click',syncOnline,{once:true})}
  }finally{syncRunning=false}
}

const local=readCache();
if(local.length)setProducts(local,{persist:false});
else grid.innerHTML='<div class="store-empty">Carregando mercadorias…</div>';
search?.addEventListener('input',render,{passive:true});
category?.addEventListener('change',render,{passive:true});
const sdkCache=await firstAvailable();
if(sdkCache?.length)setProducts(sdkCache);
syncOnline();
window.addEventListener('online',syncOnline,{passive:true});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&root.offsetParent!==null&&root.dataset.storeOffline==='true')syncOnline()},{passive:true});
