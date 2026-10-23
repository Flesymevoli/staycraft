// Opt-in integration test: real model, fictional in-memory business data only.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {parseEnv} = require('node:util');

if (require.main !== module) {
  assert.equal(process.env.RUN_PAID_MODEL_TEST, '1');
  assert.equal(process.env.STAYCRAFT_QA_AUTH_FIXTURES, '1');
  assert.equal(process.env.STAYCRAFT_QA_FORMAL_STAYS, '1');
  assert.equal(process.env.STAYCRAFT_OPERATOR_SAMPLE, '0');
  assert(process.argv.includes('127.0.0.1'));
  const fixtureFetch = globalThis.fetch;
  const provider = new URL(process.env.MODEL_BASE_URL);
  let calls = 0;
  globalThis.fetch = async (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    if (url.hostname === 'husrpqalpjjswpvrkxet.supabase.co') return fixtureFetch(input, init);
    if (['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) return fixtureFetch(input, init);
    assert.equal(url.origin, provider.origin, 'Unexpected external destination');
    assert.equal(url.pathname, provider.pathname.replace(/\/$/, '') + '/chat/completions');
    assert(++calls <= 2, 'Two-call live integration budget exceeded');
    console.log('QA_LIVE_MODEL_REQUEST');
    return fixtureFetch(input, init);
  };
} else {
  main().catch(() => { console.error('Live workspace test failed; credentials and provider response not logged.'); process.exitCode = 1; });
}

async function main() {
  assert.equal(process.env.RUN_PAID_MODEL_TEST, '1', 'Requires RUN_PAID_MODEL_TEST=1');
  const config = parseEnv(fs.readFileSync(process.env.STAYCRAFT_MODEL_ENV || path.resolve('../backend/.env'), 'utf8'));
  for (const key of ['MODEL_BASE_URL', 'MODEL_NAME', 'MODEL_API_KEY']) assert(config[key], 'Missing test provider configuration');
  const provider = new URL(config.MODEL_BASE_URL);
  assert.equal(provider.protocol, 'https:');
  assert(!provider.username && !provider.password);
  const {spawn} = require('node:child_process');
  const {chromium} = require('./qa-browser.cjs');
  const child = spawn(process.execPath, ['--require', path.resolve('scripts/qa-workspace-fixture.cjs'), '--require', __filename,
    'node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3104'], {
    env: {...process.env, RUN_PAID_MODEL_TEST: '1', STAYCRAFT_QA_AUTH_FIXTURES: '1', STAYCRAFT_QA_FORMAL_STAYS: '1', STAYCRAFT_OPERATOR_SAMPLE: '0',
      HOMESTAY_LOCAL_DATA: '0', STAYCRAFT_HOSTED: '0', VERCEL: '0', FORMAL_AUTO_REPLY_ENABLED: '1', FORMAL_MODEL_ENABLED: '1', MODEL_ENABLED: '1',
      MODEL_BASE_URL: config.MODEL_BASE_URL, MODEL_NAME: config.MODEL_NAME, MODEL_API_KEY: config.MODEL_API_KEY,
      NEXT_PUBLIC_SUPABASE_URL: 'https://husrpqalpjjswpvrkxet.supabase.co', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_release_fixture_only'},
    stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
  });
  let output = '', browser;
  child.stdout.on('data', data => { output += data; });
  child.stderr.on('data', () => {});
  try {
    await new Promise((resolve, reject) => {
      const timer = setInterval(() => { if (output.includes('Ready in')) { clearInterval(timer); resolve(); } }, 100);
      child.once('exit', () => { clearInterval(timer); reject(new Error('Isolated server stopped')); });
      setTimeout(() => { clearInterval(timer); reject(new Error('Isolated server startup timeout')); }, 20000).unref();
    });
    browser = await chromium.launch();
    const owner = await browser.newContext({viewport: {width: 390, height: 844}});
    const base = 'http://127.0.0.1:3104', id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', property = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
    const enc = value => Buffer.from(JSON.stringify(value)).toString('base64url');
    const token = `${enc({alg: 'HS256', typ: 'JWT'})}.${enc({sub: id, exp: 4102444800, iat: 1700000000, aud: 'authenticated', role: 'authenticated'})}.qa-signature`;
    await owner.addCookies([{name: 'sb-husrpqalpjjswpvrkxet-auth-token', url: base, value: 'base64-' + enc({access_token: token, refresh_token: 'qa', expires_at: 4102444800, expires_in: 3600, token_type: 'bearer', user: {id}})}]);
    const page = await owner.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base + '/app/work');
    const toggle = page.getByRole('switch', {name: '自动回复', exact: true});
    await toggle.waitFor();
    assert.equal(await toggle.getAttribute('aria-checked'), 'false');
    await toggle.click();
    await page.waitForFunction(() => document.querySelector('[role=switch]')?.getAttribute('aria-checked') === 'true');
    const guest = await browser.newContext();
    const session = await guest.request.post(base + '/api/guest', {headers: {Origin: base}, data: {property, action: 'session'}});
    assert.equal(session.status(), 200);
    const response = await guest.request.post(base + '/api/guest', {headers: {Origin: base}, data: {
      property, action: 'message', body: '早晨用餐一般从什么时刻供应呀？', requestId: require('node:crypto').randomUUID(),
    }});
    assert.equal(response.status(), 200);
    const thread = await response.json();
    assert.equal(thread.messages.at(-1).automatic, true);
    assert.match(thread.messages.at(-1).body, /^早餐时间：/);
    const state = await (await page.request.get(base + '/api/workspace/automation')).json();
    assert(state.events.some(event => event.engine === 'model_v1' && event.state === 'replied'));
    await page.goto(base + '/app/messages/' + thread.id);
    await page.locator('.cloud-message small').filter({hasText: '自动回复'}).first().waitFor();
    console.log('PASS real classifier -> fictional guest reply -> operator conversation and audit');
    await page.goto(base + '/app/analysis');
    const button = page.getByRole('button', {name: '梳理重点与行动', exact: true});
    await button.waitFor();
    const answerResponse = page.waitForResponse(response => response.url().endsWith('/api/workspace/assistant') && response.request().method() === 'POST');
    await button.click();
    const answer = await (await answerResponse).json();
    assert.equal(answer.engine, 'model_v1');
    assert.equal(answer.fallback, false);
    assert(answer.items.length >= 2);
    await page.getByText('AI 辅助重点梳理', {exact: true}).waitFor();
    assert.deepEqual(errors, []);
    assert.equal((output.match(/QA_LIVE_MODEL_REQUEST/g) || []).length, 2);
    console.log('PASS real priority model -> existing analysis card; two calls, fictional data only');
    await guest.close();
  } finally {
    if (browser) await browser.close();
    child.kill();
  }
}
