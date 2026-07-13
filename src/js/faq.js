import { FAQ } from './data.js';

export function initFaq() {
  const list = document.getElementById('faq-list');
  const search = document.getElementById('faq-search');
  if (list) {
    list.innerHTML = FAQ.map((f, i) => `
      <details class="faq__item reveal" role="listitem" data-search="${(f.q + ' ' + (f.search || '')).toLowerCase()}">
        <summary class="faq__question">${f.q} <span class="faq__mark" aria-hidden="true"></span></summary>
        <div class="faq__answer"><p>${f.a}</p></div>
      </details>
    `).join('');
  }

  if (search) {
    search.addEventListener('input', () => {
      const q = search.value.trim().toLowerCase();
      document.querySelectorAll('.faq__item').forEach(it => {
        const hay = it.dataset.search || '';
        it.style.display = !q || hay.includes(q) ? '' : 'none';
      });
    });
  }
}