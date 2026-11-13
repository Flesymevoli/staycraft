
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire('C:/个人/学习/ENT207/Homestay AI assistant/frontend/package.json');
const { chromium } = require('playwright');
const ROOT = 'C:/个人/学习/ENT207/Homestay AI assistant/video/staycraft-demo';
const log = (...a) => console.log('[demo]', ...a);
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--no-sandbox', '--disable-http2'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, locale: 'zh-CN' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
await page.goto('http://127.0.0.1:4177/concept/index.html', { waitUntil: 'load', timeout: 60000 });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1200);
const views = ['workbench', 'analysis', 'explore', 'promotion', 'mine'];
// CN
for (const v of views) {
  await page.evaluate((vv) => window.switchView(vv), v);
  await page.waitForTimeout(700);
  await page.screenshot({ path: ROOT + '/shots-cn/' + v + '.png' });
  await page.screenshot({ path: ROOT + '/shots-cn/' + v + '-full.png', fullPage: true });
}
const cn = {};
for (const v of views) {
  cn[v] = await page.evaluate((vv) => { document.querySelectorAll('section[id^=view-]').forEach(s => s.style.display = s.id === 'view-' + vv ? '' : 'none'); const el = document.getElementById('view-' + vv); return el ? el.innerText.slice(0, 6000) : ''; }, v);
}
// EN
await page.click('#langBtn');
await page.waitForTimeout(900);
log('lang button ->', await page.evaluate(() => document.getElementById('langBtn')?.textContent));
for (const v of views) {
  await page.evaluate((vv) => window.switchView(vv), v);
  await page.waitForTimeout(700);
  await page.screenshot({ path: ROOT + '/shots-en/' + v + '.png' });
  await page.screenshot({ path: ROOT + '/shots-en/' + v + '-full.png', fullPage: true });
}
const en = {};
for (const v of views) {
  en[v] = await page.evaluate((vv) => { document.querySelectorAll('section[id^=view-]').forEach(s => s.style.display = s.id === 'view-' + vv ? '' : 'none'); const el = document.getElementById('view-' + vv); return el ? el.innerText.slice(0, 6000) : ''; }, v);
}
// mobile CN (viewport)
await page.setViewportSize({ width: 390, height: 844 });
await page.evaluate(() => { if (window.lang !== 'zh') window.toggleLang(); window.switchView('workbench'); });
await page.waitForTimeout(800);
await page.screenshot({ path: ROOT + '/shots-cn/mobile-workbench.png' });
await page.evaluate(() => window.switchView('analysis'));
await page.waitForTimeout(600);
await page.screenshot({ path: ROOT + '/shots-cn/mobile-analysis.png' });
const meta = await page.evaluate(() => ({ lang: window.lang, title: document.title, w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight }));
fs.writeFileSync(ROOT + '/capture/inventory.json', JSON.stringify({ meta, errors, cn, en }, null, 1));
log('meta', JSON.stringify(meta), 'errors', errors.length);
await browser.close();
log('DONE');
