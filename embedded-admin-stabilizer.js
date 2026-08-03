/* Estabiliza ferramentas administrativas embutidas e elimina shells legados duplicados. */
(() => {
  const LEGACY_SELECTORS = [
    '.menu',
    '.wd-admin-sidebar',
    '.wd-admin-mobile-trigger',
    '.wd-admin-backdrop',
    '.wd-member-nav',
    '.client-bottom-nav',
    '.app-bottom-nav',
    '.mobile-menu-trigger',
    '.menu-backdrop'
  ].join(',');

  const observers = new WeakMap();

  function removeLegacyShell(doc) {
    doc.querySelectorAll(LEGACY_SELECTORS).forEach(element => element.remove());
    doc.body?.classList.remove(
      'wd-admin-layout',
      'wd-admin-menu-open',
      'wd-member-layout',
      'menu-open',
      'client-menu-disabled'
    );
  }

  function applyEmbeddedLayout(frame) {
    let doc;
    try {
      doc = frame.contentDocument;
    } catch {
      return;
    }
    if (!doc?.documentElement || !doc.body) return;

    doc.documentElement.dataset.embeddedAdmin = 'true';
    removeLegacyShell(doc);

    doc.documentElement.style.setProperty('margin', '0', 'important');
    doc.documentElement.style.setProperty('padding', '0', 'important');
    doc.documentElement.style.setProperty('min-height', '100%', 'important');
    doc.documentElement.style.setProperty('height', 'auto', 'important');

    doc.body.style.setProperty('margin', '0', 'important');
    doc.body.style.setProperty('padding', '0', 'important');
    doc.body.style.setProperty('min-height', '100%', 'important');
    doc.body.style.setProperty('height', 'auto', 'important');
    doc.body.style.setProperty('overflow-x', 'hidden', 'important');

    const painel = doc.querySelector('.painel');
    if (painel) {
      painel.style.setProperty('display', 'block', 'important');
      painel.style.setProperty('width', '100%', 'important');
      painel.style.setProperty('max-width', 'none', 'important');
      painel.style.setProperty('min-height', '100%', 'important');
      painel.style.setProperty('height', 'auto', 'important');
      painel.style.setProperty('margin', '0', 'important');
      painel.style.setProperty('padding', '0', 'important');
      painel.style.setProperty('background', 'transparent', 'important');
    }

    const conteudo = doc.querySelector('.conteudo');
    if (conteudo) {
      conteudo.style.setProperty('box-sizing', 'border-box', 'important');
      conteudo.style.setProperty('width', '100%', 'important');
      conteudo.style.setProperty('max-width', 'none', 'important');
      conteudo.style.setProperty('min-height', '100%', 'important');
      conteudo.style.setProperty('height', 'auto', 'important');
      conteudo.style.setProperty('margin', '0', 'important');
      conteudo.style.setProperty('background', 'transparent', 'important');
      conteudo.style.setProperty(
        'padding',
        matchMedia('(max-width: 768px)').matches ? '16px 16px 24px' : '28px clamp(22px,4vw,52px) 32px',
        'important'
      );
    }

    let style = doc.getElementById('wd-embedded-stabilizer-style');
    if (!style) {
      style = doc.createElement('style');
      style.id = 'wd-embedded-stabilizer-style';
      style.textContent = `
        html[data-embedded-admin="true"],
        html[data-embedded-admin="true"] body,
        html[data-embedded-admin="true"] .painel,
        html[data-embedded-admin="true"] .conteudo {
          background: transparent !important;
        }
        html[data-embedded-admin="true"] .menu,
        html[data-embedded-admin="true"] .wd-admin-sidebar,
        html[data-embedded-admin="true"] .wd-admin-mobile-trigger,
        html[data-embedded-admin="true"] .wd-admin-backdrop,
        html[data-embedded-admin="true"] .wd-member-nav,
        html[data-embedded-admin="true"] .client-bottom-nav,
        html[data-embedded-admin="true"] .app-bottom-nav,
        html[data-embedded-admin="true"] .mobile-menu-trigger,
        html[data-embedded-admin="true"] .menu-backdrop {
          display: none !important;
        }
        @media (max-width: 768px) {
          html[data-embedded-admin="true"] .conteudo {
            padding-bottom: 24px !important;
          }
        }
      `;
      doc.head.append(style);
    }

    if (!observers.has(doc)) {
      const observer = new MutationObserver(() => removeLegacyShell(doc));
      observer.observe(doc.body, { childList: true, subtree: true });
      observers.set(doc, observer);
    }
  }

  function watchFrame(frame) {
    if (!frame || frame.dataset.wdStabilized === 'true') return;
    frame.dataset.wdStabilized = 'true';
    const stabilize = () => {
      applyEmbeddedLayout(frame);
      requestAnimationFrame(() => applyEmbeddedLayout(frame));
      setTimeout(() => applyEmbeddedLayout(frame), 80);
      setTimeout(() => applyEmbeddedLayout(frame), 300);
    };
    frame.addEventListener('load', stabilize);
    stabilize();
  }

  function scan() {
    document.querySelectorAll('.unified-admin-frame').forEach(watchFrame);
  }

  new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });
  addEventListener('resize', scan, { passive: true });
  addEventListener('orientationchange', () => setTimeout(scan, 120), { passive: true });
  scan();
})();
