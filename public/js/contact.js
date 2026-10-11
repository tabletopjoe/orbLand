/** Contact / interest form dialog. Opened from the landing canvas CONTACT row via window.openContactForm(). */
(() => {
  const dialog = document.getElementById('contact-dialog');
  const form = document.getElementById('contact-form');
  if (!dialog || !form) return;

  const done = document.getElementById('contact-done');
  const status = document.getElementById('contact-status');
  const submitBtn = document.getElementById('contact-submit');
  let openedAt = 0;

  function setFieldErrors(fields = {}) {
    form.querySelectorAll('[data-error-for]').forEach((el) => {
      const name = el.getAttribute('data-error-for');
      const msg = fields[name] || '';
      el.textContent = msg;
      const input = form.elements.namedItem(name);
      if (input) input.toggleAttribute('aria-invalid', Boolean(msg));
    });
  }

  function setStatus(text, isError = false) {
    status.textContent = text;
    status.classList.toggle('contact-status--error', isError);
  }

  function clientErrors(data) {
    const errors = {};
    if (!data.name.trim()) errors.name = 'Please enter your name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) errors.email = 'Please enter a valid email address.';
    if (!data.message.trim()) errors.message = 'Please include a short message.';
    return errors;
  }

  function openContactForm() {
    if (dialog.open) return;
    if (!done.hidden) {
      form.reset();
      done.hidden = true;
      form.hidden = false;
    }
    setFieldErrors();
    setStatus('');
    openedAt = Date.now();
    dialog.showModal();
    form.elements.namedItem('name').focus();
  }

  function closeContactForm() {
    dialog.close();
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    const errors = clientErrors(data);
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      setStatus('');
      form.elements.namedItem(Object.keys(errors)[0]).focus();
      return;
    }

    submitBtn.disabled = true;
    setStatus('Sending…');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, elapsedMs: Date.now() - openedAt }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok || !result.ok) {
        setFieldErrors(result.fields);
        setStatus(result.error || 'Something went wrong sending your message.', true);
        return;
      }
      form.hidden = true;
      done.hidden = false;
      document.getElementById('contact-done-close').focus();
    } catch {
      setStatus('Could not reach the server. Please check your connection and try again.', true);
    } finally {
      submitBtn.disabled = false;
    }
  });

  document.getElementById('contact-close').addEventListener('click', closeContactForm);
  document.getElementById('contact-done-close').addEventListener('click', closeContactForm);

  // Click on the backdrop (outside the dialog box) closes it.
  dialog.addEventListener('click', (e) => {
    if (e.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    if (!inside) closeContactForm();
  });

  window.openContactForm = openContactForm;
})();
