
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire('C:/个人/学习/ENT207/Homestay AI assistant/frontend/package.json');
const { chromium } = require('playwright');
const ROOT = 'C:/个人/学习/ENT207/Homestay AI assistant/video/staycraft-promo-en';
const TEX = ROOT + '/public/textures';
const BASE = 'https://staycraft.online';
const log = (...a) => console.log('[cap]', ...a);
const meta = { at: new Date().toISOString(), pages: [], notes: {} };
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--no-sandbox'] });

async function waitNav(page, ms = 15000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const n = await page.evaluate(() => document.querySelectorAll('nav a, aside a').length);
    if (n > 0) return true;
    await page.waitForTimeout(500);
  }
  return false;
}
async function isEN(page) {
  const nav = await page.evaluate(() => Array.from(document.querySelectorAll('nav a, aside a')).map(a => (a.textContent||'').trim()));
  return nav.some(t => /Workbench|Business data|Market research/.test(t));
}
async function ensureEN(page) {
  for (let i = 0; i < 6; i++) {
    if (await isEN(page)) return true;
    const btn = page.locator('header button, button').filter({ hasText: /^(EN|中文)$/ }).first();
    if (await btn.count()) {
      const t = (await btn.textContent()) || '';
      if (/EN/.test(t)) { await btn.click().catch(()=>{}); await page.waitForTimeout(1500); continue; }
    }
    await page.waitForTimeout(800);
  }
  return await isEN(page);
}
async function dump(page, name, extra = {}) {
  const info = await page.evaluate(() => {
    const rect = (el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x + scrollX), y: Math.round(r.y + scrollY), w: Math.round(r.width), h: Math.round(r.height) }; };
    const grab = (sel, lim = 50) => Array.from(document.querySelectorAll(sel)).filter(e => { const r = e.getBoundingClientRect(); return r.width > 30 && r.height > 14; }).slice(0, lim).map(e => ({ tag: e.tagName, text: (e.textContent || '').trim().slice(0, 60), cls: String(e.className||'').slice(0,50), ...rect(e) }));
    return { w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight, lang: document.documentElement.lang, nav: Array.from(document.querySelectorAll('nav a, aside a')).map(a => (a.textContent||'').trim()).slice(0,14), headings: grab('main h1, main h2, main h3'), cards: grab('main [class*=card], main [class*=metric], main section'), svgs: grab('main svg'), buttons: grab('main button'), links: Array.from(document.querySelectorAll('a')).map(a=>a.getAttribute('href')).filter(Boolean).slice(0,40) };
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: TEX + '/' + name + '.png', fullPage: true });
  fs.writeFileSync(ROOT + '/capture/layout-en-' + name + '.json', JSON.stringify(info, null, 1));
  meta.pages.push({ name, url: page.url(), w: info.w, h: info.h, lang: info.lang, extra });
  log('SHOT', name, info.w + 'x' + info.h, 'lang=' + info.lang, 'EN=' + info.nav.slice(0,3).join('/'));
  return info;
}

