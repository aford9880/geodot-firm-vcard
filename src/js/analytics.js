// Mock Google Analytics (gtag). В проде легко заменить на реальный GA4.
const QUEUE = [];
let _uid = localStorage.getItem('gt_uid') || (() => {
  const id = 'usr_' + Math.random().toString(36).slice(2, 10);
  localStorage.setItem('gt_uid', id);
  return id;
})();

export function track(event, params = {}) {
  const payload = { event, ts: Date.now(), uid: _uid, ...params };
  QUEUE.push(payload);
  if (window.gtag && typeof window.gtag === 'function') {
    window.gtag('event', event, payload);
  }
  if (import.meta.env?.DEV !== false) console.log('[analytics]', event, params);
}

// Имитация gtag для совместимости со сторонними сниппетами
window.gtag = window.gtag || function () { console.log('[gtag-mock]', ...arguments); };
window.dataLayer = window.dataLayer || [];
window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });