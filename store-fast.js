import { db } from './firebase.js';
import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

const root=document.querySelector('[data-view="store"]');
if(!root)throw new Error('Tela da vitrine não encontrada');
const grid=root.querySelector('#productsGrid');
const search=root.querySelector('#storeSearch');
const category=root.querySelector('#storeCategory');
const count=root.querySelector('#storeResultCount');
const CACHE_KEY='wd-store-cache-v1';
const money=value=>Number(value||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
let products=[];

function stockOf(product){if(product.estoquePorTamanho&&typeof product.estoquePorTamanho==='object')return Object.values(product.estoquePorTamanho).reduce((sum,value)=>sum+Math.max(0,Number(value)||0),0);return Math.max(0,Number(product.estoque)||0)}
function discountOf(product){const old=Number(product.precoAntigo||0),price=Number(product.preco||0);return old>price&&old>0?Math.round((1-price/old)*100):0}
function card(product){const image=product.imagem||(Array.isArray(product.imagens)?product.imagens[0]:'');const discount=discountOf(product),stock=stockOf(product);return `<article class="product-card" data-product-id="${esc(product.id)}"><span class="product-media ${image?'':'no-image'}">${image?`<img src="${esc(image)}" alt="${esc(product.nome||'Mercadoria')}" loading="lazy">`:'<span class="product-placeholder">WD</span>'}${product.selo?`<span class="product-badge">${esc(product.selo)}</span>`:''}</span><span class="product-body"><span class="product-category">${esc(product.categoria||'WD Founder')}</span><strong class="product-title">${esc(product.nome||'Mercadoria')}</strong><span class="product-price-row"><span class="product-price">${Number(product.precoAntigo||0)>Number(product.preco||0)?`<del>${money(product.precoAntigo)}</del>`:''}<span class="product-price-line"><strong>${money(product.preco)}</strong>${discount?`<span class="product-discount-inline">-${discount}%</span>`:''}</span></span><span class="product-stock">Estoque: ${stock}</span></span></span></article>`}
function filtered(){const term=String(search?.value||'').toLowerCase().trim(),cat=category?.value||'';return products.filter(product=>product.ativo!==false&&(!cat||product.categoria===cat)&&(!term||`${product.nome||''} ${product.categoria||''} ${product.descricao||''}`.toLowerCase().includes(term)))}
function render(){const list=filtered();count.textContent=list.length===1?'1 produto':`${list.length} produtos`;grid.innerHTML=list.length?list.map(card).join(''):'<div class="store-empty">Nenhuma mercadoria encontrada.</div>'}
function setProducts(list,{cache=true}={}){products=Array.isArray(list)?list:[];const categories=[...new Set(products.map(item=>item.categoria).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'));category.innerHTML='<option value="">Todas as categorias</option>'+categories.map(item=>`<option value="${esc(item)}">${esc(item)}</option>`).join('');render();if(cache){try{localStorage.setItem(CACHE_KEY,JSON.stringify({at:Date.now(),products}))}catch{}}}
function readCache(){try{const parsed=JSON.parse(localStorage.getItem(CACHE_KEY)||'null');return Array.isArray(parsed?.products)?parsed.products:[]}catch{return[]}}
async function loadOnline(){const timeout=new Promise((_,reject)=>setTimeout(()=>reject(new Error('Tempo limite da vitrine')),5000));const request=getDocs(collection(db,'ofertas'));const snapshot=await Promise.race([request,timeout]);return snapshot.docs.map(doc=>({id:doc.id,...doc.data()})).filter(item=>item.tipo==='produto')}

const cached=readCache();if(cached.length)setProducts(cached,{cache:false});else grid.innerHTML='<div class="store-empty">Carregando mercadorias…</div>';
search?.addEventListener('input',render);category?.addEventListener('change',render);
try{setProducts(await loadOnline())}catch(error){console.warn('Vitrine online indisponível:',error);if(!cached.length){count.textContent='';grid.innerHTML='<div class="store-empty">Não foi possível carregar a vitrine agora.<br><button type="button" id="retryStore">Tentar novamente</button></div>';root.querySelector('#retryStore')?.addEventListener('click',()=>location.reload())}}
