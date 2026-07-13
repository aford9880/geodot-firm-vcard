// «Прицел» — кнопки с crosshair-наведением.
// Заменяет магнитные кнопки из site1 (Б.2): при наведении точки прицела
// на элементе включается «захват» — угловые засечки + ведомый ретикл.
export function initCrosshairAim() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(pointer: fine)').matches;
  if (reduced || !fine) return;

  const els = document.querySelectorAll('.btn, .nav__link, .logo, .social-link, .obj-card__btn, .zone-toggle, .objects__filter, .calc__chip');

  els.forEach(el => {
    if (el.dataset.aimBound) return;
    el.dataset.aimBound = '1';

    let raf = 0;
    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      const rx = ((e.clientX - r.left) / r.width) * 100;
      const ry = ((e.clientY - r.top) / r.height) * 100;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.setProperty('--aim-x', rx + '%');
        el.style.setProperty('--aim-y', ry + '%');
      });
    };
    const onEnter = () => {
      el.classList.add('is-aimed');
      if (!el.querySelector(':scope > .aim-reticle')) {
        const ret = document.createElement('span');
        ret.className = 'aim-reticle';
        ret.setAttribute('aria-hidden', 'true');
        el.appendChild(ret);
      }
    };
    const onLeave = () => {
      el.classList.remove('is-aimed');
      cancelAnimationFrame(raf);
      const ret = el.querySelector(':scope > .aim-reticle');
      if (ret) ret.remove();
    };

    el.addEventListener('mouseenter', onEnter);
    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
  });
}
