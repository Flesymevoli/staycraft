const { chromium } = require('C:/Users/86299/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const base = 'http://127.0.0.1:' + (process.env.QA_PORT || '3102');
    const initial = await (await page.request.get(base + '/api/local/operation-metrics?days=7')).json();
    assert.equal(initial.source, 'local_reservations');
    await page.goto(base + '/native-home', { waitUntil: 'networkidle' });
    assert.equal(await page.locator('.home-occupancy .native-metric').innerText(), initial.occupancy_pct + '%');
    await page.goto(base + '/native-analysis', { waitUntil: 'networkidle' });
    for (const days of [7,28]) {
      await page.getByRole('button', { name: days + ' days', exact: true }).click();
      const metrics = await (await page.request.get(base + '/api/local/operation-metrics?days=' + days)).json();
      await page.locator('.analysis-overview-grid button').first().getByText(metrics.occupancy_pct + '%', { exact: true }).waitFor();
      await page.getByRole('button', { name: /^View daily values/ }).click();
      const rows = page.locator('.analysis-data-table tbody tr');
      assert.equal(await rows.count(), days);
      assert.deepEqual(await rows.locator('td:last-child').allTextContents(), metrics.daily.map(d => d.value + '%'));
      await page.getByRole('button', { name: /^View daily values/ }).click();
      const summary = await (await page.request.get(base + '/api/local/analysis-summary?days=' + days + '&language=en')).json();
      assert.deepEqual(summary.metrics.daily, metrics.daily);
      assert.equal(summary.metrics.occupied_room_nights, metrics.occupied_room_nights);
    }
    await page.locator('.analysis-overview-grid button').nth(1).click();
    await page.locator('#booking-detail').waitFor();
    assert.equal(await page.locator('.analysis-overview-grid button').nth(1).locator('strong').innerText(), `${initial.next_week_booked_nights} / ${initial.next_week_capacity_nights}`);
    assert.equal(await page.locator('#booking-detail').getByText('Last week: 26', { exact: false }).count(), 0);
    await page.locator('.native-language').click();
    await page.locator('#booking-detail').getByText('暂无历史预订快照，暂不比较预订速度。', { exact: true }).waitFor();
    for (const width of [320,360,390,430,658]) {
      await page.setViewportSize({ width, height: 956 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      const alignment = await page.locator('.analysis-overview-grid button').evaluateAll(buttons => buttons.map(b => {
        const icon = b.querySelector('svg').getBoundingClientRect();
        const title = b.querySelector('small').getBoundingClientRect();
        return Math.abs(icon.y + icon.height/2 - title.y - title.height/2);
      }));
      assert.ok(alignment.every(diff => diff < 1));
    }
    await page.screenshot({ path: 'qa-operation-metrics.png', animations: 'disabled' });
    await page.locator('.native-language').click();
    await page.route('**/api/local/operation-metrics?**', route => route.fulfill({ status: 503, json: {} }));
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('.analysis-selected-detail [role=alert]').waitFor();
    assert.equal(await page.locator('.analysis-overview-grid button').first().locator('strong').innerText(), '—');
    await page.unroute('**/api/local/operation-metrics?**');
    await page.locator('.analysis-selected-detail').getByRole('button', { name: 'Retry', exact: true }).click();
    await page.locator('.analysis-plot').waitFor();
    const empty = { ...initial, occupancy_pct: null, weekday_pct: null, weekend_pct: null, capacity_room_nights: 0, next_week_capacity_nights: 0, daily: initial.daily.map(d => ({ ...d, value: null, capacity_nights: 0, occupied_nights: 0 })) };
    await page.route('**/api/local/operation-metrics?**', route => route.fulfill({ json: empty }));
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('.analysis-selected-detail').getByText('No room inventory available.', { exact: true }).waitFor();
    assert.equal(await page.locator('.analysis-plot').count(), 0);
    await page.goto(base + '/native-home', { waitUntil: 'networkidle' });
    await page.locator('.home-occupancy').getByText('No room inventory available.', { exact: true }).waitFor();
    await page.unroute('**/api/local/operation-metrics?**');
    await page.route('**/api/local/operation-metrics?**', async route => { await new Promise(resolve => setTimeout(resolve,600)); await route.continue(); });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('.home-occupancy [role=status]').waitFor();
    await page.locator('.home-occupancy .native-metric').getByText(initial.occupancy_pct + '%', { exact: true }).waitFor();
    console.log('PASS: Home/Analysis/summary share computed orders, daily rows and periods match, booking counts, title alignment, Chinese, responsive, loading/empty/failure/retry');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
