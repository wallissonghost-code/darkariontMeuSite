import { db } from './firebase.js';
import { doc,getDoc } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

const money=value=>Number(value||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const esc=value=>String(value??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const clean=value=>String(value||'').replace(/\s+/g,' ').trim();
let opening=false;

function imagesOf(p){const list=Array.isArray(p.imagens)&&p.imagens.length?p.imagens:(p.imagem?[p.imagem]:[]);return [...new Set(list.filter(Boolean))].slice(0,5)}
function sizeStockOf(p){if(p.estoquePorTamanho&&typeof p.estoquePorTamanho==='object')return Object.entries(p.estoquePorTamanho).filter(([,q])=>Number(q)>0);const sizes=Array.isArray(p.tamanhos)?p.tamanhos.filter(Boolean):[];return sizes.map((size,index)=>[size,index===0?Math.max(0,Number(p.estoque)||0):0])}
function totalStockOf(p){const entries=sizeStockOf(p);return entries.length?entries.reduce((sum,[,q])=>sum+Math.max(0,Number(q)||0),0):Math.max(0,Number(p.estoque)||0)}
function discountOf(p){const old=Number(p.precoAntigo||0),price=Number(p.preco||0);return old>price&&old>0?Math.round((1-price/old)*100):0}
function whatsappUrl(product,config,size=''){const phone=String(config.whatsappCompleto||'').replace(/\D/g,'');if(phone.length<12||phone.length>13)return '';const greeting=clean(config.whatsappMensagem)||'Olá! Tenho interesse neste produto:';const message=[greeting,'',`Produto: ${clean(product.nome)||'Produto'}`,`Categoria: ${clean(product.categoria)||'WD Founder'}`,`Valor: ${money(product.preco)}`,...(size?[`Tamanho: ${size}`]:[]),'','Gostaria de mais informações e de finalizar meu pedido.'].join('\n');return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`}

async function openProduct(id){
  if(opening)return;opening=true;
  try{
    const dialog=document.getElementById('productDialog'),content=document.getElementById('dialogContent');
    if(!dialog||!content)throw new Error('Painel do produto indisponível.');
    const [productSnap,configSnap]=await Promise.all([getDoc(doc(db,'ofertas',id)),getDoc(doc(db,'ofertas','__config_loja'))]);
    if(!productSnap.exists())throw new Error('Produto não encontrado.');
    const p={id:productSnap.id,...productSnap.data()},config=configSnap.exists()?configSnap.data():{};
    const images=imagesOf(p),sizes=sizeStockOf(p),discount=discountOf(p),stock=totalStockOf(p);
    const gallery=images.length?`<div class="detail-gallery"><div class="detail-thumbs">${images.map((src,i)=>`<button type="button" data-thumb="${i}" class="${i===0?'active':''}"><img src="${esc(src)}" alt="Miniatura ${i+1}"></button>`).join('')}</div><div class="detail-main-media"><div class="detail-slider">${images.map((src,i)=>`<figure><img src="${esc(src)}" alt="${esc(p.nome||'Produto')} - foto ${i+1}"></figure>`).join('')}</div>${images.length>1?`<button class="gallery-arrow gallery-prev" type="button">‹</button><button class="gallery-arrow gallery-next" type="button">›</button><span class="detail-counter">1/${images.length}</span>`:''}</div></div>`:'<div class="detail-gallery no-image"><div class="detail-main-media"><span class="product-placeholder">WD</span></div></div>';
    content.innerHTML=`<div class="product-detail-layout">${gallery}<section class="detail-info"><div class="detail-meta-row"><span class="product-category">${esc(p.categoria||'WD Founder')}</span>${p.selo?`<span class="detail-badge">${esc(p.selo)}</span>`:''}</div><h2>${esc(p.nome||'Mercadoria')}</h2><p class="detail-description">${esc(p.descricao||'Produto selecionado da coleção WD Founder.')}</p><div class="detail-price-block">${Number(p.precoAntigo||0)>Number(p.preco||0)?`<del>${money(p.precoAntigo)}</del>`:''}<div><strong>${money(p.preco)}</strong>${discount?`<span>-${discount}%</span>`:''}</div></div><div class="detail-stock"><span></span>${stock} unidades disponíveis</div>${sizes.length?`<div class="detail-sizes"><strong>Tamanhos disponíveis</strong><div>${sizes.map(([size,qty],i)=>`<button type="button" class="${i===0?'selected':''}" data-size-choice="${esc(size)}"><b>${esc(size)}</b><small>${Number(qty)} un.</small></button>`).join('')}</div></div>`:''}<div class="detail-actions"><button class="detail-primary" type="button" id="whatsappProductButton">Falar sobre este produto no WhatsApp</button><button class="detail-secondary" type="button" id="closeDetail">Continuar vendo produtos</button></div></section></div>`;
    if(!dialog.open)dialog.showModal();
    const slider=content.querySelector('.detail-slider'),thumbs=[...content.querySelectorAll('[data-thumb]')],counter=content.querySelector('.detail-counter');let current=0;
    const goTo=index=>{if(!slider||!images.length)return;current=(index+images.length)%images.length;slider.scrollTo({left:slider.clientWidth*current,behavior:'smooth'});thumbs.forEach((t,i)=>t.classList.toggle('active',i===current));if(counter)counter.textContent=`${current+1}/${images.length}`};
    thumbs.forEach((t,i)=>t.addEventListener('click',()=>goTo(i)));content.querySelector('.gallery-prev')?.addEventListener('click',()=>goTo(current-1));content.querySelector('.gallery-next')?.addEventListener('click',()=>goTo(current+1));
    content.querySelectorAll('[data-size-choice]').forEach(button=>button.addEventListener('click',()=>{content.querySelectorAll('[data-size-choice]').forEach(item=>item.classList.remove('selected'));button.classList.add('selected')}));
    content.querySelector('#whatsappProductButton')?.addEventListener('click',()=>{const hasSizes=Boolean(content.querySelector('[data-size-choice]'));const size=clean(content.querySelector('[data-size-choice].selected b')?.textContent);if(hasSizes&&!size){alert('Selecione um tamanho antes de continuar.');return}const url=whatsappUrl(p,config,size);if(!url){alert('O WhatsApp da loja ainda não foi configurado corretamente pelo administrador.');return}location.href=url});
    content.querySelector('#closeDetail')?.addEventListener('click',()=>dialog.close());
  }catch(error){console.error('Falha ao abrir produto:',error);alert(error.message||'Não foi possível abrir este produto agora.')}finally{opening=false}
}

document.addEventListener('click',event=>{const card=event.target.closest('[data-open-product]');if(!card)return;event.preventDefault();event.stopImmediatePropagation();openProduct(card.dataset.openProduct)},{capture:true});
document.addEventListener('keydown',event=>{const card=event.target.closest?.('[data-open-product]');if(!card||!['Enter',' '].includes(event.key))return;event.preventDefault();event.stopImmediatePropagation();openProduct(card.dataset.openProduct)},{capture:true});
