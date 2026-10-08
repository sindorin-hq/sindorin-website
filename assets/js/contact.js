/*
  Enquiry form: client-side validation and an inline thank-you after the Worker
  confirms the email was accepted. Without JS the Worker returns a confirmation page.
*/
(function () {
  'use strict';
  var form = document.querySelector('[data-enquiry-form]');
  if (!form) return;
  var thanks = document.querySelector('[data-enquiry-thanks]');
  var errorBox = form.querySelector('[data-form-error]');
  var submit = form.querySelector('button[type="submit"]');
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var MESSAGES = {
    fullname: 'Please enter your name.',
    email: 'Please enter an email address we can reply to.',
    description: 'Please describe the decision in a few lines.'
  };
  var tried = false;

  function value(name) { return form.elements[name].value.trim(); }

  function errors() {
    return {
      fullname: !value('fullname'),
      email: !EMAIL.test(value('email')),
      description: !value('description')
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
    fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' }, mode: 'cors' })
      .then(function (response) {
        if (!response.ok) throw new Error('Enquiry submission failed.');
        return response.json();
      })
      .then(function (result) {
        if (result.ok !== true) throw new Error('Enquiry submission was not confirmed.');
        done();
      })
      .catch(function () { errorBox.hidden = false; })
      .then(function () { submit.disabled = false; });
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
})();
