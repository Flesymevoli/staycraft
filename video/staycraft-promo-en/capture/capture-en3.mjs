
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire('C:/个人/学习/ENT207/Homestay AI assistant/frontend/package.json');
const { chromium } = require('playwright');
const ROOT = 'C:/个人/学习/ENT207/Homestay AI assistant/video/staycraft-promo-en';
const TEX = ROOT + '/public/textures';
const BASE = 'https://staycraft.online';
const log = (...a) => console.log('[cap]', ...a);
const meta = { at: new Date().toISOString(), pages: [], notes: [] };
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--no-sandbox'] });
async function gotoRetry(page, url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try { await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }); return true; }
    catch (e) { log('goto fail', url, i, String(e).slice(0, 120)); await page.waitForTimeout(2500 * (i + 1)); }
  }
  return false;
}
async function ensureEN(page) {
  const nav = await page.evaluate(() => Array.from(document.querySelectorAll('nav a, aside a')).map(a => (a.textContent||'').trim()));
  if (nav.some(t => /工作台|经营数据/.test(t))) {
    const en = page.locator('button:has-text("EN")').first();
    if (await en.count()) { await en.click(); await page.waitForTimeout(1800); }
  }
}
async function dump(page, name) {
  const info = await page.evaluate(() => {
    const rect = (el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x + scrollX), y: Math.round(r.y + scrollY), w: Math.round(r.width), h: Math.round(r.height) }; };
    const grab = (sel, lim = 40) => Array.from(document.querySelectorAll(sel)).filter(e => { const r = e.getBoundingClientRect(); return r.width > 30 && r.height > 14; }).slice(0, lim).map(e => ({ tag: e.tagName, text: (e.textContent || '').trim().slice(0, 50), ...rect(e) }));
    return { w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight, headings: grab('main h1, main h2, main h3, h1, h2, h3'), cards: grab('main [class*=card], main [class*=metric], main section'), svgs: grab('main svg'), rows: grab('main li, main tr'), buttons: grab('main button') };
  });
  await page.screenshot({ path: TEX + '/' + name + '.png', fullPage: true });
  meta.pages.push({ name, url: page.url(), w: info.w, h: info.h });
  fs.writeFileSync(ROOT + '/capture/layout-en-' + name + '.json', JSON.stringify(info, null, 1));
  log('SHOT', name, info.w + 'x' + info.h);
  return info;
}
// ── desktop ──
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, locale: 'en-US' });
const page = await ctx.newPage();
let ok = await gotoRetry(page, BASE + '/welcome');
if (!ok) { log('FATAL welcome'); process.exit(1); }
await page.waitForTimeout(1500);
const demo = page.locator('button:has-text("免登录试用"), a:has-text("免登录试用")').first();
if (await demo.count()) await demo.click();
await page.waitForTimeout(5000);
await ensureEN(page);
// wait workbench data
for (let i = 0; i < 10; i++) { const b = await page.evaluate(() => document.body.innerText); if (/Completed room revenue/.test(b) && !/Investigating revenue period/.test(b)) break; await page.waitForTimeout(4000); }
await dump(page, 'app-workbench');
// analysis + tabs
await gotoRetry(page, BASE + '/app/analysis'); await ensureEN(page); await page.waitForTimeout(4000);
await dump(page, 'app-analysis');
for (const [label, name] of [['Bookings & import', 'app-import'], ['Room inventory', 'app-rooms']]) {
  const tab = page.locator('button:has-text("' + label + '")').first();
  if (await tab.count()) { await tab.click(); await page.waitForTimeout(3500); await dump(page, name); }
}
// market
await gotoRetry(page, BASE + '/app/explore'); await ensureEN(page); await page.waitForTimeout(5000); await dump(page, 'app-market');
// promotion: simple state then social state
await gotoRetry(page, BASE + '/app/promotion'); await ensureEN(page); await page.waitForTimeout(5000); await dump(page, 'app-promo-simple');
for (const t of ['Social', 'Social copy', '引流版']) {
  const tab = page.locator('button:has-text("' + t + '"), [role=tab]:has-text("' + t + '")').first();
  if (await tab.count()) { await tab.click(); await page.waitForTimeout(2500); break; }
}
await dump(page, 'app-promo-traffic');
// report: expand + history + direct href
let reportHref = null;
await gotoRetry(page, BASE + '/app'); await ensureEN(page); await page.waitForTimeout(3000);
for (const t of ['Read full report', 'Read the full report', 'Full report']) {
  const el = page.locator('button:has-text("' + t + '"), a:has-text("' + t + '")').first();
  if (await el.count()) { await el.click(); await page.waitForTimeout(4000); break; }
}
let links = await page.evaluate(() => Array.from(document.querySelectorAll('a')).map(a => a.getAttribute('href')).filter(Boolean));
reportHref = links.find(h => /\/app\/reports\//.test(h)) || null;
if (!reportHref) {
  const hist = page.locator('button:has-text("Diagnosis history"), summary:has-text("Diagnosis history")').first();
  if (await hist.count()) { await hist.click(); await page.waitForTimeout(2500); }
  links = await page.evaluate(() => Array.from(document.querySelectorAll('a')).map(a => a.getAttribute('href')).filter(Boolean));
  reportHref = links.find(h => /\/app\/reports\//.test(h)) || null;
}
meta.notes.push({ reportHref, links: links.slice(0, 30) });
log('reportHref', reportHref);
if (reportHref) {
  await gotoRetry(page, BASE + reportHref); await ensureEN(page); await page.waitForTimeout(6000); await dump(page, 'app-report');
  meta.notes.push({ reportText: (await page.evaluate(() => document.body.innerText)).slice(0, 4000) });
}
fs.writeFileSync(ROOT + '/capture/meta3-desktop.json', JSON.stringify({ meta, promoText: await page.evaluate(() => document.body.innerText).catch(()=>'').slice(0, 1500) }, null, 1));
await ctx.close();
// ── mobile ──
const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'en-US', isMobile: true, hasTouch: true });
const mp = await mctx.newPage();
if (!(await gotoRetry(mp, BASE + '/welcome'))) { log('mobile welcome fail'); await browser.close(); process.exit(1); }
await mp.waitForTimeout(1500);
const md = mp.locator('button:has-text("免登录试用"), a:has-text("免登录试用")').first();
if (await md.count()) await md.click();
await mp.waitForTimeout(5000); await ensureEN(mp);
for (const [name, path] of [['m-workbench', '/app'], ['m-analysis', '/app/analysis'], ['m-market', '/app/explore'], ['m-promotion', '/app/promotion']]) {
  await gotoRetry(mp, BASE + path); await ensureEN(mp); await mp.waitForTimeout(4500); await dump(mp, name);
}
if (reportHref) { await gotoRetry(mp, BASE + reportHref); await ensureEN(mp); await mp.waitForTimeout(5000); await dump(mp, 'm-report'); }
fs.writeFileSync(ROOT + '/capture/meta3-mobile.json', JSON.stringify(meta, null, 1));
await mctx.close(); await browser.close();
log('DONE');
