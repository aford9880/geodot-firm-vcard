// Прелоадер с журналом загрузки в стиле term-вывода геодезиста.
const LINES = [
  { p: 'geomark$', t: 'init geodetic runtime…', ms: 220 },
  { p: '>', t: 'load GNSS calibration… OK', ms: 260 },
  { p: '>', t: 'mount leaflet@1.9 … OK', ms: 240 },
  { p: '>', t: 'parse zones.geojson (4 features)… OK', ms: 280 },
  { p: '>', t: 'warmup cartocdn dark tiles… OK', ms: 260 },
  { p: '>', t: 'bind handlers & reveal site', ms: 260 }
];

export function initPreloader() {
  const log = document.getElementById('preloader-log');
  const bar = document.getElementById('preloader-bar');
  const preloader = document.getElementById('preloader');
  if (!log || !bar || !preloader) { document.body.classList.add('site--ready'); return; }

  let i = 0, total = LINES.length;
  const next = () => {
    if (i >= total) {
      bar.style.width = '100%';
      setTimeout(() => {
        preloader.classList.add('is-done');
        document.body.classList.add('site--ready');
        setTimeout(() => preloader.remove(), 450);
      }, 320);
      return;
    }
    const line = LINES[i++];
    const el = document.createElement('div');
    el.className = 'preloader__line';
    el.innerHTML = `<span class="preloader__prompt">${line.p}</span><span class="preloader__text">${line.t}</span><span class="preloader__ok">✓</span>`;
    log.appendChild(el);
    const pct = Math.round((i / total) * 100);
    bar.style.width = pct + '%';
    setTimeout(next, line.ms);
  };
  setTimeout(next, 120);
}