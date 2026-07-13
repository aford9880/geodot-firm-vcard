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

// Процедурно рисуем «топо-фрагмент» карты для карточки объекта
function genTopo(o) {
  const [lat, lng] = o.coords;
  // детерминированный сдвиг позиции пина на 16:9 холсте
  const px = 50 + (lng - 37.6) * 8;
  const py = 60 + (55.7 - lat) * 12;
  const cx = Math.max(14, Math.min(86, px));
  const cy = Math.max(20, Math.min(80, py));
  const seed = Math.abs((lat * 1000 + lng) | 0) % 999;
  const rng = mulberry(seed);
  const lines = 5;
  let paths = '';
  for (let i = 0; i < lines; i++) {
    const y = 18 + i * 14;
    const a = 8 + rng() * 22, b = 60 + rng() * 40, c = 120 + rng() * 40, d = 190 + rng() * 28;
    paths += `<path d="M-10 ${y} C ${a} ${y - 8}, ${b} ${y + 6}, ${c} ${y - 4} S ${d} ${y + 4}, 260 ${y}" />`;
  }
  return `<svg viewBox="0 0 240 135" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
    ${paths}
    <circle class="pin-ring" cx="${cx}" cy="${cy}" r="10" />
    <circle class="pin-ring" cx="${cx}" cy="${cy}" r="5" />
    <path class="pin" d="M${cx} ${cy - 6} L${cx + 5} ${cy} L${cx} ${cy + 6} L${cx - 5} ${cy} Z" />
    <circle cx="${cx}" cy="${cy}" r="1.8" fill="#0b1418" />
  </svg>`;
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