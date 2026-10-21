const { chromium } = require('C:/Users/86299/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  let previous;
  try {
  if (process.env.EXPECT_BACKEND_OFF !== '1') {
    const response = await page.request.get('http://127.0.0.1:3100/api/local/facts');
    if (!response.ok()) throw Error('Enable local data on both servers');
    previous = Object.fromEntries((await response.json()).facts.map(f => [f.key, f.value]));
    const saved = await page.request.put('http://127.0.0.1:3100/api/local/facts', {data: {breakfast:'07:30–10:00',checkin:'14:00'}});
    if (!saved.ok()) throw Error('Could not prepare test facts');
  }
  await page.goto('http://127.0.0.1:3100/native-work', { waitUntil: 'networkidle' });
  const question = page.locator('#work-demo-question');
  const button = page.getByRole('button', { name: 'Check reply' });
  if (!await button.isDisabled()) throw Error('Empty question should not submit');

  if (process.env.EXPECT_BACKEND_OFF === '1') {
    await question.fill('What time is breakfast?');
    await button.click();
    await page.locator('.work-try-error').getByText('The local decision service is unavailable.').waitFor();
    if (await page.locator('.work-try-result').count()) throw Error('Stale result shown after failure');
    console.log('Work rule demo: backend failure and retry guidance passed');
    return;
  }

  await question.fill('What time is breakfast?');
  await page.waitForFunction(() => !document.querySelector('.work-try-actions button')?.disabled);
  await button.click();
  await page.locator('.work-try-result').getByText('Reply draft · Review required').waitFor();
  if (!await page.locator('.work-try-result').getByText('07:30–10:00').count()) throw Error('Breakfast fact missing');
  if (!await page.locator('.work-try-result').getByText('Not sent').count()) throw Error('Unsent status missing');

  await page.getByRole('switch', { name: 'Always-on AI replies' }).click();
  await button.click();
  await page.locator('.work-try-result').getByText('Reply draft · Review required').waitFor();
  if (!await page.locator('.work-try-result').getByText('Automatic replies are paused.').count()) throw Error('Paused reason missing');

  await question.fill('Can I get a refund?');
  await button.click();
  await page.locator('.work-try-result').getByText('Refunds and cancellations need your decision.').waitFor();
  await page.locator('.work-try-section').screenshot({ path: 'qa-work-decision.png' });
  for (const width of [360, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw Error(`Horizontal overflow at ${width}px`);
  }
  console.log('Work rule demo: grounded draft, disabled automation, refund handoff, unsent status and mobile widths passed');
  } finally {
    if (previous) await page.request.put('http://127.0.0.1:3100/api/local/facts', {data:previous});
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
