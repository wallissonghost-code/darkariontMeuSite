const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function markReady() {
  document.documentElement.classList.add('wd-transitions-ready');
  document.body.classList.add('wd-page-visible');
}

function isInternalNavigation(link, event) {
  if (!link || link.dataset.noTransition === 'true') return false;
  if (event.defaultPrevented || event.button !== 0) return false;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  if (link.target && link.target !== '_self') return false;
  if (link.hasAttribute('download')) return false;

  const raw = link.getAttribute('href');
  if (!raw || raw.startsWith('#') || raw.startsWith('javascript:') || raw.startsWith('mailto:') || raw.startsWith('tel:')) return false;

  const url = new URL(link.href, location.href);
  return url.origin === location.origin;
}

// A troca acontece imediatamente. O navegador cuida da animação nativa
// entre documentos quando o recurso View Transitions está disponível.
document.addEventListener('click', event => {
  const link = event.target.closest('a[href]');
  if (!isInternalNavigation(link, event)) return;

  if (link.closest('.client-bottom-nav')) {
    document.querySelectorAll('.client-bottom-nav a').forEach(item => item.classList.remove('ativo'));
    link.classList.add('ativo');
  }
}, true);

window.addEventListener('pageshow', markReady);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', markReady, { once: true });
} else {
  markReady();
}

if (REDUCED_MOTION) {
  document.documentElement.classList.add('wd-reduced-motion');
}
