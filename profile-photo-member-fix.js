import { db } from './firebase.js';
import { doc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

const MAX_FILE_SIZE=10*1024*1024;
const PHOTO_SIZE=320;
const LOCAL_PREFIX='wd-profile-photo:';

const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const timeout=(promise,ms,message)=>Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(new Error(message)),ms))]);

function message(text,error=false){
  const status=document.getElementById('profileStatus');
  if(!status)return;
  status.textContent=text;
  status.style.color=error?'#ff8d84':'var(--vip-a,var(--gold))';
}

function initials(name){
  return String(name||'WD').trim().split(/\s+/).slice(0,2).map(part=>part[0]||'').join('').toUpperCase()||'WD';
}

function showPhoto(url,name){
  const image=document.getElementById('profileAvatarImage');
  const fallback=document.getElementById('profileAvatarInitials');
  if(!image||!fallback)return;
  fallback.textContent=initials(name);
  if(!url){
    image.hidden=true;
    image.removeAttribute('src');
    fallback.hidden=false;
    return;
  }
  const probe=new Image();
  probe.onload=()=>{
    image.src=url;
    image.hidden=false;
    fallback.hidden=true;
  };
  probe.onerror=()=>{
    image.hidden=true;
    fallback.hidden=false;
  };
  probe.src=url;
}

function loadImage(file){
  return new Promise((resolve,reject)=>{
    const url=URL.createObjectURL(file);
    const image=new Image();
    image.onload=()=>{URL.revokeObjectURL(url);resolve(image)};
    image.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Não foi possível abrir essa imagem.'))};
    image.src=url;
  });
}

async function compressPhoto(file){
  if(!file?.type?.startsWith('image/'))throw new Error('Selecione uma imagem válida.');
  if(file.size>MAX_FILE_SIZE)throw new Error('A foto deve ter no máximo 10 MB.');
  const image=await timeout(loadImage(file),12000,'A imagem demorou demais para abrir.');
  const width=image.naturalWidth||image.width;
  const height=image.naturalHeight||image.height;
  const side=Math.min(width,height);
  if(!side)throw new Error('A imagem não possui dimensões válidas.');
  const canvas=document.createElement('canvas');
  canvas.width=PHOTO_SIZE;
  canvas.height=PHOTO_SIZE;
  const context=canvas.getContext('2d',{alpha:false});
  context.fillStyle='#111';
  context.fillRect(0,0,PHOTO_SIZE,PHOTO_SIZE);
  context.drawImage(image,(width-side)/2,(height-side)/2,side,side,0,0,PHOTO_SIZE,PHOTO_SIZE);
  const dataUrl=canvas.toDataURL('image/jpeg',.72);
  if(dataUrl.length>420000)throw new Error('A imagem ficou grande demais. Escolha outra foto.');
  return dataUrl;
}

async function install(){
  await wait(120);
  const session=window.WDSession?.state;
  if(session?.status!=='ready'||!session.user)return;
  const user=session.user;
  const profile=session.profile||{};
  const name=profile.nome||user.displayName||'Cliente Founder';
  const localPhoto=localStorage.getItem(`${LOCAL_PREFIX}${user.uid}`)||'';
  const savedPhoto=String(profile.foto||localPhoto||user.photoURL||'').trim();
  if(savedPhoto)showPhoto(savedPhoto,name);

  const oldInput=document.getElementById('profilePhotoInput');
  const oldButton=document.getElementById('profilePhotoButton');
  if(!oldInput||!oldButton)return;

  const input=oldInput.cloneNode(true);
  const button=oldButton.cloneNode(true);
  oldInput.replaceWith(input);
  oldButton.replaceWith(button);

  let busy=false;
  button.addEventListener('click',()=>{if(!busy)input.click()});
  input.addEventListener('change',async()=>{
    const file=input.files?.[0];
    input.value='';
    if(!file||busy)return;
    busy=true;
    button.disabled=true;
    button.classList.add('is-loading');
    try{
      message('Preparando sua foto...');
      const photo=await compressPhoto(file);
      showPhoto(photo,name);
      localStorage.setItem(`${LOCAL_PREFIX}${user.uid}`,photo);
      message('Salvando sua foto...');
      await timeout(setDoc(doc(db,'usuarios',user.uid),{
        foto:photo,
        fotoFormato:'data-url-jpeg',
        fotoAtualizadaEm:serverTimestamp(),
        atualizadoEm:serverTimestamp()
      },{merge:true}),15000,'Não foi possível salvar a foto agora.');
      message('Foto de perfil atualizada com sucesso.');
      document.dispatchEvent(new CustomEvent('wd-profile-photo-updated',{detail:{foto:photo,uid:user.uid}}));
    }catch(error){
      console.error('Falha ao salvar foto do membro:',error);
      const previous=String(window.WDSession?.state?.profile?.foto||localPhoto||user.photoURL||'').trim();
      showPhoto(previous,name);
      message(error.message||'Não foi possível atualizar a foto.',true);
    }finally{
      busy=false;
      button.disabled=false;
      button.classList.remove('is-loading');
    }
  });
}

install().catch(error=>console.error('Falha ao iniciar correção de foto:',error));
