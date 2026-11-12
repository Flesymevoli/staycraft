
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire('C:/个人/学习/ENT207/Homestay AI assistant/frontend/package.json');
const { chromium } = require('playwright');
const ROOT = 'C:/个人/学习/ENT207/Homestay AI assistant/video/staycraft-promo-en';
const TEX = ROOT + '/public/textures';
const BASE = 'https://staycraft.online';
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--no-sandbox'] });
const meta = { capturedAt: new Date().toISOString(), source: BASE, pages: [], errors: [] };

async function enterDemo(ctx) {
  const page = await ctx.newPage();
  page.on('pageerror', e => meta.errors.push(String(e)));
  await page.goto(BASE + '/welcome', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(1500);
  const b = page.locator('button:has-text("免登录试用"), a:has-text("免登录试用")').first();
  if (await b.count()) await b.click();
  await page.waitForTimeout(4000);
  return page;
}
async function ensureEN(page) {
  let nav = await page.evaluate(() => Array.from(document.querySelectorAll('nav a, aside a')).map(a => (a.textContent||'').trim()));
  if (nav.some(t => /工作台|经营数据/.test(t))) {
    const en = page.locator('button:has-text("EN")').first();
    if (await en.count()) { await en.click(); await page.waitForTimeout(2000); }
  }
  nav = await page.evaluate(() => Array.from(document.querySelectorAll('nav a, aside a')).map(a => (a.textContent||'').trim()));
  return nav;
}
async function waitData(page, ms = 45000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const body = await page.evaluate(() => document.body.innerText);
    if (/¥\s?\d/.test(body) && !/正在读取经营周期|Reading revenue period|正在读取订单指标|Reading booking metrics/.test(body)) return body;
    await page.waitForTimeout(2500);
  }
  return await page.evaluate(() => document.body.innerText);
}
async function dumpLayout(page, name) {
  const data = await page.evaluate(() => {
    const rect = (el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x + window.scrollX), y: Math.round(r.y + window.scrollY), w: Math.round(r.width), h: Math.round(r.height) }; };
    const pick = (sel) => Array.from(document.querySelectorAll(sel)).filter(el => { const r = el.getBoundingClientRect(); return r.width > 40 && r.height > 16; }).slice(0, 60).map(el => ({ sel, tag: el.tagName, cls: String(el.className || '').slice(0, 60), text: (el.textContent || '').trim().slice(0, 40), ...rect(el) }));
    return {
      pageH: document.documentElement.scrollHeight,
      pageW: document.documentElement.scrollWidth,
      headings: pick('main h1, main h2, main h3, h1, h2, h3'),
      cards: pick('main [class*=card], main [class*=Card], main section'),
      charts: pick('main svg'),
      tables: pick('main table, main [class*=row], main li'),
    };
  });
  fs.writeFileSync(ROOT + '/capture/layout-en-' + name + '.json', JSON.stringify(data, null, 1));
  return data;
}
async function snap(page, name) {
  await page.waitForTimeout(2500);
  const layout = await dumpLayout(page, name);
  await page.screenshot({ path: TEX + '/' + name + '.png', fullPage: true });
  meta.pages.push({ name, url: page.url(), pageH: layout.pageH, pageW: layout.pageW, text: (await page.evaluate(() => document.body.innerText)).slice(0, 2000) });
  console.log('SHOT', name, layout.pageW + 'x' + layout.pageH);
}

// ── desktop ──
const dctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, locale: 'en-US' });
const page = await enterDemo(dctx);
await waitData(page);
const nav = await ensureEN(page);
console.log('NAV', JSON.stringify(nav));
const routes = [
  ['app-workbench', '/app'],
  ['app-analysis', '/app/analysis'],
  ['app-market', '/app/explore'],
  ['app-promotion', '/app/promotion'],
  ['app-mine', '/app/mine'],
];
for (const [name, path] of routes) {
  await page.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitData(page, 30000);
  await ensureEN(page);
  await snap(page, name);
}
// find report link
let reportHref = null;
const links = await page.evaluate(() => Array.from(document.querySelectorAll('a')).map(a => a.getAttribute('href')).filter(Boolean));
reportHref = links.find(h => /\/app\/reports\//.test(h)) || null;
console.log('REPORT HREF', reportHref, 'ALL', JSON.stringify(links.slice(0, 25)));
if (!reportHref) {
  // try diagnosis history expand on /app
  await page.goto(BASE + '/app', { waitUntil: 'domcontentloaded' });
  await waitData(page, 20000);
  await ensureEN(page);
  const hit = page.locator('a:has-text("reports"), a[href*="/reports/"]').first();
  if (await hit.count()) { reportHref = await hit.getAttribute('href'); }
}
if (reportHref) {
  await page.goto(BASE + reportHref, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(6000);
  await ensureEN(page);
  await snap(page, 'app-report');
} else {
  console.log('NO REPORT LINK');
  const body = await page.evaluate(() => document.body.innerText);
  meta.pages.push({ name: 'app-no-report', url: page.url(), text: body.slice(0, 2000) });
}
fs.writeFileSync(ROOT + '/capture/meta-desktop.json', JSON.stringify(meta, null, 1));
await dctx.close();

// ── mobile ──
const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'en-US', isMobile: true, hasTouch: true });
const mp = await enterDemo(mctx);
await mp.waitForTimeout(4000);
await ensureEN(mp);
await waitData(mp, 30000);
const mRoutes = [
  ['m-workbench', '/app'],
  ['m-analysis', '/app/analysis'],
  ['m-market', '/app/explore'],
  ['m-promotion', '/app/promotion'],
];
for (const [name, path] of mRoutes) {
  await mp.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitData(mp, 25000);
  await ensureEN(mp);
  const layout = await dumpLayout(mp, name);
  await mp.waitForTimeout(2000);
  await mp.screenshot({ path: TEX + '/' + name + '.png', fullPage: true });
  meta.pages.push({ name, url: mp.url(), pageH: layout.pageH, pageW: layout.pageW, text: (await mp.evaluate(() => document.body.innerText)).slice(0, 1200) });
  console.log('SHOT', name, layout.pageW + 'x' + layout.pageH);
}
fs.writeFileSync(ROOT + '/capture/meta-mobile.json', JSON.stringify(meta, null, 1));
await mctx.close();
await browser.close();
console.log('DONE');
