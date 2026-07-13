import L from 'leaflet';
import zonesGeoRaw from '../data/zones.geojson?raw';
import { track } from './analytics.js';

const zonesGeo = JSON.parse(zonesGeoRaw);

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const TILE_ATTR = '&copy; OpenStreetMap &copy; CARTO';
const MOSCOW = [55.7558, 37.6173];

export function initHeroMap() {
  const el = document.getElementById('hero-map');
  if (!el) return;

  const map = L.map(el, {
    zoomControl: false,
    attributionControl: true,
    scrollWheelZoom: true,
    dragging: true,
    doubleClickZoom: true,
    boxZoom: false,
    keyboard: false
  }).setView(MOSCOW, 9);

  L.tileLayer(TILE_URL, { attribution: TILE_ATTR, subdomains: 'abcd', maxZoom: 19, detectRetina: true }).addTo(map);

  // Стиль зон — общий для всех карт
  const fc = zonesGeo;
  const layers = addZonesToMap(fc, map);

  // Кастомный «базовый» маркер — сама ГеоТочка
  L.marker(MOSCOW, { icon: makePin('#ff6b35') }).addTo(map)
    .bindPopup(`<div class="obj-popup"><div class="obj-popup__title">ГеоТочка — офис в Москве</div><div class="obj-popup__meta">Профсоюзная, 84 • выезд по РФ</div></div>`);

  // disable map scroll hijack until user interacts: сделаем так, что колёсико зумит карту только при Ctrl
  // (стандартный Leaflet scroll-wheel нужен для UX). Тач-устройства — drag.
  // Ограничим зум диапазоном:
  map.setMinZoom(7);
  map.setMaxZoom(17);
  map.fitBounds(getBoundsOfZones(fc), { padding: [40, 40] });

  // Поиск по координатам / адресу в hero
  initHeroSearch(map, fc, layers);

  // Лёгкое авто-вращение центра (параллакс по курсору) — если fine pointer
  initParallax(el, map);

  // После раскрытия—— инвалидируем размер (контейнер изначально мог быть нулевым)
  setTimeout(() => map.invalidateSize(), 300);
  window.addEventListener('resize', () => map.invalidateSize());

  el.addEventListener('click', () => track('hero_map_click'), { once: true });
}

function initHeroSearch(map, fc, layers) {
  const form = document.getElementById('hero-search');
  if (!form) return;
  const input = document.getElementById('hero-coords');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = (input.value || '').trim();
    if (!q) return;
    track('hero_search', { q });
    // Попытка распарсить координаты dd.d, dd.d или dd°mm'
    const coords = parseCoords(q);
    if (coords) {
      map.flyTo(coords, 14, { duration: 1.5 });
      const z = whichZone(fc, coords);
      L.popup({ className: 'zone-popup' })
        .setLatLng(coords)
        .setContent(zonePopupHTML(z || {
          name: 'Вне зон обслуживания',
          tier: 'rf',
          response: 'Командировка по РФ: 1–2 дня',
          price: 'Индивидуальный расчёт',
          color: '#ff6b35',
          desc: 'Точка вне базовых зон — оформим командировку.'
        }))
        .openOn(map);
      L.circleMarker(coords, { radius: 7, color: '#ff6b35', fillColor: '#ff6b35', fillOpacity: 0.6 }).addTo(map);
      return;
    }
    // Иначе — геокодирование через Nominatim OSM (только для кадастровых адресов в РФ)
    geocode(q).then(latlng => {
      if (!latlng) { alert('Не нашёл адрес — укажите точнее или координаты (широта, долгота).'); return; }
      map.flyTo(latlng, 14, { duration: 1.5 });
      const z = whichZone(fc, latlng);
      L.popup().setLatLng(latlng).setContent(z ? zonePopupHTML(z) : 'Точка вне базовых зон — командировка по РФ.').openOn(map);
    }).catch(() => alert('Сервис геокодирования временно недоступен.'));
  });
}

export function parseCoords(q) {
  const m = q.match(/(\d{1,3}[.,]\d+)\s*[,\s]+\s*(\d{1,3}[.,]\d+)/);
  if (!m) return null;
  const lat = parseFloat(m[1].replace(',', '.'));
  const lng = parseFloat(m[2].replace(',', '.'));
  if (lat > 90 || lat < -90 || lng > 180 || lng < -180) return null;
  return [lat, lng];
}

async function geocode(q) {
  const url = 'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=' + encodeURIComponent(q + ', Россия');
  try {
    const resp = await fetch(url, { headers: { 'Accept-Language': 'ru' } });
    const data = await resp.json();
    if (data && data[0]) return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
  } catch (e) {}
  return null;
}

export function whichZone(fc, [lat, lng]) {
  for (const f of fc.features) {
    if (pointInPolygon([lng, lat], f.geometry.coordinates[0])) return f.properties;
  }
  return null;
}

function pointInLatLngBounds(polygon, lat, lng) {
  return polygon.getBounds().contains(L.latLng(lat, lng));
}

function pointInPolygon(point, poly) {
  // ray casting. point = [lng,lat], poly = [[lng,lat]...]
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / ((yj - yi) || 1e-12) + xi)) inside = !inside;
  }
  return inside;
}

export function getBoundsOfZones(fc) {
  const bound = L.latLngBounds([]);
  (fc.features || []).forEach(f => {
    f.geometry.coordinates[0].forEach(([lng, lat]) => bound.extend([lat, lng]));
  });
  return bound;
}

export function addZonesToMap(fc, map) {
  const layers = [];
  L.geoJSON(fc, {
    style: feature => zoneStyle(feature.properties),
    onEachFeature: (feature, lyr) => {
      layers.push(lyr);
      lyr.bindPopup(zonePopupHTML(feature.properties), { className: 'zone-popup', maxWidth: 280 });
      lyr.on('mouseover', () => lyr.setStyle({ weight: 2.4, fillOpacity: 0.34 }));
      lyr.on('mouseout', () => lyr.setStyle(zoneStyle(feature.properties)));
    }
  }).addTo(map);
  return layers;
}

export function zoneStyle(p) {
  const c = p.color || '#2dd4a7';
  return { color: c, weight: 1.5, opacity: 0.9, fillColor: c, fillOpacity: 0.12, dashArray: '4 6', lineJoin: 'round' };
}

export function zonePopupHTML(p) {
  return `<div class="zone-popup" style="--zc:${p.color || '#2dd4a7'}">
    <div class="zone-popup__tag">${escapeHtml(p.response || 'Зона')}</div>
    <div class="zone-popup__title">${escapeHtml(p.name)}</div>
    <div class="zone-popup__row"><span>Реакция:</span><strong>${escapeHtml(p.response || '')}</strong></div>
    <div class="zone-popup__row"><span>Тариф:</span><strong>${escapeHtml(p.price || '—')}</strong></div>
    <div class="zone-popup__desc">${escapeHtml(p.desc || '')}</div>
    <a class="zone-popup__cta" href="#contact">Заказать выезд</a>
  </div>`;
}

export function makePin(color) {
  return L.divIcon({ className: 'geo-marker', html: '', iconSize: [22, 22], iconAnchor: [11, 22], popupAnchor: [0, -22] });
}

function initParallax(el, map) {
  const fine = window.matchMedia('(pointer: fine)').matches;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!fine || reduced) return;
  el.addEventListener('mousemove', (e) => {
    const r = el.getBoundingClientRect();
    const dx = (e.clientX - r.left) / r.width - 0.5;
    const dy = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty('--px', `${dx * -6}px`);
    el.style.setProperty('--py', `${dy * -6}px`);
  });
}

function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }