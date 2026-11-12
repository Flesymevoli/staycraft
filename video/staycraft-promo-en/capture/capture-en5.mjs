
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire('C:/个人/学习/ENT207/Homestay AI assistant/frontend/package.json');
const { chromium } = require('playwright');
const ROOT = 'C:/个人/学习/ENT207/Homestay AI assistant/video/staycraft-promo-en';
const TEX = ROOT + '/public/textures';
const BASE = 'https://staycraft.online';
const log = (...a) => console.log('[cap]', ...a);
const meta = { at: new Date().toISOString(), pages: [], notes: {} };
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--no-sandbox', '--disable-http2'] });

async function goto(page, url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try { await page.goto(url, { waitUntil: 'commit', timeout: 60000 }); await page.waitForTimeout(1200); return true; }
    catch (e) { log('goto fail', i, url, String(e).slice(0, 100)); await page.waitForTimeout(4000); }
  }
  return false;
}
async function waitBody(page, test, ms = 20000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const b = await page.evaluate(() => document.body ? document.body.innerText : '').catch(() => '');
    if (test(b)) return b;
    await page.waitForTimeout(800);
  }
  return await page.evaluate(() => document.body ? document.body.innerText : '').catch(() => '');
}
async function isEN(page) {
  const nav = await page.evaluate(() => Array.from(document.querySelectorAll('nav a, aside a')).map(a => (a.textContent||'').trim())).catch(() => []);
  return nav.some(t => /Workbench|Business data|Market research/.test(t));
}
async function ensureEN(page) {
  for (let i = 0; i < 8; i++) {
    if (await isEN(page)) return true;
    const btn = page.locator('button').filter({ hasText: /^EN$/ }).first();
    if (await btn.count()) { await btn.click({ timeout: 4000 }).catch(()=>{}); }
    await page.waitForTimeout(1200);
  }
  return await isEN(page);
}
async function dump(page, name) {
  const info = await page.evaluate(() => {
    const rect = (el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x + scrollX), y: Math.round(r.y + scrollY), w: Math.round(r.width), h: Math.round(r.height) }; };
    const grab = (sel, lim = 50) => Array.from(document.querySelectorAll(sel)).filter(e => { const r = e.getBoundingClientRect(); return r.width > 30 && r.height > 14; }).slice(0, lim).map(e => ({ tag: e.tagName, text: (e.textContent || '').trim().slice(0, 60), cls: String(e.className||'').slice(0,50), ...rect(e) }));
    return { w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight, nav: Array.from(document.querySelectorAll('nav a, aside a')).map(a => (a.textContent||'').trim()).slice(0,14), headings: grab('main h1, main h2, main h3'), cards: grab('main [class*=card], main [class*=metric], main section'), svgs: grab('main svg'), buttons: grab('main button'), links: Array.from(document.querySelectorAll('a')).map(a=>a.getAttribute('href')).filter(Boolean).slice(0,40) };
  }).catch(() => ({ w:0,h:0,error:true }));
  await page.screenshot({ path: TEX + '/' + name + '.png', fullPage: true }).catch((e) => log('shot fail', name, String(e).slice(0,100)));
  fs.writeFileSync(ROOT + '/capture/layout-en-' + name + '.json', JSON.stringify(info, null, 1));
  meta.pages.push({ name, url: page.url(), w: info.w, h: info.h });
  log('SHOT', name, info.w + 'x' + info.h);
  return info;
}

const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, locale: 'en-US' });
const page = await ctx.newPage();
if (!(await goto(page, BASE + '/welcome'))) { log('FATAL welcome'); fs.writeFileSync(ROOT + '/capture/meta5.json', JSON.stringify(meta)); await browser.close(); process.exit(2); }
await waitBody(page, b => /免登录试用/.test(b), 15000);
let demo = page.locator('button:has-text("免登录试用"), a:has-text("免登录试用")').first();
if (await demo.count()) await demo.click().catch(()=>{});
await waitBody(page, b => /工作台|Workbench/.test(b), 20000);
await page.waitForTimeout(2500);
const enOk = await ensureEN(page);
log('EN OK', enOk);
await waitBody(page, b => /Workbench|Know what matters/.test(b), 15000);
await dump(page, 'app-workbench');
// expand report
let reportHref = null;
for (const t of ['Read full report', 'Read the full report']) {
  const el = page.locator('button:has-text("' + t + '"), a:has-text("' + t + '")').first();
  if (await el.count()) { await el.click({ timeout: 5000 }).catch(()=>{}); await page.waitForTimeout(5000); log('expanded', t); break; }
}
const links = await page.evaluate(() => Array.from(document.querySelectorAll('a')).map(a=>a.getAttribute('href')).filter(Boolean)).catch(()=>[]);
reportHref = links.find(h => /\/app\/reports\//.test(h)) || null;
meta.notes.reportHref = reportHref;
meta.notes.links = links.slice(0, 30);
await dump(page, 'app-workbench-report');
// SPA nav
const navClick = async (label) => {
  const a = page.locator('nav a, aside a').filter({ hasText: label }).first();
  if (await a.count()) { await a.click({ timeout: 5000 }).catch(()=>{}); await page.waitForTimeout(3500); return true; }
  return false;
};
await navClick('Business data'); await ensureEN(page); await page.waitForTimeout(2500);
await dump(page, 'app-analysis');
for (const [label, name] of [['Bookings & import', 'app-import'], ['Room inventory', 'app-rooms']]) {
  const tab = page.locator('main button').filter({ hasText: label }).first();
  if (await tab.count()) { await tab.click({ timeout: 5000 }).catch(()=>{}); await page.waitForTimeout(3500); await dump(page, name); }
  else log('tab missing', label);
}
await navClick('Market research'); await ensureEN(page); await page.waitForTimeout(4500); await dump(page, 'app-market');
await navClick('Promotion plans'); await ensureEN(page); await page.waitForTimeout(5000); await dump(page, 'app-promo-simple');
meta.notes.promoText = await page.evaluate(() => document.body.innerText).catch(()=>'');
await page.screenshot({ path: TEX + '/app-promotion.png', fullPage: true }).catch(()=>{});
for (const t of ['Social']) {
  const tab = page.locator('main button, [role=tab]').filter({ hasText: new RegExp('^' + t) }).first();
  if (await tab.count()) { await tab.click({ timeout: 5000 }).catch(()=>{}); await page.waitForTimeout(3000); break; }
}
await dump(page, 'app-promo-traffic');
meta.notes.promoText2 = await page.evaluate(() => document.body.innerText).catch(()=>'');
if (reportHref) {
  await goto(page, BASE + reportHref);
  await page.waitForTimeout(5000); await ensureEN(page);
  await dump(page, 'app-report');
  meta.notes.reportText = await page.evaluate(() => document.body.innerText).catch(()=>'');
} else {
  meta.notes.reportText = await page.evaluate(() => document.body.innerText).catch(()=>'');
}
fs.writeFileSync(ROOT + '/capture/meta5.json', JSON.stringify(meta, null, 1));
await ctx.close(); await browser.close();
log('DONE');
