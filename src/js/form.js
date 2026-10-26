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

    const name = form.name.value.trim();
    const email = form.email.value.trim();

    // FormSubmit field conventions: keys become the labels in the email,
    // and _-prefixed keys are its control fields.
    const payload = {
      _subject: `Tattoo enquiry — ${name}`,
      _template: 'table',
      _captcha: 'false',
      _replyto: email,
      _autoresponse:
        "Kia ora, thank you for your enquiry — it's come through to Goldy. " +
        'She reads every message herself and will reply personally within the week. ' +
        "If you have any reference images, or anything that captures the feeling you're " +
        'after, just reply to this email with them. Everything is poked by hand, one ' +
        'client at a time, so things move at a gentle pace — thank you for your patience.\n\n' +
        'Ngā mihi,\nGoldy — Hāwea Flat, Wanaka',
      Name: name,
      Email: email,
      Phone: form.phone.value.trim() || '—',
      'Enquiring from': form.location.value.trim() || '—',
      'Flash or custom': form.enquiry.value,
      Placement: form.placement.value.trim() || '—',
      Size: form.size.value.trim() || '—',
      'Preferred date': form.preferred_date.value.trim() || '—',
      Design: form.design.value.trim() || '—',
      'Heard via': form.heard.value.trim() || '—',
    };

    try {
      const res = await fetch(CONFIG.formEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      // FormSubmit returns success as boolean true or the string "true"
      const ok = res.ok && (data.success === true || data.success === 'true');
      if (!ok) throw new Error(data.message || 'send-failed');

      form.hidden = true;
      success.hidden = false;
      success.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (err) {
      submit.disabled = false;
      submit.textContent = 'Send enquiry';
      note.classList.add('is-error');
      note.textContent =
        'That did not send. Please try again, or email handpoked.ttt@gmail.com directly.';
    }
  });
}
