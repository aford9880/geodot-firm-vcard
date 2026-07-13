// Прелоадер «калибровка тахеометра»: круговая юстировка + badge-статусы.
// Заменяет терминал-журнал из site1 (Б.2).

const BADGES = [
  { code: 'INIT',   text: 'gnss init',     ms: 230, state: 'wait' },
  { code: 'SEARCH', text: 'sat search …',  ms: 380, state: 'wait' },
  { code: 'GPS',    text: 'GPS LOCK',      ms: 320, state: 'ok'   },
  { code: 'RTK',    text: 'BASE + ROVER',  ms: 340, state: 'ok'   },
  { code: 'RMSE',   text: 'RMSE 0.012 м',  ms: 300, state: 'ok'   },
  { code: 'READY',  text: 'site ready',    ms: 260, state: 'ok'   }
];

export function initPreloader() {
  const log = document.getElementById('preloader-log');
  const bar = document.getElementById('preloader-bar');
  const preloader = document.getElementById('preloader');
  if (!log || !bar || !preloader) { document.body.classList.add('site--ready'); return; }

  let i = 0;
  const total = BADGES.length;
  const next = () => {
    if (i >= total) {
      bar.style.width = '100%';
      setTimeout(() => {
        preloader.classList.add('is-done');
        document.body.classList.add('site--ready');
        setTimeout(() => preloader.remove(), 450);
      }, 360);
      return;
    }
    const b = BADGES[i++];
    const el = document.createElement('div');
    el.className = `preloader__badge preloader__badge--${b.state}`;
    el.innerHTML =
      `<span class="preloader__badge-code">${b.code}</span>` +
      `<span class="preloader__badge-text">${b.text}</span>` +
      `<span class="preloader__badge-tick" aria-hidden="true"></span>`;
    log.appendChild(el);
    bar.style.width = Math.round((i / total) * 100) + '%';
    setTimeout(next, b.ms);
  };
  setTimeout(next, 160);
}
