/* WD Founder — mantém apenas uma rolagem e ajusta o iframe à altura real. */
(() => {
  const observedFrames = new WeakSet();
  const frameState = new WeakMap();

  function schedule(frame) {
    const state = frameState.get(frame) || {};
    if (state.raf) cancelAnimationFrame(state.raf);
    state.raf = requestAnimationFrame(() => {
      state.raf = 0;
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
        html[data-embedded-admin="true"] textarea {
          resize:vertical;
        }
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
    return Math.max(
      body?.scrollHeight || 0,
      body?.offsetHeight || 0,
      root?.scrollHeight || 0,
      root?.offsetHeight || 0,
      painel?.scrollHeight || 0,
      painel?.offsetHeight || 0,
      conteudo?.scrollHeight || 0,
      conteudo?.offsetHeight || 0,
      1
    );
  }

  function resizeFrame(frame) {
    if (!frame?.isConnected || frame.closest('[hidden]')) return;
    const doc = prepareDocument(frame);
    if (!doc) return;

    frame.setAttribute('scrolling', 'no');
    frame.style.setProperty('overflow', 'hidden', 'important');
    frame.style.setProperty('height', '1px', 'important');

    const height = Math.ceil(contentHeight(doc) + 2);
    frame.style.setProperty('height', `${height}px`, 'important');
    frame.closest('.unified-admin-workspace')?.style.setProperty('height', 'auto', 'important');
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

      state.resizeObserver = new ResizeObserver(() => schedule(frame));
      state.resizeObserver.observe(doc.documentElement);
      state.resizeObserver.observe(doc.body);
      const conteudo = doc.querySelector('.conteudo');
      if (conteudo) state.resizeObserver.observe(conteudo);

      state.mutationObserver = new MutationObserver(() => schedule(frame));
      state.mutationObserver.observe(doc.body, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true
      });
      frameState.set(frame, state);

      schedule(frame);
      setTimeout(() => schedule(frame), 80);
      setTimeout(() => schedule(frame), 350);
      setTimeout(() => schedule(frame), 1000);
    };

    frame.addEventListener('load', connect);
    connect();
  }

  function scan() {
    document.querySelectorAll('.unified-admin-frame').forEach(watch);
  }

  new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });
  addEventListener('resize', () => document.querySelectorAll('.unified-admin-frame').forEach(schedule), { passive: true });
  addEventListener('orientationchange', () => setTimeout(() => document.querySelectorAll('.unified-admin-frame').forEach(schedule), 150), { passive: true });
  window.visualViewport?.addEventListener('resize', () => document.querySelectorAll('.unified-admin-frame').forEach(schedule), { passive: true });
  scan();
})();
