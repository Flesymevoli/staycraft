
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire('C:/个人/学习/ENT207/Homestay AI assistant/frontend/package.json');
const { chromium } = require('playwright');
const ROOT = 'C:/个人/学习/ENT207/Homestay AI assistant/video/staycraft-demo-promo';
const TEX = ROOT + '/public/textures';
const log = (...a) => console.log('[cap]', ...a);
const MAPPING = [
  ['11/14 周六 · 100% 满房', '11/14 Sat · 100% booked'],
  ['周边中位数 ¥540/晚', 'Nearby median ¥540/night'],
  ['11/14(六)', '11/14 Sat'], ['11/15(日)', '11/15 Sun'],
  ['11-14 (六)', '11-14 Sat'], ['11-15 (日)', '11-15 Sun'],
  ['11-14(六)', '11-14 Sat'], ['11-15(日)', '11-15 Sun'],
  ['¥488 / 晚', '¥488 / night'], ['3 项活动', '3 activities'],
  ['(7天)', '(7 days)'], ['每日分摊预订金额', 'Allocated booking value'],
  ['每日已订间夜分布', 'Daily booked nights'], ['每日订单平均房价', 'Daily average room rate'],
  ['每日预订占用率走势', 'Daily booked occupancy trend'],
  ['15 间夜', '15 room nights'], ['9 间夜', '9 room nights'], ['11 间夜', '11 room nights'],
  ['/晚', '/night'],
  ['含双早 / 入住前1天免费退 / 含税', 'Breakfast included / Free cancellation 1 day before / Tax included'],
  ['2026-11-14 入住 · 1 晚 · 2 成人', 'Check-in 2026-11-14 · 1 night · 2 adults'],
  ['11-09 18:00 采集为 ¥520 (+¥48)', 'Collected 11-09 18:00 at ¥520 (+¥48)'],
  ['乌镇水巷临河精品美宿', 'Wuzhen Water Lane Riverside Boutique'],
  ['西塘烟雨栖舍庭院客栈', 'Xitang Misty Rain Courtyard Inn'],
  ['枕水江南设计度假酒店', 'Jiangnan Waterside Design Resort'],
  ['静逸庭院双床房·舒适型·计入统计', 'Courtyard Twin · Comfort · Counted'],
  ['临河露台大床房·舒适型·计入统计', 'Riverside Terrace Double · Comfort · Counted'],
  ['同条件上次采集对比', 'Previous capture'],
  ['可售 · 日历参考价', 'Available · Calendar price'],
  ['入住条件', 'Stay conditions'],
  ['不含早 / 不可取消 / 含税', 'Room only / Non-refundable / Tax included'],
  ['含定制双早 / 提前24h免费退 / 含税', 'Custom breakfast / Free cancellation 24h before / Tax included'],
  ['2026-11-10 16:30 (北京时间)', '2026-11-10 16:30 (Beijing time)'],
  ['收起详情', 'Hide details'], ['查看详情', 'View details'],
];
const patchBrowser = ({ mapping }) => {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n; let changed = 0;
  while ((n = walker.nextNode())) {
    let t = n.nodeValue, o = t;
    for (const [a, b] of mapping) if (t.includes(a)) t = t.split(a).join(b);
    if (t !== o) { n.nodeValue = t; changed++; }
  }
  for (const el of document.querySelectorAll('[placeholder]')) {
    let p = el.getAttribute('placeholder') || '';
    for (const [a, b] of mapping) if (p.includes(a)) p = p.split(a).join(b);
    if (p.includes('搜索订单号')) p = 'Search orders, rooms or ask a question…';
    el.setAttribute('placeholder', p);
  }
  return changed;
};
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, locale: 'en-US' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e).slice(0, 160)));
await page.goto('http://127.0.0.1:4177/concept/index.html', { waitUntil: 'load', timeout: 60000 });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1000);
await page.click('#langBtn');
await page.waitForTimeout(900);
log('patched text nodes:', await page.evaluate(patchBrowser, { mapping: MAPPING }));
const layout = { viewport: { w: 1440, h: 900, dsf: 2 }, views: {}, errors };
for (const v of ['workbench', 'analysis', 'explore']) {
  await page.evaluate((vv) => window.switchView(vv), v);
  await page.waitForTimeout(900);
  await page.evaluate(patchBrowser, { mapping: MAPPING });
  await page.waitForTimeout(250);
  await page.screenshot({ path: TEX + '/app-' + v + '.png' });
  await page.screenshot({ path: TEX + '/app-' + v + '-full.png', fullPage: true });
  const sec = page.locator('#view-' + v);
  await sec.screenshot({ path: TEX + '/page-' + v + '.png' });
  const info = await page.evaluate((vv) => {
    const pb = document.querySelector('.page-body') || document.scrollingElement;
    const s = document.getElementById('view-' + vv);
    const r = s.getBoundingClientRect();
    const cards = [];
    for (const sel of ['#view-' + vv + ' .kpi-card', '#view-' + vv + ' .hero-composite-top', '#view-' + vv + ' .bento-card', '#view-' + vv + ' .opp-card', '#view-explore .quote-row']) {
      for (const el of document.querySelectorAll(sel)) {
        const rb = el.getBoundingClientRect();
        cards.push({ sel, cls: String(el.className).slice(0, 70), id: el.id || '', x: +(rb.x).toFixed(1), y: +(rb.y).toFixed(1), w: +rb.width.toFixed(1), h: +rb.height.toFixed(1), docY: +(rb.y + window.scrollY).toFixed(1), text: (el.innerText || '').replace(/\s+/g, ' ').slice(0, 110) });
      }
    }
    return { section: { x: r.x, y: r.y, w: r.width, h: r.height }, pageBody: { clientH: pb.clientHeight, scrollH: pb.scrollHeight, scrollTop: pb.scrollTop }, doc: { w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight }, cards };
  }, v);
  layout.views[v] = info;
  const cards = page.locator('#view-' + v + ' article.kpi-card, #view-' + v + ' article.bento-card, #view-' + v + ' .hero-composite-top, #view-' + v + ' .opp-card, #view-explore .quote-row');
  const cnt = await cards.count();
  for (let i = 0; i < cnt; i++) {
    const el = cards.nth(i);
    const b = await el.boundingBox();
    if (!b || b.width < 200 || b.height < 80) continue;
    await el.screenshot({ path: TEX + '/cards/' + v + '-' + String(i).padStart(2, '0') + '.png' }).catch(() => {});
  }
  log(v, 'section', JSON.stringify(info.section), 'pageBody', JSON.stringify(info.pageBody), 'cards', cnt);
}
// explore collapsed
await page.evaluate(() => window.switchView('explore'));
await page.waitForTimeout(700);
await page.evaluate(patchBrowser, { mapping: MAPPING });
const hide = page.locator('button:has-text("Hide details")').first();
if (await hide.count()) { await hide.click(); await page.waitForTimeout(700); await page.evaluate(patchBrowser, { mapping: MAPPING }); await page.locator('#view-explore').screenshot({ path: TEX + '/page-explore-collapsed.png' }); await page.screenshot({ path: TEX + '/app-explore-collapsed-full.png', fullPage: true }); log('explore collapsed captured'); }
// tall shell
const tall = await page.evaluate(() => { const pb = document.querySelector('.page-body') || document.scrollingElement; return { clientH: pb.clientHeight, scrollH: pb.scrollHeight, docH: document.documentElement.scrollHeight }; });
log('tall metrics', JSON.stringify(tall));
await page.setViewportSize({ width: 1440, height: Math.min(2400, Math.max(900, tall.scrollH + 900 - tall.clientH)) });
await page.waitForTimeout(1000);
await page.evaluate(patchBrowser, { mapping: MAPPING });
await page.screenshot({ path: TEX + '/_tall-workbench.png' });
// leftovers
const leftovers = {};
for (const v of ['workbench', 'analysis', 'explore']) {
  await page.evaluate((vv) => window.switchView(vv), v);
  await page.waitForTimeout(500);
  leftovers[v] = await page.evaluate((vv) => {
    const el = document.getElementById('view-' + vv); if (!el) return [];
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); const out = []; let n;
    while ((n = w.nextNode())) if (/[\u4e00-\u9fff]/.test(n.nodeValue)) out.push(n.nodeValue.trim());
    return Array.from(new Set(out)).slice(0, 60);
  }, v);
}
layout.leftovers = leftovers;
layout.texts = await page.evaluate(() => { const o = {}; for (const v of ['workbench', 'analysis', 'explore']) { const el = document.getElementById('view-' + v); o[v] = el ? el.innerText : ''; } return o; });
fs.writeFileSync(ROOT + '/capture/layout-en.json', JSON.stringify(layout, null, 1));
fs.writeFileSync(ROOT + '/capture/text-en.json', JSON.stringify(layout.texts, null, 1));
log('leftovers', JSON.stringify(leftovers).slice(0, 1200));
log('errors', errors.length);
await browser.close();
log('DONE');
