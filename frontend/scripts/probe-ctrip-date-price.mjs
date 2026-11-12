// Verify the core assumption for list-page collection: changing the stay date changes the
// card prices on the same result page. Read-only, two opens, no card clicks.
import {chromium} from 'playwright';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../.price-monitor');
const base = 'https://hotels.ctrip.com/hotels/list?countryId=1&city=654&provinceId=0&optionId=654&optionType=City&directSearch=1&optionName=%E6%B0%91%E5%AE%BF&display=%E6%B0%91%E5%AE%BF&crn=1&adult=1&children=0&domestic=1';
const urlFor = checkin => `${base}&checkin=${checkin}&checkout=${checkin.replace(/^(\d{4})\/(\d{2})\/(\d{2})$/, (_, y, m, d) => { const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d) + 1)); return `${date.getUTCFullYear()}/${String(date.getUTCMonth() + 1).padStart(2, '0')}/${String(date.getUTCDate()).padStart(2, '0')}`; })}`;

// Extract (name, first price) pairs from the rendered list text.
function parseCards(body) {
  const lines = body.split('\n').map(line => line.trim());
  const cards = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.length < 4 || line.length > 48) continue;
    if (!/民宿|庄园|客栈|公寓|旅舍|宾馆|酒店|度假/.test(line)) continue;
    if (!/^\d\.\d$/.test(lines[index + 1] || '')) continue;
    let price = null;
    for (let look = index + 2; look < Math.min(index + 26, lines.length); look += 1) {
      const match = lines[look].match(/^¥\s?([\d,]+)$/);
      if (match) { price = Number(match[1].replace(/,/g, '')); break; }
      if (/^\d\.\d$/.test(lines[look])) break;
    }
    if (!cards.some(card => card.name === line)) cards.push({name: line, price});
  }
  return cards;
}

const context = await chromium.launchPersistentContext(path.join(root, 'browser-profile'), {headless: true, locale: 'zh-CN', viewport: {width: 1366, height: 1000}});
const report = {dates: [], barrier: null};
try {
  const page = await context.pages()[0] || await context.newPage();
  for (const checkin of ['2026/11/11', '2026/11/14']) {
    await page.goto(urlFor(checkin), {waitUntil: 'domcontentloaded', timeout: 45000});
    await page.waitForTimeout(4000);
    const body = await page.locator('body').innerText().catch(() => '');
    const barrier = /请完成安全验证|拖动滑块|请完成下面的验证测试/.test(body) ? 'verification_required' : null;
    if (barrier) { report.barrier = barrier; break; }
    const cards = parseCards(body);
    report.dates.push({checkin, count: cards.length, cards: cards.slice(0, 6), allPrices: cards.map(card => card.price)});
  }
} catch (error) {
  report.error = error instanceof Error ? error.message : String(error);
} finally {
  await context.close().catch(() => {});
  console.log(JSON.stringify(report, null, 2));
}
