import { TICKER_EVENTS, LIVE_BRIGADE } from './data.js';

// Зацикленный тикер «журналов последних работ» + ротация live-карточки бригады.
export function initTicker() {
  const listEl = document.getElementById('ticker-list');
  if (listEl) {
    const items = [...TICKER_EVENTS, ...TICKER_EVENTS];
    listEl.innerHTML = items.map(e =>
      `<li class="ticker__item"><strong>${e.task}</strong> ${e.spot} — ${e.loc} <span class="ticker__time">${e.ago} назад</span></li>`
    ).join('');
  }

  const lc = {
    object: document.getElementById('lc-object'),
    task: document.getElementById('lc-task'),
    zone: document.getElementById('lc-zone'),
    status: document.getElementById('lc-status')
  };
  if (lc.object) {
    let idx = Math.floor(Math.random() * LIVE_BRIGADE.length);
    const render = () => {
      const b = LIVE_BRIGADE[idx % LIVE_BRIGADE.length];
      const fadeOut = () => Object.values(lc).forEach(el => el && (el.style.opacity = '0'));
      const fadeIn = () => Object.values(lc).forEach(el => el && (el.style.opacity = '1'));
      fadeOut();
      setTimeout(() => {
        lc.object.textContent = b.object;
        lc.task.textContent = b.task;
        lc.zone.textContent = b.zone;
        lc.status.textContent = b.status;
        fadeIn();
      }, 380);
    };
    render();
    setInterval(() => { idx++; render(); }, 4200);
  }

  // Плавное появление — добавим base-переход
  ['lc-object','lc-task','lc-zone','lc-status'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.transition = 'opacity 0.35s';
  });
}