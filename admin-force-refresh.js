/* WD Founder — status do sistema e atualização forçada para administradores */
const CURRENT_VERSION='3.40.0';
let refreshing=false;
let adminAuthorized=false;
let remoteVersion=CURRENT_VERSION;
let remoteRelease='';

function ensureSystemStyles(){
  if(document.querySelector('style[data-wd-system-status]'))return;
  const style=document.createElement('style');
  style.dataset.wdSystemStatus='true';
  style.textContent=`
    .wd-system-status-card{grid-column:1/-1;width:100%;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:20px 22px;border:1px solid rgba(212,175,55,.22);border-radius:24px;background:linear-gradient(145deg,#17191e,#101216);color:#fff;box-shadow:0 14px 34px rgba(0,0,0,.2);text-align:left;cursor:pointer;-webkit-tap-highlight-color:transparent}
    .wd-system-status-main{display:flex;align-items:center;gap:14px;min-width:0}.wd-system-dot{width:12px;height:12px;flex:0 0 auto;border-radius:50%;background:#42d993;box-shadow:0 0 0 6px rgba(66,217,147,.1)}
    .wd-system-status-card[data-status="update"] .wd-system-dot{background:#e8bd45;box-shadow:0 0 0 6px rgba(232,189,69,.1)}.wd-system-status-card[data-status="error"] .wd-system-dot{background:#ef5b67;box-shadow:0 0 0 6px rgba(239,91,103,.1)}
    .wd-system-status-copy{min-width:0}.wd-system-status-copy small{display:block;margin-bottom:5px;color:#d8bb61;font-size:10px;font-weight:900;letter-spacing:.22em}.wd-system-status-copy strong{display:block;font-size:18px;line-height:1.2}.wd-system-status-copy span{display:block;margin-top:5px;color:#aaa8a3;font-size:13px}
    .wd-system-status-arrow{color:#e5c04b;font-size:26px;font-weight:900}
    .wd-system-sheet-backdrop{position:fixed;inset:0;z-index:99994;background:rgba(0,0,0,.64);backdrop-filter:blur(7px)}
    .wd-system-sheet{position:fixed;left:50%;bottom:0;z-index:99995;width:min(100%,620px);max-height:min(82dvh,720px);overflow:auto;transform:translateX(-50%);padding:24px 22px calc(28px + env(safe-area-inset-bottom));border:1px solid #34373d;border-bottom:0;border-radius:30px 30px 0 0;background:#111318;color:#fff;box-shadow:0 -24px 70px rgba(0,0,0,.48)}
    .wd-system-sheet-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;padding-bottom:18px;border-bottom:1px solid #2d3036}.wd-system-sheet-head small{color:#d8bb61;font-size:10px;font-weight:900;letter-spacing:.22em}.wd-system-sheet-head h2{margin:7px 0 0;font-size:28px}.wd-system-sheet-close{width:46px;height:46px;border:1px solid #3b3e45;border-radius:15px;background:#191b20;color:#fff;font-size:28px}
    .wd-system-version-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:18px 0}.wd-system-version-grid div{padding:16px;border:1px solid #30333a;border-radius:18px;background:#17191e}.wd-system-version-grid small{display:block;color:#92918d;font-size:11px}.wd-system-version-grid strong{display:block;margin-top:7px;font-size:17px}
    .wd-system-actions{display:grid;gap:11px}.wd-system-action{width:100%;min-height:58px;padding:14px 16px;border:1px solid #34373d;border-radius:17px;background:#17191e;color:#fff;font-size:15px;font-weight:800;text-align:left}.wd-system-action.primary{border-color:rgba(212,175,55,.46);background:linear-gradient(145deg,#2b2517,#17150f);color:#f1d36d}.wd-system-action:disabled{opacity:.45}
    @media(max-width:420px){.wd-system-status-card{padding:17px 18px;border-radius:21px}.wd-system-status-copy strong{font-size:16px}.wd-system-version-grid{grid-template-columns:1fr}}
  `;
  document.head.append(style);
}

function removeLegacyAdminRefresh(){document.querySelectorAll('[data-force-app-update]').forEach(item=>item.remove())}

function cardMarkup(){return `<button type="button" class="wd-system-status-card" data-system-status-card data-status="checking"><span class="wd-system-status-main"><span class="wd-system-dot"></span><span class="wd-system-status-copy"><small>STATUS DO SISTEMA</small><strong data-system-status-title>Verificando atualização…</strong><span data-system-status-meta>Versão instalada ${CURRENT_VERSION}</span></span></span><span class="wd-system-status-arrow">›</span></button>`}

function installStatusCard(){
  if(!adminAuthorized)return;
  ensureSystemStyles();removeLegacyAdminRefresh();
  document.querySelectorAll('.spa-view[data-route="home"] .metric-grid').forEach(grid=>{
    if(grid.previousElementSibling?.matches('[data-system-status-card]'))return;
    grid.insertAdjacentHTML('beforebegin',cardMarkup());
  });
  updateCardState();
}

