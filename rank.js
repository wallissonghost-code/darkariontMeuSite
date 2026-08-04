import {db} from './firebase.js';
import {collection,onSnapshot,doc,getDoc} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

const LEVEL_NAMES=['MEMBRO','BRONZE','SILVER','GOLD','PREMIUM','PLATINUM','SELECT','BLACK','ELITE','PRIME','FOUNDER'];
const LEVEL_COLORS=['#82705a','#b87333','#c0c0c0','#d4af37','#8d62ef','#e5e4e2','#2471e8','#242424','#c92d42','#3256b8','#ffd700'];
const ADMIN_ROLES=new Set(['admin','administrador','master']);
const FIXED_ADMINS=new Set(['WAPN8cPkPGP2mwiQ8FNbIGyUaUl1']);
const DEFAULT_CONFIG={minimumSpend:500,weekly:['Premiação em definição','Premiação em definição','Premiação em definição'],monthly:['Premiação em definição','Premiação em definição','Premiação em definição']};
const money=value=>Number(value||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const root=document.querySelector('[data-view="rank"]');
const podium=root?.querySelector('#rankPodium');
const listEl=root?.querySelector('#rankList');
const countdown=root?.querySelector('#rankCountdown');
const cycleLabel=root?.querySelector('#rankCycleLabel');
const lockPanel=root?.querySelector('#rankAccessLock');
const unlockedContent=root?.querySelector('#rankUnlockedContent');
const unlockCelebration=root?.querySelector('#rankUnlockCelebration');
const progressText=root?.querySelector('#rankAccessProgressText');
const progressBar=root?.querySelector('#rankAccessProgressBar');
const remainingText=root?.querySelector('#rankAccessRemaining');
const rewardsGrid=root?.querySelector('#rankRewardsGrid');
const rewardsPeriod=root?.querySelector('#rankRewardsPeriod');
let users=[];
let mode='spend';
let period='week';
let timer=null;
let unsubscribePublic=null;
let currentUid='';
let currentRankId='';
let currentProfile={};
let config={...DEFAULT_CONFIG};
let adminAccess=false;

function hash(value,seed=2166136261){let result=seed;for(const char of String(value||'')){result^=char.charCodeAt(0);result=Math.imul(result,16777619)}return result>>>0}
function rankId(uid){const a=hash(uid).toString(36);const b=hash([...String(uid)].reverse().join(''),2246822519).toString(36);return `rank_${a}${b}`.slice(0,28)}
function publicAlias(user){const words=['NOVA','ONYX','LUX','PRIME','VANTA','AURA','NEXO','ORBIT','ROYAL','ZENITH','NOBLE','ECLIPSE'];const value=hash(user.id);const initial=String(user.initial||'W').replace(/[^A-Z0-9À-Ü]/gi,'').slice(0,1).toUpperCase()||'W';return `@${initial}-${words[value%words.length]}-${(value%1679616).toString(36).toUpperCase().padStart(4,'0')}`}
function escapeHtml(value){return String(value||'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]))}
function localPhoto(uid){if(!uid)return '';for(const key of [`wd-profile-photo:${uid}`,`wd-profile-photo-${uid}`,`profilePhoto:${uid}`,`avatar:${uid}`]){const value=localStorage.getItem(key);if(value?.trim())return value.trim()}return ''}
function weekKey(date=new Date()){const value=new Date(date);const day=(value.getDay()+6)%7;value.setHours(0,0,0,0);value.setDate(value.getDate()-day);return `${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,'0')}-${String(value.getDate()).padStart(2,'0')}`}
function monthKey(date=new Date()){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`}
function startOfWeek(){const date=new Date();const day=(date.getDay()+6)%7;date.setHours(0,0,0,0);date.setDate(date.getDate()-day);return date}
function nextBoundary(){const now=new Date();if(period==='week'){const next=startOfWeek();next.setDate(next.getDate()+7);return next}if(period==='month')return new Date(now.getFullYear(),now.getMonth()+1,1);return null}
function eligible(user){return Math.max(0,Number(user.totalGasto)||0)>=Number(config.minimumSpend||500)}
function scoreFor(user){if(period==='all')return Math.max(0,Number(user.totalGasto)||0);if(period==='month')return user.monthKey===monthKey()?Math.max(0,Number(user.monthSpent)||0):0;return user.weekKey===weekKey()?Math.max(0,Number(user.weekSpent)||0):0}
function rankingEntries(){return users.filter(eligible).map(user=>{const vip=Math.max(0,Math.min(10,Number(user.vip)||0));const score=scoreFor(user);return{id:user.id,alias:publicAlias(user),photo:String(user.photo||''),vip,score,historicalSpent:Math.max(0,Number(user.totalGasto)||0),isCurrent:user.id===currentRankId}}).filter(item=>mode==='vip'||item.score>0).sort((a,b)=>mode==='spend'?(b.score-a.score||b.vip-a.vip||a.alias.localeCompare(b.alias)):(b.vip-a.vip||b.historicalSpent-a.historicalSpent||a.alias.localeCompare(b.alias)))}
function avatar(item){const initials=item.alias.replace('@','').split('-').slice(0,2).map(part=>part[0]).join('');const photo=item.isCurrent?(localPhoto(currentUid)||item.photo):item.photo;return `<div class="rank-avatar" style="--rank-accent:${LEVEL_COLORS[item.vip]}">${photo?`<img src="${escapeHtml(photo)}" alt="Foto pública do participante" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.hidden=true;this.nextElementSibling.hidden=false">`:''}<span ${photo?'hidden':''}>${initials}</span></div>`}
function identity(item){return `<strong class="rank-alias">${escapeHtml(item.alias)}</strong>${item.isCurrent?'<span class="rank-you">VOCÊ</span>':''}`}
function podiumCard(item,place){if(!item)return `<article class="podium-card" data-place="${place}"><span class="podium-place">${place}</span><div class="rank-avatar"><span>?</span></div><strong class="rank-alias">Vaga aberta</strong><span class="rank-level">Aguardando participante</span></article>`;const score=mode==='spend'?money(item.score):`LV${item.vip}`;const detail=mode==='spend'?'TOTAL NO CICLO':`${money(item.historicalSpent)} HISTÓRICO`;return `<article class="podium-card ${item.isCurrent?'is-current-user':''}" data-place="${place}" style="--rank-accent:${LEVEL_COLORS[item.vip]}"><span class="podium-place">${place}</span>${avatar(item)}<div class="rank-identity">${identity(item)}</div><span class="rank-level">LV${item.vip} · ${LEVEL_NAMES[item.vip]}</span><strong class="rank-score">${score}<small>${detail}</small></strong></article>`}
function renderRewards(){if(!rewardsGrid||!rewardsPeriod)return;const rewards=period==='month'?config.monthly:period==='week'?config.weekly:null;rewardsPeriod.textContent=period==='month'?'Mensal':period==='week'?'Semanal':'Sem premiação';if(!rewards){rewardsGrid.innerHTML='<article class="rank-no-reward"><strong>O ranking geral não reinicia e não possui premiação de ciclo.</strong></article>';return}rewardsGrid.innerHTML=rewards.slice(0,3).map((reward,index)=>`<article data-place="${index+1}"><b>${index+1}º</b><strong>${escapeHtml(reward||'Premiação em definição')}</strong></article>`).join('')}
function render(){if(!podium||!listEl)return;const data=rankingEntries();podium.innerHTML=podiumCard(data[1],2)+podiumCard(data[0],1)+podiumCard(data[2],3);listEl.innerHTML=data.slice(3,30).map((item,index)=>`<div class="rank-row ${item.isCurrent?'is-current-user':''}" style="--rank-accent:${LEVEL_COLORS[item.vip]}"><span class="rank-position">${index+4}</span>${avatar(item)}<div class="rank-copy">${identity(item)}<small>LV${item.vip} · ${LEVEL_NAMES[item.vip]}</small></div><strong class="rank-row-score">${mode==='spend'?money(item.score):`LV${item.vip}`}<small>${mode==='spend'?'NO CICLO':money(item.historicalSpent)}</small></strong></div>`).join('')||'<div class="rank-loading">Ainda não há participantes elegíveis neste ciclo.</div>';cycleLabel.textContent=period==='week'?'Semanal':period==='month'?'Mensal':'Geral';root.dataset.rankMode=mode;root.dataset.rankPeriod=period;renderRewards()}
function tick(){const boundary=nextBoundary();if(!boundary){countdown.textContent='SEM REINÍCIO';return}const diff=Math.max(0,boundary-new Date());const days=Math.floor(diff/86400000),hours=Math.floor(diff/3600000)%24,minutes=Math.floor(diff/60000)%60,seconds=Math.floor(diff/1000)%60;countdown.textContent=`${days?days+'d ':''}${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`}
function showLocked(){const spent=Math.max(0,Number(currentProfile.totalGasto)||0);const minimum=Number(config.minimumSpend||500);const percent=Math.min(100,spent/minimum*100);lockPanel.hidden=false;unlockedContent.hidden=true;progressText.textContent=`${money(spent)} de ${money(minimum)}`;progressBar.style.width=`${percent}%`;remainingText.textContent=`Faltam ${money(Math.max(0,minimum-spent))}`;root.dataset.access='locked'}
function showUnlocked(){lockPanel.hidden=true;unlockedContent.hidden=false;root.dataset.access='unlocked';const key=`wd-rank-unlocked:${currentUid}`;if(currentUid&&!localStorage.getItem(key)){unlockCelebration.hidden=false;localStorage.setItem(key,'1');setTimeout(()=>{unlockCelebration.classList.add('is-leaving');setTimeout(()=>{unlockCelebration.hidden=true;unlockCelebration.style.display='none'},500)},2200)}}
function applyPublicSnapshot(snapshot){users=snapshot.docs.map(item=>({id:item.id,...item.data()})).filter(item=>item.tipo==='rank_publico');const publicConfig=snapshot.docs.find(item=>item.id==='__rank_config_public')?.data();if(publicConfig){config={minimumSpend:Math.max(500,Number(publicConfig.minimumSpend)||500),weekly:Array.isArray(publicConfig.weekly)?publicConfig.weekly:DEFAULT_CONFIG.weekly,monthly:Array.isArray(publicConfig.monthly)?publicConfig.monthly:DEFAULT_CONFIG.monthly}}render()}
root?.addEventListener('click',event=>{const modeButton=event.target.closest('[data-rank-mode]');const periodButton=event.target.closest('[data-rank-period]');if(modeButton){mode=modeButton.dataset.rankMode;root.querySelectorAll('[data-rank-mode]').forEach(button=>button.classList.toggle('is-active',button===modeButton));render()}if(periodButton){period=periodButton.dataset.rankPeriod;root.querySelectorAll('[data-rank-period]').forEach(button=>button.classList.toggle('is-active',button===periodButton));render();tick()}});

(async()=>{try{const session=await window.WDSession?.ready;currentUid=session?.user?.uid||window.WDSession?.user?.uid||'';currentRankId=rankId(currentUid);currentProfile=session?.profile||session?.dados||{};adminAccess=FIXED_ADMINS.has(currentUid)||ADMIN_ROLES.has(String(currentProfile.role||'').toLowerCase());try{const publicConfigSnap=await getDoc(doc(db,'ofertas','__rank_config_public'));if(publicConfigSnap.exists()){const data=publicConfigSnap.data();config={minimumSpend:Math.max(500,Number(data.minimumSpend)||500),weekly:Array.isArray(data.weekly)?data.weekly:DEFAULT_CONFIG.weekly,monthly:Array.isArray(data.monthly)?data.monthly:DEFAULT_CONFIG.monthly}}}catch(error){console.warn('Configuração pública do Rank indisponível:',error)}const canView=adminAccess||Math.max(0,Number(currentProfile.totalGasto)||0)>=config.minimumSpend;if(!canView){showLocked();return}showUnlocked();unsubscribePublic=onSnapshot(collection(db,'ofertas'),applyPublicSnapshot,error=>{console.error('Falha ao acompanhar o Rank público:',error);if(podium)podium.innerHTML='<div class="rank-loading">O ranking está temporariamente indisponível.</div>'});tick();timer=setInterval(tick,1000)}catch(error){console.error('Falha ao carregar ranking:',error);if(podium)podium.innerHTML='<div class="rank-loading">O ranking está temporariamente indisponível.</div>';if(listEl)listEl.innerHTML=''}})();
window.addEventListener('beforeunload',()=>{clearInterval(timer);unsubscribePublic?.()},{once:true});