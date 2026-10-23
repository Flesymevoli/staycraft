// Use a dedicated fictional database: this test saves owner replies.
const { chromium } = require('./qa-browser.cjs');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const base = 'http://127.0.0.1:' + (process.env.QA_PORT || '3101');
    await page.request.put(base + '/api/local/facts', { data: { breakfast: '08:00–09:00', checkin: '15:00' } });
    await page.goto(base + '/native-work', { waitUntil: 'networkidle' });
    await page.locator('.work-inbox-row').first().waitFor();
    assert.equal(await page.locator('.work-inbox-row').count(), 2);
    assert.equal(await page.locator('.work-try-section').count(), 0);
    await page.locator('.work-inbox-row').filter({ hasText: 'Jamie' }).click();
    await page.waitForFunction(() => document.querySelector('#followup-breakfast')?.value.includes('08:00–09:00'));
    const historyUrl = (process.env.QA_BACKEND || 'http://127.0.0.1:8013') + '/v1/local/reply-history';
    const count = (await (await page.request.get(historyUrl)).json()).items.length;
    await page.getByRole('button', { name: 'Back to messages', exact: true }).click();
    await page.locator('.work-inbox-row').filter({ hasText: 'Jamie' }).click();
    await page.waitForFunction(() => document.querySelector('#followup-breakfast')?.value.includes('08:00–09:00'));
    assert.equal((await (await page.request.get(historyUrl)).json()).items.length, count);
    await page.locator('#followup-breakfast').fill('Breakfast is 08:00–09:00. See you tomorrow.');
    await page.route('**/api/local/conversation-reply', route => route.fulfill({ status: 503, json: {} }));
    await page.getByRole('button', { name: 'Reply in demo', exact: true }).click();
    await page.locator('.work-inbox-feedback[role=alert]').waitFor();
    assert.match(await page.locator('#followup-breakfast').inputValue(), /See you tomorrow/);
    await page.unroute('**/api/local/conversation-reply');
    await page.getByRole('button', { name: 'Retry', exact: true }).click();
    await page.locator('.work-message-owner').getByText('Breakfast is 08:00–09:00. See you tomorrow.', { exact: true }).waitFor();
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('.work-inbox-row').filter({ hasText: 'Jamie' }).click();
    await page.locator('.work-message-owner').getByText('Breakfast is 08:00–09:00. See you tomorrow.', { exact: true }).waitFor();
    await page.screenshot({ path: 'qa-work-inbox.png' });
    for (const width of [320, 360, 390, 430]) {
      await page.setViewportSize({ width, height: 844 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    }
    await page.getByRole('button', { name: 'Back to messages', exact: true }).click();
    await page.locator('.native-language').click();
    await page.locator('.work-inbox-row').filter({ hasText: 'Morgan' }).click();
    await page.waitForFunction(() => !document.querySelector('#followup-transfer')?.disabled);
    await page.locator('.work-thread').getByText('建议回复 · 待审核', { exact: true }).waitFor();
    await page.route('**/api/local/conversations', route => route.fulfill({ json: { items: [] } }));
    await page.reload({ waitUntil: 'networkidle' });
    await page.getByText('暂无客人消息。', { exact: true }).waitFor();
    await page.unroute('**/api/local/conversations');
    await page.route('**/api/local/conversations', route => route.fulfill({ status: 503, json: {} }));
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('.work-inbox-feedback[role=alert]').waitFor();
    await page.unroute('**/api/local/conversations');
    await page.getByRole('button', { name: '重试', exact: true }).click();
    await page.locator('.work-inbox-row').first().waitFor();
    console.log('PASS: inbox, cached draft, edit/save, failed-save retry, reload persistence, Chinese, empty/error states and mobile widths');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
