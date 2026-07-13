import L from 'leaflet';
import objects from '../data/objects.json';
import { makePin } from './map.js';
import { track } from './analytics.js';

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

let modalMap = null;
let modalMarker = null;

export function initObjects() {
  const grid = document.getElementById('objects-grid');
  const filtersEl = document.getElementById('objects-filters');
  if (!grid) return;

  // Уникальные типы работ для фильтра
  const types = ['Все', ...Array.from(new Set(objects.map(o => o.type)))];

  if (filtersEl) {
    filtersEl.innerHTML = types.map((t, i) =>
      `<li role="none"><button class="objects__filter${i === 0 ? ' is-active' : ''}" data-filter="${escapeAttr(t)}" role="tab">${escapeHtml(t)}</button></li>`
    ).join('');
    filtersEl.querySelectorAll('.objects__filter').forEach(btn => {
      btn.addEventListener('click', () => {
        filtersEl.querySelectorAll('.objects__filter').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        const f = btn.dataset.filter;
        render(grid, f === 'Все' ? null : f);
        track('object_filter', { filter: f });
      });
    });
  }

  render(grid, null);
  initModal();
}

function render(grid, filter) {
  const list = filter ? objects.filter(o => o.type === filter) : objects;
  grid.innerHTML = list.map((o, i) => {
    const isWip = o.status === 'В работе';
    return `
      <article class="obj-card reveal" style="transition-delay:${i * 50}ms" data-id="${o.id}">
        <div class="obj-card__topo">
          ${genTopo(o)}
          <span class="obj-card__coords">${fmt(o.coords)}</span>
          <span class="obj-card__status obj-card__status--${isWip ? 'wip' : 'done'}">${o.status}</span>
        </div>
        <div class="obj-card__body">
          <span class="obj-card__type">${o.type}</span>
          <h3 class="obj-card__title">${o.title}</h3>
          <p class="obj-card__loc">${o.location}</p>
          <p class="obj-card__result">${o.result}</p>
          <div class="obj-card__footer">
            <span class="obj-card__meta">${o.area} • ${o.date} • ${o.duration}</span>
            <button class="obj-card__btn" data-open="${o.id}">Показать на карте ⌖</button>
          </div>
        </div>
      </article>`;
  }).join('');

  grid.querySelectorAll('[data-open]').forEach(btn => {
    btn.addEventListener('click', () => openModal(btn.dataset.open));
  });
}

// Процедурно рисуем «топо-фрагмент» карты для карточки объекта.
// Диспетчер по категории рисует уникальную геометрию; пин-маркер и
// подпись координат — общие для всех (см. .obj-card__coords в разметке).
function genTopo(o) {
  const [lat, lng] = o.coords;
  const px = 50 + (lng - 37.6) * 8;
  const py = 60 + (55.7 - lat) * 12;
  const cx = Math.max(14, Math.min(86, px));
  const cy = Math.max(20, Math.min(80, py));
  const seed = Math.abs((lat * 1000 + lng) | 0) % 999;
  const rng = mulberry(seed);
  const cat = o.category || 'topo';
  let inner = '';
  switch (cat) {
    case 'cadastral': inner = genCadastral(rng); break;
    case 'linear':    inner = genLinear(rng); break;
    case 'staking':   inner = genStaking(rng, lat); break;
    case 'volumes':   inner = genVolumes(rng); break;
    default:          inner = genTopoRelief(rng);
  }
  return `<svg class="topo topo-${cat}" viewBox="0 0 240 135" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
    ${inner}
    <circle class="pin-ring" cx="${cx}" cy="${cy}" r="10" />
    <circle class="pin-ring" cx="${cx}" cy="${cy}" r="5" />
    <path class="pin" d="M${cx} ${cy - 6} L${cx + 5} ${cy} L${cx} ${cy + 6} L${cx - 5} ${cy} Z" />
    <circle cx="${cx}" cy="${cy}" r="1.8" fill="#0b1418" />
  </svg>`;
}

