import {db} from './firebase.js';
import {doc,setDoc,serverTimestamp} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
const BASE=Array.from({length:10},(_,i)=>`frame-${String(i+1).padStart(2,'0')}`);
const EXCLUSIVE=['frame-11','frame-12'];
const NAMES=['Bronze Prism','Silver Edge','Gold Aura','Amethyst','Platinum','Diamond Gold','Royal Purple','Ruby','Onyx Gold','Heritage','Diamond Plus','Admin Apex'];
const ADMIN_ROLES=new Set(['admin','administrador','master']);
const FIXED_ADMINS=new Set(['WAPN8cPkPGP2mwiQ8FNbIGyUaUl1']);
const root=document.querySelector('[data-view="account"]');
const button=root?.querySelector('#profileFrameButton');
const wrap=root?.querySelector('.profile-avatar-wrap');
let uid='',profile={},isAdmin=false,active='frame-01',unlocked=[...BASE];
const frameNumber=id=>Math.max(1,Math.min(12,Number(String(id||'').split('-')[1])||1));
function apply(id){active=id||'frame-01';wrap?.setAttribute('data-frame',active);document.querySelectorAll('[data-profile-frame-host]').forEach(el=>el.setAttribute('data-frame',active));document.dispatchEvent(new CustomEvent('wd-profile-frame-updated',{detail:{uid,frame:active}}))}
function canUse(id){return isAdmin||BASE.includes(id)||unlocked.includes(id)}
function ensureModal(){let modal=document.getElementById('profileFrameModal');if(modal)return modal;modal=document.createElement('div');modal.id='profileFrameModal';modal.className='frame-modal';modal.hidden=true;modal.innerHTML=`<section class="frame-sheet" role="dialog" aria-modal="true" aria-labelledby="frameTitle"><header class="frame-sheet-head"><div><span class="eyebrow">IDENTIDADE DO PERFIL</span><h3 id="frameTitle">Escolha sua moldura</h3><p>As dez primeiras estão disponíveis para todos. As exclusivas são liberadas pelo Admin.</p></div><button class="frame-close" type="button" aria-label="Fechar">×</button></header><div class="frame-grid"></div><div class="frame-status" aria-live="polite"></div></section>`;document.body.append(modal);modal.addEventListener('click',event=>{if(event.target===modal||event.target.closest('.frame-close'))close();const option=event.target.closest('[data-frame-option]');if(option)select(option.dataset.frameOption)});return modal}
function render(){const modal=ensureModal(),grid=modal.querySelector('.frame-grid');grid.innerHTML=[...BASE,...EXCLUSIVE].map((id,index)=>{const locked=!canUse(id),exclusive=index>=10;return `<button class="frame-option frame-preview ${locked?'is-locked':''} ${id===active?'is-active':''}" data-frame-option="${id}" data-frame="${id}" type="button" aria-disabled="${locked}">${locked?'<span class="lock">🔒</span>':''}<span class="frame-preview-ring">${String(index+1).padStart(2,'0')}</span><small>${NAMES[index]}${exclusive?' · EXCLUSIVA':''}</small></button>`}).join('')}
function open(){render();const modal=ensureModal();modal.hidden=false;document.body.style.overflow='hidden';modal.querySelector('.frame-close')?.focus()}
function close(){const modal=ensureModal();modal.hidden=true;document.body.style.overflow='';button?.focus()}
async function select(id){const modal=ensureModal(),status=modal.querySelector('.frame-status');if(!canUse(id)){status.textContent='Essa moldura precisa ser liberada pelo Admin.';return}status.textContent='Aplicando moldura...';try{await setDoc(doc(db,'usuarios',uid),{molduraAtiva:id,atualizadoEm:serverTimestamp()},{merge:true});profile={...profile,molduraAtiva:id};apply(id);render();status.textContent='Moldura aplicada ao seu perfil.'}catch(error){console.error(error);status.textContent='Não foi possível salvar a moldura. Publique as regras atualizadas do Firestore.'}}
button?.addEventListener('click',open);
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!ensureModal().hidden)close()});
window.WDSession?.subscribe(state=>{if(state.status!=='ready')return;uid=state.user?.uid||'';profile=state.profile||{};isAdmin=FIXED_ADMINS.has(uid)||ADMIN_ROLES.has(String(profile.role||'').toLowerCase());const gifted=Array.isArray(profile.moldurasLiberadas)?profile.moldurasLiberadas.filter(id=>EXCLUSIVE.includes(id)):[];unlocked=[...BASE,...gifted];active=canUse(profile.molduraAtiva)?profile.molduraAtiva:'frame-01';apply(active)});
