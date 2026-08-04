/* WD Founder — controlador único das ferramentas administrativas embutidas. */
(() => {
  const FRAME_SELECTOR = '.unified-admin-frame';
  const LEGACY_SELECTOR = [
    '.menu','.wd-admin-sidebar','.wd-admin-mobile-trigger','.wd-admin-backdrop',
    '.wd-member-nav','.client-bottom-nav','.app-bottom-nav','.mobile-menu-trigger',
    '.menu-backdrop'
  ].join(',');
  const states = new WeakMap();
  let touching = false;

  function stateFor(frame) {
    if (!states.has(frame)) states.set(frame, { raf: 0, resizeObserver: null, mutationObserver: null, lastHeight: 0, pending: false });
    return states.get(frame);
  }

  function safeDocument(frame) {
    try { return frame.contentDocument || null; } catch { return null; }
  }

  function removeLegacy(doc) {
    doc.querySelectorAll(LEGACY_SELECTOR).forEach(node => node.remove());
    doc.body?.classList.remove('wd-admin-layout','wd-admin-menu-open','wd-member-layout','menu-open','client-menu-disabled','spa-admin-open');
    doc.getElementById('wd-admin-embedded-layout')?.remove();
    doc.getElementById('wd-parent-embedded-layout')?.remove();
    doc.getElementById('wd-embedded-stabilizer-style')?.remove();
    doc.getElementById('wd-final-admin-autosize')?.remove();
  }

  function installStyle(doc) {
    let style = doc.getElementById('wd-admin-embedded-core');
    if (style) return;
    style = doc.createElement('style');
    style.id = 'wd-admin-embedded-core';
    style.textContent = `
      html[data-embedded-admin="true"],html[data-embedded-admin="true"] body{
        margin:0!important;padding:0!important;height:auto!important;min-height:0!important;
        max-height:none!important;overflow:hidden!important;overscroll-behavior:none!important;
        background:transparent!important;
      }
      html[data-embedded-admin="true"] .painel{
        display:block!important;width:100%!important;max-width:none!important;height:auto!important;
        min-height:0!important;margin:0!important;padding:0!important;background:transparent!important;
        grid-template-columns:minmax(0,1fr)!important;
      }
      html[data-embedded-admin="true"] .conteudo{
        box-sizing:border-box!important;width:100%!important;max-width:none!important;height:auto!important;
        min-height:0!important;margin:0!important;padding:28px clamp(22px,4vw,52px) 32px!important;
        background:transparent!important;
      }
      html[data-embedded-admin="true"] ${LEGACY_SELECTOR}{display:none!important}
      @media(max-width:768px){
        html[data-embedded-admin="true"] .conteudo{padding:16px 16px 24px!important}
      }
    `;
    doc.head.append(style);
  }

  function prepare(frame) {
    const doc = safeDocument(frame);
    if (!doc?.documentElement || !doc.body) return null;
    doc.documentElement.dataset.embeddedAdmin = 'true';
    doc.documentElement.dataset.theme = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
    removeLegacy(doc);
    installStyle(doc);
    frame.setAttribute('scrolling','no');
    frame.style.setProperty('overflow','hidden','important');
    frame.style.setProperty('border','0','important');
    return doc;
  }

  function contentHeight(doc) {
    const content = doc.querySelector('.conteudo');
    const panel = doc.querySelector('.painel');
    const rectBottom = Math.max(
      content?.getBoundingClientRect().bottom || 0,
      panel?.getBoundingClientRect().bottom || 0,
      doc.body.getBoundingClientRect().bottom || 0
    );
    return Math.max(
      Math.ceil(rectBottom),
      content?.scrollHeight || 0,
      panel?.scrollHeight || 0,
      doc.body.scrollHeight || 0,
      1
    );
  }

  function resize(frame) {
    const state = stateFor(frame);
    if (touching) { state.pending = true; return; }
    if (!frame.isConnected || frame.closest('[hidden]')) return;
    const doc = prepare(frame);
    if (!doc) return;
    const next = contentHeight(doc) + 2;
    if (Math.abs(next - state.lastHeight) < 2) return;
    state.lastHeight = next;
    frame.style.setProperty('height', `${next}px`, 'important');
    frame.closest('.unified-admin-workspace')?.style.setProperty('height','auto','important');
  }

  function schedule(frame) {
    const state = stateFor(frame);
    if (state.raf) cancelAnimationFrame(state.raf);
    state.raf = requestAnimationFrame(() => { state.raf = 0; resize(frame); });
  }

  function connect(frame) {
    const doc = prepare(frame);
    if (!doc) return;
    const state = stateFor(frame);
    state.resizeObserver?.disconnect();
    state.mutationObserver?.disconnect();
    state.resizeObserver = new ResizeObserver(() => schedule(frame));
    const content = doc.querySelector('.conteudo');
    state.resizeObserver.observe(content || doc.body);
    state.mutationObserver = new MutationObserver(() => schedule(frame));
    state.mutationObserver.observe(content || doc.body, { childList:true, subtree:true, characterData:true });
    schedule(frame);
    setTimeout(() => schedule(frame), 120);
    setTimeout(() => schedule(frame), 600);
  }

  function watch(frame) {
    if (frame.dataset.wdController === 'true') return;
    frame.dataset.wdController = 'true';
    frame.addEventListener('load', () => connect(frame));
    connect(frame);
  }

  function scan() { document.querySelectorAll(FRAME_SELECTOR).forEach(watch); }
  new MutationObserver(scan).observe(document.documentElement,{childList:true,subtree:true});

  addEventListener('touchstart', () => { touching = true; }, {passive:true});
  const finishTouch = () => {
    touching = false;
    document.querySelectorAll(FRAME_SELECTOR).forEach(frame => {
      const state = stateFor(frame);
      if (state.pending) { state.pending = false; schedule(frame); }
    });
  };
  addEventListener('touchend', finishTouch, {passive:true});
  addEventListener('touchcancel', finishTouch, {passive:true});
  addEventListener('orientationchange', () => setTimeout(() => document.querySelectorAll(FRAME_SELECTOR).forEach(schedule), 180), {passive:true});
  document.addEventListener('wd-theme-ready', () => document.querySelectorAll(FRAME_SELECTOR).forEach(schedule));
  scan();
})();
