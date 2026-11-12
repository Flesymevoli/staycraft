// Screenshot the market page on the running preview server for a visual check.
import {chromium} from 'playwright';

const base = process.argv[2] || 'http://127.0.0.1:3114';
const out = process.argv[3] || '../tmp/market-new.png';
const routePath = process.argv[4] || '/app/explore';
const browser = await chromium.launch({headless: true});
try {
  const page = await browser.newPage({viewport: {width: 1280, height: 1600}, locale: 'zh-CN'});
  await page.goto(base + '/login', {waitUntil: 'domcontentloaded', timeout: 30000});
  await page.locator('.auth-submit').waitFor({timeout: 15000});
  await page.locator('input[type=email], input[name=email], input#email').first().fill('demo@example.invalid');
  await page.locator('input[type=password], input[name=password], input#password').first().fill('staycraft-demo');
  await page.locator('.auth-submit').click();
  await page.waitForURL(base + '/app', {timeout: 30000});
  await page.goto(base + routePath, {waitUntil: 'domcontentloaded', timeout: 30000});
  await page.locator('.mo-panel, .nearby-discovery').first().waitFor({timeout: 30000});
  await page.waitForTimeout(3500);
  const target = page.locator('.mo-panel, .nearby-discovery').first();
  await target.screenshot({path: out});
  const text = await target.innerText();
  console.log(JSON.stringify({out, lines: text.split('\n').filter(Boolean).slice(0, 60)}, null, 2));
} finally {
  await browser.close().catch(() => {});
}
