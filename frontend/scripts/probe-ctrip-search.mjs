// Layer ① discovery probe: open the Ctrip hotel search UI with the existing local profile and
// report the controls we need (destination, dates, occupancy, homestay filter). Read-only:
// it never books, never submits a price change, never bypasses a barrier.
import {chromium} from 'playwright';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../.price-monitor');
const out = {stage: 'start', barrier: null, loggedIn: null, url: null, inputs: [], buttons: [], selects: [], textSample: []};

const context = await chromium.launchPersistentContext(path.join(root, 'browser-profile'), {headless: true, locale: 'zh-CN', viewport: {width: 1366, height: 900}});
try {
  const page = await context.pages()[0] || await context.newPage();
  out.stage = 'open_home';
  await page.goto('https://hotels.ctrip.com/', {waitUntil: 'domcontentloaded', timeout: 45000});
  await page.waitForTimeout(2500);
  out.url = page.url();
  const body = await page.locator('body').innerText().catch(() => '');
  out.loggedIn = await page.getByRole('button', {name: /我的账户:/}).count() > 0;
  out.barrier = /请完成安全验证|拖动滑块|请完成下面的验证测试|请按顺序点选图标/.test(body) ? 'verification_required' : (page.url().includes('passport.ctrip.com') ? 'login_required' : null);

  out.inputs = await page.locator('input').evaluateAll(nodes => nodes.slice(0, 25).map(node => ({
    placeholder: node.getAttribute('placeholder'), aria: node.getAttribute('aria-label'), id: node.id, value: node.value?.slice(0, 40), type: node.type,
  })).filter(item => item.placeholder || item.aria || item.id));
  out.buttons = await page.locator('button').evaluateAll(nodes => nodes.slice(0, 40).map(node => (node.innerText || node.getAttribute('aria-label') || '').trim()).filter(Boolean).slice(0, 30));
  out.selects = await page.locator('select').evaluateAll(nodes => nodes.map(node => ({id: node.id, name: node.name})));
  out.textSample = body.split('\n').map(line => line.trim()).filter(Boolean).slice(0, 40);

  // Try to type a destination without committing to a search, to see the suggestion widget.
  const destination = page.locator('input').filter({hasNot: page.locator('[type=password]')}).first();
  await destination.click({timeout: 5000}).catch(() => {});
  await destination.fill('太仓').catch(() => {});
  await page.waitForTimeout(2000);
  out.afterTyping = (await page.locator('body').innerText().catch(() => '')).split('\n').map(line => line.trim()).filter(Boolean).slice(0, 60);
  out.stage = 'done';
} catch (error) {
  out.error = error instanceof Error ? error.message : String(error);
} finally {
  await context.close().catch(() => {});
  console.log(JSON.stringify(out, null, 2));
}
