const { chromium } = require('C:/Users/86299/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto('http://127.0.0.1:3100/native-work', { waitUntil: 'networkidle' });
  const question = page.locator('#work-demo-question');
  const button = page.getByRole('button', { name: 'Check reply' });
  if (!await button.isDisabled()) throw Error('Empty question should not submit');

  if (process.env.EXPECT_BACKEND_OFF === '1') {
    await question.fill('What time is breakfast?');
    await button.click();
    await page.locator('.work-try-error').getByText('The local decision service is unavailable.').waitFor();
    if (await page.locator('.work-try-result').count()) throw Error('Stale result shown after failure');
    await browser.close();
    console.log('Work rule demo: backend failure and retry guidance passed');
    return;
  }

  await question.fill('What time is breakfast?');
  await page.waitForFunction(() => !document.querySelector('.work-try-actions button')?.disabled);
  await button.click();
  await page.locator('.work-try-result').getByText('Draft available').waitFor();
  if (!await page.locator('.work-try-result').getByText('07:30–10:00').count()) throw Error('Breakfast fact missing');
  if (!await page.locator('.work-try-result').getByText('Not sent').count()) throw Error('Unsent status missing');

  await page.getByRole('switch', { name: 'Always-on AI replies' }).click();
  await button.click();
  await page.locator('.work-try-result').getByText('Needs your review').waitFor();
  if (!await page.locator('.work-try-result').getByText('Automatic replies are paused.').count()) throw Error('Paused reason missing');

  await question.fill('Can I get a refund?');
  await button.click();
  await page.locator('.work-try-result').getByText('Refunds and cancellations need your decision.').waitFor();
  await page.locator('.work-try-section').screenshot({ path: 'qa-work-decision.png' });
  for (const width of [360, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw Error(`Horizontal overflow at ${width}px`);
  }
  await browser.close();
  console.log('Work rule demo: grounded draft, disabled automation, refund handoff, unsent status and mobile widths passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
