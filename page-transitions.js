const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const PAGE_KEY = 'wd-page-transition';

function ensureCurtain() {
  let curtain = document.querySelector('.wd-page-curtain');
  if (!curtain) {
    curtain = document.createElement('div');
    curtain.className = 'wd-page-curtain';
    curtain.setAttribute('aria-hidden', 'true');
    document.body.append(curtain);
  }
  return curtain;
}

function finishEntry() {
  ensureCurtain();
  document.documentElement.classList.add('wd-transitions-ready');
  document.body.classList.add('wd-page-enter');
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.body.classList.add('wd-page-visible');
      window.setTimeout(() => {
        document.body.classList.remove('wd-page-enter');
      }, REDUCED_MOTION ? 0 : 460);
    });
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

function navigateWithTransition(url) {
  if (document.body.classList.contains('wd-page-leaving')) return;
  sessionStorage.setItem(PAGE_KEY, String(Date.now()));
  document.body.classList.add('wd-page-leaving');
  document.body.classList.remove('wd-page-visible');
  const delay = REDUCED_MOTION ? 0 : 260;
  window.setTimeout(() => location.assign(url), delay);
}

document.addEventListener('click', event => {
  const link = event.target.closest('a[href]');
  if (!isInternalNavigation(link, event)) return;
  event.preventDefault();
  navigateWithTransition(link.href);
}, true);

window.addEventListener('pageshow', event => {
  if (event.persisted) {
    document.body.classList.remove('wd-page-leaving');
    document.body.classList.add('wd-page-visible');
  }
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', finishEntry, { once: true });
} else {
  finishEntry();
}
