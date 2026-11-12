
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire('C:/个人/学习/ENT207/Homestay AI assistant/frontend/package.json');
const { chromium } = require('playwright');
const ROOT = 'C:/个人/学习/ENT207/Homestay AI assistant/video/staycraft-promo-en';
const TEX = ROOT + '/public/textures';
const BASE = 'https://staycraft.online';
const log = (...a) => console.log('[m]', ...a);
const meta = { at: new Date().toISOString(), pages: [] };
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--no-sandbox', '--disable-http2'] });
async function goto(page, url) { for (let i=0;i<3;i++){ try { await page.goto(url,{waitUntil:'commit',timeout:60000}); await page.waitForTimeout(1500); return true; } catch(e){ log('goto fail', i, String(e).slice(0,80)); await page.waitForTimeout(4000);} } return false; }
async function isEN(page){ const n=await page.evaluate(()=>Array.from(document.querySelectorAll('nav a, a')).map(a=>(a.textContent||'').trim())).catch(()=>[]); return n.some(t=>/Workbench|Business data|Market research/.test(t)); }
async function ensureEN(page){ for(let i=0;i<8;i++){ if(await isEN(page)) return true; const b=page.locator('button').filter({hasText:/^EN$/}).first(); if(await b.count()){ await b.click({timeout:4000}).catch(()=>{});} await page.waitForTimeout(1200);} return await isEN(page); }
async function dump(page,name){ const info=await page.evaluate(()=>({w:document.documentElement.scrollWidth,h:document.documentElement.scrollHeight,txt:document.body.innerText.slice(0,2500)})).catch(()=>({w:0,h:0,txt:''})); await page.screenshot({path:TEX+'/'+name+'.png',fullPage:true}).catch(e=>log('shotfail',name)); meta.pages.push({name,url:page.url(),w:info.w,h:info.h}); log('SHOT',name,info.w+'x'+info.h); return info; }
const ctx = await browser.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:2, locale:'en-US', isMobile:true, hasTouch:true });
const page = await ctx.newPage();
if(!(await goto(page, BASE+'/welcome'))){ fs.writeFileSync(ROOT+'/capture/meta-mobile-en.json', JSON.stringify(meta)); await browser.close(); process.exit(2);}
await page.waitForTimeout(1200);
const d = page.locator('button:has-text("免登录试用"), a:has-text("免登录试用")').first();
if(await d.count()) await d.click().catch(()=>{});
await page.waitForTimeout(6000);
await ensureEN(page);
await dump(page,'m-workbench');
for (const [label,name] of [['Data','m-analysis'],['Market','m-market'],['Promotion','m-promotion']]) {
  const a = page.locator('nav a, a').filter({hasText:new RegExp('^'+label+'$')}).first();
  if(await a.count()) { await a.click({timeout:5000}).catch(()=>{}); await page.waitForTimeout(3500); }
  await ensureEN(page);
  await page.waitForTimeout(2500);
  await dump(page,name);
}
fs.writeFileSync(ROOT+'/capture/meta-mobile-en.json', JSON.stringify(meta,null,1));
await browser.close(); log('DONE');
