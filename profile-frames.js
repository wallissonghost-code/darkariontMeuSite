import {db} from './firebase.js';
import {doc,setDoc,serverTimestamp} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

const BASE=Array.from({length:10},(_,i)=>`frame-${String(i+1).padStart(2,'0')}`);
const EXCLUSIVE=['frame-11','frame-12'];
const ALL=[...BASE,...EXCLUSIVE];
const NAMES=['Bronze Prism','Silver Edge','Gold Aura','Amethyst','Platinum','Diamond Gold','Royal Purple','Ruby','Onyx Gold','Heritage','Diamond Plus','Admin Apex'];
const ADMIN_ROLES=new Set(['admin','administrador','master']);
const FIXED_ADMINS=new Set(['WAPN8cPkPGP2mwiQ8FNbIGyUaUl1']);
const ZIP_URL='./molduras_perfil_transparentes.zip';
const JSZIP_URL='https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
const root=document.querySelector('[data-view="account"]');
const button=root?.querySelector('#profileFrameButton');
const wrap=root?.querySelector('.profile-avatar-wrap');

let uid='',profile={},isAdmin=false,active='frame-01',unlocked=[...BASE];
let frameAssets=new Map();
let assetPromise=null;

const localKey=id=>`wd-profile-frame:${id}`;

function loadScript(src){
  return new Promise((resolve,reject)=>{
    if(window.JSZip)return resolve();
    const existing=document.querySelector(`script[src="${src}"]`);
    if(existing){existing.addEventListener('load',resolve,{once:true});existing.addEventListener('error',reject,{once:true});return}
    const script=document.createElement('script');
    script.src=src;
    script.async=true;
    script.onload=resolve;
    script.onerror=()=>reject(new Error('Não foi possível carregar o leitor das molduras.'));
    document.head.append(script);
  });
}

async function loadFrameAssets(){
  if(frameAssets.size===ALL.length)return frameAssets;
  if(assetPromise)return assetPromise;
  assetPromise=(async()=>{
    await loadScript(JSZIP_URL);
    const response=await fetch(`${ZIP_URL}?v=3.12.0`,{cache:'force-cache'});
    if(!response.ok)throw new Error(`Falha ao baixar molduras (${response.status}).`);
    const zip=await window.JSZip.loadAsync(await response.arrayBuffer());
    for(const id of ALL){
      const entry=zip.file(`assets/profile-frames/${id}.png`)||zip.file(`${id}.png`);
      if(!entry)continue;
      const blob=await entry.async('blob');
      frameAssets.set(id,URL.createObjectURL(blob));
    }
    if(frameAssets.size!==ALL.length)console.warn(`Foram carregadas ${frameAssets.size} de ${ALL.length} molduras.`);
    syncFrameArtwork();
    return frameAssets;
  })().catch(error=>{console.error('Erro ao carregar molduras reais:',error);assetPromise=null;throw error});
  return assetPromise;
}

function setArtwork(host,id){
  if(!host)return;
  let image=host.querySelector(':scope > img.profile-frame-art');
  if(!image){
    image=document.createElement('img');
    image.className='profile-frame-art';
    image.alt='';
    image.setAttribute('aria-hidden','true');
    image.draggable=false;
    host.append(image);
  }
  const src=frameAssets.get(id);
  if(src){image.src=src;image.hidden=false}else image.hidden=true;
}

function syncFrameArtwork(){
  setArtwork(wrap,active);
  document.querySelectorAll('[data-profile-frame-host]').forEach(host=>setArtwork(host,host.getAttribute('data-frame')||active));
  document.querySelectorAll('[data-frame-option]').forEach(option=>{
    const preview=option.querySelector('.frame-preview-ring');
    setArtwork(preview,option.dataset.frameOption);
  });
}

function apply(id){
  active=id||'frame-01';
  wrap?.setAttribute('data-frame',active);
  document.querySelectorAll('[data-profile-frame-host]').forEach(el=>el.setAttribute('data-frame',active));
  syncFrameArtwork();
  loadFrameAssets().catch(()=>{});
  document.dispatchEvent(new CustomEvent('wd-profile-frame-updated',{detail:{uid,frame:active}}));
}

