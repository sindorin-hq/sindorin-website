const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const { runInNewContext } = require('node:vm');

const script = readFileSync(require('node:path').join(__dirname, '../assets/js/contact.js'), 'utf8');

function client(fetchImpl, values = {}) {
  const elements = Object.fromEntries(Object.entries({ fullname: 'Jake Stride', email: 'jake@example.com', phone: '', description: 'A decision to discuss', botcheck: '', ...values }).map(([name, value]) => [name, { value, setAttribute() {}, focus() {} }]));
  const error = { hidden: true };
  const errorMessage = {};
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
      if (selector === '[data-form-error-message]') return errorMessage;
      if (selector === 'button[type="submit"]') return button;
      return hints[selector] ||= { getAttribute: () => null };
    }
  };
  let calls = 0;
  const timers = new Map();
  runInNewContext(script, {
    document: { querySelector: (selector) => selector === '[data-enquiry-form]' ? form : thanks },
    FormData: class extends FormData {
      constructor(form) {
        super();
        for (const [name, field] of Object.entries(form.elements)) this.set(name, field.value);
      }
    },
    AbortController,
    setTimeout: (callback, delay) => { timers.set(callback, delay); return callback; },
    clearTimeout: (callback) => timers.delete(callback),
    fetch: (...args) => { calls++; return fetchImpl(...args); }
  });
  return { form, thanks, error, errorMessage, button, firstName, replyEmail, timers, submit: () => listeners.submit({ preventDefault() {} }), calls: () => calls };
}

const settle = () => new Promise((resolve) => setImmediate(resolve));

test('shows thanks only for a confirmed successful response using CORS', async () => {
  const state = client(async (url, options) => {
    assert.equal(url, 'https://do.sindorin.com/enquiry');
    assert.equal(options.mode, 'cors');
    assert.equal(options.headers.Accept, 'application/json');
    assert.ok(options.signal instanceof AbortSignal);
    assert.deepEqual(Object.fromEntries(options.body), { fullname: 'Jake Stride', email: 'jake@example.com', phone: '', description: 'A decision to discuss', botcheck: '' });
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
  assert.equal(state.timers.size, 0);
  assert.equal(state.form.noValidate, true);
});

test('keeps the form visible and enables retry after HTTP, network or invalid-response errors', async () => {
  for (const fetchImpl of [
    async () => ({ ok: false }),
    async () => { throw new TypeError('Network error'); },
    async () => ({ ok: true, json: async () => ({ ok: false }) }),
    async () => ({ ok: true, json: async () => null }),
    async () => ({ ok: true, json: async () => { throw new SyntaxError('Invalid JSON'); } })
  ]) {
    const state = client(fetchImpl);
    state.submit();
    await settle();
    assert.equal(state.form.hidden, false);
    assert.equal(state.thanks.hidden, true);
    assert.equal(state.error.hidden, false);
    assert.equal(state.button.disabled, false);
    assert.equal(state.form.elements.email.value, 'jake@example.com');
    assert.equal(state.timers.size, 0);
  }
});

test('shows worker validation and rate-limit messages as text and allows retry', async () => {
  let attempts = 0;
  const message = 'Please wait a minute before sending another enquiry. <script>not HTML</script>';
  const state = client(async () => {
    attempts++;
    return attempts === 1
      ? { ok: false, json: async () => ({ ok: false, error: message }) }
      : { ok: true, json: async () => ({ ok: true }) };
  });
  state.submit();
  await settle();
  assert.equal(state.errorMessage.textContent, message);
  assert.equal(state.thanks.hidden, true);
  state.submit();
  await settle();
  assert.equal(state.error.hidden, true);
  assert.equal(state.thanks.hidden, false);
  assert.equal(state.calls(), 2);
});

test('aborts a stalled request after 15 seconds and preserves the enquiry for retry', async () => {
  let signal;
  const state = client((url, options) => {
    signal = options.signal;
    return new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => reject(new DOMException('Timed out', 'AbortError')));
    });
  });
  state.submit();
  assert.equal(state.button.disabled, true);
  const [[expire, delay]] = state.timers;
  assert.equal(delay, 15000);
  expire();
  await settle();
  assert.equal(signal.aborted, true);
  assert.equal(state.button.disabled, false);
  assert.equal(state.error.hidden, false);
  assert.equal(state.thanks.hidden, true);
  assert.equal(state.form.elements.description.value, 'A decision to discuss');
  assert.equal(state.timers.size, 0);
});

test('rejects the same invalid field values as the worker before sending', () => {
  for (const values of [
    { fullname: ' ' }, { fullname: 'Jake\nBcc: other@example.com' }, { fullname: 'x'.repeat(201) },
    { email: 'jake@example.com;other@example.com' }, { email: 'jake@example.com,other@example.com' },
    { email: `${'x'.repeat(250)}@example.com` },
    { phone: '123\n456' }, { phone: '1'.repeat(101) },
    { description: '\t' }, { description: 'Hello\u0000world' }, { description: 'x'.repeat(10001) }
  ]) {
    const state = client(async () => { throw new Error('Unexpected request'); }, values);
    state.submit();
    assert.equal(state.calls(), 0, JSON.stringify(values).slice(0, 100));
    assert.equal(state.thanks.hidden, true);
    assert.equal(state.timers.size, 0);
  }
});

test('leaves native form submission and validation enabled without the required browser APIs', () => {
  const form = {};
  runInNewContext(script, { document: { querySelector: () => form } });
  assert.equal(form.noValidate, undefined);
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
