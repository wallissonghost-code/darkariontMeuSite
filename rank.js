import {db} from './firebase.js';
import {collection,getDocs} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

const LEVEL_NAMES=['MEMBRO','BRONZE','SILVER','GOLD','PREMIUM','PLATINUM','SELECT','BLACK','ELITE','PRIME','FOUNDER'];
const LEVEL_COLORS=['#82705a','#b87333','#c0c0c0','#d4af37','#8d62ef','#e5e4e2','#2471e8','#242424','#c92d42','#3256b8','#ffd700'];
const money=value=>Number(value||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const root=document.querySelector('[data-view="rank"]');
const podium=root?.querySelector('#rankPodium');
const listEl=root?.querySelector('#rankList');
const countdown=root?.querySelector('#rankCountdown');
const cycleLabel=root?.querySelector('#rankCycleLabel');
let users=[];
let purchases=[];
let purchasesAvailable=true;
let mode='spend';
let period='week';
let timer=null;
let currentUid='';

function hash(value){let result=2166136261;for(const char of String(value||'')){result^=char.charCodeAt(0);result=Math.imul(result,16777619)}return result>>>0}
function accountInitial(user){const source=String(user.nome||user.name||user.displayName||user.email||'W').trim();const match=source.match(/[A-Za-zÀ-ÖØ-öø-ÿ0-9]/);return (match?.[0]||'W').toUpperCase()}
function publicAlias(user){const words=['NOVA','ONYX','LUX','PRIME','VANTA','AURA','NEXO','ORBIT','ROYAL','ZENITH','NOBLE','ECLIPSE'];const value=hash(user.id);return `@${accountInitial(user)}-${words[value%words.length]}-${(value%1679616).toString(36).toUpperCase().padStart(4,'0')}`}
function firstString(...values){for(const value of values){if(typeof value==='string'&&value.trim())return value.trim()}return ''}
function localPhoto(uid){if(!uid)return '';const keys=[`wd-profile-photo:${uid}`,`wd-profile-photo-${uid}`,`profilePhoto:${uid}`,`avatar:${uid}`];for(const key of keys){const value=localStorage.getItem(key);if(value&&value.trim())return value.trim()}return ''}
function safePhoto(user){return firstString(user.foto,user.photoURL,user.photoUrl,user.fotoPerfil,user.fotoPerfilUrl,user.fotoPerfilURL,user.profilePhoto,user.profilePhotoURL,user.avatar,user.avatarUrl,user.avatarURL,user.imagemPerfil,user.imagem,user.urlFoto,user.fotoUrl,user.publicPhoto,user.rankPhoto,user.perfil?.foto,user.perfil?.photoURL,user.profile?.photoURL,user.profile?.avatarUrl,user.id===currentUid?localPhoto(user.id):'')}
function dateOf(value){if(value?.toDate)return value.toDate();if(value?.seconds)return new Date(Number(value.seconds)*1000);const date=new Date(value||0);return Number.isNaN(date.getTime())?new Date(0):date}
function startOfWeek(){const date=new Date();const day=(date.getDay()+6)%7;date.setHours(0,0,0,0);date.setDate(date.getDate()-day);return date}
function startOfMonth(){const date=new Date();return new Date(date.getFullYear(),date.getMonth(),1)}
function nextBoundary(){const now=new Date();if(period==='week'){const next=startOfWeek();next.setDate(next.getDate()+7);return next}if(period==='month')return new Date(now.getFullYear(),now.getMonth()+1,1);return null}
function purchasesInPeriod(){if(period==='all')return purchases;const start=period==='week'?startOfWeek():startOfMonth();return purchases.filter(item=>dateOf(item.criadoEm)>=start)}
function rankingEntries(){
  const spentByUser=new Map();
  purchasesInPeriod().forEach(purchase=>{const id=String(purchase.clienteId||'');if(!id)return;const value=Math.max(0,Number(purchase.valorFidelidade??purchase.valorPago??purchase.valor??0));spentByUser.set(id,(spentByUser.get(id)||0)+value)});
  return users.map(user=>{const vip=Math.max(0,Math.min(10,Number(user.vip)||0));const cycleSpent=spentByUser.get(user.id)||0;const historicalSpent=Math.max(0,Number(user.totalGasto)||0);return {id:user.id,alias:publicAlias(user),photo:safePhoto(user),vip,cycleSpent,historicalSpent,score:period==='all'?Math.max(historicalSpent,cycleSpent):cycleSpent,isCurrent:user.id===currentUid}}).filter(item=>mode==='vip'||item.score>0).sort((a,b)=>mode==='spend'?(b.score-a.score||b.vip-a.vip||a.alias.localeCompare(b.alias)):(b.vip-a.vip||b.historicalSpent-a.historicalSpent||a.alias.localeCompare(b.alias)));
}
function escapeAttribute(value){return String(value||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
function avatar(item){const initials=item.alias.replace('@','').split('-').slice(0,2).map(part=>part[0]).join('');return `<div class="rank-avatar" style="--rank-accent:${LEVEL_COLORS[item.vip]}">${item.photo?`<img src="${escapeAttribute(item.photo)}" alt="Avatar público" referrerpolicy="no-referrer" onerror="this.hidden=true;this.nextElementSibling.hidden=false">`:''}<span ${item.photo?'hidden':''}>${initials}</span></div>`}
function identity(item){return `<strong class="rank-alias">${item.alias}</strong>${item.isCurrent?'<span class="rank-you">VOCÊ</span>':''}`}
function podiumCard(item,place){
  if(!item)return `<article class="podium-card" data-place="${place}"><span class="podium-place">${place}</span><div class="rank-avatar"><span>?</span></div><strong class="rank-alias">Vaga aberta</strong><span class="rank-level">Aguardando participante</span></article>`;
  const score=mode==='spend'?money(item.score):`LV${item.vip}`;const detail=mode==='spend'?'TOTAL NO CICLO':`${money(item.historicalSpent)} HISTÓRICO`;
  return `<article class="podium-card ${item.isCurrent?'is-current-user':''}" data-place="${place}" style="--rank-accent:${LEVEL_COLORS[item.vip]}"><span class="podium-place">${place}</span>${avatar(item)}<div class="rank-identity">${identity(item)}</div><span class="rank-level">LV${item.vip} · ${LEVEL_NAMES[item.vip]}</span><strong class="rank-score">${score}<small>${detail}</small></strong></article>`;
}
function render(){
  const data=rankingEntries();
  podium.innerHTML=podiumCard(data[1],2)+podiumCard(data[0],1)+podiumCard(data[2],3);
  listEl.innerHTML=data.slice(3,30).map((item,index)=>`<div class="rank-row ${item.isCurrent?'is-current-user':''}" style="--rank-accent:${LEVEL_COLORS[item.vip]}"><span class="rank-position">${index+4}</span>${avatar(item)}<div class="rank-copy">${identity(item)}<small>LV${item.vip} · ${LEVEL_NAMES[item.vip]}</small></div><strong class="rank-row-score">${mode==='spend'?money(item.score):`LV${item.vip}`}<small>${mode==='spend'?'NO CICLO':money(item.historicalSpent)}</small></strong></div>`).join('')||'<div class="rank-loading">Ainda não há participantes suficientes neste ciclo.</div>';
  cycleLabel.textContent=period==='week'?'Semanal':period==='month'?'Mensal':'Geral';root.dataset.rankMode=mode;root.dataset.rankPeriod=period;
}
function tick(){const boundary=nextBoundary();if(!boundary){countdown.textContent='SEM REINÍCIO';return}const diff=Math.max(0,boundary-new Date());const days=Math.floor(diff/86400000),hours=Math.floor(diff/3600000)%24,minutes=Math.floor(diff/60000)%60,seconds=Math.floor(diff/1000)%60;countdown.textContent=`${days?days+'d ':''}${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`}
root?.addEventListener('click',event=>{const modeButton=event.target.closest('[data-rank-mode]');const periodButton=event.target.closest('[data-rank-period]');if(modeButton){mode=modeButton.dataset.rankMode;root.querySelectorAll('[data-rank-mode]').forEach(button=>button.classList.toggle('is-active',button===modeButton));render()}if(periodButton){period=periodButton.dataset.rankPeriod;root.querySelectorAll('[data-rank-period]').forEach(button=>button.classList.toggle('is-active',button===periodButton));render();tick()}});

(async()=>{
  try{
    const session=await window.WDSession?.ready;currentUid=session?.user?.uid||window.WDSession?.user?.uid||'';
    const usersSnapshot=await getDocs(collection(db,'usuarios'));users=usersSnapshot.docs.map(document=>({id:document.id,...document.data()}));
    try{const purchasesSnapshot=await getDocs(collection(db,'compras'));purchases=purchasesSnapshot.docs.map(document=>document.data())}catch(error){purchasesAvailable=false;console.warn('Compras do ciclo indisponíveis para esta conta:',error)}
    if(!purchasesAvailable){period='all';root.querySelectorAll('[data-rank-period]').forEach(button=>button.classList.toggle('is-active',button.dataset.rankPeriod==='all'));root.querySelectorAll('[data-rank-period]:not([data-rank-period="all"])').forEach(button=>button.disabled=true)}
    render();tick();timer=setInterval(tick,1000);
  }catch(error){console.error('Falha ao carregar ranking:',error);podium.innerHTML='<div class="rank-loading">O ranking está temporariamente indisponível.</div>';listEl.innerHTML=''}
})();
window.addEventListener('beforeunload',()=>clearInterval(timer),{once:true});