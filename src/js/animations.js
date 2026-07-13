// Scroll-анимации через IntersectionObserver + счётчики чисел.
export function initAnimations() {
  const revealEls = document.querySelectorAll('.reveal');
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  revealEls.forEach(el => io.observe(el));

  const counters = document.querySelectorAll('[data-count]');
  const cio = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCount(entry.target);
        cio.unobserve(entry.target);
      }
    });
  }, { threshold: 0.4 });
  counters.forEach(el => cio.observe(el));
}

function animateCount(el) {
  const target = parseFloat(el.dataset.count);
  const dur = 1400;
  const start = performance.now();
  const fmt = (n) => target >= 1000 ? Math.round(n).toLocaleString('ru-RU') : String(Math.round(n));
  const tick = (now) => {
    const p = Math.min(1, (now - start) / dur);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = fmt(target * eased);
    if (p < 1) requestAnimationFrame(tick);
    else el.textContent = fmt(target);
  };
  requestAnimationFrame(tick);
}