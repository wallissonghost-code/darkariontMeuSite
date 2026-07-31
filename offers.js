import { db } from './firebase.js';
import { collection, getDocs, query, orderBy } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

const offersGrid=document.getElementById('offersGrid');
const productsGrid=document.getElementById('productsGrid');
const defaults=[
  {categoria:'DROP EXCLUSIVO',titulo:'20% OFF',descricao:'Condição especial aplicada em coleções selecionadas.',botao:'Ver condição',ordem:1,ativo:true},
  {categoria:'BENEFÍCIO VIP',titulo:'FRETE GRÁTIS',descricao:'Disponível para membros elegíveis conforme o nível.',botao:'Consultar benefício',ordem:2,ativo:true},
  {categoria:'ACESSO PRIVADO',titulo:'PRÉ-LANÇAMENTO',descricao:'Antecipe o acesso às próximas coleções WD Founder.',botao:'Ver disponibilidade',ordem:3,ativo:true}
];
const money=value=>Number(value||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const escapeHtml=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));

function renderOffers(items){
  offersGrid.innerHTML=items.filter(item=>item.ativo!==false).map(item=>`<article class="oferta"><h2>${escapeHtml(item.categoria||'BENEFÍCIO')}</h2><h1>${escapeHtml(item.titulo||'Oferta')}</h1><p>${escapeHtml(item.descricao||'')}</p><button type="button">${escapeHtml(item.botao||'Ver benefício')}</button></article>`).join('')||'<article class="oferta"><h2>EM BREVE</h2><h1>Novos benefícios</h1><p>Não há condições ativas no momento.</p></article>';
}

function renderProducts(items){
  const active=items.filter(item=>item.ativo!==false);
  productsGrid.innerHTML=active.map(item=>{
    const image=item.imagem?`<img src="${escapeHtml(item.imagem)}" alt="${escapeHtml(item.nome||'Produto')}" loading="lazy" onerror="this.parentElement.classList.add('no-image');this.remove()">`:'<span>WD</span>';
    const oldPrice=Number(item.precoAntigo||0)>Number(item.preco||0)?`<del>${money(item.precoAntigo)}</del>`:'';
    const stock=Number.isFinite(Number(item.estoque))?`${Math.max(0,Number(item.estoque))} em estoque`:'Disponível';
    const link=item.link||'#';
    return `<article class="product-card"><div class="product-media ${item.imagem?'':'no-image'}">${image}${item.selo?`<span class="product-badge">${escapeHtml(item.selo)}</span>`:''}</div><div class="product-body"><span class="product-category">${escapeHtml(item.categoria||'WD Founder')}</span><h3 class="product-title">${escapeHtml(item.nome||'Produto')}</h3><p class="product-description">${escapeHtml(item.descricao||'')}</p><div class="product-price-row"><div class="product-price">${oldPrice}<strong>${money(item.preco)}</strong></div><span class="product-stock">${escapeHtml(stock)}</span></div><a class="product-action" href="${escapeHtml(link)}" ${link==='#'?'aria-disabled="true"':'target="_blank" rel="noopener"'}>${escapeHtml(item.botao||'Ver item')}</a></div></article>`;
  }).join('')||'<div class="store-empty">Nenhum produto disponível no momento.</div>';
}

async function loadOffers(){
  try{
    const snap=await getDocs(query(collection(db,'ofertas'),orderBy('ordem')));
    renderOffers(snap.empty?defaults:snap.docs.map(doc=>({id:doc.id,...doc.data()})));
  }catch(error){
    console.error('Falha ao carregar benefícios:',error);
    renderOffers(defaults);
  }
}

async function loadProducts(){
  try{
    const snap=await getDocs(collection(db,'produtosVitrine'));
    const items=snap.docs.map(doc=>({id:doc.id,...doc.data()})).sort((a,b)=>(Number(a.ordem)||999)-(Number(b.ordem)||999));
    renderProducts(items);
  }catch(error){
    console.error('Falha ao carregar produtos:',error);
    productsGrid.innerHTML='<div class="store-empty">Não foi possível carregar os produtos agora.</div>';
  }
}

await Promise.allSettled([loadOffers(),loadProducts()]);