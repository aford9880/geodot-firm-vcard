// «Облако точек» при hover — карточка параллаксит как 3D-модель рельефа.
// Заменяет 3D-наклон из site1 (Б.2).
export function initPointcloud() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(pointer: fine)').matches;
  if (reduced || !fine) return;

  const cards = document.querySelectorAll('.instr-card');
  const N = 26; // точек в облаке

  cards.forEach(card => {
    let raf = 0;
    const onEnter = () => {
      if (card.querySelector('.pointcloud')) return;
      const cloud = document.createElement('div');
      cloud.className = 'pointcloud';
      let pts = '';
      for (let i = 0; i < N; i++) {
        const x = (Math.random() * 100).toFixed(2);
        const y = (Math.random() * 100).toFixed(2);
        const z = (0.2 + Math.random() * 0.9).toFixed(2); // глубина → сила параллакса
        const s = (1 + Math.random() * 2).toFixed(1);     // размер точки
        pts += `<i class="pointcloud__pt" style="left:${x}%;top:${y}%;--z:${z};--s:${s}px"></i>`;
      }
      cloud.innerHTML = pts;
      card.appendChild(cloud);
    };
    const onMove = (e) => {
      const r = card.getBoundingClientRect();
      const dx = (e.clientX - r.left - r.width / 2) / r.width;
      const dy = (e.clientY - r.top - r.height / 2) / r.height;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        card.style.setProperty('--pc-x', dx.toFixed(3));
        card.style.setProperty('--pc-y', dy.toFixed(3));
      });
    };
    const onLeave = () => {
      cancelAnimationFrame(raf);
      const cloud = card.querySelector('.pointcloud');
      if (cloud) {
        cloud.classList.add('is-out');
        setTimeout(() => cloud.remove(), 260);
      }
    };

    card.addEventListener('mouseenter', onEnter);
    card.addEventListener('mousemove', onMove);
    card.addEventListener('mouseleave', onLeave);
  });
}
