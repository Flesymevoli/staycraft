/* eslint-disable @typescript-eslint/no-require-imports */
const { chromium } = require('playwright');
const path = require('node:path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  await page.goto('http://localhost:3000/native-analysis');
  await page.getByRole('heading', { name: 'Occupancy' }).waitFor();
  await page.screenshot({ path: path.join(__dirname, '..', 'qa-native-analysis.png'), fullPage: true });
  await page.getByRole('button', { name: '28 days', exact: true }).click();
  if (await page.getByRole('button', { name: '28 days', exact: true }).getAttribute('aria-pressed') !== 'true') throw new Error('Range did not change');
  await page.getByRole('button', { name: 'View daily values' }).click();
  const rows = await page.locator('.analysis-main-card tbody tr').count();
  if (rows !== 28) throw new Error('Expected 28 daily values; got ' + rows);
  await page.getByRole('button', { name: 'Why?' }).click();
  await page.getByText('Monday–Thursday account for', { exact: false }).waitFor();
  await page.getByRole('button', { name: 'What can I do?' }).click();
  await page.getByRole('link', { name: 'Create promotion' }).waitFor();
  await page.getByRole('button', { name: /Room performance/ }).click();
  await page.getByText('18 / 21').waitFor();
  console.log('Analysis visual and interaction smoke check passed');
  await browser.close();
})().catch((error) => { console.error(error); process.exit(1); });

