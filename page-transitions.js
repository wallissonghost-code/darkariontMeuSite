const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function finishEntry() {
  document.documentElement.classList.add('wd-transitions-ready');
  document.body.classList.remove('wd-page-leaving');
  document.body.classList.add('wd-page-enter');

  requestAnimationFrame(() => {
    document.body.classList.add('wd-page-visible');
    window.setTimeout(() => {
      document.body.classList.remove('wd-page-enter');
    }, REDUCED_MOTION ? 0 : 180);
  });
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
  if (url.origin !== location.origin) return false;
  if (url.pathname === location.pathname && url.search === location.search && url.hash) return false;
  return true;
}

function navigateWithTransition(url, link) {
  if (document.body.classList.contains('wd-page-leaving')) return;

  const isBottomNavigation = Boolean(link?.closest('.client-bottom-nav'));
  document.body.classList.add('wd-page-leaving');

  if (isBottomNavigation) {
    document.querySelectorAll('.client-bottom-nav a').forEach(item => item.classList.remove('ativo'));
    link.classList.add('ativo');
  }

  const delay = REDUCED_MOTION ? 0 : 45;
  window.setTimeout(() => location.assign(url), delay);
}

document.addEventListener('click', event => {
  const link = event.target.closest('a[href]');
  if (!isInternalNavigation(link, event)) return;
  event.preventDefault();
  navigateWithTransition(link.href, link);
}, true);

window.addEventListener('pageshow', () => {
  document.body.classList.remove('wd-page-leaving');
  document.body.classList.add('wd-page-visible');
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', finishEntry, { once: true });
} else {
  finishEntry();
}
