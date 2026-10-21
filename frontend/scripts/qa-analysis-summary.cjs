const { chromium } = require('C:/Users/86299/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const base = 'http://127.0.0.1:' + (process.env.QA_PORT || '3101');
    await page.goto(base + '/native-analysis', { waitUntil: 'networkidle' });
    await page.locator('.analysis-summary-card').getByText('Sample summary', { exact: true }).waitFor();
    for (const days of [7, 28]) {
      await page.getByRole('button', { name: days + ' days', exact: true }).click();
      const response = await page.request.get(base + '/api/local/analysis-summary?days=' + days + '&language=en');
      const data = await response.json();
      assert.equal(data.metrics.period_days, days);
      assert.equal(data.metrics.occupancy_pct + '%', await page.locator('.analysis-overview-grid button').first().locator('strong').innerText());
    }
    const fixture = { paragraphs: ['Weekdays have more availability.', 'Review a focused promotion before changing rates.'], engine: 'model_v1', reason: 'ready', metrics: { period_days: 7 } };
    await page.route('**/api/local/analysis-summary?**', route => route.fulfill({ json: fixture }));
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('.analysis-summary-card').getByText('AI summary · Sample', { exact: true }).waitFor();
    assert.equal(await page.locator('.analysis-summary-card > p').count(), 2);
    await page.screenshot({ path: 'qa-analysis-summary.png' });
    await page.unroute('**/api/local/analysis-summary?**');
    await page.route('**/api/local/analysis-summary?**', route => route.fulfill({ status: 503, json: {} }));
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('.analysis-summary-card [role=alert]').waitFor();
    await page.unroute('**/api/local/analysis-summary?**');
    await page.locator('.analysis-summary-retry').click();
    await page.locator('.analysis-summary-card').getByText('Sample summary', { exact: true }).waitFor();
    await page.locator('.native-language').click();
    await page.locator('.analysis-summary-card').getByText('示例总结', { exact: true }).waitFor();
    for (const width of [320, 360, 390, 430]) {
      await page.setViewportSize({ width, height: 844 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    }
    assert.equal(await page.locator('.analysis-decisions .analysis-decision-link').count(), 3);
    console.log('PASS: summary matches chart period/mean, AI label via stub, failure/retry, Chinese, existing decisions and mobile sizes');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
