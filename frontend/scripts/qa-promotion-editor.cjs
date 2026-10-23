// Use a dedicated fictional database, with MODEL_ENABLED=0 for routine QA.
const { chromium } = require('./qa-browser.cjs');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const base = 'http://127.0.0.1:' + (process.env.QA_PORT || '3101');
    await page.goto(base + '/native-explore', { waitUntil: 'networkidle' });
    const generate = page.getByRole('button', { name: 'Generate sample content', exact: true });
    await generate.click();
    await page.locator('#promotion-copy').waitFor();
    assert.match(await page.locator('#promotion-copy').inputValue(), /lakeside weekend market/);
    assert.match(await page.locator('#promotion-copy').inputValue(), /#/);
    await page.locator('#promotion-copy').fill('');
    assert.equal(await page.getByRole('button', { name: 'Save draft', exact: true }).isDisabled(), true);
    assert.equal(await page.locator('#promotion-copy').count(), 1);
    await page.locator('#promotion-copy').fill('Edited fictional promotion for the lakeside market.');
    await page.route('**/api/local/promotion-draft', route => route.request().method() === 'PUT' ? route.fulfill({ status: 503, json: {} }) : route.continue());
    await page.getByRole('button', { name: 'Save draft', exact: true }).click();
    await page.locator('#promotion [role=alert]').waitFor();
    assert.equal(await page.locator('#promotion-copy').inputValue(), 'Edited fictional promotion for the lakeside market.');
    await page.unroute('**/api/local/promotion-draft');
    await page.getByRole('button', { name: 'Save draft', exact: true }).click();
    await page.getByText('Draft saved on this computer. Not published.', { exact: true }).waitFor();
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(await page.locator('#promotion-copy').inputValue(), 'Edited fictional promotion for the lakeside market.');
    await page.locator('#promotion-channel').selectOption('wechat');
    await page.waitForFunction(() => !document.querySelector('#promotion-copy'));
    await page.waitForFunction(() => !document.querySelector('#promotion button.native-primary')?.disabled);
    await generate.click();
    await page.locator('#promotion-copy').waitFor();
    assert.doesNotMatch(await page.locator('#promotion-copy').inputValue(), /#/);
    await page.locator('#promotion-channel').selectOption('xiaohongshu');
    await page.waitForFunction(() => document.querySelector('#promotion-copy')?.value === 'Edited fictional promotion for the lakeside market.');
    await page.locator('#promotion').screenshot({ path: 'qa-promotion-editor.png' });
    for (const width of [320, 360, 390, 430]) {
      await page.setViewportSize({ width, height: 844 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    }
    await page.locator('.native-language').click();
    await page.getByRole('button', { name: '生成示例文案', exact: true }).waitFor();
    await page.waitForFunction(() => !document.querySelector('#promotion button.native-primary')?.disabled);
    await page.getByRole('button', { name: '生成示例文案', exact: true }).click();
    await page.locator('#promotion-copy').waitFor();
    assert.match(await page.locator('#promotion-copy').inputValue(), /湖畔周末市集/);
    console.log('PASS: existing generation/editor, context/channel, empty editor, save failure retention, save/reload, separate channels, Chinese and mobile');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
