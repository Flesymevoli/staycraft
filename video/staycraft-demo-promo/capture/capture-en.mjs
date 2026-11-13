
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire('C:/个人/学习/ENT207/Homestay AI assistant/frontend/package.json');
const { chromium } = require('playwright');
const ROOT = 'C:/个人/学习/ENT207/Homestay AI assistant/video/staycraft-demo-promo';
const TEX = ROOT + '/public/textures';
const CJK = /[\u4e00-\u9fff]/;
const log = (...a) => console.log('[cap]', ...a);

const MAPPING = [
  ['11/14 周六 · 100% 满房', '11/14 Sat · 100% booked'],
  ['周边中位数 ¥540/晚', 'Nearby median ¥540/night'],
  ['11/14(六)', '11/14 Sat'],
  ['11/15(日)', '11/15 Sun'],
  ['11-14 (六)', '11-14 Sat'],
  ['11-15 (日)', '11-15 Sun'],
  ['11-14(六)', '11-14 Sat'],
  ['11-15(日)', '11-15 Sun'],
  ['¥488 / 晚', '¥488 / night'],
  ['3 项活动', '3 activities'],
  ['(7天)', '(7 days)'],
  ['每日分摊预订金额', 'Allocated booking value'],
  ['每日已订间夜分布', 'Daily booked nights'],
  ['每日订单平均房价', 'Daily average room rate'],
  ['每日预订占用率走势', 'Daily booked occupancy trend'],
  ['15 间夜', '15 room nights'],
  ['9 间夜', '9 room nights'],
  ['11 间夜', '11 room nights'],
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
  ['收起详情', 'Hide details'],
  ['查看详情', 'View details'],
  ['收起', 'Hide'],
];
const patch = () => {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n; let changed = 0;
  while ((n = walker.nextNode())) {
    let t = n.nodeValue; let o = t;
    for (const [a, b] of MAPPING) if (t.includes(a)) t = t.split(a).join(b);
    if (t !== o) { n.nodeValue = t; changed++; }
  }
  // placeholder / title attributes
  for (const el of document.querySelectorAll('[placeholder]')) {
    let p = el.getAttribute('placeholder');
    for (const [a, b] of MAPPING) if (p.includes(a)) p = p.split(a).join(b);
    for (const ch of ['搜索订单号、房号或输入问题回车提问…']) if (p.includes(ch)) p = 'Search orders, rooms or ask a question…';
    el.setAttribute('placeholder', p);
  }
  return changed;
};
const jscan = (rootSel) => {
  const root = document.querySelector(rootSel); if (!root) return [];
  return Array.from(root.querySelectorAll('article, section.docked-ai-card, .opp-card')).map((el, i) => {
    const r = el.getBoundingClientRect();
    return { i, tag: el.tagName, cls: String(el.className).slice(0, 80), id: el.id || '', x: +(r.x + window.scrollX).toFixed(1), y: +(r.y + window.scrollY).toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1), text: (el.innerText || '').replace(/\s+/g, ' ').slice(0, 120) };
  });
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
await page.waitForTimeout(800);
log('patched text nodes:', await page.evaluate(patch));
const layout = { viewport: { w: 1440, h: 900, dsf: 2 }, views: {}, errors };
const views = ['workbench', 'analysis', 'explore'];
for (const v of views) {
  await page.evaluate((vv) => window.switchView(vv), v);
  await page.waitForTimeout(800);
  await page.evaluate(patch);
  await page.waitForTimeout(200);
  // app shell at design viewport
  await page.screenshot({ path: TEX + '/app-' + v + '.png' });
  // full section element
  const sec = page.locator('#view-' + v);
  const box = await sec.boundingBox();
  await sec.screenshot({ path: TEX + '/page-' + v + '.png' });
  const info = await page.evaluate((vv) => {
    const pb = document.querySelector('.page-body') || document.scrollingElement;
    const s = document.getElementById('view-' + vv);
    const r = s.getBoundingClientRect();
    const ir = vv === 'workbench' ? document.querySelector('.main-canvas, .workspace-canvas, .content') : null;
    return { section: { x: r.x + window.scrollX, y: r.y + window.scrollY, w: r.width, h: r.height }, pageBody: { clientH: pb.clientHeight, scrollH: pb.scrollHeight, scrollTop: pb.scrollTop }, doc: { w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight }, cards: null };
  }, v);
  info.cards = await page.evaluate(() => {
    const out = [];
    const sel = ['#view-workbench .kpi-card', '#view-workbench .hero-composite-top', '#view-workbench .bento-card', '#view-workbench .opp-card',
      '#view-analysis .kpi-card', '#view-analysis .bento-card',
      '#view-explore .bento-card', '#view-explore .quote-row'];
    for (const s of sel) for (const el of document.querySelectorAll(s)) {
      const r = el.getBoundingClientRect();
      out.push({ sel: s, cls: String(el.className).slice(0, 70), id: el.id || '', x: +(r.x + window.scrollX).toFixed(1), y: +(r.y + window.scrollY).toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1), text: (el.innerText || '').replace(/\s+/g, ' ').slice(0, 100) });
    }
    return out;
  });
  layout.views[v] = info;
  const cards = page.locator('#view-' + v + ' article.bento-card, #view-' + v + ' article.kpi-card, #view-' + v + ' .hero-composite-top, #view-' + v + ' .opp-card, #view-explore .quote-row');
  const cnt = await cards.count();
  for (let i = 0; i < cnt; i++) {
    const el = cards.nth(i);
    const b = await el.boundingBox();
    if (!b || b.width < 200 || b.height < 80) continue;
    await el.screenshot({ path: TEX + '/cards/' + v + '-' + String(i).padStart(2, '0') + '.png' }).catch(() => {});
  }
  log(v, 'section', JSON.stringify(info.section), 'cards', cnt, 'scrollH', info.pageBody.scrollH);
}
// explore collapsed state
await page.evaluate(() => window.switchView('explore'));
await page.waitForTimeout(600);
const hide = page.locator('button:has-text("Hide details")').first();
if (await hide.count()) { await hide.click(); await page.waitForTimeout(600); await page.evaluate(patch); await page.locator('#view-explore').screenshot({ path: TEX + '/page-explore-collapsed.png' }); }
// tall shell capture (does layout hold?)
const tall = await page.evaluate(() => {
  const pb = document.querySelector('.page-body') || document.scrollingElement;
  return { clientH: pb.clientHeight, scrollH: pb.scrollHeight, docH: document.documentElement.scrollHeight };
});
log('tall metrics', JSON.stringify(tall));
const newH = Math.min(2400, Math.max(900, tall.clientH + (tall.scrollH - tall.clientH)));
await page.setViewportSize({ width: 1440, height: newH });
await page.waitForTimeout(900);
await page.evaluate(patch);
await page.screenshot({ path: TEX + '/_tall-workbench.png' });
// CJK leftovers per view (report only)
const leftovers = {};
for (const v of views) {
  await page.evaluate((vv) => window.switchView(vv), v);
  await page.waitForTimeout(400);
  leftovers[v] = await page.evaluate((vv) => {
    const el = document.getElementById('view-' + vv); if (!el) return [];
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); const out = []; let n;
    while ((n = w.nextNode())) if (/[\u4e00-\u9fff]/.test(n.nodeValue)) out.push(n.nodeValue.trim());
    return Array.from(new Set(out)).slice(0, 60);
  }, v);
}
layout.leftovers = leftovers;
layout.texts = await page.evaluate(() => {
  const o = {};
  for (const v of ['workbench', 'analysis', 'explore']) { const el = document.getElementById('view-' + v); o[v] = el ? el.innerText : ''; }
  return o;
});
fs.writeFileSync(ROOT + '/capture/layout-en.json', JSON.stringify(layout, null, 1));
fs.writeFileSync(ROOT + '/capture/text-en.json', JSON.stringify(layout.texts, null, 1));
log('CJK leftovers:', JSON.stringify(leftovers).slice(0, 1500));
log('errors', errors.length);
await browser.close();
log('DONE');
