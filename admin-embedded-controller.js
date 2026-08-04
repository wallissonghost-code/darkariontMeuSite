/* WD Founder — controlador único e multiplataforma das ferramentas administrativas embutidas. */
(() => {
  const FRAME_SELECTOR = '.unified-admin-frame';
  const LEGACY_SELECTOR = [
    '.menu','.wd-admin-sidebar','.wd-admin-mobile-trigger','.wd-admin-backdrop',
    '.wd-member-nav','.client-bottom-nav','.app-bottom-nav','.mobile-menu-trigger',
    '.menu-backdrop'
  ].join(',');
  const CONFLICTING_STYLES = [
    'wd-admin-embedded-layout','wd-parent-embedded-layout','wd-embedded-stabilizer-style',
    'wd-final-admin-autosize','wd-admin-embedded-core-old'
  ];
  const PAGE_ROOTS = [
    '.purchase-page','.admin-page','.dashboard-page','.store-admin-page',
    '.performance-page','.history-page','.delete-page','.account-delete-page'
  ].join(',');

  const states = new WeakMap();
  let touching = false;
  let touchReleaseTimer = 0;

  function stateFor(frame) {
    if (!states.has(frame)) {
      states.set(frame, {
        raf: 0,
        resizeObserver: null,
        contentObserver: null,
        headObserver: null,
        lastHeight: 0,
        pending: false
      });
    }
    return states.get(frame);
  }

  function safeDocument(frame) {
    try { return frame.contentDocument || null; } catch { return null; }
  }

  function removeConflicts(doc) {
    CONFLICTING_STYLES.forEach(id => doc.getElementById(id)?.remove());
    doc.querySelectorAll(LEGACY_SELECTOR).forEach(node => node.remove());
    doc.body?.classList.remove(
      'wd-admin-layout','wd-admin-menu-open','wd-member-layout','menu-open',
      'client-menu-disabled','spa-admin-open','spa-admin-opened'
    );
  }

  function forceAutoBox(element, { overflow = 'visible', padding = null } = {}) {
    if (!element) return;
    element.style.setProperty('height', 'auto', 'important');
    element.style.setProperty('min-height', '0', 'important');
    element.style.setProperty('max-height', 'none', 'important');
    element.style.setProperty('overflow', overflow, 'important');
    element.style.setProperty('overflow-x', 'hidden', 'important');
    element.style.setProperty('margin-top', '0', 'important');
    element.style.setProperty('margin-bottom', '0', 'important');
    if (padding !== null) element.style.setProperty('padding', padding, 'important');
  }

  function installCoreStyle(doc) {
    let style = doc.getElementById('wd-admin-embedded-core');
    if (style) return;
    style = doc.createElement('style');
    style.id = 'wd-admin-embedded-core';
    style.textContent = `
      html[data-embedded-admin="true"],html[data-embedded-admin="true"] body{
        margin:0!important;padding:0!important;height:auto!important;min-height:0!important;
        max-height:none!important;overflow:hidden!important;overscroll-behavior:none!important;
        background:transparent!important;-webkit-text-size-adjust:100%;
      }
      html[data-embedded-admin="true"] .painel{
        display:block!important;width:100%!important;max-width:none!important;height:auto!important;
        min-height:0!important;margin:0!important;padding:0!important;background:transparent!important;
        grid-template-columns:minmax(0,1fr)!important;overflow:visible!important;
      }
      html[data-embedded-admin="true"] .conteudo{
        box-sizing:border-box!important;width:100%!important;max-width:none!important;height:auto!important;
        min-height:0!important;margin:0!important;padding:28px clamp(22px,4vw,52px) 32px!important;
        background:transparent!important;overflow:visible!important;
      }
      html[data-embedded-admin="true"] ${PAGE_ROOTS}{
        width:100%!important;max-width:1120px!important;height:auto!important;min-height:0!important;
        margin-left:auto!important;margin-right:auto!important;padding-top:0!important;
      }
      html[data-embedded-admin="true"] ${LEGACY_SELECTOR}{display:none!important}
      @media(max-width:768px){
        html[data-embedded-admin="true"] .conteudo{padding:16px 16px 22px!important}
        html[data-embedded-admin="true"] ${PAGE_ROOTS}{max-width:none!important}
      }
    `;
    doc.head.append(style);
  }

  function normalizeDocument(frame) {
    const doc = safeDocument(frame);
    if (!doc?.documentElement || !doc.body || !doc.head) return null;

    doc.documentElement.dataset.embeddedAdmin = 'true';
    doc.documentElement.dataset.theme = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
    doc.documentElement.style.colorScheme = doc.documentElement.dataset.theme;

    removeConflicts(doc);
    installCoreStyle(doc);

    forceAutoBox(doc.documentElement, { overflow: 'hidden', padding: '0' });
    forceAutoBox(doc.body, { overflow: 'hidden', padding: '0' });

    const panel = doc.querySelector('.painel');
    if (panel) {
      forceAutoBox(panel, { overflow: 'visible', padding: '0' });
      panel.style.setProperty('display', 'block', 'important');
      panel.style.setProperty('width', '100%', 'important');
      panel.style.setProperty('max-width', 'none', 'important');
      panel.style.setProperty('background', 'transparent', 'important');
      panel.style.setProperty('grid-template-columns', 'minmax(0,1fr)', 'important');
    }

    const content = doc.querySelector('.conteudo');
    if (content) {
      const mobile = matchMedia('(max-width:768px)').matches;
      forceAutoBox(content, {
        overflow: 'visible',
        padding: mobile ? '16px 16px 22px' : '28px clamp(22px,4vw,52px) 32px'
      });
      content.style.setProperty('box-sizing', 'border-box', 'important');
      content.style.setProperty('width', '100%', 'important');
      content.style.setProperty('max-width', 'none', 'important');
      content.style.setProperty('background', 'transparent', 'important');
    }

    doc.querySelectorAll(PAGE_ROOTS).forEach(root => {
      forceAutoBox(root, { overflow: 'visible' });
      root.style.setProperty('width', '100%', 'important');
    });

    frame.setAttribute('scrolling', 'no');
    frame.style.setProperty('overflow', 'hidden', 'important');
    frame.style.setProperty('border', '0', 'important');
    frame.style.setProperty('min-height', '0', 'important');
    frame.style.setProperty('max-height', 'none', 'important');
    frame.style.setProperty('display', 'block', 'important');
    frame.style.setProperty('width', '100%', 'important');
    return doc;
  }

  function isVisibleElement(element, view) {
    if (!(element instanceof view.HTMLElement)) return false;
    const style = view.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden' || style.position === 'fixed') return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function contentHeight(doc) {
    const view = doc.defaultView;
    const bodyRect = doc.body.getBoundingClientRect();
    const content = doc.querySelector('.conteudo') || doc.body;
    let maxBottom = bodyRect.top;

    const candidates = [content, ...content.children];
    candidates.forEach(element => {
      if (!isVisibleElement(element, view)) return;
      maxBottom = Math.max(maxBottom, element.getBoundingClientRect().bottom);
      Array.from(element.children || []).forEach(child => {
        if (isVisibleElement(child, view)) maxBottom = Math.max(maxBottom, child.getBoundingClientRect().bottom);
      });
    });

    const lastVisible = Array.from(content.querySelectorAll('*')).reverse().find(element => isVisibleElement(element, view));
    if (lastVisible) maxBottom = Math.max(maxBottom, lastVisible.getBoundingClientRect().bottom);

    return Math.max(1, Math.ceil(maxBottom - bodyRect.top + 2));
  }

  function resize(frame, force = false) {
    const state = stateFor(frame);
    if (touching && !force) { state.pending = true; return; }
    if (!frame.isConnected || frame.closest('[hidden]')) return;

    const doc = normalizeDocument(frame);
    if (!doc) return;

    const next = contentHeight(doc);
    if (!Number.isFinite(next) || next < 1) return;
    if (!force && Math.abs(next - state.lastHeight) < 2) return;

    state.lastHeight = next;
    frame.style.setProperty('height', `${next}px`, 'important');

    const workspace = frame.closest('.unified-admin-workspace');
    if (workspace) {
      workspace.style.setProperty('height', 'auto', 'important');
      workspace.style.setProperty('min-height', '0', 'important');
      workspace.style.setProperty('overflow', 'visible', 'important');
      workspace.style.setProperty('padding', '0', 'important');
      workspace.style.setProperty('margin', '0', 'important');
    }
  }

  function schedule(frame, force = false) {
    const state = stateFor(frame);
    if (state.raf) cancelAnimationFrame(state.raf);
    state.raf = requestAnimationFrame(() => {
      state.raf = 0;
      resize(frame, force);
    });
  }

  function connect(frame) {
    const doc = normalizeDocument(frame);
    if (!doc) return;

    const state = stateFor(frame);
    state.resizeObserver?.disconnect();
    state.contentObserver?.disconnect();
    state.headObserver?.disconnect();
    state.lastHeight = 0;

    const content = doc.querySelector('.conteudo') || doc.body;
    state.resizeObserver = new ResizeObserver(() => schedule(frame));
    state.resizeObserver.observe(content);

    state.contentObserver = new MutationObserver(() => schedule(frame));
    state.contentObserver.observe(content, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['class','hidden','open','style']
    });

    state.headObserver = new MutationObserver(() => {
      const hadConflict = CONFLICTING_STYLES.some(id => doc.getElementById(id));
      if (hadConflict) {
        removeConflicts(doc);
        installCoreStyle(doc);
        schedule(frame, true);
      }
    });
    state.headObserver.observe(doc.head, { childList: true, subtree: true });

    schedule(frame, true);
    setTimeout(() => schedule(frame, true), 120);
    setTimeout(() => schedule(frame, true), 600);
  }

  function watch(frame) {
    if (frame.dataset.wdController === 'true') return;
    frame.dataset.wdController = 'true';
    frame.addEventListener('load', () => connect(frame));
    connect(frame);
  }

  function scan() {
    document.querySelectorAll(FRAME_SELECTOR).forEach(watch);
  }

  function beginTouch() {
    touching = true;
    clearTimeout(touchReleaseTimer);
    touchReleaseTimer = setTimeout(endTouch, 900);
  }

  function endTouch() {
    clearTimeout(touchReleaseTimer);
    touching = false;
    document.querySelectorAll(FRAME_SELECTOR).forEach(frame => {
      const state = stateFor(frame);
      if (state.pending) {
        state.pending = false;
        schedule(frame, true);
      }
    });
  }

  new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });
  addEventListener('touchstart', beginTouch, { passive: true });
  addEventListener('touchmove', beginTouch, { passive: true });
  addEventListener('touchend', endTouch, { passive: true });
  addEventListener('touchcancel', endTouch, { passive: true });
  addEventListener('pointerup', endTouch, { passive: true });
  addEventListener('orientationchange', () => {
    setTimeout(() => document.querySelectorAll(FRAME_SELECTOR).forEach(frame => schedule(frame, true)), 220);
  }, { passive: true });
  addEventListener('resize', () => {
    if (!touching) document.querySelectorAll(FRAME_SELECTOR).forEach(frame => schedule(frame));
  }, { passive: true });
  document.addEventListener('wd-theme-ready', () => {
    document.querySelectorAll(FRAME_SELECTOR).forEach(frame => schedule(frame, true));
  });
  document.addEventListener('wd-spa-route', () => {
    requestAnimationFrame(() => document.querySelectorAll(FRAME_SELECTOR).forEach(frame => schedule(frame, true)));
  });

  scan();
})();
