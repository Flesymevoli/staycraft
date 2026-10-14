const { chromium } = require('C:/Users/86299/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('file:///C:/个人/学习/ENT207/Homestay AI assistant/figma-export/prototype-package/index.html', { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  const cards = await page.locator('a.card').count();
  const imgs = await page.locator('.phone img').evaluateAll((els) => els.map((e) => ({ ok: e.complete && e.naturalWidth > 0, src: e.getAttribute('src') })));
  const hrefs = await page.locator('a.card').evaluateAll((els) => els.map((e) => e.getAttribute('href')));
  console.log(JSON.stringify({ cards, imgs, hrefs, errors }, null, 2));
  await browser.close();
  process.exit(cards === 5 && imgs.every((i) => i.ok) && errors.length === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
