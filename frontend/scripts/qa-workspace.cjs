const { chromium } = require('C:/Users/86299/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const { spawn } = require('node:child_process');
const path = require('node:path');
const assert = require('node:assert/strict');
const port = 3104;
const base = `http://127.0.0.1:${port}`;
const ids = ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'];
const cookie = index => {
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const access_token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: ids[index], exp: 4102444800, iat: 1700000000, aud: 'authenticated', role: 'authenticated' })}.qa-signature`;
  return { name: 'sb-husrpqalpjjswpvrkxet-auth-token', value: 'base64-' + encode({ access_token, refresh_token: 'qa-refresh', expires_at: 4102444800, expires_in: 3600, token_type: 'bearer', user: { id: ids[index] } }), url: base };
};

(async () => {
  const child = spawn(process.execPath, ['--require', path.resolve('scripts/qa-workspace-fixture.cjs'), 'node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', String(port)], { env: { ...process.env, STAYCRAFT_QA_AUTH_FIXTURES: '1', HOMESTAY_LOCAL_DATA: '0' }, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = ''; child.stdout.on('data', chunk => { output += chunk; }); child.stderr.on('data', chunk => { output += chunk; });
  let browser;
  try {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => { clearInterval(poll); reject(new Error(output || 'QA server timeout')); }, 15000);
      const poll = setInterval(() => { if (output.includes('Ready in')) { clearTimeout(timeout); clearInterval(poll); resolve(); } }, 100);
      child.once('exit', code => { if (code) { clearTimeout(timeout); clearInterval(poll); reject(new Error(output)); } });
    });
    browser = await chromium.launch();
    const anonymous = await browser.newPage();
    for (const route of ['/app', '/app/work', '/app/analysis', '/app/explore', '/app/mine']) {
      await anonymous.goto(base + route); await anonymous.waitForURL('**/login');
    }
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.addCookies([cookie(0)]);
    const page = await context.newPage();
    const localRequests = [];
    page.on('request', req => { if (/\/api\/(local|demo)\//.test(req.url())) localRequests.push(req.url()); });
    await page.addInitScript(() => { sessionStorage.setItem('homestay-demo:property', JSON.stringify({ name: 'LEAKED SAMPLE PROPERTY' })); });
    await page.goto(base + '/app');
    await page.getByRole('heading', { name: '当日待办' }).waitFor();
    assert.equal(await page.getByRole('navigation').getByRole('link').count(), 5);
    for (const route of ['/app', '/app/work', '/app/analysis', '/app/explore', '/app/mine']) {
      await page.goto(base + route);
      const text = await page.locator('main').innerText();
      assert.doesNotMatch(text, /Alex|Jamie|Morgan|70%|¥520|Garden House|LEAKED SAMPLE PROPERTY|Account B/);
      assert.equal(await page.locator('nav a[aria-current="page"]').count(), 1);
      assert.equal(await page.locator('nav a[href^="/native-"]').count(), 0);
      for (const width of [320, 390, 658]) {
        await page.setViewportSize({ width, height: 844 });
        assert.equal(await page.locator('body').evaluate(el => el.scrollWidth > innerWidth), false);
      }
    }
    assert.equal(localRequests.length, 0);
    await page.getByRole('heading',{name:'民宿资料',exact:true}).waitFor();assert.equal(await page.getByText('关联民宿后才能保存，现在可以先填写、上传并核对资料。',{exact:true}).count(),0);
    await page.getByRole('button', { name: 'EN', exact: true }).click();
    await page.getByRole('heading',{name:'Property information',exact:true}).waitFor();
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await page.waitForURL('**/login');
    await page.goto(base + '/app/mine'); await page.waitForURL('**/login');

    await context.addCookies([cookie(1)]);
    await page.goto(base + '/app/mine');
    await page.getByRole('heading', { name: 'Account B private property', exact: true }).waitFor();
    await context.addCookies([cookie(0)]);
    await page.goto(base + '/app/mine');
    assert.doesNotMatch(await page.locator('main').innerText(), /Account B private property|account-1@/);

    // Language now persists across routes/accounts in this browser; explicitly switch back for Chinese assertions.
    await page.getByRole('button', { name: '中文', exact: true }).click();
    await context.addCookies([cookie(2)]);
    await page.goto(base + '/app');
    await page.getByRole('status').getByText('暂时无法读取民宿资料，请稍后重试。').waitFor();
    await page.locator('.workspace-notice').getByRole('button', { name: '重试', exact: true }).click();
    await page.locator('.workspace-notice').getByRole('button', { name: '重试', exact: true }).waitFor();
    await page.screenshot({ path: 'qa-workspace-unavailable.png', fullPage: true });
    await context.addCookies([cookie(3)]);
    await page.goto(base + '/app', { waitUntil: 'commit' });
    await page.getByRole('status').getByText('正在打开工作台…', { exact: true }).waitFor();
    await page.getByRole('heading', { name: '当日待办' }).waitFor();
    await context.addCookies([cookie(0)]);
    await page.goto(base + '/app');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: 'qa-workspace-home.png', fullPage: true });
    await page.getByRole('navigation').getByRole('link', { name: '工作', exact: true }).click();
    await page.locator('.native-section-head').getByRole('link', { name: '添加客房', exact: true }).click();
    await page.waitForURL('**/app/rooms/new');
    await page.goto(base + '/app/analysis');
    await page.screenshot({ path: 'qa-workspace-analysis.png', fullPage: true });
    console.log('PASS: protected five-page empty workspace; no sample/local API leakage; per-account fixtures; missing-schema retry; sign-out; bilingual; 320/390/658px. Auth responses mocked only in isolated QA process; no live cloud writes.');
  } finally {
    if (browser) await browser.close();
    child.kill();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
