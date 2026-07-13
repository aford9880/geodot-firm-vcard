import { INSTRUMENTS, EQUIPMENT, FIELDLOG_PHASES, FIELDLOG_TABLE, ICONS } from './data.js';
import { track } from './analytics.js';

// ---------- INSTRUMENTS (бывший services) ----------
export function initInstruments() {
  const grid = document.getElementById('instruments-grid');
  if (!grid) return;

  grid.innerHTML = INSTRUMENTS.map((it, i) => `
    <article class="instr-card reveal" style="transition-delay:${i * 60}ms" data-id="${it.id}">
      <div class="instr-card__icon">${ICONS[it.icon] || ''}</div>
      <h3 class="instr-card__title">${it.title}</h3>
      <p class="instr-card__desc">${it.desc}</p>
      <ul class="instr-card__codes">${it.codes.map(c => `<li><code>${c}</code></li>`).join('')}</ul>
      <div class="instr-card__spec"><span>Точность</span><strong>${it.spec}</strong></div>
    </article>
  `).join('');

  grid.querySelectorAll('.instr-card').forEach(card => {
    card.addEventListener('click', () => track('instrument_click', { id: card.dataset.id }));
  });
}

// ---------- EQUIPMENT (бывший advantages) ----------
export function initEquipment() {
  const wrap = document.getElementById('equipment-grid');
  if (!wrap) return;

  const rows = EQUIPMENT.map((e, i) => `
    <div class="equip-row reveal" style="transition-delay:${i * 40}ms">
      <span class="equip-row__idx">${String(i + 1).padStart(2, '0')}</span>
      <span class="equip-row__model">${e.model}</span>
      <span class="equip-row__type">${e.type}</span>
      <span class="equip-row__acc">${e.acc}</span>
      <span class="equip-row__scope">${e.scope}</span>
    </div>
  `).join('');

  wrap.innerHTML = `
    <div class="equip-row equip-row--head">
      <span class="equip-row__idx">№</span>
      <span class="equip-row__model">Модель</span>
      <span class="equip-row__type">Тип</span>
      <span class="equip-row__acc">Точность</span>
      <span class="equip-row__scope">Назначение</span>
    </div>
    ${rows}
  `;
}

// ---------- FIELDLOG (бывший process + ticker) ----------
export function initFieldlog() {
  const phases = document.getElementById('fieldlog-phases');
  if (phases) {
    phases.innerHTML = FIELDLOG_PHASES.map((p, i) => `
      <li class="phase reveal" style="transition-delay:${i * 80}ms">
        <div class="phase__head">
          <code class="phase__code">${p.code}</code>
          <span class="phase__num">${i + 1}</span>
        </div>
        <h3 class="phase__title">${p.title}</h3>
        <p class="phase__desc">${p.desc}</p>
      </li>
    `).join('');
  }

  const table = document.getElementById('fieldlog-table');
  if (table) {
    table.innerHTML = `
      <div class="fieldlog__row fieldlog__row--head">
        <span>Пикет</span><span>Дата</span><span>Время</span><span>Ст.</span><span>Рейка</span><span>Работа</span>
      </div>
      ${FIELDLOG_TABLE.map(r => `
        <div class="fieldlog__row">
          <span class="fieldlog__pk">${r.pk}</span>
          <span>${r.date}</span>
          <span>${r.time}</span>
          <span>${r.st}</span>
          <span class="fieldlog__rod">${r.rod}</span>
          <span class="fieldlog__task">${r.task}</span>
        </div>
      `).join('')}
    `;
  }
}
