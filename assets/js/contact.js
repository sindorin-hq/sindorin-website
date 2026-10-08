/*
  Enquiry form: client-side validation and an inline thank-you after the Worker
  confirms the email was accepted. Without JS the Worker returns a confirmation page.
*/
(function () {
  'use strict';
  var form = document.querySelector('[data-enquiry-form]');
  if (!form) return;
  if (typeof fetch !== 'function' || typeof FormData !== 'function' || typeof AbortController !== 'function') return;
  var thanks = document.querySelector('[data-enquiry-thanks]');
  var errorBox = form.querySelector('[data-form-error]');
  var errorMessage = form.querySelector('[data-form-error-message]');
  var submit = form.querySelector('button[type="submit"]');
  var EMAIL = /^[^\s@<>(),;:\\"\[\]]+@[^\s@<>(),;:\\"\[\]]+\.[^\s@<>(),;:\\"\[\]]+$/;
  var CONTROL = /[\u0000-\u001f\u007f]/;
  var MESSAGES = {
    fullname: 'Please enter your name.',
    email: 'Please enter an email address we can reply to.',
    phone: 'Please enter a valid phone number.',
    description: 'Please describe the decision in a few lines.'
  };
  var tried = false;

  function value(name) { return form.elements[name].value.trim(); }

  function errors() {
    return {
      fullname: !value('fullname') || value('fullname').length > 200 || CONTROL.test(value('fullname')),
      email: !EMAIL.test(value('email')) || value('email').length > 254 || CONTROL.test(value('email')),
      phone: value('phone').length > 100 || CONTROL.test(value('phone')),
      description: !value('description') || value('description').length > 10000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value('description'))
    };
  }

  // Errors appear only after the first submit attempt, then update as the user types.
  function showHints() {
    var errs = errors();
    Object.keys(MESSAGES).forEach(function (name) {
      var hint = form.querySelector('[data-hint="' + name + '"]');
      hint.textContent = tried && errs[name] ? MESSAGES[name] : (hint.getAttribute('data-default') || '');
      form.elements[name].setAttribute('aria-invalid', tried && errs[name] ? 'true' : 'false');
    });
    return errs;
  }

  form.addEventListener('input', function () { if (tried) showHints(); });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (submit.disabled) return;
    tried = true;
    var errs = showHints();
    var firstInvalid = Object.keys(MESSAGES).filter(function (n) { return errs[n]; })[0];
    if (firstInvalid) { form.elements[firstInvalid].focus(); return; }

    var first = value('fullname').split(/\s+/)[0];
    var replyEmail = value('email');

    var done = function () {
      thanks.querySelector('[data-first-name]').textContent = first;
      thanks.querySelector('[data-reply-email]').textContent = replyEmail;
      form.hidden = true;
      thanks.hidden = false;
      thanks.focus();
    };

    // Honeypot: bots fill the hidden field. Pretend it worked and send nothing.
    if (form.elements.botcheck.value) { done(); return; }

    errorBox.hidden = true;
    submit.disabled = true;
    var controller = new AbortController();
    var timeout = setTimeout(function () { controller.abort(); }, 15000);
    fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' }, mode: 'cors', signal: controller.signal })
      .then(function (response) {
        return response.json().then(function (result) {
          if (!response.ok || !result || result.ok !== true) {
            var error = new Error('Enquiry submission was not confirmed.');
            error.userMessage = result && typeof result.error === 'string' ? result.error : '';
            throw error;
          }
          done();
        });
      })
      .catch(function (error) {
        errorMessage.textContent = error.userMessage || 'We could not confirm your enquiry was sent. Please try again.';
        errorBox.hidden = false;
      })
      .finally(function () { clearTimeout(timeout); submit.disabled = false; });
  });

  thanks.setAttribute('tabindex', '-1');
  thanks.querySelector('[data-enquiry-reset]').addEventListener('click', function () {
    form.reset();
    tried = false;
    showHints();
    thanks.hidden = true;
    form.hidden = false;
    form.elements.fullname.focus();
  });
  // Keep native validation when JavaScript is unavailable; show our inline hints when it is active.
  form.noValidate = true;
})();
