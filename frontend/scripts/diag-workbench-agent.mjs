// Diagnose the workbench diagnosis call against the running preview server: login, open /app,
// capture /api/workspace/agent responses, and report what the page shows.
import {chromium} from 'playwright';

const base = process.argv[2] || 'http://127.0.0.1:3114';
const browser = await chromium.launch({headless: true});
const context = await browser.newContext();
const page = await context.newPage();
const calls = [];
page.on('response', async response => {
  if (!response.url().includes('/api/workspace/agent')) return;
  let body = '';
  try { body = (await response.text()).slice(0, 600); } catch {}
  calls.push({status: response.status(), method: response.request().method(), body});
});
page.on('pageerror', error => calls.push({pageError: String(error).slice(0, 300)}));
const report = {base, calls, summarySeen: false, pageText: ''};
try {
  await page.goto(base + '/login', {waitUntil: 'domcontentloaded', timeout: 30000});
  await page.locator('.auth-submit').waitFor({timeout: 15000});
  await page.locator('input[type=email], input[name=email], input#email').first().fill('demo@example.invalid');
  await page.locator('input[type=password], input[name=password], input#password').first().fill('staycraft-demo');
  await page.locator('.auth-submit').click();
  await page.waitForURL(base + '/app', {timeout: 30000});
  await page.locator('.wb-diagnosis-head').waitFor({timeout: 15000});
  try {
    await page.locator('.wb-agent-summary').waitFor({timeout: 45000});
    report.summarySeen = true;
  } catch {
    report.summarySeen = false;
  }
  report.pageText = (await page.locator('body').innerText().catch(() => '')).split('\n').filter(Boolean).slice(0, 40);
} catch (error) {
  report.fatal = error instanceof Error ? error.message.slice(0, 300) : String(error);
} finally {
  await browser.close().catch(() => {});
  console.log(JSON.stringify(report, null, 2));
}
