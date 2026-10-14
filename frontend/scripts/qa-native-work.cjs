/* eslint-disable @typescript-eslint/no-require-imports */
const { chromium } = require('playwright');
const path = require('node:path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  await page.goto('http://localhost:3000/native-work');
  await page.getByRole('heading', { name: 'Needs you' }).waitFor();
  await page.screenshot({ path: path.join(__dirname, '..', 'qa-native-work.png'), fullPage: true });
  await page.getByRole('button', { name: 'Review reply' }).click();
  await page.getByRole('textbox', { name: 'AI draft · Sample' }).first().waitFor();
  await page.getByRole('button', { name: 'Confirm & save' }).click();
  await page.getByText('Guest reply confirmed').waitFor();
  await page.getByRole('button', { name: /Reset demo/ }).click();
  await page.getByText('Early arrival request').waitFor();
  await page.goto('http://localhost:3000/native-work?task=promotion');
  await page.getByRole('textbox', { name: 'AI draft · Sample' }).first().waitFor();
  console.log('Work visual and interaction smoke check passed');
  await browser.close();
})().catch((error) => { console.error(error); process.exit(1); });
