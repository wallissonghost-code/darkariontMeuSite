import { db } from './firebase.js';
import { doc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

const MAX_FILE_SIZE=10*1024*1024;
const PHOTO_SIZE=320;
const LOCAL_PREFIX='wd-profile-photo:';
const timeout=(promise,ms,message)=>Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(new Error(message)),ms))]);

function message(text,error=false){const status=document.getElementById('profileStatus');if(!status)return;status.textContent=text;status.style.color=error?'#ff8d84':'var(--vip-a,var(--gold))'}
function initials(name){return String(name||'WD').trim().split(/\s+/).slice(0,2).map(part=>part[0]||'').join('').toUpperCase()||'WD'}
function avatarElements(){return{wrap:document.querySelector('.profile-avatar-wrap'),image:document.getElementById('profileAvatarImage'),fallback:document.getElementById('profileAvatarInitials')}}
function settleAvatar(mode,name='WD'){const{wrap,image,fallback}=avatarElements();if(!image||!fallback)return;wrap?.classList.remove('photo-pending');fallback.textContent=initials(name);if(mode==='photo'){image.hidden=false;fallback.hidden=true}else{image.hidden=true;fallback.hidden=false}}
function showPhoto(url,name,{keepCurrent=true}={}){const{wrap,image,fallback}=avatarElements();if(!image||!fallback)return;fallback.textContent=initials(name);const source=String(url||'').trim();if(!source){image.removeAttribute('src');settleAvatar('initials',name);return}if(image.getAttribute('src')===source&&image.complete&&image.naturalWidth>0){settleAvatar('photo',name);return}wrap?.classList.add('photo-pending');if(!keepCurrent){image.hidden=true;fallback.hidden=true}const probe=new Image();probe.decoding='async';probe.onload=()=>{image.src=source;settleAvatar('photo',name)};probe.onerror=()=>{if(image.complete&&image.naturalWidth>0&&keepCurrent)settleAvatar('photo',name);else settleAvatar('initials',name)};probe.src=source}
function loadImage(file){return new Promise((resolve,reject)=>{const url=URL.createObjectURL(file),image=new Image();image.onload=()=>{URL.revokeObjectURL(url);resolve(image)};image.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Não foi possível abrir essa imagem.'))};image.src=url})}
async function compressPhoto(file){if(!file?.type?.startsWith('image/'))throw new Error('Selecione uma imagem válida.');if(file.size>MAX_FILE_SIZE)throw new Error('A foto deve ter no máximo 10 MB.');const image=await timeout(loadImage(file),12000,'A imagem demorou demais para abrir.');const width=image.naturalWidth||image.width,height=image.naturalHeight||image.height,side=Math.min(width,height);if(!side)throw new Error('A imagem não possui dimensões válidas.');const canvas=document.createElement('canvas');canvas.width=PHOTO_SIZE;canvas.height=PHOTO_SIZE;const context=canvas.getContext('2d',{alpha:false});context.fillStyle='#111';context.fillRect(0,0,PHOTO_SIZE,PHOTO_SIZE);context.drawImage(image,(width-side)/2,(height-side)/2,side,side,0,0,PHOTO_SIZE,PHOTO_SIZE);const dataUrl=canvas.toDataURL('image/jpeg',.72);if(dataUrl.length>420000)throw new Error('A imagem ficou grande demais. Escolha outra foto.');return dataUrl}

async function install(){
  const root=document.querySelector('[data-view="account"]');
  if(!root||root.dataset.memberPhotoFix==='ready')return;
  const session=window.WDSession?.state;
  if(session?.status!=='ready'||!session.user)return;
  const user=session.user,profile=session.profile||{},name=profile.nome||user.displayName||'Cliente Founder';
  const localKey=`${LOCAL_PREFIX}${user.uid}`;
  const localPhoto=localStorage.getItem(localKey)||'';
  const savedPhoto=String(localPhoto||profile.foto||user.photoURL||'').trim();
  if(savedPhoto)showPhoto(savedPhoto,name,{keepCurrent:false});else settleAvatar('initials',name);
  const oldInput=document.getElementById('profilePhotoInput'),oldButton=document.getElementById('profilePhotoButton');
  if(!oldInput||!oldButton)return;
  const input=oldInput.cloneNode(true),button=oldButton.cloneNode(true);
  oldInput.replaceWith(input);oldButton.replaceWith(button);root.dataset.memberPhotoFix='ready';
  let busy=false;
  button.addEventListener('click',()=>{if(!busy)input.click()});
  input.addEventListener('change',async()=>{
    const file=input.files?.[0];input.value='';if(!file||busy)return;
    busy=true;button.disabled=true;button.classList.add('is-loading');
    const previous=String(localStorage.getItem(localKey)||window.WDSession?.state?.profile?.foto||user.photoURL||'').trim();
    try{
      message('Preparando sua foto...');
      const photo=await compressPhoto(file);
      localStorage.setItem(localKey,photo);
      showPhoto(photo,name,{keepCurrent:true});
      document.dispatchEvent(new CustomEvent('wd-profile-photo-updated',{detail:{foto:photo,uid:user.uid}}));
      message('Salvando sua foto...');
      await timeout(setDoc(doc(db,'usuarios',user.uid),{foto:photo,fotoFormato:'data-url-jpeg',fotoAtualizadaEm:serverTimestamp(),atualizadoEm:serverTimestamp()},{merge:true}),15000,'Não foi possível salvar a foto agora.');
      message('Foto de perfil atualizada com sucesso.');
    }catch(error){
      console.error('Falha ao salvar foto do membro:',error);
      if(previous)localStorage.setItem(localKey,previous);else localStorage.removeItem(localKey);
      showPhoto(previous,name,{keepCurrent:true});message(error.message||'Não foi possível atualizar a foto.',true);
    }finally{busy=false;button.disabled=false;button.classList.remove('is-loading')}
  });
}

const activate=()=>install().catch(error=>console.error('Falha ao iniciar correção de foto:',error));
activate();
document.addEventListener('wd-spa-route',event=>{if(event.detail?.route==='account')activate()});
document.addEventListener('wd-session-change',()=>{if(document.querySelector('[data-view="account"]'))activate()});
document.addEventListener('wd-profile-photo-updated',event=>{const session=window.WDSession?.state;if(session?.user&&event.detail?.foto)localStorage.setItem(`${LOCAL_PREFIX}${session.user.uid}`,event.detail.foto)});
