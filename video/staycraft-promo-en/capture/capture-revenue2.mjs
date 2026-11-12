
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire('C:/个人/学习/ENT207/Homestay AI assistant/frontend/package.json');
const { chromium } = require('playwright');
const ROOT = 'C:/个人/学习/ENT207/Homestay AI assistant/video/staycraft-promo-en';
const TEX = ROOT + '/public/textures';
const log = (...a) => console.log('[c7]', ...a);
const urls = ['https://staycraft.online/welcome', 'https://staycraft.online/'];
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--no-sandbox', '--disable-http2', '--disable-quic'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, locale: 'en-US' });
const page = await ctx.newPage();
async function tryGoto(url, label) {
  for (let i = 0; i < 6; i++) {
    try { await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 }); log(label, 'ok', i); await page.waitForTimeout(1500); return true; }
    catch (e) { log(label, 'fail', i, String(e).slice(0, 90)); await page.waitForTimeout(3000 + i * 2000); }
  }
  return false;
}
let ok = false;
for (const u of urls) { if (await tryGoto(u, u)) { ok = true; break; } }
if (!ok) { log('NO SITE'); await browser.close(); process.exit(3); }
// enter demo if present
const demo = page.locator('button:has-text("免登录试用"), a:has-text("免登录试用")').first();
if (await demo.count()) await demo.click().catch(()=>{});
await page.waitForTimeout(3000);
await tryGoto('https://staycraft.online/app/analysis', 'analysis');
await page.waitForTimeout(3000);
// EN
const navTxt = async () => page.evaluate(() => Array.from(document.querySelectorAll('nav a, aside a')).map(a => (a.textContent||'').trim())).catch(()=>[]);
for (let i = 0; i < 8; i++) {
  const n = await navTxt();
  if (n.some(t => /Workbench|Business data/.test(t))) break;
  const en = page.locator('button').filter({ hasText: /^EN$/ }).first();
  if (await en.count()) { await en.click({ timeout: 5000 }).catch(()=>{}); }
  await page.waitForTimeout(1500);
}
// wait for metrics
for (let i = 0; i < 10; i++) {
  const b = await page.evaluate(() => document.body.innerText).catch(()=> '');
  if (/Booked occupancy/.test(b) && /54\.3/.test(b)) break;
  await page.waitForTimeout(2500);
}
// expand the revenue accordion (try several selectors)
let clicked = null;
for (const sel of ['text=Completed booking value & calendar', 'text=Completed booking value', 'summary:has-text("Completed booking value")']) {
  try {
    const el = page.locator(sel).first();
    if (await el.count()) {
      await el.scrollIntoViewIfNeeded().catch(()=>{});
      await el.click({ timeout: 6000 });
      clicked = sel;
      await page.waitForTimeout(4000);
      break;
    }
  } catch (e) { log('click fail', sel); }
}
log('clicked', clicked);
// if number still absent, try pressing the arrow area near the text
let txt = await page.evaluate(() => document.body.innerText).catch(()=> '');
if (!/1,579|1579/.test(txt)) {
  try {
    const h = page.locator('text=Completed booking value & calendar').first();
    const box = await h.boundingBox();
    if (box) { await page.mouse.click(box.x - 18, box.y + box.height / 2); await page.waitForTimeout(3500); }
  } catch (e) { log('arrow click fail'); }
  txt = await page.evaluate(() => document.body.innerText).catch(()=> '');
}
log('HAS 1579:', /1,579|1579/.test(txt));
const info = await page.evaluate(() => {
  const rect = (el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x + scrollX), y: Math.round(r.y + scrollY), w: Math.round(r.width), h: Math.round(r.height) }; };
  const hits = Array.from(document.querySelectorAll('section, div')).filter(e => /Completed booking value/.test(e.textContent||'')).slice(0, 8).map(e => ({ cls: String(e.className||'').slice(0,40), text: (e.textContent||'').trim().slice(0,160), ...rect(e) }));
  return { w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight, hits, has1579: /1,579|1579/.test(document.body.innerText) };
});
log('page', info.w + 'x' + info.h, 'has1579', info.has1579);
log(JSON.stringify(info.hits, null, 1));
await page.screenshot({ path: TEX + '/en-analysis-revenue.png', fullPage: true }).catch((e) => log('shot fail'));
fs.writeFileSync(ROOT + '/capture/meta7.json', JSON.stringify({ clicked, info, text: txt.slice(0, 2500) }, null, 1));
await browser.close(); log('DONE');
