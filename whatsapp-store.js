import { db } from './firebase.js';
import { doc,getDoc } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

const content=document.getElementById('dialogContent');
const grid=document.getElementById('productsGrid');
let currentProductId='';
let config=null;
let configPromise=null;

const clean=value=>String(value||'').replace(/\s+/g,' ').trim();

async function loadConfig(){
  if(config)return config;
  if(configPromise)return configPromise;
  configPromise=(async()=>{
    try{
      const snap=await getDoc(doc(db,'ofertas','__config_loja'));
      config=snap.exists()?snap.data():{};
    }catch(error){
      console.error('Não foi possível carregar o WhatsApp da loja:',error);
      config={};
    }
    return config;
  })();
  return configPromise;
}

function selectedSize(){
  return clean(content?.querySelector('[data-size-choice].selected b')?.textContent)||'Não informado';
}

async function openWhatsapp(){
  const settings=await loadConfig();
  const phone=String(settings.whatsappCompleto||'').replace(/\D/g,'');
  if(phone.length<12||phone.length>13){
    alert('O WhatsApp da loja ainda não foi configurado corretamente pelo administrador.');
    return;
  }

  const name=clean(content?.querySelector('.detail-info h2')?.textContent)||'Produto';
  const category=clean(content?.querySelector('.detail-info .product-category')?.textContent)||'WD Founder';
  const price=clean(content?.querySelector('.detail-price-block strong')?.textContent)||'Consultar valor';
  const hasSizes=Boolean(content?.querySelector('[data-size-choice]'));
  const size=selectedSize();

  if(hasSizes&&size==='Não informado'){
    alert('Selecione um tamanho antes de continuar.');
    return;
  }

  const greeting=clean(settings.whatsappMensagem)||'Olá! Tenho interesse neste produto:';
  const message=[
    greeting,
    '',
    `Produto: ${name}`,
    `Categoria: ${category}`,
    `Valor: ${price}`,
    ...(hasSizes?[`Tamanho: ${size}`]:[]),
    '',
    'Gostaria de mais informações e de finalizar meu pedido.'
  ].join('\n');

  const whatsappUrl=`https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  const popup=window.open(whatsappUrl,'_blank','noopener,noreferrer');
  if(!popup)location.href=whatsappUrl;
}

function enhanceDialog(){
  const primary=content?.querySelector('.detail-actions .detail-primary');
  if(!primary||primary.dataset.whatsappReady==='1')return;

  primary.dataset.whatsappReady='1';
  primary.id='whatsappProductButton';
  primary.textContent='Falar sobre este produto no WhatsApp';
  primary.removeAttribute('href');
  primary.removeAttribute('target');
  primary.removeAttribute('rel');
  primary.setAttribute('role','button');
  primary.setAttribute('tabindex','0');

  const activate=event=>{
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    openWhatsapp();
  };

  primary.addEventListener('click',activate,true);
  primary.addEventListener('keydown',event=>{
    if(event.key==='Enter'||event.key===' '){
      event.preventDefault();
      activate(event);
    }
  },true);
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