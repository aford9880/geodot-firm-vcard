import { SERVICES, CALC_PRICING, CALC_ZONES, CALC_URGENCY } from './data.js';
import { track } from './analytics.js';

let state = { type: 'topo', qty: 1, urgency: 'normal', zone: 'moscow' };

export function initCalculator() {
  const typeEl = document.getElementById('calc-type');
  const areaEl = document.getElementById('calc-area');
  const areaVal = document.getElementById('calc-area-val');
  const urgEl = document.getElementById('calc-urgency');
  const zoneEl = document.getElementById('calc-zone');
  if (!typeEl || !areaEl || !urgEl || !zoneEl) return;

  typeEl.innerHTML = SERVICES.map(s =>
    `<button type="button" class="calc__chip${s.id === state.type ? ' is-active' : ''}" data-id="${s.id}">${s.title}</button>`
  ).join('');
  const urgNames = CALC_URGENCY.map(u =>
    `<button type="button" class="calc__chip${u.id === state.urgency ? ' is-active' : ''}" data-id="${u.id}">${u.name}</button>`
  ).join('');
  urgEl.innerHTML = urgNames;
  zoneEl.innerHTML = CALC_ZONES.map(z =>
    `<button type="button" class="calc__chip${z.id === state.zone ? ' is-active' : ''}" data-id="${z.id}">${z.name}</button>`
  ).join('');

  applySliderConfig();
  typeEl.querySelectorAll('.calc__chip').forEach(c => c.addEventListener('click', () => {
    typeEl.querySelectorAll('.calc__chip').forEach(x => x.classList.remove('is-active'));
    c.classList.add('is-active');
    state.type = c.dataset.id;
    applySliderConfig();
    recompute();
    track('calc_type', { id: state.type });
  }));
  urgEl.querySelectorAll('.calc__chip').forEach(c => c.addEventListener('click', () => {
    urgEl.querySelectorAll('.calc__chip').forEach(x => x.classList.remove('is-active'));
    c.classList.add('is-active');
    state.urgency = c.dataset.id;
    recompute();
  }));
  zoneEl.querySelectorAll('.calc__chip').forEach(c => c.addEventListener('click', () => {
    zoneEl.querySelectorAll('.calc__chip').forEach(x => x.classList.remove('is-active'));
    c.classList.add('is-active');
    state.zone = c.dataset.id;
    recompute();
  }));
  areaEl.addEventListener('input', () => {
    state.qty = parseFloat(areaEl.value);
    const v = document.getElementById('calc-area-val');
    if (v) v.textContent = formatQty(state.qty);
    recompute(false);
  });

  recompute();
}

function applySliderConfig() {
  const areaEl = document.getElementById('calc-area');
  const areaVal = document.getElementById('calc-area-val');
  const label = document.querySelector('.calc__slider-val');
  const m = CALC_PRICING[state.type];

  let cfg;
  if (m.mode === 'km') cfg = { min: 0.1, max: 20, step: 0.1, start: 1, unit: ' км' };
  else if (m.mode === 'item') cfg = { min: 1, max: 50, step: 1, start: 1, unit: ` ${m.unit}` };
  else if (m.mode === 'point') cfg = { min: 1, max: 200, step: 1, start: 5, unit: ` ${m.unit}` };
  else if (m.mode === 'visit') cfg = { min: 1, max: 10, step: 1, start: 1, unit: ` ${m.unit}` };
  else cfg = { min: 0.1, max: 100, step: 0.1, start: 1, unit: ' га' };

  areaEl.min = cfg.min; areaEl.max = cfg.max; areaEl.step = cfg.step;
  areaEl.value = cfg.start;
  state.qty = cfg.start;
  if (label) label.innerHTML = `<span id="calc-area-val">${formatQty(cfg.start)}</span>${cfg.unit}`;
  // сохранить unit для переиспользования в recompute
  state.unit = cfg.unit;
}

function formatQty(v) {
  if (Number.isInteger(v)) return String(v);
  return v.toFixed(1).replace('.', ',');
}

function recompute(trackEv = true) {
  const m = CALC_PRICING[state.type];
  const zone = CALC_ZONES.find(z => z.id === state.zone);
  const urg = CALC_URGENCY.find(u => u.id === state.urgency);

  let baseCost = m.base;
  let workLabel = 'Минимальная стоимость работ';
  if (m.mode === 'ha' || m.mode === 'km' || m.mode === 'point') {
    const per = m.mode === 'ha' ? m.perHa : (m.mode === 'km' ? m.perKm : m.perPoint);
    baseCost = m.base + per * state.qty;
    workLabel = m.mode === 'ha' ? `Топосъёмка ${state.qty} га` : (m.mode === 'km' ? `Подоснова ${state.qty} км` : `Вынос ${state.qty} точек`);
  } else if (m.mode === 'item') {
    if (state.qty > 1) { baseCost = m.base + m.perItem * (state.qty - 1); workLabel = `${state.qty} объекта`; }
    else workLabel = '1 объект';
  } else if (m.mode === 'visit') {
    if (state.qty > 1) { baseCost = m.base + m.perVisit * (state.qty - 1); workLabel = `${state.qty} выездов`; }
  }

  if (baseCost < m.min) baseCost = m.min;

  const zoneCost = baseCost * zone.coef;
  const total = zoneCost * urg.coef;
  const low = Math.round(total * 0.92), high = Math.round(total * 1.08);

  document.getElementById('calc-price').textContent = `${low.toLocaleString('ru-RU')} – ${high.toLocaleString('ru-RU')} ₽`;
  document.getElementById('calc-sub').textContent = `${SERVICES.find(s => s.id === state.type).title} • зона «${zone.name}» • ${urg.name.toLowerCase()}`;
  document.getElementById('calc-breakdown').innerHTML = `
    <li><span>Базовые работы</span><strong>${m.base.toLocaleString('ru-RU')} ₽</strong></li>
    <li><span>${workLabel}</span><strong>${Math.round(baseCost).toLocaleString('ru-RU')} ₽</strong></li>
    <li><span>Зона выезда (${zone.coef}×)</span><strong>${Math.round(zoneCost).toLocaleString('ru-RU')} ₽</strong></li>
    <li><span>Срочность (${urg.coef}×)</span><strong>${Math.round(total).toLocaleString('ru-RU')} ₽</strong></li>
  `;
  if (trackEv) track('calc_change', { ...state, total });
}