function canUse(id){return isAdmin||BASE.includes(id)||unlocked.includes(id)}

function ensureModal(){
  let modal=document.getElementById('profileFrameModal');
  if(modal)return modal;
  modal=document.createElement('div');
  modal.id='profileFrameModal';
  modal.className='frame-modal';
  modal.hidden=true;
  modal.innerHTML=`<section class="frame-sheet" role="dialog" aria-modal="true" aria-labelledby="frameTitle"><header class="frame-sheet-head"><div><span class="eyebrow">IDENTIDADE DO PERFIL</span><h3 id="frameTitle">Escolha sua moldura</h3><p>As dez primeiras estão disponíveis para todos. As duas exclusivas são liberadas pelo Admin.</p></div><button class="frame-close" type="button" aria-label="Fechar">×</button></header><div class="frame-grid"></div><div class="frame-status" aria-live="polite"></div></section>`;
  document.body.append(modal);
  modal.addEventListener('click',event=>{
    if(event.target===modal||event.target.closest('.frame-close'))close();
    const option=event.target.closest('[data-frame-option]');
    if(option)select(option.dataset.frameOption);
  });
  return modal;
}

function render(){
  const modal=ensureModal(),grid=modal.querySelector('.frame-grid');
  grid.innerHTML=ALL.map((id,index)=>{
    const locked=!canUse(id),exclusive=index>=10;
    return `<button class="frame-option frame-preview ${locked?'is-locked':''} ${id===active?'is-active':''}" data-frame-option="${id}" data-frame="${id}" type="button" aria-disabled="${locked}">${locked?'<span class="lock">🔒</span>':''}<span class="frame-preview-ring"><span class="frame-preview-avatar">${String(index+1).padStart(2,'0')}</span></span><small>${NAMES[index]}${exclusive?' · EXCLUSIVA':''}</small></button>`;
  }).join('');
  syncFrameArtwork();
  loadFrameAssets().catch(error=>{
    modal.querySelector('.frame-status').textContent='Não foi possível carregar as artes das molduras. Atualize a página e tente novamente.';
  });
}

function open(){
  render();
  const modal=ensureModal();
  modal.hidden=false;
  document.body.style.overflow='hidden';
  modal.querySelector('.frame-close')?.focus();
}

function close(){
  const modal=ensureModal();
  modal.hidden=true;
  document.body.style.overflow='';
  button?.focus();
}

async function select(id){
  const modal=ensureModal(),status=modal.querySelector('.frame-status');
  if(!canUse(id)){status.textContent='Essa moldura precisa ser liberada pelo Admin.';return}
  localStorage.setItem(localKey(uid),id);
  profile={...profile,molduraAtiva:id};
  apply(id);
  render();
  status.textContent='Moldura aplicada.';
  try{
    await setDoc(doc(db,'usuarios',uid),{molduraAtiva:id,atualizadoEm:serverTimestamp()},{merge:true});
    status.textContent='Moldura aplicada e sincronizada na conta.';
  }catch(error){
    console.warn('Moldura salva apenas neste aparelho até as regras do Firestore serem publicadas:',error);
    status.textContent='Moldura aplicada neste aparelho. A sincronização depende das regras do Firestore.';
  }
}

button?.addEventListener('click',open);
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!ensureModal().hidden)close()});
loadFrameAssets().catch(()=>{});

window.WDSession?.subscribe(state=>{
  if(state.status!=='ready')return;
  uid=state.user?.uid||'';
  profile=state.profile||{};
  isAdmin=FIXED_ADMINS.has(uid)||ADMIN_ROLES.has(String(profile.role||'').toLowerCase());
  const gifted=Array.isArray(profile.moldurasLiberadas)?profile.moldurasLiberadas.filter(id=>EXCLUSIVE.includes(id)):[];
  unlocked=[...BASE,...gifted];
  const local=localStorage.getItem(localKey(uid));
  active=canUse(local)?local:canUse(profile.molduraAtiva)?profile.molduraAtiva:'frame-01';
  apply(active);
});