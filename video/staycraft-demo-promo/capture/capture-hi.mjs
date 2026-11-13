
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire('C:/个人/学习/ENT207/Homestay AI assistant/frontend/package.json');
const { chromium } = require('playwright');
const ROOT = 'C:/个人/学习/ENT207/Homestay AI assistant/video/staycraft-demo-promo';
const HI = ROOT + '/public/textures/hi';
const MAPPING = [
  ['11/14 周六 · 100% 满房', '11/14 Sat · 100% booked'], ['周边中位数 ¥540/晚', 'Nearby median ¥540/night'],
  ['11/14(六)', '11/14 Sat'], ['11/15(日)', '11/15 Sun'], ['11-14 (六)', '11-14 Sat'], ['11-15 (日)', '11-15 Sun'],
  ['¥488 / 晚', '¥488 / night'], ['3 项活动', '3 activities'], ['(7天)', '(7 days)'],
  ['每日分摊预订金额', 'Allocated booking value'], ['15 间夜', '15 room nights'], ['9 间夜', '9 room nights'], ['11 间夜', '11 room nights'],
  ['/晚', '/night'], ['含双早 / 入住前1天免费退 / 含税', 'Breakfast included / Free cancellation 1 day before / Tax included'],
  ['不含早 / 不可取消 / 含税', 'Room only / Non-refundable / Tax included'],
  ['含定制双早 / 提前24h免费退 / 含税', 'Custom breakfast / Free cancellation 24h before / Tax included'],
  ['2026-11-14 入住 · 1 晚 · 2 成人', 'Check-in 2026-11-14 · 1 night · 2 adults'],
  ['11-09 18:00 采集为 ¥520 (+¥48)', 'Collected 11-09 18:00 at ¥520 (+¥48)'],
  ['2026-11-10 16:30 (北京时间)', '2026-11-10 16:30 (Beijing time)'],
  ['乌镇水巷临河精品美宿', 'Wuzhen Water Lane Riverside Boutique'], ['西塘烟雨栖舍庭院客栈', 'Xitang Misty Rain Courtyard Inn'],
  ['枕水江南设计度假酒店', 'Jiangnan Waterside Design Resort'],
  ['静逸庭院双床房·舒适型·计入统计', 'Courtyard Twin · Comfort · Counted'],
  ['临河露台大床房·舒适型·计入统计', 'Riverside Terrace Double · Comfort · Counted'],
  ['同条件上次采集对比', 'Previous capture'], ['可售 · 日历参考价', 'Available · Calendar price'],
  ['入住条件', 'Stay conditions'], ['收起详情', 'Hide details'], ['查看详情', 'View details'],
];
const patchBrowser = ({ mapping }) => {
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n;
  while ((n = w.nextNode())) { let t = n.nodeValue, o = t; for (const [a, b] of mapping) if (t.includes(a)) t = t.split(a).join(b); if (t !== o) n.nodeValue = t; }
  for (const el of document.querySelectorAll('[placeholder]')) { let p = el.getAttribute('placeholder') || ''; for (const [a, b] of mapping) if (p.includes(a)) p = p.split(a).join(b); el.setAttribute('placeholder', p); }
};
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--no-sandbox'] });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 3, locale: 'en-US' })).newPage();
await page.goto('http://127.0.0.1:4177/concept/index.html', { waitUntil: 'load', timeout: 60000 });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(900);
await page.click('#langBtn');
await page.waitForTimeout(700);
const targets = {
  workbench: [['kpi', '#view-workbench .kpi-row'], ['hero', '#view-workbench .bento-card:nth-of-type(1)'], ['signals', '#view-workbench .bento-card:nth-of-type(2)'], ['gauge', '#view-workbench .bento-card:nth-of-type(3)'], ['plan', '#view-workbench .bento-card:nth-of-type(4)'], ['opps', '#view-workbench .opp-grid'], ['roommix', '#view-workbench .room-mix, #view-workbench .mix-card']],
  analysis: [['kpis', '#view-analysis .kpi-row'], ['chart', '#view-analysis .bento-card:nth-of-type(1)'], ['table', '#view-analysis .bento-card:nth-of-type(2)']],
  explore: [['stats', '#view-explore .bento-card:nth-of-type(1)'], ['trend', '#view-explore .bento-card:nth-of-type(2)'], ['quotes', '#view-explore .bento-card:nth-of-type(3)']],
};
const geo = {};
for (const [view, list] of Object.entries(targets)) {
  await page.evaluate((v) => window.switchView(v), view);
  await page.waitForTimeout(700);
  await page.evaluate(patchBrowser, { mapping: MAPPING });
  await page.waitForTimeout(200);
  geo[view] = {};
  for (const [name, sel] of list) {
    const el = page.locator(sel).first();
    if (!(await el.count())) { console.log('missing', view, name, sel); continue; }
    const b = await el.boundingBox(); if (!b) continue;
    await el.screenshot({ path: HI + '/' + view + '-' + name + '.png' }).catch((e) => console.log('shotfail', view, name));
    geo[view][name] = { sel, x: +b.x.toFixed(2), y: +b.y.toFixed(2), w: +b.width.toFixed(2), h: +b.height.toFixed(2) };
  }
}
// chart internals
await page.evaluate(() => window.switchView('analysis'));
await page.waitForTimeout(500);
const chartGeo = await page.evaluate(() => {
  const card = document.querySelector('#view-analysis .bento-card');
  const svg = card ? card.querySelector('svg') : null;
  const cr = card ? card.getBoundingClientRect() : null, sr = svg ? svg.getBoundingClientRect() : null;
  const rows = Array.from(document.querySelectorAll('#view-analysis tbody tr')).map((tr) => { const r = tr.getBoundingClientRect(); return { y: +r.y.toFixed(2), h: +r.height.toFixed(2), text: tr.innerText.replace(/\s+/g, ' ') }; });
  return { card: cr ? { x: cr.x, y: cr.y, w: cr.width, h: cr.height } : null, svg: sr ? { x: sr.x, y: sr.y, w: sr.width, h: sr.height } : null, rows };
});
// workbench hero + gauge internals
await page.evaluate(() => window.switchView('workbench'));
await page.waitForTimeout(600);
const wbGeo = await page.evaluate(() => {
  const pick = (sel) => { const el = document.querySelector(sel); if (!el) return null; const r = el.getBoundingClientRect(); return { x: +r.x.toFixed(2), y: +r.y.toFixed(2), w: +r.width.toFixed(2), h: +r.height.toFixed(2), text: (el.innerText || '').replace(/\s+/g, ' ').slice(0, 160) }; };
  return { hero: pick('#view-workbench .hero-composite-top'), gauge: pick('#view-workbench .gauge-wrap'), gaugeSvg: pick('#workbenchGaugeSvg'), plan: pick('#view-workbench .bento-card:nth-of-type(4)'), signals: pick('#view-workbench .bento-card:nth-of-type(2)'), svgChart: pick('#view-workbench svg') };
});
fs.writeFileSync(ROOT + '/capture/layout-hi.json', JSON.stringify({ geo, chartGeo, wbGeo }, null, 1));
console.log('geo', JSON.stringify({ geo, chartGeo, wbGeo }).slice(0, 2500));
await browser.close();
