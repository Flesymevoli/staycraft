
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire('C:/个人/学习/ENT207/Homestay AI assistant/frontend/package.json');
const { chromium } = require('playwright');
const ROOT = 'C:/个人/学习/ENT207/Homestay AI assistant/video/staycraft-promo-en';
const TEX = ROOT + '/public/textures';
const BASE = 'https://staycraft.online';
const log = (...a) => console.log('[cap]', ...a);
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--no-sandbox'] });
const meta = { capturedAt: new Date().toISOString(), desktop: {}, mobile: {}, notes: [] };
async function ensureEN(page) {
  const nav = await page.evaluate(() => Array.from(document.querySelectorAll('nav a, aside a')).map(a => (a.textContent||'').trim()));
  if (nav.some(t => /工作台|经营数据/.test(t))) {
    const en = page.locator('button:has-text("EN")').first();
    if (await en.count()) { await en.click(); await page.waitForTimeout(2000); }
  }
}
async function enterDemo(ctx) {
  const page = await ctx.newPage();
  await page.goto(BASE + '/welcome', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(1500);
  const b = page.locator('button:has-text("免登录试用"), a:has-text("免登录试用")').first();
  if (await b.count()) await b.click();
  await page.waitForTimeout(5000);
  return page;
}
async function shot(page, name, secs = 3) {
  await page.waitForTimeout(secs * 1000);
  const info = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight, text: document.body.innerText.slice(0, 2500) }));
  await page.screenshot({ path: TEX + '/' + name + '.png', fullPage: true });
  log('SHOT', name, info.w + 'x' + info.h);
  return info;
}

// ── desktop ──
const dctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, locale: 'en-US' });
const page = await enterDemo(dctx);
await ensureEN(page);
// wait for workbench data
let body = '';
for (let i = 0; i < 18; i++) {
  body = await page.evaluate(() => document.body.innerText);
  if (/Completed room revenue/.test(body) && !/Investigating revenue period/.test(body)) break;
  await page.waitForTimeout(5000);
}
log('workbench waited', i);
meta.desktop.workbench = await shot(page, 'app-workbench', 2);
// try expand "Read full report" and find report link
for (const t of ['Read full report', 'Read the full report', 'View full report', 'Full report']) {
  const el = page.locator('button:has-text("' + t + '"), a:has-text("' + t + '"), summary:has-text("' + t + '")').first();
  if (await el.count()) { await el.click(); log('clicked', t); await page.waitForTimeout(4000); break; }
}
meta.desktop.workbenchExpanded = await shot(page, 'app-workbench-expanded', 1);
let links = await page.evaluate(() => Array.from(document.querySelectorAll('a')).map(a => a.getAttribute('href')).filter(Boolean));
log('links after expand', JSON.stringify(links.filter(h => /report/i.test(h))), JSON.stringify(links.slice(0, 20)));
let reportHref = links.find(h => /\/app\/reports\//.test(h));
if (!reportHref) {
  // open diagnosis history
  const hist = page.locator('button:has-text("Diagnosis history"), summary:has-text("Diagnosis history")').first();
  if (await hist.count()) { await hist.click(); await page.waitForTimeout(2500); }
  links = await page.evaluate(() => Array.from(document.querySelectorAll('a')).map(a => a.getAttribute('href')).filter(Boolean));
  reportHref = links.find(h => /\/app\/reports\//.test(h));
  log('links after history', JSON.stringify(links.filter(h => /report/i.test(h))));
  meta.desktop.history = await shot(page, 'app-workbench-history', 1);
}
if (reportHref) {
  await page.goto(BASE + reportHref, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(6000);
  await ensureEN(page);
  meta.desktop.report = await shot(page, 'app-report', 2);
  meta.desktop.reportUrl = reportHref;
  const rh = await page.evaluate(() => document.documentElement.scrollHeight);
  meta.desktop.reportH = rh;
}
// promotion page + draft states
await page.goto(BASE + '/app/promotion', { waitUntil: 'domcontentloaded', timeout: 60000 });
await ensureEN(page);
await page.waitForTimeout(6000);
await shot(page, 'app-promotion', 1);
for (const t of ['Simple', 'Social']) {
  const tab = page.locator('button:has-text("' + t + '"), [role=tab]:has-text("' + t + '")').first();
  if (await tab.count()) { await tab.click(); await page.waitForTimeout(2500); await shot(page, 'app-promotion-' + t.toLowerCase(), 1); }
}
meta.desktop.promotionText = await page.evaluate(() => document.body.innerText.slice(0, 3000));
fs.writeFileSync(ROOT + '/capture/meta2.json', JSON.stringify(meta, null, 1));
await dctx.close();

// ── mobile ──
const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'en-US', isMobile: true, hasTouch: true });
const mp = await enterDemo(mctx);
await mp.waitForTimeout(3000);
await ensureEN(mp);
for (const [name, path] of [['m-workbench', '/app'], ['m-analysis', '/app/analysis'], ['m-market', '/app/explore'], ['m-promotion', '/app/promotion'], ['m-mine', '/app/mine']]) {
  await mp.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await ensureEN(mp);
  const info = await shot(mp, name, 5);
  meta.mobile[name] = { w: info.w, h: info.h, text: info.text.slice(0, 800) };
}
if (meta.desktop.reportUrl) {
  await mp.goto(BASE + meta.desktop.reportUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await mp.waitForTimeout(6000);
  await ensureEN(mp);
  const info = await shot(mp, 'm-report', 2);
  meta.mobile['m-report'] = { w: info.w, h: info.h, text: info.text.slice(0, 800) };
}
fs.writeFileSync(ROOT + '/capture/meta2.json', JSON.stringify(meta, null, 1));
await mctx.close();
await browser.close();
log('DONE');
