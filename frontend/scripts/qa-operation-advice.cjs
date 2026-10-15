const { chromium } = require('C:/Users/86299/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto('http://127.0.0.1:3100/native-work', { waitUntil: 'networkidle' });
    const arrival = page.locator('#operation-arrival');
    await arrival.getByRole('button', { name: 'Review advice' }).click();

    if (process.env.EXPECT_BACKEND_OFF === '1') {
      await arrival.getByRole('alert').getByText('The local advice service is unavailable.').waitFor();
      if (await arrival.getByRole('button', { name: 'Record readiness check' }).count()) throw Error('Decision offered without advice');
      await arrival.getByRole('button', { name: 'Try again' }).click();
      await arrival.getByRole('alert').waitFor();
      console.log('Operation advice: backend failure and retry state passed');
      return;
    }

    await arrival.getByText('Check cleaning before deciding on an early arrival.').waitFor();
    await arrival.getByText('Cleaning completion').waitFor();
    await arrival.getByRole('button', { name: 'Record readiness check' }).click();
    await page.getByText('Check-in plan recorded').waitFor();
    if (!await page.getByText('Check room readiness · Not executed').count()) throw Error('Arrival displayed as executed');

    await page.getByRole('navigation').getByRole('link', { name: 'Home', exact: true }).click();
    if (await page.locator('a[href="/native-work#operation-arrival"]').count()) throw Error('Arrival remained pending on Home');
    await page.locator('a[href="/native-work#operation-refund"]').click();
    const refund = page.locator('#operation-refund');
    await refund.getByRole('button', { name: 'Review advice' }).click();
    await refund.getByText('Sample policy suggests a full refund; execution still needs review.').waitFor();
    await refund.getByText('Proposed refund: ¥1,040').waitFor();
    await refund.screenshot({ path: 'qa-operation-advice.png' });
    await refund.getByRole('button', { name: 'Record refund proposal' }).click();
    await page.getByText('Refund plan recorded').waitFor();
    if (!await page.getByText('Refund proposal · No money moved').count()) throw Error('Refund displayed as executed');

    for (const width of [360, 390, 430]) {
      await page.setViewportSize({ width, height: 844 });
      if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw Error(`Horizontal overflow at ${width}px`);
    }
    await page.evaluate(() => {
      sessionStorage.setItem('homestay-demo:language', JSON.stringify('zh'));
      sessionStorage.removeItem('homestay-demo:operationDecisions');
    });
    await page.reload({ waitUntil: 'networkidle' });
    const chineseArrival = page.locator('#operation-arrival');
    await chineseArrival.getByRole('button', { name: '查看建议' }).click();
    await chineseArrival.getByText('先确认清洁完成情况，再决定能否提前入住。').waitFor();
    console.log('Operation advice: arrival checks, refund calculation, decision record, Home sync, Chinese UI and mobile widths passed');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
