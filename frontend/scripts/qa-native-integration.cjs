/* eslint-disable @typescript-eslint/no-require-imports */
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
  await page.goto('http://localhost:3000/');
  await page.getByRole('heading', { name: 'Hi, Alex.' }).waitFor();
  const routes = ['/native-home','/native-work','/native-analysis','/native-explore','/native-mine'];
  for (const route of routes) {
    await page.goto('http://localhost:3000' + route);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    if (overflow > 1) throw new Error(route + ' horizontal overflow: ' + overflow);
  }
  await page.goto('http://localhost:3000/native-work?task=reply');
  await page.getByRole('button', { name: /Confirm & save/ }).click();
  await page.goto('http://localhost:3000/native-home');
  await page.getByText('Needs you').waitFor();
  if (await page.locator('.native-pending-head span').last().textContent() !== '1') throw new Error('Home pending count did not sync');
  await page.setViewportSize({ width: 812, height: 375 });
  await page.goto('http://localhost:3000/native-explore');
  const landscapeOverflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  if (landscapeOverflow > 1) throw new Error('Landscape overflow: ' + landscapeOverflow);
  console.log('Small viewport, landscape, root redirect and cross-page state check passed');
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });

