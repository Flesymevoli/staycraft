
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire('C:/个人/学习/ENT207/Homestay AI assistant/frontend/package.json');
const { chromium } = require('playwright');
const ROOT = 'C:/个人/学习/ENT207/Homestay AI assistant/video/staycraft-demo-promo';
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
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, locale: 'en-US' })).newPage();
await page.goto('http://127.0.0.1:4177/concept/index.html', { waitUntil: 'load', timeout: 60000 });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(900);
await page.click('#langBtn');
await page.waitForTimeout(700);
const out = { viewport: { w: 1440, h: 900 }, views: {} };
for (const v of ['workbench', 'analysis', 'explore']) {
  await page.evaluate((vv) => { window.scrollTo(0, 0); const pb = document.querySelector('.page-body'); if (pb) pb.scrollTop = 0; window.switchView(vv); }, v);
  await page.waitForTimeout(650);
  await page.evaluate(() => { window.scrollTo(0, 0); const pb = document.querySelector('.page-body'); if (pb) pb.scrollTop = 0; });
  await page.evaluate(patchBrowser, { mapping: MAPPING });
  const info = await page.evaluate((vv) => {
    const s = document.getElementById('view-' + vv);
    const r = s.getBoundingClientRect();
    const cards = [];
    for (const sel of ['#view-' + vv + ' .kpi-row', '#view-' + vv + ' .kpi-card', '#view-' + vv + ' .hero-composite-top', '#view-' + vv + ' .bento-card', '#view-' + vv + ' .opp-card', '#view-' + vv + ' .opp-grid', '#view-' + vv + ' .gauge-wrap', '#view-' + vv + ' .signal-card, #view-' + vv + ' .detector-grid', '#view-explore .quote-row']) {
      for (const el of document.querySelectorAll(sel)) {
        const rb = el.getBoundingClientRect();
        cards.push({ sel, cls: String(el.className).slice(0, 60), x: +rb.x.toFixed(2), y: +rb.y.toFixed(2), w: +rb.width.toFixed(2), h: +rb.height.toFixed(2), text: (el.innerText || '').replace(/\s+/g, ' ').slice(0, 90) });
      }
    }
    return { section: { x: +r.x.toFixed(2), y: +r.y.toFixed(2), w: +r.width.toFixed(2), h: +r.height.toFixed(2) }, doc: { w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight }, scrollY: window.scrollY, cards };
  }, v);
  out.views[v] = info;
  console.log(v, JSON.stringify({ section: info.section, doc: info.doc, scrollY: info.scrollY }));
}
fs.writeFileSync(ROOT + '/capture/layout-fixed.json', JSON.stringify(out, null, 1));
await browser.close();
