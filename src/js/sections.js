import { SERVICES, ADVANTAGES, PROCESS, ICONS } from './data.js';
import { track } from './analytics.js';

export function initServices() {
  const grid = document.getElementById('services-grid');
  if (grid) {
    grid.innerHTML = SERVICES.map((s, i) => `
      <article class="service-card reveal" style="transition-delay:${i * 60}ms" data-id="${s.id}">
        <span class="service-card__index">0${i + 1}</span>
        <div class="service-card__icon">${ICONS[s.icon] || ''}</div>
        <h3 class="service-card__title">${s.title}</h3>
        <p class="service-card__desc">${s.desc}</p>
        <ul class="service-card__features">${s.features.map(f => `<li>${f}</li>`).join('')}</ul>
        <div class="service-card__price"><strong>${s.priceNote} ${s.priceFrom.toLocaleString('ru-RU')}</strong>${s.priceUnit}</div>
      </article>
    `).join('');

    grid.querySelectorAll('.service-card').forEach(card => {
      card.addEventListener('click', () => track('service_click', { id: card.dataset.id }));
    });
  }

  const adv = document.getElementById('advantages-grid');
  if (adv) {
    adv.innerHTML = ADVANTAGES.map((a, i) => `
      <div class="adv-card reveal" style="transition-delay:${i * 60}ms">
        <span class="adv-card__num">${a.num}</span>
        <div class="adv-card__icon" aria-hidden="true">${a.icon}</div>
        <h3 class="adv-card__title">${a.title}</h3>
        <p class="adv-card__desc">${a.desc}</p>
      </div>
    `).join('');
  }

  const timeline = document.getElementById('process-timeline');
  if (timeline) {
    timeline.innerHTML = PROCESS.map((p, i) => `
      <li class="step reveal" style="transition-delay:${i * 80}ms">
        <div class="step__dot">${i + 1}</div>
        <h3 class="step__title">${p.title}</h3>
        <p class="step__desc">${p.desc}</p>
      </li>
    `).join('');
  }
}