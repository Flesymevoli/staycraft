
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire('C:/个人/学习/ENT207/Homestay AI assistant/frontend/package.json');
const { chromium } = require('playwright');

const OUT = 'C:/个人/学习/ENT207/Homestay AI assistant/video/staycraft-promo/tmp-probe';
fs.mkdirSync(OUT, { recursive: true });
const BASE = 'http://127.0.0.1:3106';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2, locale: 'zh-CN' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
await page.goto(BASE + '/welcome', { waitUntil: 'domcontentloaded' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1500);
const info1 = await page.evaluate(() => ({
  h: document.documentElement.scrollHeight, w: document.documentElement.scrollWidth,
  anchors: Array.from(document.querySelectorAll('a')).map(a => ({t: (a.textContent||'').trim().slice(0,30), h: a.getAttribute('href')})),
  buttons: Array.from(document.querySelectorAll('button')).map(b => (b.textContent||'').trim().slice(0,30)),
  sections: Array.from(document.querySelectorAll('section, [id]')).map(el => ({tag: el.tagName, id: el.id, cls: (el.className||'').toString().slice(0,60)})).slice(0,40),
  headings: Array.from(document.querySelectorAll('h1,h2,h3')).map(h => ({tag:h.tagName, t:(h.textContent||'').trim().slice(0,80)})),
  classes: Array.from(new Set(Array.from(document.querySelectorAll('[class]')).flatMap(e => Array.from(e.classList)))).filter(c=>/landing|hero|chapter|stage|panel|sample|metric/.test(c)).slice(0,80)
}));
console.log('WELCOME', JSON.stringify(info1, null, 1));
await page.screenshot({ path: path.join(OUT,'w-top.png') });
// try demo button
const demo = page.locator('button:has-text("免登录试用"), a:has-text("免登录试用")').first();
console.log('demo count', await demo.count());
await demo.click().catch(e => console.log('click err', String(e).slice(0,200)));
await page.waitForTimeout(4000);
console.log('url after demo', page.url());
const info2 = await page.evaluate(() => ({
  url: location.href, title: document.title,
  nav: Array.from(document.querySelectorAll('nav a, aside a, [class*=side] a')).map(a => ({t:(a.textContent||'').trim().slice(0,20), h:a.getAttribute('href')})).slice(0,20),
  headings: Array.from(document.querySelectorAll('h1,h2,h3')).map(h => (h.textContent||'').trim().slice(0,60)).slice(0,30),
  text: document.body.innerText.slice(0,600)
}));
console.log('APP', JSON.stringify(info2, null, 1));
await page.screenshot({ path: path.join(OUT,'app-home.png'), fullPage: true });
await browser.close();
console.log('ERRORS', JSON.stringify(errors.slice(0,10)));
