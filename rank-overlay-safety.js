const MAX_VISIBLE_MS=3200;
let hideTimer=0;
function overlay(){return document.querySelector('.rank-unlock-celebration')}
function hideOverlay(){clearTimeout(hideTimer);const element=overlay();if(!element)return;element.classList.remove('is-leaving');element.hidden=true;element.style.display='none';element.setAttribute('aria-hidden','true')}
function armOverlay(){const element=overlay();if(!element||element.hidden)return;element.style.removeProperty('display');element.setAttribute('aria-hidden','false');clearTimeout(hideTimer);hideTimer=setTimeout(hideOverlay,MAX_VISIBLE_MS)}
document.addEventListener('animationstart',event=>{if(event.target?.classList?.contains('rank-unlock-celebration'))armOverlay()},true);
document.addEventListener('click',event=>{if(event.target.closest('.rank-unlock-celebration'))hideOverlay()},true);
document.addEventListener('keydown',event=>{if(event.key==='Escape')hideOverlay()});
document.addEventListener('wd-spa-route',event=>{if(event.detail?.route!=='rank')hideOverlay();else requestAnimationFrame(armOverlay)});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')armOverlay()});
window.addEventListener('pageshow',armOverlay);
