const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('./qa-browser.cjs');
const base=process.env.QA_BASE||'http://127.0.0.1:3114';
const output='../tmp/workbench-qa';
(async()=>{fs.mkdirSync(output,{recursive:true});const browser=await chromium.launch();try{
 const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[];
 const goto=async url=>{await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});await page.waitForLoadState('load',{timeout:15000}).catch(()=>{});await page.waitForTimeout(200)},widths=(process.env.QA_WIDTHS||'1440,1280,768,390,320').split(',').map(Number);
 page.on('pageerror',e=>{errors.push(e.message);console.error('Browser exception:',e.message)});
 await page.route('**/api/workspace/discovery',route=>route.fulfill({json:{provider:'amap',places:[],location:'隔离地理夹具'}}));
 for(const width of [1440,390,320]){
  await page.setViewportSize({width,height:1000});
  for(const route of ['/','/login']){
   await goto(base+route);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,`${width} ${route} public overflow`);
   if(width!==320)await page.screenshot({path:`${output}/${width}-${route==='/'?'landing':'login'}.png`,fullPage:true});
  }
 }
 await page.getByRole('button',{name:/还没有账号|New here/}).click();await page.getByRole('heading',{name:/创建账号|Create an account/}).waitFor();
 await page.getByRole('button',{name:/已有账号|Already registered/}).click();
 await page.setViewportSize({width:1440,height:1000});
 await page.getByRole('button',{name:/体验演示|Try StayCraft/}).click();await page.waitForURL('**/app',{waitUntil:'domcontentloaded'});
 await page.locator('.wb-agent-summary').waitFor();
 for(const width of widths){
  await page.setViewportSize({width,height:1000});
  for(const route of ['/app','/app/work','/app/analysis','/app/explore','/app/mine','/app/promotion']){
   await goto(base+route);await page.locator('.workbench-body').waitFor();
   await page.waitForTimeout(250);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,`${width} ${route} document overflow`);
   const clipped=await page.locator('input[type=date]').evaluateAll(nodes=>nodes.filter(node=>{const r=node.getBoundingClientRect(),p=node.closest('label')?.getBoundingClientRect();return r.width>0&&(r.right>innerWidth+1||r.left<0||p&&r.right>p.right+2)}).length);
   assert.equal(clipped,0,`${width} ${route} date fields overflow`);
   assert.equal(await page.locator('.workbench-sidebar').isVisible(),width>=1080,`${width} desktop sidebar`);
   assert.equal(await page.locator('.workbench-mobile-nav').isVisible(),width<1080,`${width} mobile navigation`);
   if([1440,390].includes(width))await page.screenshot({path:`${output}/${width}-${route.split('/').pop()||'home'}.png`,fullPage:true});
  }
 }
 await page.setViewportSize({width:1440,height:1000});await goto(base+'/app');await page.locator('.wb-agent-summary').waitFor();
 await page.locator('.wb-trace summary').click();assert(await page.locator('.wb-trace li').count()>0);
 const bodyWidth=await page.locator('.workbench-content').evaluate(n=>n.getBoundingClientRect().width);assert(bodyWidth>1000,'Desktop should use available width');
 assert.equal(errors.length,0,errors.join('\n'));
 console.log(`PASS UI ${base}: six screens × widths ${widths.join(',')}, desktop sidebar/content, mobile navigation, date containment, evidence trail; no browser exceptions. Discovery mocked; no forced model refresh.`);
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
