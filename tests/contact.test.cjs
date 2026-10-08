const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const { runInNewContext } = require('node:vm');

const script = readFileSync(require('node:path').join(__dirname, '../assets/js/contact.js'), 'utf8');

function client(fetchImpl, values = {}) {
  const elements = Object.fromEntries(Object.entries({ fullname: 'Jake Stride', email: 'jake@example.com', phone: '', description: 'A decision to discuss', botcheck: '', ...values }).map(([name, value]) => [name, { value, setAttribute() {}, focus() {} }]));
  const error = { hidden: true };
  const button = { disabled: false };
  const firstName = {};
  const replyEmail = {};
  const hints = {};
  const listeners = {};
  const thanks = { hidden: true, setAttribute() {}, focus() {}, querySelector: (selector) => ({ '[data-first-name]': firstName, '[data-reply-email]': replyEmail, '[data-enquiry-reset]': { addEventListener() {} } })[selector] };
  const form = {
    hidden: false,
    action: 'https://do.sindorin.com/enquiry',
    elements,
    addEventListener: (name, callback) => { listeners[name] = callback; },
    querySelector: (selector) => {
      if (selector === '[data-form-error]') return error;
      if (selector === 'button[type="submit"]') return button;
      return hints[selector] ||= { getAttribute: () => null };
    }
  };
  let calls = 0;
  runInNewContext(script, {
    document: { querySelector: (selector) => selector === '[data-enquiry-form]' ? form : thanks },
    FormData: class { constructor() {} },
    fetch: (...args) => { calls++; return fetchImpl(...args); }
  });
  return { form, thanks, error, button, firstName, replyEmail, submit: () => listeners.submit({ preventDefault() {} }), calls: () => calls };
}

const settle = () => new Promise((resolve) => setImmediate(resolve));

test('shows thanks only for a confirmed successful response using CORS', async () => {
  const state = client(async (url, options) => {
    assert.equal(url, 'https://do.sindorin.com/enquiry');
    assert.equal(options.mode, 'cors');
    assert.equal(options.headers.Accept, 'application/json');
    return { ok: true, json: async () => ({ ok: true }) };
  });
  state.submit();
  assert.equal(state.thanks.hidden, true);
  assert.equal(state.button.disabled, true);
  state.form.elements.email.value = 'changed@example.com';
  state.submit();
  assert.equal(state.calls(), 1);
  await settle();
  assert.equal(state.form.hidden, true);
  assert.equal(state.thanks.hidden, false);
  assert.equal(state.firstName.textContent, 'Jake');
  assert.equal(state.replyEmail.textContent, 'jake@example.com');
  assert.equal(state.button.disabled, false);
});

test('keeps the form visible and enables retry after HTTP, network or invalid-response errors', async () => {
  for (const fetchImpl of [
    async () => ({ ok: false }),
    async () => { throw new TypeError('Network error'); },
    async () => ({ ok: true, json: async () => ({ ok: false }) }),
    async () => ({ ok: true, json: async () => { throw new SyntaxError('Invalid JSON'); } })
  ]) {
    const state = client(fetchImpl);
    state.submit();
    await settle();
    assert.equal(state.form.hidden, false);
    assert.equal(state.thanks.hidden, true);
    assert.equal(state.error.hidden, false);
    assert.equal(state.button.disabled, false);
  }
});

test('invalid fields and honeypot submissions do not send a request', () => {
  const invalid = client(async () => { throw new Error('Unexpected request'); }, { email: 'invalid' });
  invalid.submit();
  assert.equal(invalid.calls(), 0);
  assert.equal(invalid.thanks.hidden, true);
  const bot = client(async () => { throw new Error('Unexpected request'); }, { botcheck: 'spam' });
  bot.submit();
  assert.equal(bot.calls(), 0);
  assert.equal(bot.thanks.hidden, false);
});
