
import { createRequire } from 'node:module';
const require = createRequire('C:/个人/学习/ENT207/Homestay AI assistant/frontend/package.json');
const { chromium } = require('playwright');
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--no-sandbox'] });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, locale: 'en-US' })).newPage();
await page.goto('http://127.0.0.1:4177/concept/index.html', { waitUntil: 'load', timeout: 60000 });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(800);
await page.click('#langBtn'); // to EN
await page.waitForTimeout(600);
await page.evaluate(() => switchView('promotion'));
await page.waitForTimeout(500);
const rd = () => page.evaluate(() => ({ draft: document.getElementById('promoDraftBox')?.value, activeClue: document.getElementById('activeClueText')?.textContent, btn: document.querySelector('#view-promotion .btn-primary, #view-promotion button')?.textContent }));
console.log('PROMO initial EN:', JSON.stringify(await rd()).slice(0, 900));
// click regenerate
const regen = page.locator('button:has-text("Regenerate")').first();
if (await regen.count()) { await regen.click(); await page.waitForTimeout(800); }
console.log('PROMO after regen:', JSON.stringify(await rd()).slice(0, 1200));
// use clue then regenerate
const useClue = page.locator('button:has-text("Use Clue")').first();
if (await useClue.count()) { await useClue.click(); await page.waitForTimeout(900); }
console.log('PROMO after clue:', JSON.stringify(await rd()).slice(0, 1200));
// drawer content EN?
await page.evaluate(() => openDrawer('collection'));
await page.waitForTimeout(800);
const drawer = await page.evaluate(() => { const d = document.querySelector('.drawer'); return d ? d.innerText.slice(0, 1200) : 'none'; });
console.log('DRAWER:', JSON.stringify(drawer).slice(0, 1400));
await page.evaluate(() => closeDrawer());
// analysis metric switch EN
await page.evaluate(() => switchView('analysis'));
await page.waitForTimeout(400);
await page.evaluate(() => switchAnalysisMetric('amount', '¥12,800', '每日分摊预订金额'));
await page.waitForTimeout(500);
const an = await page.evaluate(() => { const el = document.getElementById('view-analysis'); return el ? el.innerText.slice(0, 1500) : ''; });
console.log('ANALYSIS after metric:', JSON.stringify(an).slice(0, 1700));
// explore expand
await page.evaluate(() => switchView('explore'));
await page.waitForTimeout(400);
const exp = await page.evaluate(() => { const el = document.getElementById('view-explore'); return el ? el.innerText.slice(0, 2000) : ''; });
console.log('EXPLORE EN:', JSON.stringify(exp).slice(0, 2400));
await browser.close();
