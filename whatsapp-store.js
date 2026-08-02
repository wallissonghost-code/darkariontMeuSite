import { db } from './firebase.js';
import { doc,getDoc } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

const dialog=document.getElementById('productDialog');
const content=document.getElementById('dialogContent');
const grid=document.getElementById('productsGrid');
let currentProductId='';
let config=null;

const clean=value=>String(value||'').replace(/\s+/g,' ').trim();

async function loadConfig(){
  if(config)return config;
  try{
    const snap=await getDoc(doc(db,'ofertas','__config_loja'));
    config=snap.exists()?snap.data():{};
  }catch(error){
    console.error('Não foi possível carregar o WhatsApp da loja:',error);
    config={};
  }
  return config;
}

function selectedSize(){
  return clean(content?.querySelector('[data-size-choice].selected b')?.textContent)||'Não informado';
}

function productUrl(){
  const url=new URL(location.href);
  url.searchParams.set('produto',currentProductId);
  return url.toString();
}

async function openWhatsapp(){
  const settings=await loadConfig();
  const phone=String(settings.whatsappCompleto||'').replace(/\D/g,'');
  if(phone.length<12){
    alert('O WhatsApp da loja ainda não foi configurado pelo administrador.');
    return;
  }
  const name=clean(content?.querySelector('.detail-info h2')?.textContent)||'Produto';
  const price=clean(content?.querySelector('.detail-price-block strong')?.textContent)||'Consultar valor';
  const size=selectedSize();
  const greeting=clean(settings.whatsappMensagem)||'Olá! Tenho interesse neste produto:';
  const message=[
    greeting,
    '',
    `Produto: ${name}`,
    `Valor: ${price}`,
    `Tamanho: ${size}`,
    '',
    `Ver produto: ${productUrl()}`,
    '',
    'Gostaria de finalizar meu pedido.'
  ].join('\n');
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`,'_blank','noopener');
}

function enhanceDialog(){
  const fallback=content?.querySelector('#noContact');
  if(!fallback)return;
  fallback.id='whatsappProductButton';
  fallback.textContent='Comprar pelo WhatsApp';
  fallback.addEventListener('click',openWhatsapp,{once:false});
}

const observer=new MutationObserver(enhanceDialog);
if(content)observer.observe(content,{childList:true,subtree:true});

grid?.addEventListener('click',event=>{
  const card=event.target.closest('[data-open-product]');
  if(card)currentProductId=card.dataset.openProduct||'';
},true);

grid?.addEventListener('keydown',event=>{
  const card=event.target.closest('[data-open-product]');
  if(card&&(event.key==='Enter'||event.key===' '))currentProductId=card.dataset.openProduct||'';
},true);

const requestedProduct=new URLSearchParams(location.search).get('produto');
if(requestedProduct){
  const tryOpen=()=>{
    const card=grid?.querySelector(`[data-open-product="${CSS.escape(requestedProduct)}"]`);
    if(!card)return false;
    currentProductId=requestedProduct;
    card.click();
    return true;
  };
  if(!tryOpen()){
    const gridObserver=new MutationObserver(()=>{if(tryOpen())gridObserver.disconnect()});
    if(grid)gridObserver.observe(grid,{childList:true,subtree:true});
    setTimeout(()=>gridObserver.disconnect(),10000);
  }
}

loadConfig();