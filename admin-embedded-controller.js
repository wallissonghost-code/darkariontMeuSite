/* WD Founder — integração única das ferramentas administrativas embutidas. */
(() => {
  const FRAME_SELECTOR='.unified-admin-frame';
  const EMBEDDED_STYLE_ID='wd-admin-embedded-core';
  const LEGACY_UI_SELECTOR=[
    '.menu','.wd-admin-sidebar','.wd-admin-mobile-trigger','.wd-admin-backdrop',
    '.wd-member-nav','.client-bottom-nav','.app-bottom-nav','.mobile-menu-trigger',
    '.menu-backdrop'
  ].join(',');

  const states=new WeakMap();
  let touching=false;

  function getState(frame){
    if(!states.has(frame)){
      states.set(frame,{
        raf:0,
        resizeObserver:null,
        mutationObserver:null,
        lastHeight:0,
        pending:false
      });
    }
    return states.get(frame);
  }

  function getDocument(frame){
    try{return frame.contentDocument||null}catch{return null}
  }

  function installEmbeddedStyle(doc){
    let style=doc.getElementById(EMBEDDED_STYLE_ID);
    if(style)return;

    style=doc.createElement('style');
    style.id=EMBEDDED_STYLE_ID;
    style.textContent=`
      html[data-embedded-admin="true"],
      html[data-embedded-admin="true"] body{
        margin:0!important;
        padding:0!important;
        width:100%!important;
        height:auto!important;
        min-height:0!important;
        max-height:none!important;
        overflow:hidden!important;
        background:transparent!important;
      }

      html[data-embedded-admin="true"] ${LEGACY_UI_SELECTOR}{
        display:none!important;
      }

      html[data-embedded-admin="true"] .painel{
        display:block!important;
        width:100%!important;
        max-width:none!important;
        height:auto!important;
        min-height:0!important;
        margin:0!important;
        padding:0!important;
        background:transparent!important;
        overflow:visible!important;
        grid-template-columns:minmax(0,1fr)!important;
      }

      html[data-embedded-admin="true"] .conteudo{
        box-sizing:border-box!important;
        width:100%!important;
        max-width:none!important;
        height:auto!important;
        min-height:0!important;
        margin:0!important;
        padding:28px clamp(22px,4vw,52px) 32px!important;
        background:transparent!important;
        overflow:visible!important;
      }

      html[data-embedded-admin="true"] .purchase-page,
      html[data-embedded-admin="true"] .admin-page,
      html[data-embedded-admin="true"] .dashboard-page,
      html[data-embedded-admin="true"] .store-admin-page{
        width:100%!important;
        max-width:1120px!important;
        margin:0 auto!important;
      }

      @media(max-width:768px){
        html[data-embedded-admin="true"] .conteudo{
          padding:16px 16px 24px!important;
        }
        html[data-embedded-admin="true"] .purchase-page,
        html[data-embedded-admin="true"] .admin-page,
        html[data-embedded-admin="true"] .dashboard-page,
        html[data-embedded-admin="true"] .store-admin-page{
          max-width:none!important;
        }
      }
    `;
    doc.head.append(style);
  }

  function prepare(frame){
    const doc=getDocument(frame);
    if(!doc?.documentElement||!doc.body)return null;

    doc.documentElement.dataset.embeddedAdmin='true';
    doc.documentElement.dataset.theme=document.documentElement.dataset.theme==='dark'?'dark':'light';
    doc.documentElement.style.colorScheme=doc.documentElement.dataset.theme;

    doc.querySelectorAll(LEGACY_UI_SELECTOR).forEach(node=>node.remove());
    doc.body.classList.remove(
      'wd-admin-layout','wd-admin-menu-open','wd-member-layout','menu-open',
      'client-menu-disabled','spa-admin-open'
    );

    installEmbeddedStyle(doc);

    frame.setAttribute('scrolling','no');
    frame.style.setProperty('display','block');
    frame.style.setProperty('width','100%');
    frame.style.setProperty('min-height','0');
    frame.style.setProperty('max-height','none');
    frame.style.setProperty('overflow','hidden');
    frame.style.setProperty('border','0');

    return doc;
  }

  function visibleBottom(doc){
    const view=doc.defaultView;
    const root=doc.querySelector('.conteudo')||doc.body;
    const origin=doc.body.getBoundingClientRect().top;
    let bottom=root.getBoundingClientRect().bottom;

    root.querySelectorAll('*').forEach(element=>{
      if(!(element instanceof view.HTMLElement))return;
      const style=view.getComputedStyle(element);
      if(style.display==='none'||style.visibility==='hidden'||style.position==='fixed')return;
      const rect=element.getBoundingClientRect();
      if(rect.width<=0||rect.height<=0)return;
      bottom=Math.max(bottom,rect.bottom);
    });

    return Math.max(1,Math.ceil(bottom-origin+2));
  }

  function resize(frame){
    const state=getState(frame);
    if(touching){state.pending=true;return}
    if(!frame.isConnected||frame.closest('[hidden]'))return;

    const doc=prepare(frame);
    if(!doc)return;

    const next=visibleBottom(doc);
    if(!Number.isFinite(next)||next<1)return;
    if(Math.abs(next-state.lastHeight)<2)return;

    state.lastHeight=next;
    frame.style.setProperty('height',`${next}px`,'important');

    const workspace=frame.closest('.unified-admin-workspace');
    if(workspace){
      workspace.style.height='auto';
      workspace.style.minHeight='0';
      workspace.style.overflow='visible';
      workspace.style.paddingBottom='0';
    }
  }

  function schedule(frame){
    const state=getState(frame);
    if(state.raf)cancelAnimationFrame(state.raf);
    state.raf=requestAnimationFrame(()=>{
      state.raf=0;
      resize(frame);
    });
  }

  function connect(frame){
    const doc=prepare(frame);
    if(!doc)return;

    const state=getState(frame);
    state.resizeObserver?.disconnect();
    state.mutationObserver?.disconnect();
    state.lastHeight=0;

    const root=doc.querySelector('.conteudo')||doc.body;
    state.resizeObserver=new ResizeObserver(()=>schedule(frame));
    state.resizeObserver.observe(root);

    state.mutationObserver=new MutationObserver(()=>schedule(frame));
    state.mutationObserver.observe(root,{
      childList:true,
      subtree:true,
      characterData:true,
      attributes:true,
      attributeFilter:['class','hidden','open','style']
    });

    schedule(frame);
    setTimeout(()=>schedule(frame),120);
    setTimeout(()=>schedule(frame),500);
  }

  function watch(frame){
    if(frame.dataset.wdEmbeddedController==='true')return;
    frame.dataset.wdEmbeddedController='true';
    frame.addEventListener('load',()=>connect(frame));
    connect(frame);
  }

  function scan(){
    document.querySelectorAll(FRAME_SELECTOR).forEach(watch);
  }

  new MutationObserver(scan).observe(document.documentElement,{childList:true,subtree:true});

  addEventListener('touchstart',()=>{touching=true},{passive:true});
  const finishTouch=()=>{
    touching=false;
    document.querySelectorAll(FRAME_SELECTOR).forEach(frame=>{
      const state=getState(frame);
      if(state.pending){
        state.pending=false;
        schedule(frame);
      }
    });
  };
  addEventListener('touchend',finishTouch,{passive:true});
  addEventListener('touchcancel',finishTouch,{passive:true});

  addEventListener('orientationchange',()=>{
    setTimeout(()=>document.querySelectorAll(FRAME_SELECTOR).forEach(schedule),180);
  },{passive:true});

  document.addEventListener('wd-theme-ready',()=>{
    document.querySelectorAll(FRAME_SELECTOR).forEach(frame=>{
      const doc=getDocument(frame);
      if(doc?.documentElement){
        const theme=document.documentElement.dataset.theme==='dark'?'dark':'light';
        doc.documentElement.dataset.theme=theme;
        doc.documentElement.style.colorScheme=theme;
      }
      schedule(frame);
    });
  });

  scan();
})();
