const MINIMUM_SPEND=500;
const ADMIN_ROLES=new Set(['admin','administrador','master']);
let currentState={uid:'',spent:0,admin:false,eligible:false};
function money(value){return Number(value||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
function rankLinks(){return [...document.querySelectorAll('[data-spa-route="rank"]')]}
function showToast(){document.querySelector('.rank-gate-toast')?.remove();const remaining=Math.max(0,MINIMUM_SPEND-currentState.spent);const toast=document.createElement('div');toast.className='rank-gate-toast';toast.innerHTML=`Rank bloqueado<small>Acumule mais ${money(remaining)} em compras para desbloquear.</small>`;document.body.append(toast);setTimeout(()=>toast.remove(),2200)}
function applyGate(){rankLinks().forEach(link=>{link.classList.toggle('is-rank-locked',!currentState.eligible);link.setAttribute('aria-disabled',currentState.eligible?'false':'true');link.title=currentState.eligible?'Abrir Rank':`Rank bloqueado — faltam ${money(Math.max(0,MINIMUM_SPEND-currentState.spent))}`})}
function celebrateNavUnlock(){const key=`wd-rank-nav-unlocked:${currentState.uid}`;if(!currentState.uid||localStorage.getItem(key))return;rankLinks().forEach(link=>link.classList.add('rank-just-unlocked'));localStorage.setItem(key,'1');setTimeout(()=>rankLinks().forEach(link=>link.classList.remove('rank-just-unlocked')),2200)}
function setProfile(detail={}){const profile=detail.dados||detail.profile||{};const user=detail.user||{};const previous=currentState.eligible;const admin=Boolean(detail.admin)||ADMIN_ROLES.has(String(profile.role||'').toLowerCase());const spent=Math.max(0,Number(profile.totalGasto)||0);currentState={uid:user.uid||'',spent,admin,eligible:admin||spent>=MINIMUM_SPEND};applyGate();if(!previous&&currentState.eligible)celebrateNavUnlock()}
document.addEventListener('wd-role-ready',event=>setProfile(event.detail));
document.addEventListener('wd-navigation-ready',applyGate);
document.addEventListener('click',event=>{const link=event.target.closest('[data-spa-route="rank"]');if(!link||currentState.eligible)return;event.preventDefault();event.stopImmediatePropagation();showToast()},true);
window.WDRankAccess={minimumSpend:MINIMUM_SPEND,getState:()=>({...currentState}),refresh:applyGate};