// Топосъёмка: горизонтали рельефа + сетка квадратов нивелирования с высотными отметками
function genTopoRelief(rng) {
  let s = '';
  const lines = 6;
  for (let i = 0; i < lines; i++) {
    const y = 16 + i * 13;
    const a = 10 + rng() * 30, b = 70 + rng() * 40, c = 130 + rng() * 40, d = 200 + rng() * 30;
    s += `<path class="topo-relief__contour" d="M-10 ${y} C ${a} ${y - 9}, ${b} ${y + 7}, ${c} ${y - 5} S ${d} ${y + 5}, 260 ${y}" />`;
  }
  // сетка квадратов нивелирования
  const step = 20, gx = 6, gy = 98, cols = 12, rows = 2;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = gx + c * step, y = gy + r * step;
      if (x > 232 || y > 130) continue;
      s += `<rect class="topo-relief__grid" x="${x}" y="${y}" width="${step}" height="${step}" />`;
    }
  }
  // высотные отметки на узлах сетки
  const marks = [[10, 104], [50, 104], [90, 104], [150, 104], [190, 104], [30, 124], [110, 124], [170, 124]];
  marks.forEach(([x, y], i) => {
    const h = 178 + i * 3 + Math.floor(rng() * 4);
    s += `<text class="topo-relief__mark" x="${x}" y="${y + 3}">${h}.${Math.floor(rng() * 9)}</text>`;
  });
  return s;
}

// Межевание / кадастр: четырёхугольник участка с межевыми знаками по углам + диагонали-привязки
function genCadastral(rng) {
  const pts = [
    [38 + rng() * 18, 26 + rng() * 14],
    [182 + rng() * 18, 22 + rng() * 14],
    [198 + rng() * 16, 98 + rng() * 16],
    [46 + rng() * 16, 108 + rng() * 12],
  ];
  const poly = pts.map(p => `${p[0]} ${p[1]}`).join(' ');
  let s = `<polygon class="topo-cadastral__plot" points="${poly}" />`;
  s += `<line class="topo-cadastral__tie" x1="${pts[0][0]}" y1="${pts[0][1]}" x2="${pts[2][0]}" y2="${pts[2][1]}" />`;
  s += `<line class="topo-cadastral__tie" x1="${pts[1][0]}" y1="${pts[1][1]}" x2="${pts[3][0]}" y2="${pts[3][1]}" />`;
  pts.forEach((p, i) => {
    s += `<rect class="topo-cadastral__mon" x="${p[0] - 3}" y="${p[1] - 3}" width="6" height="6" />`;
    s += `<text class="topo-cadastral__num" x="${p[0] + 6}" y="${p[1] - 4}">н${i + 1}</text>`;
  });
  return s;
}

// Линейный объект: трасса-полилиния с пикетами ПК0…ПК5 и поперечными сечениями
function genLinear(rng) {
  const pts = [[8, 70 + rng() * 10]];
  const n = 5;
  for (let i = 1; i <= n; i++) {
    pts.push([10 + i * (220 / n), 28 + rng() * 70]);
  }
  pts.push([232, 60 + rng() * 20]);
  const d = 'M' + pts.map(p => `${p[0]} ${p[1]}`).join(' L ');
  let s = `<path class="topo-linear__trace" d="${d}" />`;
  pts.forEach((p, i) => {
    if (i === 0 || i === pts.length - 1) return;
    s += `<line class="topo-linear__cross" x1="${p[0]}" y1="${p[1] - 11}" x2="${p[0]}" y2="${p[1] + 11}" />`;
    s += `<circle class="topo-linear__pk" cx="${p[0]}" cy="${p[1]}" r="2.4" />`;
    s += `<text class="topo-linear__label" x="${p[0] - 7}" y="${p[1] - 14}">ПК${i}</text>`;
  });
  return s;
}

