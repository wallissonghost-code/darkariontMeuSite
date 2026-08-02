import { db } from './firebase.js';
import { collection,getDocs } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import { money } from './regras-fidelidade.js';

const $=id=>document.getElementById(id);
const num=value=>Math.max(0,Number(value)||0);
const margin=(cost,price)=>price>0?((price-cost)/price)*100:0;
const esc=value=>String(value??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
let initialized=false;

function sizeMap(product){
  if(product.estoquePorTamanho&&typeof product.estoquePorTamanho==='object')return product.estoquePorTamanho;
  const sizes=Array.isArray(product.tamanhos)?product.tamanhos:[];
  const total=num(product.estoque);
  if(!sizes.length)return total?{'ÚNICO':total}:{};
  const output={};
  sizes.forEach((size,index)=>{output[size]=index===0?total:0});
  return output;
}

function prepareProduct(product){
  const sizes=sizeMap(product);
  const stock=Object.values(sizes).reduce((sum,value)=>sum+num(value),0);
  const cost=num(product.precoCusto);
  const price=num(product.preco);
  const investment=stock*cost;
  const potential=stock*price;
  const profit=potential-investment;
  const minimum=num(product.estoqueMinimo||3);
  return {...product,sizes,stock,cost,price,investment,potential,profit,minimum,margin:margin(cost,price)};
}

function sizeChips(product){
  const entries=Object.entries(product.sizes).filter(([,qty])=>num(qty)>0);
  return entries.length
    ?`<div class="size-breakdown">${entries.map(([size,qty])=>`<span><b>${esc(size)}</b>${num(qty)} un.</span>`).join('')}</div>`
    :'<div class="size-breakdown empty">Sem distribuição por tamanho</div>';
}

function renderKpis(products){
  const totals=products.reduce((result,product)=>{
    result.units+=product.stock;
    result.investment+=product.investment;
    result.potential+=product.potential;
    if(product.stock===0)result.out+=1;
    else if(product.stock<=product.minimum)result.low+=1;
    return result;
  },{units:0,investment:0,potential:0,low:0,out:0});
  const profit=totals.potential-totals.investment;
  const average=totals.potential>0?profit/totals.potential*100:0;
  $('stockValue').textContent=money(totals.investment);
  $('potentialRevenue').textContent=money(totals.potential);
  $('expectedProfit').textContent=money(profit);
  $('stockUnits').textContent=String(totals.units);
  $('productCount').textContent=String(products.length);
  $('lowStock').textContent=String(totals.low);
  $('outOfStock').textContent=String(totals.out);
  $('averageMargin').textContent=`${average.toFixed(1).replace('.',',')}%`;
}

function renderProducts(products){
  const sorted=[...products].sort((a,b)=>b.investment-a.investment);
  $('productsList').innerHTML=sorted.length?sorted.map(product=>{
    const state=product.stock===0?'Esgotado':product.stock<=product.minimum?'Estoque baixo':`${product.stock} peças`;
    return `<article class="dashboard-product-card"><header><div><span class="product-label">${esc(product.categoria||'Sem categoria')}</span><h3>${esc(product.nome||'Produto sem nome')}</h3><p>${esc(product.selo||'Produto padrão')}</p></div><span class="stock-badge ${product.stock<=product.minimum?'low':''}">${state}</span></header>${sizeChips(product)}<div class="product-finance"><div><span>Investido</span><strong>${money(product.investment)}</strong></div><div><span>Venda potencial</span><strong>${money(product.potential)}</strong></div><div><span>Lucro esperado</span><strong>${money(product.profit)}</strong></div><div><span>Margem</span><strong>${product.margin.toFixed(1).replace('.',',')}%</strong></div></div></article>`;
  }).join(''):'<div class="empty-products">Nenhuma mercadoria publicada.</div>';
}

function ranking(target,list,empty){
  $(target).innerHTML=list.length?list.map((item,index)=>`<div class="ranking-item"><span class="rank-index">${index+1}</span><div><strong>${esc(item.nome)}</strong><small>${esc(item.detalhe)}</small></div><strong>${money(item.valor)}</strong></div>`).join(''):`<div class="empty-products">${empty}</div>`;
}

function renderRankings(products){
  ranking('topInvestment',products.map(product=>({nome:product.nome||'Produto',valor:product.investment,detalhe:`${product.stock} peça(s)`})).sort((a,b)=>b.valor-a.valor).slice(0,6),'Sem investimento cadastrado.');
  ranking('topProfit',products.map(product=>({nome:product.nome||'Produto',valor:product.profit,detalhe:`Margem ${product.margin.toFixed(1).replace('.',',')}%`})).sort((a,b)=>b.valor-a.valor).slice(0,6),'Sem lucro calculado.');
  const categories=new Map();
  products.forEach(product=>{
    const key=product.categoria||'Sem categoria';
    const current=categories.get(key)||{nome:key,valor:0,unidades:0};
    current.valor+=product.potential;
    current.unidades+=product.stock;
    categories.set(key,current);
  });
  ranking('topCategories',[...categories.values()].map(item=>({nome:item.nome,valor:item.valor,detalhe:`${item.unidades} peça(s)`})).sort((a,b)=>b.valor-a.valor).slice(0,6),'Sem categorias cadastradas.');
}

async function waitForSession(){
  if(window.WDSession?.state?.status==='ready')return;
  if(window.WDSession?.ready)await window.WDSession.ready;
}

async function initialize(){
  if(initialized)return;
  initialized=true;
  try{
    await waitForSession();
    const snapshot=await getDocs(collection(db,'ofertas'));
    const products=snapshot.docs.map(document=>({id:document.id,...document.data()})).filter(product=>product.tipo==='produto'&&product.ativo!==false).map(prepareProduct);
    renderKpis(products);
    renderProducts(products);
    renderRankings(products);
  }catch(error){
    initialized=false;
    console.error('Falha ao carregar Dashboard:',error);
    $('productsList').innerHTML='<div class="empty-products">Não foi possível carregar o Dashboard. Tente abrir novamente.</div>';
  }
}

initialize();