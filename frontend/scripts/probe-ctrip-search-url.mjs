// Try the Ctrip result URL directly instead of driving the homepage widget. Read-only.
import {chromium} from 'playwright';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../.price-monitor');
const [checkin = '2026-11-14', checkout = '2026-11-15'] = process.argv.slice(2);
const urls = [
  `https://hotels.ctrip.com/hotels/list?cityName=${encodeURIComponent('太仓')}&checkin=${checkin}&checkout=${checkout}&adult=1&children=0&crn=1`,
  `https://hotels.ctrip.com/hotels/list?city=${encodeURIComponent('太仓')}&checkin=${checkin}&checkout=${checkout}&adult=1&children=0&crn=1`,
];

const context = await chromium.launchPersistentContext(path.join(root, 'browser-profile'), {headless: true, locale: 'zh-CN', viewport: {width: 1366, height: 900}});
const report = {tries: []};
try {
  const page = await context.pages()[0] || await context.newPage();
  for (const url of urls) {
    const attempt = {url, finalUrl: null, title: null, barrier: null, hasCity: null, hasHomestayFilter: null, resultCountLine: null, names: []};
    try {
      await page.goto(url, {waitUntil: 'domcontentloaded', timeout: 45000});
      await page.waitForTimeout(3500);
      attempt.finalUrl = page.url();
      attempt.title = await page.title();
      const body = await page.locator('body').innerText().catch(() => '');
      attempt.barrier = /请完成安全验证|拖动滑块|请完成下面的验证测试|请按顺序点选图标/.test(body) ? 'verification_required' : (page.url().includes('passport.ctrip.com') ? 'login_required' : null);
      attempt.hasCity = /太仓/.test(body);
      attempt.hasHomestayFilter = /民宿/.test(body);
      attempt.resultCountLine = body.split('\n').map(line => line.trim()).find(line => /找到\s*\d+\s*家/.test(line)) || null;
      attempt.names = body.split('\n').map(line => line.trim()).filter(line => /民宿|度假庄园|客栈|公寓|旅舍|宾馆|酒店/.test(line) && line.length < 40).slice(0, 12);
      report.tries.push(attempt);
      if (attempt.resultCountLine && attempt.hasCity) break;
    } catch (error) {
      attempt.error = error instanceof Error ? error.message : String(error);
      report.tries.push(attempt);
    }
  }
} finally {
  await context.close().catch(() => {});
  console.log(JSON.stringify(report, null, 2));
}
