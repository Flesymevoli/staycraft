
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire('C:/个人/学习/ENT207/Homestay AI assistant/frontend/package.json');
const { chromium } = require('playwright');
const ROOT = 'C:/个人/学习/ENT207/Homestay AI assistant/video/staycraft-promo-en';
const TEX = ROOT + '/public/textures';
const BASE = 'https://staycraft.online';
const log = (...a) => console.log('[c6]', ...a);
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--no-sandbox', '--disable-http2'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, locale: 'en-US' });
const page = await ctx.newPage();
// block model-triggering endpoints: we only need read-only revenue/chart data, not a new AI run
let blocked = 0;
await page.route('**/api/workspace/agent**', (r) => { blocked++; r.abort(); });
await page.route('**/api/workspace/decision**', (r) => { blocked++; r.abort(); });
async function goto(url) { for (let i=0;i<3;i++){ try { await page.goto(url,{waitUntil:'commit',timeout:60000}); await page.waitForTimeout(1500); return true; } catch(e){ log('goto fail', i, String(e).slice(0,80)); await page.waitForTimeout(4000);} } return false; }
async function isEN(){ const n=await page.evaluate(()=>Array.from(document.querySelectorAll('nav a, aside a')).map(a=>(a.textContent||'').trim())).catch(()=>[]); return n.some(t=>/Workbench|Business data/.test(t)); }
async function ensureEN(){ for(let i=0;i<8;i++){ if(await isEN()) return true; const b=page.locator('button').filter({hasText:/^EN$/}).first(); if(await b.count()){ await b.click({timeout:4000}).catch(()=>{});} await page.waitForTimeout(1200);} return await isEN(); }
if (!(await goto(BASE + '/welcome'))) { await browser.close(); process.exit(2); }
await page.waitForTimeout(1200);
const demo = page.locator('button:has-text("免登录试用"), a:has-text("免登录试用")').first();
if (await demo.count()) await demo.click().catch(()=>{});
await page.waitForTimeout(2500);
// go straight to analysis (block agent above)
await goto(BASE + '/app/analysis');
await page.waitForTimeout(4000);
await ensureEN();
// wait for data
for (let i = 0; i < 12; i++) {
  const b = await page.evaluate(() => document.body.innerText).catch(()=> '');
  if (/Booked occupancy/.test(b) && /54\.3/.test(b)) break;
  await page.waitForTimeout(3000);
}
log('blocked agent calls:', blocked);
// expand the revenue accordion
const cands = ['Completed booking value & calendar', 'Completed booking value', 'Completed booking value and calendar'];
let clicked = null;
for (const t of cands) {
  const el = page.locator('button:has-text("' + t + '"), summary:has-text("' + t + '"), [role=button]:has-text("' + t + '")').first();
  if (await el.count()) { await el.click({ timeout: 6000 }).catch(()=>{}); clicked = t; await page.waitForTimeout(4000); break; }
}
log('accordion clicked:', clicked);
const info = await page.evaluate(() => {
  const rect = (el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x + scrollX), y: Math.round(r.y + scrollY), w: Math.round(r.width), h: Math.round(r.height) }; };
  const all = Array.from(document.querySelectorAll('section, div')).filter(e => /Completed booking value/.test((e.textContent||'')) && (e.textContent||'').length < 600);
  const boxes = all.slice(0, 6).map(e => ({ cls: String(e.className||'').slice(0,50), text: (e.textContent||'').trim().slice(0,120), ...rect(e) }));
  return { w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight, boxes, text: document.body.innerText.slice(0, 3500) };
});
log('page', info.w + 'x' + info.h);
log('boxes', JSON.stringify(info.boxes, null, 1));
await page.screenshot({ path: TEX + '/en-analysis-revenue.png', fullPage: true });
fs.writeFileSync(ROOT + '/capture/meta6.json', JSON.stringify({ info, clicked, blocked }, null, 1));
await browser.close(); log('DONE');
