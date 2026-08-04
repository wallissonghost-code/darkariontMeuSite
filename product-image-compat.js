import { db } from './firebase.js';
import { collection,getDocs } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

const sources=new Map();
let currentProductId='';

function sourceOf(value){
  if(typeof value==='string')return value.trim();
  if(value&&typeof value==='object')return String(value.url||value.src||value.dataUrl||value.downloadURL||'').trim();
  return '';
}

function imagesOf(product={}){
  const values=[
    product.imagens,product.fotos,product.galeria,product.imageUrls,product.images,
    product.imagem,product.foto,product.capa,product.image,product.imageUrl,
    product.fotoUrl,product.imagemUrl
  ];
  return [...new Set(values.flatMap(value=>Array.isArray(value)?value:[value]).map(sourceOf).filter(Boolean))].slice(0,5);
}

function safeImage(src,alt='Mercadoria'){
  const image=document.createElement('img');
  image.src=src;
  image.alt=alt;
  image.loading='lazy';
  image.decoding='async';
  image.addEventListener('error',()=>image.remove(),{once:true});
  return image;
}

function patchCards(){
  document.querySelectorAll('[data-open-product]').forEach(card=>{
    const id=card.dataset.openProduct;
    const product=sources.get(id);
    const images=imagesOf(product);
    if(!images.length)return;
    const media=card.querySelector('.product-media');
    if(!media||media.querySelector('img'))return;
    media.querySelector('.product-placeholder')?.remove();
    media.prepend(safeImage(images[0],product?.nome||'Mercadoria'));
    media.classList.remove('no-image');
    if(images.length>1&&!media.querySelector('.photo-count')){
      const count=document.createElement('span');
      count.className='photo-count';
      count.textContent=`${images.length} fotos`;
      media.append(count);
    }
  });
}

function patchDialog(){
  if(!currentProductId)return;
  const product=sources.get(currentProductId);
  const images=imagesOf(product);
  const empty=document.querySelector('#dialogContent .detail-gallery.no-image');
  if(!empty||!images.length)return;
  const gallery=document.createElement('div');
  gallery.className='detail-gallery';
  const thumbs=document.createElement('div');
  thumbs.className='detail-thumbs';
  const main=document.createElement('div');
  main.className='detail-main-media';
  const slider=document.createElement('div');
  slider.className='detail-slider';
  images.forEach((src,index)=>{
    const thumb=document.createElement('button');
    thumb.type='button';
    thumb.dataset.thumb=String(index);
    if(index===0)thumb.classList.add('active');
    thumb.append(safeImage(src,`Miniatura ${index+1}`));
    thumbs.append(thumb);
    const figure=document.createElement('figure');
    figure.append(safeImage(src,`${product?.nome||'Produto'} - foto ${index+1}`));
    slider.append(figure);
  });
  main.append(slider);
  gallery.append(thumbs,main);
  empty.replaceWith(gallery);
  thumbs.querySelectorAll('[data-thumb]').forEach((button,index)=>button.addEventListener('click',()=>{
    slider.scrollTo({left:slider.clientWidth*index,behavior:'smooth'});
    thumbs.querySelectorAll('[data-thumb]').forEach((item,i)=>item.classList.toggle('active',i===index));
  }));
}

document.addEventListener('pointerdown',event=>{
  const card=event.target.closest('[data-open-product]');
  if(card)currentProductId=card.dataset.openProduct||'';
},{capture:true,passive:true});

document.addEventListener('click',event=>{
  const card=event.target.closest('[data-open-product]');
  if(card)currentProductId=card.dataset.openProduct||'';
},true);

new MutationObserver(()=>{patchCards();patchDialog()}).observe(document.documentElement,{childList:true,subtree:true});

try{
  const snapshot=await getDocs(collection(db,'ofertas'));
  snapshot.docs.forEach(item=>{
    const data=item.data();
    if(data.tipo==='produto')sources.set(item.id,{id:item.id,...data});
  });
  patchCards();
  patchDialog();
}catch(error){
  console.error('Não foi possível normalizar as fotos dos produtos:',error);
}
