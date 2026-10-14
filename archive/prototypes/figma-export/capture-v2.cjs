const { chromium } = require('C:/Users/86299/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const root = 'C:/个人/学习/ENT207/Homestay AI assistant';
const outDir = path.join(root, 'figma-export');
fs.mkdirSync(outDir, { recursive: true });

const pages = ['home', 'work', 'analysis', 'explore', 'profile'];
const baseSegments = path.join(root, '手机原型_柔白新版_v2.html').replace(/\\/g, '/').split('/');
const fileUrl = 'file:///' + baseSegments.map((seg, i) => (i === 0 ? seg : encodeURIComponent(seg))).join('/');
const viewportHeight = 844;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: viewportHeight } });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const results = [];
  const manifest = {};
  for (const [index, route] of pages.entries()) {
    const prefix = String(index + 1).padStart(2, '0') + '-' + route;
    try {
      await page.goto(fileUrl + '#' + route, { waitUntil: 'load' });
      await page.waitForTimeout(1400);
      await page.evaluate(() => document.fonts.ready.catch(() => {}));
      const height = await page.evaluate(() => document.documentElement.scrollHeight);
      const tiles = Math.max(1, Math.ceil(height / viewportHeight));
      const offsets = [];
      const dockHide = await page.addStyleTag({ content: '.dock{display:none!important}' });
      for (let k = 0; k < tiles; k++) {
        const isLast = k === tiles - 1;
        if (isLast) {
          await dockHide.evaluate((el) => el.remove());
        }
        const y = Math.min(k * viewportHeight, Math.max(0, height - viewportHeight));
        offsets.push(y);
        await page.evaluate((scrollY) => window.scrollTo(0, scrollY), y);
        await page.waitForTimeout(180);
        await page.screenshot({ path: path.join(outDir, prefix + '-tile-' + k + '.png') });
        if (isLast) {
          await page.evaluate(() => window.scrollTo(0, 0));
        }
      }
      manifest[route] = { height, offsets };
      results.push({ route, height, tiles, offsets });
      console.log(route + ': pageHeight=' + height + ' tiles=' + tiles + ' offsets=' + offsets.join(','));
    } catch (error) {
      results.push({ route, error: error.message });
      console.error(route + ' FAILED: ' + error.message);
    }
  }
  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  await browser.close();
  console.log('DONE ' + JSON.stringify(results));
  process.exit(results.some((r) => r.error) ? 1 : 0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
