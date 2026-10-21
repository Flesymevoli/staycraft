const { chromium } = require('C:/Users/86299/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const base = 'http://127.0.0.1:' + (process.env.QA_PORT || '3101');
    await page.goto(base + '/native-home', { waitUntil: 'networkidle' });
    await page.locator('.native-ask').click();
    await page.getByRole('button', { name: 'How is this week going?', exact: true }).click();
    const summary = await (await page.request.get(base + '/api/local/analysis-summary?days=7&language=en')).json();
    await page.locator('.native-answer').getByText(summary.paragraphs[0], { exact: true }).waitFor();
    await page.getByRole('button', { name: 'What needs my attention?', exact: true }).click();
    const threads = (await (await page.request.get(base + '/api/local/conversations')).json()).items;
    const count = threads.filter(item => !item.messages.some(message => message.sender === 'owner')).length;
    await page.waitForFunction(value => document.querySelector('.native-answer')?.textContent.includes(value + ' guest conversations'), count);
    await page.locator('#native-question').fill('Hello, explain something unrelated');
    await page.getByRole('button', { name: 'Ask question', exact: true }).click();
    await page.locator('.native-answer').getByText('This demo can explain your business summary', { exact: false }).waitFor();
    await page.route('**/api/local/conversations', route => route.fulfill({ status: 503, json: {} }));
    await page.getByRole('button', { name: 'What needs my attention?', exact: true }).click();
    await page.locator('.native-answer [role=alert]').waitFor();
    await page.unroute('**/api/local/conversations');
    await page.getByRole('button', { name: 'What needs my attention?', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('.native-answer')?.textContent.includes('booking items'));
    await page.getByRole('button', { name: 'Close assistant', exact: true }).click();
    await page.locator('.native-greeting').waitFor();
    await page.locator('.native-language').click();
    await page.locator('.native-ask').click();
    await page.getByRole('button', { name: '哪些事情需要我处理？', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('.native-answer')?.textContent.includes('项订单事务'));
    for (const width of [320, 360, 390, 430]) {
      await page.setViewportSize({ width, height: 844 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    }
    console.log('PASS: Home uses same summary and current conversation count, unsupported input, failure/retry, close, Chinese and mobile');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
