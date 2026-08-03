/* WD Founder — iframe administrativo com altura estável e uma única rolagem. */
(() => {
  const observedFrames = new WeakSet();
  const frameState = new WeakMap();
  let userInteracting = false;
  let interactionTimer = 0;

  function markInteraction() {
    userInteracting = true;
    clearTimeout(interactionTimer);
    interactionTimer = setTimeout(() => {
      userInteracting = false;
      document.querySelectorAll('.unified-admin-frame').forEach(frame => schedule(frame, true));
    }, 180);
  }

  addEventListener('touchstart', markInteraction, { passive: true });
  addEventListener('touchmove', markInteraction, { passive: true });
  addEventListener('scroll', markInteraction, { passive: true });

  function schedule(frame, force = false) {
    const state = frameState.get(frame) || {};
    if (state.raf) cancelAnimationFrame(state.raf);
    state.raf = requestAnimationFrame(() => {
      state.raf = 0;
      if (userInteracting && !force) {
        state.pending = true;
        frameState.set(frame, state);
        return;
      }
      state.pending = false;
      resizeFrame(frame);
    });
    frameState.set(frame, state);
  }

  function prepareDocument(frame) {
    let doc;
    try { doc = frame.contentDocument; } catch { return null; }
    if (!doc?.documentElement || !doc.body) return null;

    let style = doc.getElementById('wd-final-admin-autosize');
    if (!style) {
      style = doc.createElement('style');
      style.id = 'wd-final-admin-autosize';
      style.textContent = `
        html[data-embedded-admin="true"],
        html[data-embedded-admin="true"] body,
        html[data-embedded-admin="true"] .painel,
        html[data-embedded-admin="true"] .conteudo {
          height:auto!important;
          min-height:0!important;
          max-height:none!important;
        }
        html[data-embedded-admin="true"],
        html[data-embedded-admin="true"] body {
          overflow:hidden!important;
          overscroll-behavior:none!important;
        }
        html[data-embedded-admin="true"] .conteudo {
          padding-bottom:24px!important;
        }
        html[data-embedded-admin="true"] textarea { resize:vertical; }
      `;
      doc.head.append(style);
    }

    doc.documentElement.dataset.embeddedAdmin = 'true';
    return doc;
  }

  function contentHeight(doc) {
    const body = doc.body;
    const root = doc.documentElement;
    const painel = doc.querySelector('.painel');
    const conteudo = doc.querySelector('.conteudo');
    const lastElement = conteudo?.lastElementChild || body?.lastElementChild;
    const lastBottom = lastElement?.getBoundingClientRect?.().bottom || 0;
    const bodyTop = body?.getBoundingClientRect?.().top || 0;

    return Math.ceil(Math.max(
      body?.scrollHeight || 0,
      root?.scrollHeight || 0,
      painel?.scrollHeight || 0,
      conteudo?.scrollHeight || 0,
      lastBottom - bodyTop + 24,
      1
    ));
  }

  function resizeFrame(frame) {
    if (!frame?.isConnected || frame.closest('[hidden]')) return;
    const doc = prepareDocument(frame);
    if (!doc) return;

    const state = frameState.get(frame) || {};
    const nextHeight = contentHeight(doc) + 2;
    const currentHeight = state.lastHeight || Math.round(frame.getBoundingClientRect().height) || 0;

    if (Math.abs(nextHeight - currentHeight) < 3) return;

    frame.setAttribute('scrolling', 'no');
    frame.style.setProperty('overflow', 'hidden', 'important');
    frame.style.setProperty('height', `${nextHeight}px`, 'important');
    frame.style.setProperty('overflow-anchor', 'none', 'important');
    frame.closest('.unified-admin-workspace')?.style.setProperty('height', 'auto', 'important');
    frame.closest('.unified-admin-workspace')?.style.setProperty('overflow-anchor', 'none', 'important');

    state.lastHeight = nextHeight;
    frameState.set(frame, state);
  }

  function watch(frame) {
    if (!frame || observedFrames.has(frame)) return;
    observedFrames.add(frame);

    const connect = () => {
      const doc = prepareDocument(frame);
      if (!doc) return;
      const state = frameState.get(frame) || {};
      state.resizeObserver?.disconnect();
      state.mutationObserver?.disconnect();
      state.lastHeight = 0;

      state.resizeObserver = new ResizeObserver(() => schedule(frame));
      const conteudo = doc.querySelector('.conteudo');
      state.resizeObserver.observe(conteudo || doc.body);

      state.mutationObserver = new MutationObserver(() => schedule(frame));
      state.mutationObserver.observe(doc.body, {
        childList: true,
        subtree: true,
        characterData: true
      });
      frameState.set(frame, state);

      schedule(frame, true);
      setTimeout(() => schedule(frame, true), 100);
      setTimeout(() => schedule(frame, true), 500);
    };

    frame.addEventListener('load', connect);
    connect();
  }

  function scan() {
    document.querySelectorAll('.unified-admin-frame').forEach(watch);
  }

  new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });
  addEventListener('resize', () => {
    if (userInteracting) return;
    document.querySelectorAll('.unified-admin-frame').forEach(frame => schedule(frame));
  }, { passive: true });
  addEventListener('orientationchange', () => setTimeout(() => {
    document.querySelectorAll('.unified-admin-frame').forEach(frame => schedule(frame, true));
  }, 220), { passive: true });
  scan();
})();
