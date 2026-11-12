// Read the homestay result list from a real Ctrip search URL. Read-only discovery:
// no booking, no price change, no barrier bypass. Prints candidates for the watchlist.
import {chromium} from 'playwright';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../.price-monitor');
const url = process.argv[2];
if (!url || !/^https:\/\/hotels\.ctrip\.com\/hotels\/list\?/.test(url)) {
  console.error('USAGE: node scripts/probe-ctrip-search-results.mjs "<result url>"');
  process.exit(1);
}

const context = await chromium.launchPersistentContext(path.join(root, 'browser-profile'), {headless: true, locale: 'zh-CN', viewport: {width: 1366, height: 940}});
const report = {url, finalUrl: null, barrier: null, loggedIn: null, resultCountLine: null, items: []};
try {
  const page = await context.pages()[0] || await context.newPage();
  await page.goto(url, {waitUntil: 'domcontentloaded', timeout: 45000});
  await page.waitForTimeout(4500);
  report.finalUrl = page.url();
  const body = await page.locator('body').innerText().catch(() => '');
  report.loggedIn = /我的订单|尊敬/.test(body);
  report.barrier = /请完成安全验证|拖动滑块|请完成下面的验证测试|请按顺序点选图标/.test(body) ? 'verification_required' : (page.url().includes('passport.ctrip.com') ? 'login_required' : null);
  report.resultCountLine = body.split('\n').map(line => line.trim()).find(line => /找到\s*\d+\s*家/.test(line)) || null;
  report.hasCity = /太仓/.test(body);

  const links = await page.locator('a[href*="/hotels/"]').evaluateAll(nodes => nodes.map(node => ({href: node.getAttribute('href') || '', text: (node.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 80)})));
  const seen = new Set();
  for (const link of links) {
    const match = link.href.match(/\/hotels\/(\d+)\.html/);
    if (!match || seen.has(match[1]) || link.text.length < 3) continue;
    seen.add(match[1]);
    report.items.push({hotelId: match[1], name: link.text, href: `https://hotels.ctrip.com/hotels/${match[1]}.html`});
    if (report.items.length >= 20) break;
  }
  // The card list is rendered without plain anchors; dump structure hints for the next step.
  report.allLinks = await page.locator('a[href]').evaluateAll(nodes => nodes.slice(0, 60).map(node => ({href: node.getAttribute('href') || '', text: (node.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 60)})));
  report.dataAttrs = await page.locator('[data-hotel-id], [data-id], [data-hotelname], [data-testid]').evaluateAll(nodes => nodes.slice(0, 30).map(node => ({tag: node.tagName, cls: (node.className || '').toString().slice(0, 60), testid: node.getAttribute('data-testid'), hotelId: node.getAttribute('data-hotel-id'), id: node.getAttribute('data-id')})));
  report.cardCandidates = await page.locator('[class*="hotel"], [class*="card"], [class*="list"]').evaluateAll(nodes => nodes.slice(0, 25).map(node => ({tag: node.tagName, cls: (node.className || '').toString().slice(0, 80), text: (node.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 100)})));
  const fs = await import('node:fs');
  fs.writeFileSync(path.resolve(import.meta.dirname, '..', '..', 'tmp', 'ctrip-list.txt'), body);
  report.bodyFile = 'tmp/ctrip-list.txt';
  // A price hint per card is nice-to-have; keep a short list of lines that look like prices.
  report.priceLines = body.split('\n').map(line => line.trim()).filter(line => /^¥\s?[\d,]+|\d+起$|最低价/.test(line)).slice(0, 20);
} catch (error) {
  report.error = error instanceof Error ? error.message : String(error);
} finally {
  await context.close().catch(() => {});
  console.log(JSON.stringify(report, null, 2));
}
