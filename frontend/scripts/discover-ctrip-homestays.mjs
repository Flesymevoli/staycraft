// Discovery: read the homestay result list, then open the first few cards to capture hotel ids.
// Read-only: click a card, record the URL, go back. No booking, no price change, no barrier bypass.
import {chromium} from 'playwright';
import path from 'node:path';
import fs from 'node:fs';
import {captureBarrier} from '../src/lib/competitor-observations.ts';

const root = path.resolve(import.meta.dirname, '../.price-monitor');
const url = process.argv[2];
const limit = Number(process.argv[3] || 5);
const output = process.argv[4] || path.resolve(import.meta.dirname, '..', '..', 'tmp', 'ctrip-candidates.json');
if (!url || !/^https:\/\/hotels\.ctrip\.com\/hotels\/list\?/.test(url) || !Number.isInteger(limit) || limit < 1 || limit > 10) {
  console.error('USAGE: node scripts/discover-ctrip-homestays.mjs "<result url>" [limit]');
  process.exit(1);
}

const context = await chromium.launchPersistentContext(path.join(root, 'browser-profile'), {headless: true, locale: 'zh-CN', viewport: {width: 1366, height: 940}});
const report = {url, barrier: null, resultCountLine: null, candidates: [], errors: []};
try {
  const page = await context.pages()[0] || await context.newPage();
  const response = await page.goto(url, {waitUntil: 'domcontentloaded', timeout: 45000});
  const checkAccess = async (tab, status) => {
    report.barrier = [401,403,429].includes(status) ? 'access_restricted'
      : captureBarrier(tab.url(), await tab.locator('body').innerText({timeout:5000}));
    if (report.barrier) throw new Error(report.barrier);
  };
  await checkAccess(page,response?.status());
  await page.waitForTimeout(4500);
  // Load the whole result list: the page renders about ten cards at a time.
  for (let round = 0; round < 14; round += 1) { await page.mouse.wheel(0, 4000); await page.waitForTimeout(850); }
  const body = await page.locator('body').innerText().catch(() => '');
  await checkAccess(page);
  report.resultCountLine = body.split('\n').map(line => line.trim()).find(line => /找到\s*\d+\s*家/.test(line)) || null;

  // A card title line is followed by a rating line like "4.8".
  const lines = body.split('\n').map(line => line.trim());
  const names = [];
  for (let index = 0; index < lines.length - 1; index += 1) {
    const line = lines[index];
    if (line.length < 4 || line.length > 48) continue;
    if (!/民宿|庄园|客栈|公寓/.test(line) || /广告$/.test(line)) continue;
    if (!/^\d\.\d$/.test(lines[index + 1] || '')) continue;
    if (names.includes(line)) continue;
    names.push(line);
    if (names.length >= 80) break;
  }
  report.detectedNames = names;

  const storeFile = path.join(root, 'homestays.json');
  const existing = fs.existsSync(storeFile) ? JSON.parse(fs.readFileSync(storeFile, 'utf8')) : [];
  const knownNames = new Set(existing.map(item => item.name));
  for (const name of names.filter(name => !knownNames.has(name)).slice(0, limit)) {
    try {
      // No reload here: the list stays loaded and each card opens a new tab, so we can walk
      // the whole result set in one pass.
      const target = page.getByText(name, {exact: true}).first();
      await target.scrollIntoViewIfNeeded({timeout: 8000}).catch(() => {});
      const beforePages = new Set(context.pages());
      await target.click({timeout: 10000});
      await page.waitForTimeout(3500);
      const pages = context.pages();
      const opened = pages.find(item => !beforePages.has(item));
      await checkAccess(opened || page);
      const detailUrl = opened?.url() || page.url();
      const id = (detailUrl.match(/[?&]hotelId=(\d+)/) || detailUrl.match(/\/hotels\/(\d+)\.html/) || [])[1] || null;
      const cityId = (detailUrl.match(/[?&]cityId=(\d+)/) || [])[1] || null;
      report.debug = report.debug || [];
      report.debug.push({name, beforePages: pages.length, detailUrl: detailUrl.slice(0, 140), id, cityId});
      if (!id) { report.errors.push({name, error: 'no_hotel_id_after_click'}); await opened?.close().catch(() => {}); continue; }
      report.candidates.push({name, hotelId: id, cityId, detailUrl, opened: true});
      if (opened && opened !== page) await opened.close().catch(() => {});
    } catch (error) {
      report.errors.push({name, error: error instanceof Error ? error.message.slice(0, 120) : String(error)});
      if (report.barrier) break;
    }
  }
  if (report.candidates.length) {
    const merged = [...existing, ...report.candidates.map(item => ({id: item.hotelId, name: item.name}))]
      .filter((item, index, list) => item.id && list.findIndex(other => other.id === item.id) === index);
    fs.writeFileSync(storeFile, JSON.stringify(merged, null, 2));
    report.storeFile = storeFile;
  }
} catch (error) {
  report.fatal = error instanceof Error ? error.message : String(error);
} finally {
  await context.close().catch(() => {});
  fs.mkdirSync(path.dirname(output), {recursive: true});
  fs.writeFileSync(output, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