async function fetchVersion(){
  try{
    const response=await fetch(`./version.json?status=${Date.now()}`,{cache:'no-store'});
    if(!response.ok)throw new Error(`status ${response.status}`);
    const data=await response.json();
    remoteVersion=String(data.version||CURRENT_VERSION).trim();
    remoteRelease=String(data.release||'').trim();
    updateCardState();
    return data;
  }catch(error){
    document.querySelectorAll('[data-system-status-card]').forEach(card=>{
      card.dataset.status='error';
      card.querySelector('[data-system-status-title]').textContent='Não foi possível verificar';
      card.querySelector('[data-system-status-meta]').textContent=`Versão instalada ${CURRENT_VERSION}`;
    });
    throw error;
  }
}

function updateCardState(){
  const hasUpdate=remoteVersion!==CURRENT_VERSION;
  document.querySelectorAll('[data-system-status-card]').forEach(card=>{
    card.dataset.status=hasUpdate?'update':'ok';
    card.querySelector('[data-system-status-title]').textContent=hasUpdate?'Nova versão disponível':'Sistema atualizado';
    card.querySelector('[data-system-status-meta]').textContent=hasUpdate?`Instalada ${CURRENT_VERSION} • disponível ${remoteVersion}`:`Última versão ${CURRENT_VERSION}`;
  });
}

function closeSystemSheet(){document.querySelector('[data-system-sheet]')?.remove();document.querySelector('[data-system-backdrop]')?.remove();document.body.style.removeProperty('overflow')}
function openSystemSheet(){
  closeSystemSheet();
  const hasUpdate=remoteVersion!==CURRENT_VERSION;
  const backdrop=document.createElement('button');backdrop.type='button';backdrop.className='wd-system-sheet-backdrop';backdrop.dataset.systemBackdrop='true';backdrop.setAttribute('aria-label','Fechar status do sistema');
  const sheet=document.createElement('section');sheet.className='wd-system-sheet';sheet.dataset.systemSheet='true';sheet.setAttribute('role','dialog');sheet.setAttribute('aria-modal','true');sheet.innerHTML=`<div class="wd-system-sheet-head"><div><small>WD FOUNDER</small><h2>Status do sistema</h2></div><button type="button" class="wd-system-sheet-close" data-close-system aria-label="Fechar">×</button></div><div class="wd-system-version-grid"><div><small>Versão instalada</small><strong>${CURRENT_VERSION}</strong></div><div><small>Versão publicada</small><strong>${remoteVersion}</strong></div></div><div class="wd-system-actions"><button type="button" class="wd-system-action" data-check-system>Verificar atualização</button><button type="button" class="wd-system-action primary" data-download-update ${hasUpdate?'':'disabled'}>${hasUpdate?'Baixar atualização':'Nenhuma atualização disponível'}</button><button type="button" class="wd-system-action" data-clear-system-cache>Limpar cache</button><button type="button" class="wd-system-action" data-force-system-update>Forçar atualização</button></div>`;
  backdrop.addEventListener('click',closeSystemSheet);sheet.querySelector('[data-close-system]').addEventListener('click',closeSystemSheet);document.body.append(backdrop,sheet);document.body.style.overflow='hidden';
}

async function clearAllCaches(){if(!('caches'in window))return;const keys=await caches.keys();await Promise.all(keys.map(key=>caches.delete(key)))}
async function forceUpdate(button){
  if(refreshing)return;
  refreshing=true;button?.setAttribute('aria-busy','true');
  try{
    if(navigator.vibrate)navigator.vibrate(35);
    await clearAllCaches();
    if('serviceWorker'in navigator){const regs=await navigator.serviceWorker.getRegistrations();await Promise.all(regs.map(async reg=>{await reg.update().catch(()=>{});reg.waiting?.postMessage({type:'SKIP_WAITING'})}))}
    await fetch(`./version.json?force=${Date.now()}`,{cache:'no-store'}).catch(()=>null);
    const url=new URL(location.href);url.searchParams.set('_wd',Date.now().toString());location.replace(url.toString());
  }catch(error){refreshing=false;button?.removeAttribute('aria-busy');alert('Não foi possível concluir a atualização. Verifique sua conexão e tente novamente.')}
}

document.addEventListener('click',async event=>{
  if(event.target.closest('[data-system-status-card]')){openSystemSheet();return}
  const check=event.target.closest('[data-check-system]');if(check){check.textContent='Verificando…';await fetchVersion().catch(()=>{});closeSystemSheet();openSystemSheet();return}
  const download=event.target.closest('[data-download-update]');if(download&&!download.disabled){await forceUpdate(download);return}
  const clear=event.target.closest('[data-clear-system-cache]');if(clear){clear.textContent='Limpando…';await clearAllCaches();clear.textContent='Cache limpo';return}
  const force=event.target.closest('[data-force-system-update]');if(force){if(confirm('Forçar a atualização do WD Founder agora?'))await forceUpdate(force)}
},true);

document.addEventListener('wd-role-ready',event=>{adminAuthorized=Boolean(event.detail?.admin);if(adminAuthorized){installStatusCard();fetchVersion().catch(()=>{})}else{document.querySelectorAll('[data-system-status-card]').forEach(card=>card.remove())}});
document.addEventListener('wd-spa-route',event=>{if(event.detail?.route==='home')requestAnimationFrame(()=>{installStatusCard();fetchVersion().catch(()=>{})})});
const observer=new MutationObserver(mutations=>{if(adminAuthorized&&mutations.some(item=>item.addedNodes.length))installStatusCard()});observer.observe(document.documentElement,{subtree:true,childList:true});
removeLegacyAdminRefresh();
