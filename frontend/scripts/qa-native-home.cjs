/* eslint-disable @typescript-eslint/no-require-imports */
const { chromium } = require('playwright');
const path = require('node:path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  await page.goto('http://localhost:3000/native-home');
  await page.getByRole('heading', { name: 'Hi, Alex.' }).waitFor();
  await page.screenshot({ path: path.join(__dirname, '..', 'qa-native-home.png'), fullPage: true });
  const date = page.getByRole('button', { name: '9/18/2026' });
  await date.click();
  await page.getByText('2 events').waitFor();
  await date.click();
  if (await page.getByText('2 events').count()) throw new Error('Date detail did not collapse');
  await page.getByRole('button', { name: '✦ Ask AI' }).click();
  await page.getByRole('heading', { name: '✦ What can I help with?' }).waitFor();
  await page.getByRole('button', { name: 'What needs my attention?' }).click();
  await page.getByText('2 items need your review', { exact: false }).waitFor();
  const navCount = await page.locator('nav[aria-label="Main navigation"] a').count();
  if (navCount !== 5) throw new Error('Expected five navigation tabs');
  console.log('Home visual and interaction smoke check passed');
  await browser.close();
})().catch((error) => { console.error(error); process.exit(1); });


