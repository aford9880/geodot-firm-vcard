import { LIVE_BRIGADE } from './data.js';

// Ротация live-карточки бригады в hero.
export function initBrigadeCard() {
  const lc = {
    object: document.getElementById('lc-object'),
    task: document.getElementById('lc-task'),
    zone: document.getElementById('lc-zone'),
    status: document.getElementById('lc-status')
  };
  if (!lc.object) return;

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

  ['lc-object','lc-task','lc-zone','lc-status'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.transition = 'opacity 0.35s';
  });
}

// «Бортовой журнал бригад» — вертикальный live-фид с координатами,
// статусом и км от базы. Автопрокручиваемый список (Б.2).
export function initBrigadeFeed() {
  const feed = document.getElementById('fieldlog-brigades');
  if (!feed) return;

  const VISIBLE = 4;
  const INTERVAL = 3600;

  const statusClass = (s) => {
    if (/полев|закрепл|соглас/i.test(s)) return 'wip';
    if (/камерал/i.test(s)) return 'office';
    if (/сдач/i.test(s)) return 'done';
    return 'wip';
  };

  let idx = Math.floor(Math.random() * LIVE_BRIGADE.length);
  let tick = 1;

  const row = (b, n) => {
    const ago = `${n} мин`;
    return `
      <div class="brigade-row">
        <span class="brigade-row__pulse" aria-hidden="true"></span>
        <span class="brigade-row__obj">${b.object}</span>
        <span class="brigade-row__task">${b.task}</span>
        <span class="brigade-row__coord">${b.coords}</span>
        <span class="brigade-row__km">${b.km} км</span>
        <span class="brigade-row__status brigade-row__status--${statusClass(b.status)}">${b.status}</span>
        <span class="brigade-row__ago">${ago}</span>
      </div>`;
  };

  // Первичная заливка
  const seed = [];
  for (let i = VISIBLE - 1; i >= 0; i--) {
    const b = LIVE_BRIGADE[(idx - i + LIVE_BRIGADE.length) % LIVE_BRIGADE.length];
    seed.unshift(row(b, tick++));
  }
  feed.innerHTML = `<div class="brigade-feed__list" id="brigade-feed-list">${seed.join('')}</div>`;
  const list = document.getElementById('brigade-feed-list');

  const push = () => {
    idx = (idx + 1) % LIVE_BRIGADE.length;
    const b = LIVE_BRIGADE[idx];
    const tmp = document.createElement('div');
    tmp.innerHTML = row(b, 1);
    const el = tmp.firstElementChild;
    el.classList.add('brigade-row--in');
    list.prepend(el);
    // сдвигаем «ago» у существующих
    list.querySelectorAll('.brigade-row').forEach((r, i) => {
      if (i === 0) return;
      const agoEl = r.querySelector('.brigade-row__ago');
      if (agoEl) {
        const cur = parseInt(agoEl.textContent, 10) || 1;
        agoEl.textContent = (cur + Math.round(INTERVAL / 60000)) + ' мин';
      }
    });
    // удаляем лишние
    while (list.children.length > VISIBLE) {
      const last = list.lastElementChild;
      last.classList.add('brigade-row--out');
      setTimeout(() => last.remove(), 300);
      break;
    }
  };

  setInterval(push, INTERVAL);
}
