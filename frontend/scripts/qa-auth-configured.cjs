const { chromium } = require('./qa-browser.cjs');
const assert = require('node:assert/strict');

// Uses a deliberately nonexistent fictional login; never creates users or sends email.
(async () => {
  const base = process.env.QA_BASE_URL || 'http://127.0.0.1:3103';
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.goto(base + '/app');
    await page.waitForURL('**/login');
    assert.equal(await page.getByRole('button', { name: 'Sign in', exact: true }).isEnabled(), true);
    assert.equal(await page.getByRole('status').count(), 0);
    await page.getByLabel('Email', { exact: true }).fill('staycraft-auth-negative-test@example.invalid');
    await page.getByLabel('Password', { exact: true }).fill('fictional-invalid-password');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.locator('form [role="alert"]').waitFor({ timeout: 30000 });
    assert.match(await page.locator('form [role="alert"]').innerText(), /couldn't verify/i);
    assert.equal(new URL(page.url()).pathname, '/login');
    await page.getByRole('button', { name: '中文', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: '登录', exact: true }).isEnabled(), true);
    await page.screenshot({ path: 'qa-auth-configured.png', fullPage: true });

    // A fabricated cookie must not unlock the protected page.
    await context.addCookies([{ name: 'sb-husrpqalpjjswpvrkxet-auth-token', value: 'forged-session', url: base }]);
    await page.goto(base + '/app');
    await page.waitForURL('**/login');
    await page.goto(base + '/native-home');
    assert.equal(new URL(page.url()).pathname, '/native-home');
    assert.equal(await page.locator('body').evaluate(el => el.scrollWidth > window.innerWidth), false);
    console.log('PASS: configured login; unauthenticated redirect; real invalid credentials; language toggle; forged session rejected; public prototype available.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