// ── desktop: SPA navigation so language state persists ──
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, locale: 'en-US' });
const page = await ctx.newPage();
await page.goto(BASE + '/welcome', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(1500);
const demo = page.locator('button:has-text("免登录试用"), a:has-text("免登录试用")').first();
if (await demo.count()) await demo.click();
await page.waitForTimeout(6000);
await waitNav(page);
const enOk = await ensureEN(page);
log('EN OK', enOk);
meta.notes.storage = await page.evaluate(() => Object.fromEntries(Object.keys(localStorage).map(k => [k, String(localStorage.getItem(k)).slice(0,60)])));

// workbench (wait data)
for (let i = 0; i < 8; i++) { const b = await page.evaluate(() => document.body.innerText); if (/Completed room revenue/.test(b) && !/Investigating revenue period/.test(b)) break; await page.waitForTimeout(4000); }
await dump(page, 'app-workbench');

// workbench: expand full report and capture expanded state
let reportHref = null;
for (const t of ['Read full report', 'Read the full report']) {
  const el = page.locator('button:has-text("' + t + '"), a:has-text("' + t + '")').first();
  if (await el.count()) { await el.click().catch(()=>{}); await page.waitForTimeout(5000); log('clicked', t); break; }
}
let info = await page.evaluate(() => ({ body: document.body.innerText.slice(0, 3000), links: Array.from(document.querySelectorAll('a')).map(a=>a.getAttribute('href')).filter(h=>h && /report/i.test(h)) }));
log('after expand links', JSON.stringify(info.links));
reportHref = info.links[0] || null;
await dump(page, 'app-workbench-report');
if (!reportHref) {
  // maybe inline expansion: look for report headings in DOM now
  meta.notes.expandedText = info.body;
}

// SPA nav to analysis
const navClick = async (label) => {
  const a = page.locator('nav a, aside a').filter({ hasText: label }).first();
  if (await a.count()) { await a.click().catch(()=>{}); await page.waitForTimeout(3500); return true; }
  return false;
};
await navClick('Business data');
await ensureEN(page);
await page.waitForTimeout(3000);
let aInfo = await dump(page, 'app-analysis');
// tabs
for (const [label, name] of [['Bookings & import', 'app-import'], ['Room inventory', 'app-rooms']]) {
  const btns = await page.evaluate(() => Array.from(document.querySelectorAll('main button')).map(b => (b.textContent||'').trim()).slice(0,30));
  const tab = page.locator('main button').filter({ hasText: label }).first();
  if (await tab.count()) { await tab.click().catch(()=>{}); await page.waitForTimeout(3500); await dump(page, name); }
  else { log('tab missing', label, JSON.stringify(btns)); }
}

// market
await navClick('Market research'); await ensureEN(page); await page.waitForTimeout(4500); await dump(page, 'app-market');
// promotion
await navClick('Promotion plans'); await ensureEN(page); await page.waitForTimeout(5000); await dump(page, 'app-promo-simple');
const promoText = await page.evaluate(() => document.body.innerText);
meta.notes.promoText = promoText.slice(0, 2500);
for (const t of ['Social', 'Social copy']) {
  const tab = page.locator('main button, [role=tab]').filter({ hasText: new RegExp('^' + t) }).first();
  if (await tab.count()) { await tab.click().catch(()=>{}); await page.waitForTimeout(3000); break; }
}
await dump(page, 'app-promo-traffic');
meta.notes.promoText2 = (await page.evaluate(() => document.body.innerText)).slice(0, 2500);
// report via route if found
if (reportHref) {
  await page.goto(BASE + reportHref, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(5000); await ensureEN(page);
  await dump(page, 'app-report');
  meta.notes.reportHref = reportHref;
  meta.notes.reportText = (await page.evaluate(() => document.body.innerText)).slice(0, 5000);
}
fs.writeFileSync(ROOT + '/capture/meta4-desktop.json', JSON.stringify(meta, null, 1));
await ctx.close();
log('DESKTOP DONE');

// ── mobile SPA ──
const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'en-US', isMobile: true, hasTouch: true });
const mp = await mctx.newPage();
await mp.goto(BASE + '/welcome', { waitUntil: 'domcontentloaded', timeout: 60000 });
await mp.waitForTimeout(1500);
const md = mp.locator('button:has-text("免登录试用"), a:has-text("免登录试用")').first();
if (await md.count()) await md.click();
await mp.waitForTimeout(6000); await waitNav(mp);
const mEnOk = await ensureEN(mp);
log('MOBILE EN', mEnOk);
const mNavClick = async (label) => {
  const a = mp.locator('nav a, a').filter({ hasText: label }).first();
  if (await a.count()) { await a.click().catch(()=>{}); await mp.waitForTimeout(3000); return true; }
  return false;
};
await mp.waitForTimeout(4000);
await dump(mp, 'm-workbench');
for (const [label, name] of [['Data', 'm-analysis'], ['Market', 'm-market'], ['Promotion', 'm-promotion']]) {
  await mNavClick(label);
  await ensureEN(mp);
  await mp.waitForTimeout(3500);
  await dump(mp, name);
}
if (meta.notes.reportHref) {
  await mp.goto(BASE + meta.notes.reportHref, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await mp.waitForTimeout(5000); await ensureEN(mp); await dump(mp, 'm-report');
}
fs.writeFileSync(ROOT + '/capture/meta4-mobile.json', JSON.stringify(meta, null, 1));
await mctx.close(); await browser.close();
log('DONE');
