// Магнитные кнопки — притягиваются к курсору.
export function initMagnetic() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(pointer: fine)').matches;
  if (reduced || !fine) return;

  const els = document.querySelectorAll('.btn, .nav__link, .logo, .social-link');
  const STRONG = 0.32, RADIUS = 90;
  els.forEach(el => {
    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const dx = e.clientX - cx, dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy);
      if (dist > RADIUS) { el.style.transform = ''; return; }
      el.style.transform = `translate(${dx * STRONG}px, ${dy * STRONG}px)`;
    });
    el.addEventListener('mouseleave', () => { el.style.transform = ''; });
  });
}