// Вынос в натуру: крупный план угла участка — колышек, две стороны, засечка-привязка
function genStaking(rng, lat) {
  const corner = [62, 92];
  const dir1 = [222, 30 + rng() * 28];
  const dir2 = [72 + rng() * 30, 12];
  let s = '';
  s += `<line class="topo-staking__side" x1="${corner[0]}" y1="${corner[1]}" x2="${dir1[0]}" y2="${dir1[1]}" />`;
  s += `<line class="topo-staking__side" x1="${corner[0]}" y1="${corner[1]}" x2="${dir2[0]}" y2="${dir2[1]}" />`;
  const off = [corner[0] + 22, corner[1] - 22];
  s += `<line class="topo-staking__tie" x1="${corner[0]}" y1="${corner[1]}" x2="${off[0]}" y2="${off[1]}" />`;
  s += `<circle class="topo-staking__aux" cx="${off[0]}" cy="${off[1]}" r="2" />`;
  s += `<rect class="topo-staking__stake" x="${corner[0] - 3}" y="${corner[1] - 3}" width="6" height="6" />`;
  s += `<text class="topo-staking__coord" x="${corner[0] + 8}" y="${corner[1] + 4}">${(lat - 0.001).toFixed(5)}°N</text>`;
  return s;
}

// Объёмы (карьер): изолинии-контуры карьера + заливка выемки/насыпи + штриховка бортов
function genVolumes(rng) {
  const cx = 120, cy = 68;
  let s = '';
  s += `<ellipse class="topo-volumes__fill" cx="${cx}" cy="${cy}" rx="100" ry="54" />`;
  s += `<ellipse class="topo-volumes__cut" cx="${cx}" cy="${cy}" rx="80" ry="43" />`;
  for (let i = 0; i < 4; i++) {
    const rx = 26 + i * 16, ry = 14 + i * 9;
    s += `<ellipse class="topo-volumes__iso" cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" />`;
  }
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const x1 = cx + Math.cos(a) * 80, y1 = cy + Math.sin(a) * 43;
    const x2 = cx + Math.cos(a) * 94, y2 = cy + Math.sin(a) * 50;
    s += `<line class="topo-volumes__hatch" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" />`;
  }
  return s;
}

function mulberry(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t) >>> 0;
    return ((t >>> 0) % 1000) / 1000;
  };
}

function fmt([lat, lng]) {
  return `${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`;
}

// ---------- Modal ----------
function initModal() {
  const modal = document.getElementById('obj-modal');
  if (!modal) return;
  modal.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', closeModal));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.classList.contains('is-open')) closeModal(); });
}

function openModal(id) {
  const modal = document.getElementById('obj-modal');
  const obj = objects.find(o => o.id === id);
  if (!modal || !obj) return;

  document.getElementById('obj-modal-type').textContent = obj.type;
  document.getElementById('obj-modal-title').textContent = obj.title;
  document.getElementById('obj-modal-meta').textContent = `${obj.location} • ${obj.date}`;
  document.getElementById('obj-modal-area').textContent = obj.area;
  document.getElementById('obj-modal-duration').textContent = obj.duration;
  document.getElementById('obj-modal-status').textContent = obj.status;
  document.getElementById('obj-modal-result').textContent = obj.result;

  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  document.body.classList.add('modal-open');
  track('object_open', { id });

  // Инициализируем/переиспользуем карту в модалке
  setTimeout(() => renderModalMap(obj), 60);
}

function renderModalMap(obj) {
  const el = document.getElementById('obj-map');
  if (!el) return;
  if (modalMap) { modalMap.remove(); modalMap = null; modalMarker = null; }
  modalMap = L.map(el, { zoomControl: true, attributionControl: true, scrollWheelZoom: false }).setView(obj.coords, 14);
  L.tileLayer(TILE_URL, { attribution: '&copy; OpenStreetMap &copy; CARTO', subdomains: 'abcd', detectRetina: true }).addTo(modalMap);
  modalMarker = L.marker(obj.coords, { icon: makePin('#ff6b35') }).addTo(modalMap);
  modalMarker.bindPopup(
    `<div class="obj-popup"><div class="obj-popup__title">${escapeHtml(obj.title)}</div>
     <div class="obj-popup__meta">${escapeHtml(obj.type)} • ${escapeHtml(obj.location)}</div></div>`
  ).openPopup();
  modalMap.on('click', () => modalMap.scrollWheelZoom.enable());
  setTimeout(() => modalMap.invalidateSize(), 120);
}

function closeModal() {
  const modal = document.getElementById('obj-modal');
  if (!modal) return;
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  document.body.classList.remove('modal-open');
  if (modalMap) { modalMap.remove(); modalMap = null; modalMarker = null; }
}

function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
function escapeAttr(s) { return escapeHtml(s); }