const {chromium}=require('C:/Users/86299/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const path=require('node:path');
const fs=require('node:fs');
const here=__dirname;
const url='file:///'+path.join(here,'..','手机原型_柔白新版_v2.html').replaceAll('\\','/').replaceAll(' ','%20')+'#explore';
const out=path.join(here,'Explore_减色方案_当前版对比.png');
const positions=[null,'.demand-section','.guest-section'];

(async()=>{
 const browser=await chromium.launch();
 const page=await browser.newPage({viewport:{width:430,height:760},deviceScaleFactor:1});
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto(url);
 await page.locator('#pulse-svg').waitFor();
 await page.evaluate(()=>document.fonts.ready);
 async function capture(){
  const images=[];
  for(const selector of positions){
   await page.evaluate(s=>s?document.querySelector(s).scrollIntoView({block:'start'}):scrollTo(0,0),selector);
   await page.waitForTimeout(100);
   images.push((await page.screenshot()).toString('base64'));
  }
  return images;
 }
 const before=await capture();
 await page.evaluate(css=>{const style=document.createElement('style');style.textContent=css;document.body.append(style)},fs.readFileSync(path.join(here,'explore-reduced-color-concept.css'),'utf8'));
 const after=await capture();
 const board=await browser.newPage({viewport:{width:950,height:2620},deviceScaleFactor:1});
 const titles=['顶部与 Market pulse','需求日历与价格位置','评价话题与周边住宿'];
 const tiles=titles.map((title,i)=>`<section class="row"><h2>${title}</h2><div class="pair"><div><img src="data:image/png;base64,${before[i]}"></div><div><img src="data:image/png;base64,${after[i]}"></div></div></section>`).join('');
 await board.setContent(`<!doctype html><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;background:#eef0f2;color:#222;font-family:Arial,'Microsoft Yahei',sans-serif;padding:18px 22px 28px}header{display:flex;align-items:end;justify-content:space-between;margin-bottom:12px}h1{font-size:23px;margin:0}header p{font-size:12px;color:#62666c;margin:0}.columns{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:0 0 12px}.columns strong{font-size:15px;padding-left:7px}.columns small{display:block;font-weight:400;color:#6a6c72;font-size:11px;margin-top:3px}.row{margin-bottom:16px}.row h2{font-size:12px;font-weight:500;color:#52565d;letter-spacing:.5px;margin:0 0 6px 7px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:12px}.pair>div{background:white;border-radius:16px;padding:7px;box-shadow:0 5px 18px #2429370a}.pair img{display:block;width:100%;height:auto;border-radius:9px}</style><header><h1>Explore · 减少大面积彩色</h1><p>独立效果研究 · 原型未修改</p></header><div class="columns"><strong>当前版<small>柔白 + 多处彩色铺底</small></strong><strong>减色版<small>白色留白 + 彩色用于数据信号</small></strong></div>${tiles}`);
 await board.screenshot({path:out,fullPage:true});
 console.log(out);
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
