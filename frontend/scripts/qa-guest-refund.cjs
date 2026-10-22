const {chromium}=require('C:/Users/86299/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
const base=process.env.GUEST_QA_URL || 'http://127.0.0.1:3105';
const key='staycraft-guest-prototype-orders-v1';
const fixture={id:'SC-REFUND01',room:'garden',arrival:'2026-11-10',departure:'2026-11-12',name:'虚构旅客',total:1040,status:'confirmed',expectedArrival:'18:00 前'};
(async()=>{
 const browser=await chromium.launch();
 try{
  for(const [time,automatic] of [['2026-11-10T17:59:59+08:00',true],['2026-11-10T18:00:00+08:00',false],['2026-11-11T02:00:00+08:00',false]]){
   const context=await browser.newContext({viewport:{width:390,height:844},timezoneId:'America/Los_Angeles'});
   await context.addInitScript(({key,fixture})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify([fixture]));},{key,fixture});
   const page=await context.newPage();const requests=[];page.on('request',r=>{if(r.url().includes('/api/'))requests.push(r.url());});
   await page.clock.setFixedTime(new Date(time));await page.goto(base+'/guest/orders');
   await page.getByRole('button',{name:'申请退款',exact:true}).click();await page.getByRole('heading',{name:'申请取消与退款'}).waitFor();
   await page.getByRole('button',{name:'暂不申请',exact:true}).click();assert.equal(await page.locator('.guest-refund-panel').count(),0);
   await page.getByRole('button',{name:'申请退款',exact:true}).click();if(automatic)await page.screenshot({path:'qa-guest-refund-request.png',fullPage:true});await page.getByRole('button',{name:'确认申请',exact:true}).click();
   await page.getByText(automatic?'符合规则，申请已自动通过':'已记录申请，等待民宿审核',{exact:true}).waitFor();
   const stored=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
   assert.equal(stored.length,1);assert.equal(stored[0].status,automatic?'cancelled':'confirmed');assert.equal(stored[0].refund.result,automatic?'auto_cancelled':'review_pending');
   assert.equal(await page.locator('.guest-order-actions').getByRole('button',{name:automatic?'已取消':'申请已提交',exact:true}).isDisabled(),true);
   await page.reload();await page.getByText(automatic?'符合规则，申请已自动通过':'已记录申请，等待民宿审核',{exact:true}).waitFor();
   if(automatic){await page.locator('.guest-filters').getByRole('button',{name:'已取消',exact:true}).click();await page.getByRole('heading',{name:'花园大床房'}).waitFor();await page.screenshot({path:'qa-guest-refund.png',fullPage:true});}
   assert.deepEqual(requests,[]);await context.close();
  }
  const failed=await browser.newContext({viewport:{width:320,height:844}});
  await failed.addInitScript(({key,fixture})=>{localStorage.setItem(key,JSON.stringify([fixture]));},{key,fixture});
  const page=await failed.newPage();await page.goto(base+'/guest/orders');await page.getByRole('button',{name:'申请退款',exact:true}).click();
  await page.evaluate(()=>{Storage.prototype.setItem=function(){throw new Error('QA storage blocked');};});
  await page.getByRole('button',{name:'确认申请',exact:true}).click();await page.getByRole('alert').filter({hasText:'申请未保存，订单状态未改变'}).waitFor();
  assert.equal(await page.getByText('预订已确认',{exact:true}).count(),1);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  console.log('PASS refund: before/exact/after 18:00 China time, alternate browser timezone, cancel confirmation, idempotency, persistence, cancelled filter, storage failure, no backend calls.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
