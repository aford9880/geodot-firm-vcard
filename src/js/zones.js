import L from 'leaflet';
import zonesGeoRaw from '../data/zones.geojson?raw';
import { zoneStyle, zonePopupHTML, makePin, getBoundsOfZones } from './map.js';
import { track } from './analytics.js';

const fc = JSON.parse(zonesGeoRaw);
const TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const RF_BBOX = [[51.0, 32.0], [69.0, 180.0]];

export function initZones() {
  const el = document.getElementById('zones-map');
  if (!el) return;

  const map = L.map(el, {
    zoomControl: true,
    attributionControl: true,
    scrollWheelZoom: true
  }).setView([55.6, 37.6], 8);

  L.tileLayer(TILE_URL, {
    attribution: '&copy; OpenStreetMap &copy; CARTO', subdomains: 'abcd', maxZoom: 18, detectRetina: true
  }).addTo(map);

  L.control.zoom({ position: 'topright' });

  const layerById = {};
  L.geoJSON(fc, {
    style: f => zoneStyle(f.properties),
    onEachFeature: (feature, lyr) => {
      lyr.bindPopup(zonePopupHTML(feature.properties), { className: 'zone-popup', maxWidth: 280 });
      lyr.on('mouseover', () => lyr.setStyle({ weight: 2.6, fillOpacity: 0.36 }));
      lyr.on('mouseout', () => lyr.setStyle(zoneStyle(feature.properties)));
      layerById[feature.properties.id] = { lyr, props: feature.properties };
    }
  }).addTo(map);

  map.fitBounds(getBoundsOfZones(fc), { padding: [30, 30] });
  setTimeout(() => map.invalidateSize(), 200);
  window.addEventListener('resize', () => map.invalidateSize());

  renderControls(map, layerById);

  // invalidate size when the section becomes visible (initial height could be 0)
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) map.invalidateSize(); });
  }, { threshold: 0.1 });
  io.observe(el);
}

function renderControls(map, layerById) {
  const wrap = document.getElementById('zones-controls');
  if (!wrap) return;

  const order = ['moscow', 'mo-near', 'mo-far', 'oblasti'];
  wrap.innerHTML = `
    <span class="zones__ctrl-title">Зоны выезда</span>
    ${order.map((id, i) => {
      const z = layerById[id];
      return `
        <label class="zone-toggle ${i === 0 ? 'is-active' : ''}" data-zone="${id}" style="--zc:${z.props.color}">
          <span class="zone-toggle__swatch"></span>
          <span>
            <span class="zone-toggle__name">${z.props.name}</span>
            <span class="zone-toggle__sub">${z.props.response}</span>
          </span>
          <input type="checkbox" ${i === 0 ? 'checked' : ''} />
        </label>`;
    }).join('')}
    <label class="zone-toggle" data-zone="rf" style="--zc:#3ba9d4">
      <span class="zone-toggle__swatch"></span>
      <span>
        <span class="zone-toggle__name">Выезд по РФ</span>
        <span class="zone-toggle__sub">Командировка: 1–2 дня + проезд</span>
      </span>
      <input type="checkbox" />
    </label>
    <p style="font-size:.78rem;color:var(--text-3,#5d7775);margin-top:8px;font-family:'JetBrains Mono',monospace">Кликните по зоне на карте — покажем тариф и время реакции.</p>
  `;

  wrap.querySelectorAll('.zone-toggle').forEach(toggle => {
    toggle.addEventListener('click', () => {
      const id = toggle.dataset.zone;
      wrap.querySelectorAll('.zone-toggle').forEach(t => t.classList.remove('is-active'));
      toggle.classList.add('is-active');
      track('zone_select', { id });

      Object.values(layerById).forEach(({ lyr }) => lyr.setStyle({ fillOpacity: id === 'rf' ? 0.04 : 0.12 }));

      if (id === 'rf') {
        map.flyToBounds(RF_BBOX, { padding: [20, 20], duration: 1.4 });
        L.popup({ className: 'zone-popup' })
          .setLatLng([55.5, 42.0])
          .setContent(zonePopupHTML({
            name: 'Выезд по всей России',
            response: 'Командировка: 1–2 дня на дорогу',
            price: 'Индивидуальный расчёт + проезд',
            color: '#3ba9d4',
            desc: 'Бригады работают в любом регионе. Согласуем разрешения, транспорт и проживание. Считаем по командировочному тарифу.'
          }))
          .openOn(map);
      } else {
        const { lyr, props } = layerById[id];
        map.flyToBounds(lyr.getBounds(), { padding: [40, 40], duration: 1.2 });
        lyr.openPopup(lyr.getBounds().getCenter());
      }
    });
  });
}