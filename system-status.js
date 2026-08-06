/* WD Founder — status do sistema para administradores */
const CURRENT_VERSION='3.42.0';
let adminAuthorized=false;
let remoteVersion=CURRENT_VERSION;
let refreshing=false;

function ensureStyles(){
  if(document.querySelector('style[data-wd-system-status]'))return;
  const style=document.createElement('style');
  style.dataset.wdSystemStatus='true';
  style.textContent=`
  .wd-system-status-card{grid-column:1/-1;width:100%;display:flex;align-items:center;justify-content:space-between;gap:16px;margin:0 0 18px;padding:19px 20px;border:1px solid rgba(212,175,55,.24);border-radius:23px;background:linear-gradient(145deg,#17191e,#101216);color:#fff;box-shadow:0 14px 34px rgba(0,0,0,.2);text-align:left;cursor:pointer;-webkit-tap-highlight-color:transparent}
  .wd-system-status-main{display:flex;align-items:center;gap:14px;min-width:0}.wd-system-dot{width:11px;height:11px;flex:0 0 auto;border-radius:50%;background:#42d993;box-shadow:0 0 0 6px rgba(66,217,147,.1)}
  .wd-system-status-card[data-status="update"] .wd-system-dot{background:#e8bd45;box-shadow:0 0 0 6px rgba(232,189,69,.1)}.wd-system-status-card[data-status="error"] .wd-system-dot{background:#ef5b67;box-shadow:0 0 0 6px rgba(239,91,103,.1)}
  .wd-system-copy{min-width:0}.wd-system-copy small{display:block;margin-bottom:5px;color:#d8bb61;font-size:10px;font-weight:900;letter-spacing:.22em}.wd-system-copy strong{display:block;font-size:17px;line-height:1.2}.wd-system-copy span{display:block;margin-top:5px;color:#aaa8a3;font-size:13px}.wd-system-arrow{color:#e5c04b;font-size:25px;font-weight:900}
  .wd-system-backdrop{position:fixed;inset:0;z-index:99994;background:rgba(0,0,0,.66);backdrop-filter:blur(7px)}.wd-system-sheet{position:fixed;left:50%;bottom:0;z-index:99995;width:min(100%,620px);max-height:82dvh;overflow:auto;transform:translateX(-50%);padding:24px 22px calc(26px + env(safe-area-inset-bottom));border:1px solid #34373d;border-bottom:0;border-radius:30px 30px 0 0;background:#111318;color:#fff;box-shadow:0 -24px 70px rgba(0,0,0,.48)}
  .wd-system-head{display:flex;justify-content:space-between;gap:18px;padding-bottom:18px;border-bottom:1px solid #2d3036}.wd-system-head small{color:#d8bb61;font-size:10px;font-weight:900;letter-spacing:.22em}.wd-system-head h2{margin:7px 0 0;font-size:28px}.wd-system-close{width:46px;height:46px;border:1px solid #3b3e45;border-radius:15px;background:#191b20;color:#fff;font-size:28px}.wd-system-versions{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:18px 0}.wd-system-versions div{padding:16px;border:1px solid #30333a;border-radius:18px;background:#17191e}.wd-system-versions small{display:block;color:#92918d;font-size:11px}.wd-system-versions strong{display:block;margin-top:7px;font-size:17px}.wd-system-actions{display:grid;gap:11px}.wd-system-action{width:100%;min-height:58px;padding:14px 16px;border:1px solid #34373d;border-radius:17px;background:#17191e;color:#fff;font-size:15px;font-weight:800;text-align:left}.wd-system-action.primary{border-color:rgba(212,175,55,.46);background:linear-gradient(145deg,#2b2517,#17150f);color:#f1d36d}.wd-system-action:disabled{opacity:.45}
  @media(max-width:420px){.wd-system-status-card{padding:17px 18px;border-radius:21px}.wd-system-copy strong{font-size:16px}.wd-system-versions{grid-template-columns:1fr}}
  `;
  document.head.append(style);
}
function cardMarkup(){return `<button type="button" class="wd-system-status-card" data-system-status-card data-status="checking"><span class="wd-system-status-main"><span class="wd-system-dot"></span><span class="wd-system-copy"><small>STATUS DO SISTEMA</small><strong data-system-title>Verificando atualização…</strong><span data-system-meta>Versão instalada ${CURRENT_VERSION}</span></span></span><span class="wd-system-arrow">›</span></button>`}
function installCard(){
  if(!adminAuthorized||document.querySelector('[data-system-status-card]'))return;
  const grid=document.querySelector('.spa-view[data-route="home"] .metric-grid');
  if(!grid)return;
  ensureStyles();
  grid.insertAdjacentHTML('beforebegin',cardMarkup());
  updateCard();
}
function updateCard(status='ok'){
  const hasUpdate=remoteVersion!==CURRENT_VERSION;
  document.querySelectorAll('[data-system-status-card]').forEach(card=>{
    const nextStatus=status==='error'?'error':(hasUpdate?'update':'ok');
    const title=status==='error'?'Não foi possível verificar':(hasUpdate?'Nova versão disponível':'Sistema atualizado');
    const meta=hasUpdate?`Instalada ${CURRENT_VERSION} • disponível ${remoteVersion}`:`Última versão ${CURRENT_VERSION}`;
    if(card.dataset.status!==nextStatus)card.dataset.status=nextStatus;
    const titleNode=card.querySelector('[data-system-title]');
    const metaNode=card.querySelector('[data-system-meta]');
    if(titleNode&&titleNode.textContent!==title)titleNode.textContent=title;
    if(metaNode&&metaNode.textContent!==meta)metaNode.textContent=meta;
  });
}
async function fetchVersion(){
  try{const r=await fetch(`./version.json?t=${Date.now()}`,{cache:'no-store'});if(!r.ok)throw new Error(r.status);const data=await r.json();remoteVersion=String(data.version||CURRENT_VERSION).trim();updateCard();return data}catch(error){updateCard('error');throw error}
}
function closeSheet(){document.querySelector('[data-system-sheet]')?.remove();document.querySelector('[data-system-backdrop]')?.remove();document.body.style.removeProperty('overflow')}
function openSheet(){
  closeSheet();const hasUpdate=remoteVersion!==CURRENT_VERSION;
  const backdrop=document.createElement('button');backdrop.type='button';backdrop.className='wd-system-backdrop';backdrop.dataset.systemBackdrop='true';backdrop.setAttribute('aria-label','Fechar');
  const sheet=document.createElement('section');sheet.className='wd-system-sheet';sheet.dataset.systemSheet='true';sheet.innerHTML=`<div class="wd-system-head"><div><small>WD FOUNDER</small><h2>Status do sistema</h2></div><button type="button" class="wd-system-close" data-close-system>×</button></div><div class="wd-system-versions"><div><small>Versão instalada</small><strong>${CURRENT_VERSION}</strong></div><div><small>Versão publicada</small><strong>${remoteVersion}</strong></div></div><div class="wd-system-actions"><button class="wd-system-action" data-check-system>Verificar atualização</button><button class="wd-system-action primary" data-download-system ${hasUpdate?'':'disabled'}>${hasUpdate?'Baixar atualização':'Nenhuma atualização disponível'}</button><button class="wd-system-action" data-clear-system>Limpar cache</button><button class="wd-system-action" data-force-system>Forçar atualização</button></div>`;
  backdrop.onclick=closeSheet;sheet.querySelector('[data-close-system]').onclick=closeSheet;document.body.append(backdrop,sheet);document.body.style.overflow='hidden';
}
async function clearCaches(){if(!('caches'in window))return;const keys=await caches.keys();await Promise.all(keys.map(k=>caches.delete(k)))}
async function forceUpdate(button){if(refreshing)return;refreshing=true;button?.setAttribute('aria-busy','true');try{await clearCaches();if('serviceWorker'in navigator){const regs=await navigator.serviceWorker.getRegistrations();await Promise.all(regs.map(async r=>{await r.update().catch(()=>{});r.waiting?.postMessage({type:'SKIP_WAITING'})}))}const url=new URL(location.href);url.searchParams.set('_wd',Date.now());location.replace(url.toString())}catch(e){refreshing=false;button?.removeAttribute('aria-busy');alert('Não foi possível atualizar. Verifique sua conexão.')}}
document.addEventListener('click',async e=>{if(e.target.closest('[data-system-status-card]'))return openSheet();if(e.target.closest('[data-check-system]')){await fetchVersion().catch(()=>{});closeSheet();openSheet();return}if(e.target.closest('[data-download-system]')&&!e.target.closest('[data-download-system]').disabled)return forceUpdate(e.target.closest('[data-download-system]'));if(e.target.closest('[data-clear-system]')){await clearCaches();e.target.closest('[data-clear-system]').textContent='Cache limpo';return}if(e.target.closest('[data-force-system]'))return forceUpdate(e.target.closest('[data-force-system]'))});
document.addEventListener('wd-role-ready',e=>{adminAuthorized=Boolean(e.detail?.admin);if(adminAuthorized){installCard();fetchVersion().catch(()=>{})}});
document.addEventListener('wd-spa-route',e=>{if(e.detail?.route==='home'&&adminAuthorized)requestAnimationFrame(()=>{installCard();fetchVersion().catch(()=>{})})});
/* Observa somente a chegada inicial da Home e se desliga assim que o card é instalado. */
const homeObserver=new MutationObserver(()=>{if(!adminAuthorized)return;if(document.querySelector('[data-system-status-card]')){homeObserver.disconnect();return}installCard();if(document.querySelector('[data-system-status-card]'))homeObserver.disconnect()});
homeObserver.observe(document.getElementById('conteudo')||document.body,{subtree:true,childList:true});
