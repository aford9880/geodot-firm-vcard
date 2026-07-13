import 'leaflet/dist/leaflet.css';
import '../scss/main.scss';

import { initPreloader } from './preloader.js';
import { initTicker } from './ticker.js';
import { initAnimations } from './animations.js';
import { initMagnetic } from './magnetic.js';
import { initCardsTilt } from './cards-tilt.js';
import { initFaq } from './faq.js';
import { initForm } from './form.js';
import { initCursorGlow } from './cursor.js';
import { initHeroMap } from './map.js';
import { initZones } from './zones.js';
import { initObjects } from './objects.js';
import { initCalculator } from './calculator.js';
import { initServices } from './sections.js';
import { track } from './analytics.js';

document.addEventListener('DOMContentLoaded', () => {
  initPreloader();
  initCursorGlow();
  initBurger();
  initMagnetic();
  initAnimations();
  initServices();
  initHeroMap();
  initTicker();
  initObjects();
  initZones();
  initCalculator();
  initFaq();
  initForm();
  initHeaderScroll();
  track('page_view', { path: location.pathname });
});

function initBurger() {
  const burger = document.querySelector('.burger');
  const navList = document.querySelector('.nav__list');
  if (!burger || !navList) return;

  burger.addEventListener('click', () => {
    const isOpen = navList.classList.toggle('nav__list--open');
    burger.classList.toggle('burger--active');
    burger.setAttribute('aria-expanded', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  document.querySelectorAll('.nav__link').forEach(link => {
    link.addEventListener('click', () => {
      navList.classList.remove('nav__list--open');
      burger.classList.remove('burger--active');
      burger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    });
  });
}

function initHeaderScroll() {
  const header = document.querySelector('.header');
  if (!header) return;
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 40);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}