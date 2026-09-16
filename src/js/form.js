/* ---------------------------------------------------------------
   Enquiry form.

   Validation is client-side for feel only; the endpoint re-checks.
   Three spam filters, none of which a real person ever notices:
     1. honeypot field, off-screen
     2. time-to-submit floor (bots fill instantly)
     3. required, well-formed email
--------------------------------------------------------------- */

import { CONFIG } from './config.js';

const MIN_SECONDS = 3;

const form = document.getElementById('form');
const note = document.getElementById('formNote');
const submit = document.getElementById('submit');
const success = document.getElementById('success');
const started = document.getElementById('_started');

if (form) {
  started.value = String(Date.now());

  const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

  function setError(field, message) {
    const wrap = field.closest('.field');
    wrap.classList.add('is-invalid');
    let el = wrap.querySelector('.field__error');
    if (!el) {
      el = document.createElement('span');
      el.className = 'field__error';
      wrap.appendChild(el);
    }
    el.textContent = message;
  }

  function clearError(field) {
    const wrap = field.closest('.field');
    wrap.classList.remove('is-invalid');
    wrap.querySelector('.field__error')?.remove();
  }

  function validate() {
    let ok = true;
    const name = form.name;
    const email = form.email;
    const enquiry = form.enquiry;

    [name, email, enquiry].forEach(clearError);

    if (!name.value.trim()) {
      setError(name, 'Please add your name.');
      ok = false;
    }
    if (!emailOk(email.value)) {
      setError(email, 'A valid email is needed — it is how Goldy replies.');
      ok = false;
    }
    if (!enquiry.value) {
      setError(enquiry, 'Let her know which you are after.');
      ok = false;
    }
    return ok;
  }

  form.addEventListener('input', (e) => {
    if (e.target.closest('.field.is-invalid')) clearError(e.target);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    note.classList.remove('is-error');
    note.textContent = '';

    // 1. honeypot
    if (form.website.value) return;

    // 2. too fast to be human
    if (Date.now() - Number(started.value) < MIN_SECONDS * 1000) {
      note.textContent = 'Just a moment — take another look before sending.';
      note.classList.add('is-error');
      return;
    }

    if (!validate()) {
      note.textContent = 'A couple of fields need a look.';
      note.classList.add('is-error');
      return;
    }

    submit.disabled = true;
    submit.textContent = 'Sending…';

    const payload = {
      access_key: CONFIG.formAccessKey,
      subject: `Tattoo enquiry — ${form.name.value.trim()}`,
      from_name: 'Goldy Handpoked website',
      replyto: form.email.value.trim(),
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      phone: form.phone.value.trim() || '—',
      location: form.location.value.trim() || '—',
      enquiry: form.enquiry.value,
      placement: form.placement.value.trim() || '—',
      size: form.size.value.trim() || '—',
      preferred_date: form.preferred_date.value.trim() || '—',
      design: form.design.value.trim() || '—',
      heard: form.heard.value.trim() || '—',
    };

    try {
      if (!CONFIG.formAccessKey) throw new Error('no-key');

      const res = await fetch(CONFIG.formEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'send-failed');

      form.hidden = true;
      success.hidden = false;
      success.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (err) {
      submit.disabled = false;
      submit.textContent = 'Send enquiry';
      note.classList.add('is-error');
      note.textContent =
        err.message === 'no-key'
          ? 'Form not connected yet — add the Web3Forms key in src/js/config.js.'
          : 'That did not send. Please try again, or email handpoked.ttt@gmail.com directly.';
    }
  });
}
