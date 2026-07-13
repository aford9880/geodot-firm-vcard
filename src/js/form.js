import { track } from './analytics.js';

// Токены можно задать через .env (VITE_*) ИЛИ прямо тут (как в соседних проектах).
const TELEGRAM_BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN || 'YOUR_BOT_TOKEN';
const TELEGRAM_CHAT_ID = import.meta.env.VITE_TELEGRAM_CHAT_ID || 'YOUR_CHAT_ID';
const EMAIL_ENDPOINT = import.meta.env.VITE_EMAIL_ENDPOINT || '';

export function initForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  const fields = {
    name: document.getElementById('form-name'),
    phone: document.getElementById('form-phone'),
    work: document.getElementById('form-work'),
    address: document.getElementById('form-address'),
    area: document.getElementById('form-area'),
    consent: document.getElementById('form-consent')
  };
  const statusEl = document.getElementById('form-status');
  const submitBtn = document.getElementById('form-submit');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    let valid = true;
    const required = [fields.name, fields.phone, fields.work, fields.address];
    required.forEach(input => {
      const error = input.parentElement.querySelector('.form__error');
      if (!input.value.trim()) {
        input.classList.add('form__input--error');
        if (error) error.style.display = 'block';
        valid = false;
      } else {
        input.classList.remove('form__input--error');
        if (error) error.style.display = 'none';
      }
    });

    if (fields.phone.value.trim() && !validatePhone(fields.phone.value)) {
      fields.phone.classList.add('form__input--error');
      const error = fields.phone.parentElement.querySelector('.form__error');
      if (error) { error.textContent = 'Введите корректный телефон'; error.style.display = 'block'; }
      valid = false;
    }
    if (fields.consent && !fields.consent.checked) {
      showStatus('error', '❌ Нужно согласие на обработку персональных данных.');
      valid = false;
    }
    if (!valid) { track('form_invalid', {}); return; }

    const data = {
      name: fields.name.value.trim(),
      phone: fields.phone.value.trim(),
      work: fields.work.value.trim(),
      address: fields.address.value.trim(),
      area: fields.area.value ? `${fields.area.value.trim()} га` : '—',
      date: new Date().toLocaleString('ru-RU')
    };

    submitBtn.classList.add('is-loading');
    const label = submitBtn.querySelector('.btn__icon')?.nextSibling;
    showStatus('', 'Отправляем заявку…');

    try {
      await sendToTelegram(data);
      await sendToEmail(data);
      showStatus('success', '✅ Заявка принята! Перезвоним в течение 15 минут в рабочее время.');
      form.reset();
      track('form_submit_success', { work: data.work });
    } catch (err) {
      showStatus('error', '❌ Ошибка отправки. Напишите нам в Telegram или позвоните: +7 (495) 123-45-67.');
      track('form_submit_error', { message: String(err) });
    } finally {
      submitBtn.classList.remove('is-loading');
    }
  });

  Object.values(fields).forEach(input => {
    if (!input || input === fields.consent) return;
    input.addEventListener('input', () => {
      input.classList.remove('form__input--error');
      const error = input.parentElement.querySelector('.form__error');
      if (error) error.style.display = 'none';
    });
  });
}

function validatePhone(p) {
  const c = p.replace(/[\s\-()]/g, '');
  return /^\+?\d{10,15}$/.test(c) && c.replace(/\D/g, '').length >= 10;
}

async function sendToTelegram(data) {
  if (TELEGRAM_BOT_TOKEN === 'YOUR_BOT_TOKEN' || TELEGRAM_CHAT_ID === 'YOUR_CHAT_ID') {
    console.log('[Mock] Telegram send:', data);
    await wait(700);
    return;
  }
  const text = `◈ Новая заявка — ГеоТочка\n\n👤 ${data.name}\n📞 ${data.phone}\n🛠 ${data.work}\n📍 ${data.address}\n📐 ${data.area}\n🕐 ${data.date}`;
  const resp = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: 'HTML' })
  });
  if (!resp.ok) throw new Error('Telegram send failed');
}

async function sendToEmail(data) {
  if (!EMAIL_ENDPOINT) {
    console.log('[Mock] Email send:', { to: 'zakaz@geotochka.ru', ...data });
    await wait(600);
    return;
  }
  const resp = await fetch(EMAIL_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ subject: 'Заявка с сайта ГеоТочка', ...data })
  });
  if (!resp.ok) throw new Error('Email send failed');
}

function showStatus(type, message) {
  const statusEl = document.getElementById('form-status');
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.className = 'form__status';
  if (type) statusEl.classList.add(`form__status--${type}`);
  statusEl.hidden = !message;
}

const wait = (ms) => new Promise(r => setTimeout(r, ms));