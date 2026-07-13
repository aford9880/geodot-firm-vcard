export function initCursorGlow() {
  const glow = document.querySelector('.cursor-glow');
  const dot = document.querySelector('.cursor-dot');
  if (!glow) return;

  const fine = window.matchMedia('(pointer: fine)').matches;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!fine || reduced) return;

  document.body.classList.add('has-custom-cursor');

  const HOVER_SEL = 'a, button, .btn, .nav__link, .calc__chip, .zone-toggle, .objects__filter, .faq__question, [data-cursor-hover], .leaflet-container, input, textarea, select, label';

  let mx = window.innerWidth / 2, my = window.innerHeight / 2;
  let hx = mx, hy = my, scale = 1, hideTimer = null;

  document.addEventListener('mousemove', (e) => {
    mx = e.clientX; my = e.clientY;
    if (dot) dot.style.transform = `translate(${mx}px, ${my}px)`;
    glow.classList.add('is-visible');
    if (dot) dot.classList.add('is-visible');
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      glow.classList.remove('is-visible');
      if (dot) dot.classList.remove('is-visible');
    }, 2800);
    const t = e.target.closest(HOVER_SEL);
    document.body.classList.toggle('cursor-hover', !!t);
  });

  document.addEventListener('mouseleave', () => {
    glow.classList.remove('is-visible');
    if (dot) dot.classList.remove('is-visible');
    document.body.classList.remove('cursor-hover');
  });

  const loop = () => {
    hx += (mx - hx) * 0.18;
    hy += (my - hy) * 0.18;
    const target = document.body.classList.contains('cursor-hover') ? 1.4 : 1;
    scale += (target - scale) * 0.15;
    glow.style.transform = `translate(${hx}px, ${hy}px) scale(${scale})`;
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}