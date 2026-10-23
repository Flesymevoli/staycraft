// Run against an isolated fictional database: this deliberately marks room 102 clean.
const { chromium } = require('./qa-browser.cjs');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const base = 'http://127.0.0.1:' + (process.env.QA_PORT || '3102');
    await page.route('**/api/local/room-board', async route => {
      await new Promise(resolve => setTimeout(resolve, 500));
      await route.continue();
    });
    await page.goto(base + '/native-home', { waitUntil: 'domcontentloaded' });
    await page.locator('.room-board [role=status]').waitFor();
    await page.getByRole('button', { name: 'Room 102 · To clean', exact: true }).waitFor();
    await page.unroute('**/api/local/room-board');
    assert.equal(await page.locator('.room-tile').count(), 10);
    await page.getByRole('button', { name: 'Room 103 · Occupied', exact: true }).click();
    assert.equal(await page.locator('.room-clean-button').count(), 0);
    await page.getByRole('button', { name: 'Room 102 · To clean', exact: true }).click();
    await page.route('**/api/local/room-clean', route => route.fulfill({ status: 503, json: {} }));
    await page.getByRole('button', { name: 'Mark cleaned · Demo', exact: true }).click();
    await page.locator('.room-detail [role=alert]').waitFor();
    await page.getByRole('button', { name: 'Room 102 · To clean', exact: true }).waitFor();
    await page.unroute('**/api/local/room-clean');
    await page.route('**/api/local/room-clean', async route => {
      await new Promise(resolve => setTimeout(resolve, 300));
      await route.continue();
    });
    await page.getByRole('button', { name: 'Mark cleaned · Demo', exact: true }).click();
    await page.getByRole('button', { name: 'Saving…', exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Saving…', exact: true }).isDisabled(), true);
    await page.getByRole('button', { name: 'Room 102 · Ready', exact: true }).waitFor();
    await page.locator('.room-demo-feedback').getByText('Saved on this computer.', { exact: false }).waitFor();
    await page.reload({ waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Room 102 · Ready', exact: true }).waitFor();
    const data = await (await page.request.get(base + '/api/local/room-board')).json();
    assert.deepEqual(data.counts, { ready: 2, cleaning: 1, occupied: 7 });
    assert.equal((await page.request.post(base + '/api/local/room-clean', { data: { room_number: '103' } })).status(), 409);
    assert.equal((await page.request.post(base + '/api/local/room-clean', { headers: { origin: 'https://foreign.example' }, data: { room_number: '201' } })).status(), 403);
    await page.locator('.native-language').click();
    await page.getByRole('button', { name: '房间 102 · 可入住', exact: true }).waitFor();
    for (const width of [320, 360, 390, 430, 658]) {
      await page.setViewportSize({ width, height: 956 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    }
    await page.screenshot({ path: 'qa-room-board-local.png' });
    await page.locator('.native-language').click();
    await page.route('**/api/local/room-board', route => route.fulfill({ json: { items: [] } }));
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('.room-board').getByText('No rooms yet.', { exact: true }).waitFor();
    await page.unroute('**/api/local/room-board');
    await page.route('**/api/local/room-board', route => route.fulfill({ status: 503, json: {} }));
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('.room-board [role=alert]').waitFor();
    await page.unroute('**/api/local/room-board');
    await page.locator('.room-board').getByRole('button', { name: 'Retry', exact: true }).click();
    await page.getByRole('button', { name: 'Room 102 · Ready', exact: true }).waitFor();
    await page.route('**/api/local/room-board', route => route.fulfill({ status: 404, json: {} }));
    await page.reload({ waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Room 102 · To clean', exact: true }).waitFor();
    console.log('PASS: room status from orders, occupied protection, saving/failure/retry, persistence, counts, Chinese, empty/load/error, demo fallback, cross-origin guard, responsive layout');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
