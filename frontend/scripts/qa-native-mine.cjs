/* eslint-disable @typescript-eslint/no-require-imports */
const { chromium } = require('playwright');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  await page.goto('http://localhost:3000/native-mine');
  await page.getByRole('heading', { name: 'Garden House' }).waitFor();
  await page.screenshot({ path: path.join(__dirname, '..', 'qa-native-mine.png'), fullPage: true });
  await page.getByRole('button', { name: 'Edit Property name' }).click();
  await page.getByRole('textbox', { name: 'Property name' }).fill('Lake House');
  await page.getByRole('button', { name: 'Save' }).click();
  await page.getByRole('heading', { name: 'Lake House' }).waitFor();
  await page.getByRole('button', { name: '中文' }).click();
  await page.getByRole('heading', { name: '民宿信息' }).waitFor();
  await page.getByRole('link', { name: '探索' }).click();
  await page.getByRole('heading', { name: '市场脉动' }).waitFor();
  console.log('Mine editing, language and five-page navigation smoke check passed');
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });


