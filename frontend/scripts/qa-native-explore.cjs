/* eslint-disable @typescript-eslint/no-require-imports */
const { chromium } = require('playwright');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  await page.goto('http://localhost:3000/native-explore');
  await page.getByRole('heading', { name: 'Market pulse' }).waitFor();
  await page.screenshot({ path: path.join(__dirname, '..', 'qa-native-explore.png'), fullPage: true });
  await page.getByRole('button', { name: 'Sep 26 · Higher demand than usual' }).click();
  await page.getByRole('dialog').getByText('A nearby event is included', { exact: false }).waitFor();
  await page.getByRole('button', { name: 'Close' }).click();
  await page.getByRole('button', { name: 'Cleanliness 24' }).click();
  await page.getByRole('heading', { name: 'Consistently positive' }).waitFor();
  await page.getByRole('button', { name: 'View comments' }).click();
  await page.getByRole('dialog').getByText('Fresh linens', { exact: false }).waitFor();
  await page.getByRole('button', { name: 'Close' }).click();
  await page.getByRole('button', { name: 'Next stay' }).click();
  console.log('Explore visual and interaction smoke check passed');
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
