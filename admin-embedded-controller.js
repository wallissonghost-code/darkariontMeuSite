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
    if (!states.has(frame)) {
      states.set(frame, {
        raf: 0,
        resizeObserver: null,
        mutationObserver: null,
        lastHeight: 0,
        pending: false
      });
    }
    return states.get(frame);
  }

  function safeDocument(frame) {
    try { return frame.contentDocument || null; } catch { return null; }
  }

  function removeLegacy(doc) {
    doc.querySelectorAll(LEGACY_SELECTOR).forEach(node => node.remove());
    doc.body?.classList.remove(
      'wd-admin-layout','wd-admin-menu-open','wd-member-layout','menu-open',
      'client-menu-disabled','spa-admin-open'
    );
    [
      'wd-admin-embedded-layout',
      'wd-parent-embedded-layout',
      'wd-embedded-stabilizer-style',
      'wd-final-admin-autosize'
    ].forEach(id => doc.getElementById(id)?.remove());
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
        grid-template-columns:minmax(0,1fr)!important;overflow:visible!important;
      }
      html[data-embedded-admin="true"] .conteudo{
        box-sizing:border-box!important;width:100%!important;max-width:none!important;height:auto!important;
        min-height:0!important;margin:0!important;padding:28px clamp(22px,4vw,52px) 32px!important;
        background:transparent!important;overflow:visible!important;
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

    /* O app-shell antigo injeta min-height:100dvh inline com !important.
       Precisamos neutralizar diretamente no elemento, pois uma folha CSS não vence inline !important. */
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
        padding: mobile ? '16px 16px 24px' : '28px clamp(22px,4vw,52px) 32px'
      });
      content.style.setProperty('box-sizing', 'border-box', 'important');
      content.style.setProperty('width', '100%', 'important');
      content.style.setProperty('max-width', 'none', 'important');
      content.style.setProperty('background', 'transparent', 'important');
    }

    frame.setAttribute('scrolling', 'no');
    frame.style.setProperty('overflow', 'hidden', 'important');
    frame.style.setProperty('border', '0', 'important');
    frame.style.setProperty('min-height', '0', 'important');
    frame.style.setProperty('max-height', 'none', 'important');
    return doc;
  }

  function isMeasurable(element, view) {
    if (!(element instanceof view.HTMLElement)) return false;
    const style = view.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden' || style.position === 'fixed') return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function contentHeight(doc) {
    const view = doc.defaultView;
    const content = doc.querySelector('.conteudo') || doc.body;
    const origin = doc.body.getBoundingClientRect().top;
    let maxBottom = content.getBoundingClientRect().bottom;

    /* Mede o último ponto visual real. Não usa body.scrollHeight/root.scrollHeight,
       porque esses valores incluem min-height antigo e criavam centenas de pixels vazios. */
    content.querySelectorAll('*').forEach(element => {
      if (!isMeasurable(element, view)) return;
      const rect = element.getBoundingClientRect();
      maxBottom = Math.max(maxBottom, rect.bottom);
    });

    const measured = Math.ceil(maxBottom - origin + 2);
    const minimum = Math.ceil(content.getBoundingClientRect().height + content.getBoundingClientRect().top - origin);
    return Math.max(measured, minimum, 1);
  }

  function resize(frame) {
    const state = stateFor(frame);
    if (touching) { state.pending = true; return; }
    if (!frame.isConnected || frame.closest('[hidden]')) return;

    const doc = prepare(frame);
    if (!doc) return;

    const next = contentHeight(doc);
    if (!Number.isFinite(next) || next < 1) return;
    if (Math.abs(next - state.lastHeight) < 2) return;

    state.lastHeight = next;
    frame.style.setProperty('height', `${next}px`, 'important');

    const workspace = frame.closest('.unified-admin-workspace');
    if (workspace) {
      workspace.style.setProperty('height', 'auto', 'important');
      workspace.style.setProperty('min-height', '0', 'important');
      workspace.style.setProperty('overflow', 'visible', 'important');
      workspace.style.setProperty('padding-bottom', '0', 'important');
    }
  }

  function schedule(frame) {
    const state = stateFor(frame);
    if (state.raf) cancelAnimationFrame(state.raf);
    state.raf = requestAnimationFrame(() => {
      state.raf = 0;
      resize(frame);
    });
  }

  function connect(frame) {
    const doc = prepare(frame);
    if (!doc) return;

    const state = stateFor(frame);
    state.resizeObserver?.disconnect();
    state.mutationObserver?.disconnect();
    state.lastHeight = 0;

    state.resizeObserver = new ResizeObserver(() => schedule(frame));
    const content = doc.querySelector('.conteudo') || doc.body;
    state.resizeObserver.observe(content);

    state.mutationObserver = new MutationObserver(() => schedule(frame));
    state.mutationObserver.observe(content, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['class', 'hidden', 'open', 'style']
    });

    schedule(frame);
    setTimeout(() => schedule(frame), 120);
    setTimeout(() => schedule(frame), 500);
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

  new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });

  addEventListener('touchstart', () => { touching = true; }, { passive: true });
  const finishTouch = () => {
    touching = false;
    document.querySelectorAll(FRAME_SELECTOR).forEach(frame => {
      const state = stateFor(frame);
      if (state.pending) {
        state.pending = false;
        schedule(frame);
      }
    });
  };
  addEventListener('touchend', finishTouch, { passive: true });
  addEventListener('touchcancel', finishTouch, { passive: true });
  addEventListener('orientationchange', () => {
    setTimeout(() => document.querySelectorAll(FRAME_SELECTOR).forEach(schedule), 180);
  }, { passive: true });
  document.addEventListener('wd-theme-ready', () => {
    document.querySelectorAll(FRAME_SELECTOR).forEach(schedule);
  });

  scan();
})();
