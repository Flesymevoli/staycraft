// Local browser regression with delayed diagnosis reads and mocked promotion
// storage. No live account, model call, or production write is used.
const assert=require('node:assert/strict');
const {chromium}=require('./qa-browser.cjs');
const base=process.env.STAYCRAFT_QA_ORIGIN||'http://127.0.0.1:3309';
if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(base))throw Error('Local sample origin required');
const runId='11111111-1111-4111-8111-111111111111';
const diagnosis={runId,opportunityId:'opp:gap'};
const source={id:'22222222-2222-4222-8222-222222222222',title:'回归测试活动',url:'https://example.com/event',summary:'活动地点与公开安排',start:'2026-11-11',end:'2026-11-20',checkedOn:'2026-11-11',location:'测试位置'};
const plan=(start,end,ids=[],ref)=>({version:1,title:'小住邀请',audience:'双人短途客群',angle:ids.length?'围绕回归测试活动安排小住':'围绕民宿安排小住',publishTiming:'入住前准备',start,end,factIds:ids.length?['property','source_0']:['property'],engine:'rules_v1',...(ref?{diagnosis:ref}:{})});
const saved={id:'33333333-3333-4333-8333-333333333333',brief:{language:'zh',channel:'wechat',goal:'rooms',start:'2026-11-17',end:'2026-11-18',sourceIds:[source.id]},content:'保存的活动小住邀请\n正文不应被异步初始化改动。',engine:'rules_v1',createdAt:'2026-11-11T08:00:00Z',basis:[{label:source.title,text:source.summary,url:source.url}],plan:plan('2026-11-17','2026-11-18',[source.id],diagnosis)};

(async()=>{
 const browser=await chromium.launch();
 try{
  const context=await browser.newContext({viewport:{width:1440,height:960}});
  await context.addInitScript(()=>{window.staycraftDesktop={status:async()=>({state:'idle',sample:true})}});
  const page=await context.newPage();page.setDefaultTimeout(20000);
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base+'/login');await page.locator('input[name=email]').fill('demo@example.invalid');await page.locator('input[name=password]').fill('staycraft-demo');await page.locator('.auth-submit').click();await page.waitForURL('**/app');
  let release,blocked,requested,store,currentLocation='测试位置',discoveryGate,eventNote='';
  await page.route('**/api/workspace/agent?id=*',async route=>{
   requested();await blocked;
   await route.fulfill({json:{run:{id:runId,dataMode:'fictional_demo',opportunities:[{id:'opp:gap',claim:'URL推荐入住期',window:{start:'2026-11-14',end:'2026-11-15'},actions:[{target:'promotion'}]}]}}}).catch(()=>{});
  });
  await page.route('**/api/workspace/promotion',async route=>{
   if(route.request().method()==='PUT')store=route.request().postDataJSON().state;
   await route.fulfill({json:{state:store,revision:'44444444-4444-4444-8444-444444444444',location:currentLocation}});
  });
  await page.route('**/api/workspace/promotion/plan',async route=>{
   const {brief,diagnosis:ref}=route.request().postDataJSON();
   await route.fulfill({json:{plan:plan(brief.start,brief.end,brief.sourceIds,ref),facts:[],reason:''}});
  });
  await page.route('**/api/workspace/discovery',async route=>{
   const location=currentLocation,title=location==='测试位置'?source.title:'杭州地址的测试活动';
   const gate=discoveryGate;discoveryGate=undefined;if(gate){gate.started();await gate.wait;}
   await route.fulfill({json:{location,events:eventNote?[]:[{id:'event-1',title,start:source.start,end:source.end,verified:true,venue:'测试活动地点',sourceUrl:source.url}],eventSource:{note:eventNote}}}).catch(()=>{});
  });
  await page.route('**/api/workspace/nearby?*',route=>route.fulfill({json:{weather:{status:'unavailable'},centerLabel:currentLocation}}));
  async function enter(){
   store={sources:[source],drafts:[saved]};
   blocked=new Promise(resolve=>{release=resolve});
   const started=new Promise(resolve=>{requested=resolve});
   await page.goto(base+`/app/promotion?runId=${runId}&opportunityId=opp%3Agap&start=2026-11-14&end=2026-11-15`);
   await started;await page.locator('.gemini-promo-saved-row').first().waitFor();
  }
  await enter();
  await page.locator('.gemini-promo-saved-row').first().getByRole('button').first().click();
  release();await page.waitForTimeout(1600);
  assert.equal(await page.locator('#workspace-promotion-copy').inputValue(),saved.content);
  assert.match(await page.locator('.gemini-promo-editor-heading').innerText(),new RegExp(source.title));
  assert.match(await page.locator('.gemini-promo-audience').innerText(),/2026-11-17 — 2026-11-18/);
  assert.match(await page.locator('.promotion-audience-result').innerText(),new RegExp(source.title));
  assert.equal(await page.getByRole('button',{name:'已选用',exact:true}).count(),1);
  assert.equal(await page.locator('.gemini-promo-audience').getAttribute('aria-busy'),'false');

  await enter();
  await page.locator('.gemini-promo-period > summary').click();
  await page.getByLabel('入住开始日期',{exact:true}).fill('2026-11-16');
  await page.getByLabel('入住结束日期',{exact:true}).fill('2026-11-19');
  release();await page.waitForTimeout(1600);
  assert.equal(await page.getByLabel('入住开始日期',{exact:true}).inputValue(),'2026-11-16');
  assert.equal(await page.getByLabel('入住结束日期',{exact:true}).inputValue(),'2026-11-19');
  assert.equal(await page.locator('.promotion-plan-origin').count(),0);

  await enter();
  await page.getByRole('button',{name:'选用线索',exact:true}).click();
  await page.getByRole('button',{name:'已选用',exact:true}).waitFor();
  release();await page.waitForTimeout(1600);
  assert.match(await page.locator('.gemini-promo-editor-heading').innerText(),new RegExp(source.title));
  assert.match(await page.locator('.promotion-audience-result').innerText(),new RegExp(source.title));
  assert.match(await page.locator('.promotion-plan-origin').innerText(),/URL推荐入住期/);

  // Queue an old-address discovery, then switch address before it completes.
  let releaseOld,startedOld;
  const oldRequested=new Promise(resolve=>{startedOld=resolve});
  discoveryGate={started:startedOld,wait:new Promise(resolve=>{releaseOld=resolve})};
  await page.evaluate(()=>window.dispatchEvent(new Event('staycraft-profile-changed')));
  await oldRequested;
  currentLocation='杭州市新测试地址';
  await page.evaluate(()=>window.dispatchEvent(new Event('staycraft-profile-changed')));
  await page.locator('.gemini-promo-pool').getByText('杭州地址的测试活动',{exact:true}).waitFor();
  releaseOld();await page.waitForTimeout(900);
  assert.equal(await page.locator('.gemini-promo-pool').getByText(source.title,{exact:true}).count(),0,'late old-city response cannot restore its activity');
  assert(!(await page.locator('.gemini-promo-editor-heading').innerText()).includes(source.title),'old source is no longer selected');
  await page.locator('.gemini-promo-pool').getByRole('button',{name:'选用线索',exact:true}).click();
  await page.locator('.gemini-promo-pool').getByRole('button',{name:'已选用',exact:true}).waitFor();
  const local=store.sources.find(item=>item.title==='杭州地址的测试活动');
  assert.equal(local.location,currentLocation);assert.equal(local.start,source.start);assert.equal(local.end,source.end,'full event dates survive a narrower stay window');
  assert(store.sources.some(item=>item.id===source.id),'historical old-city source is retained');
  eventNote='活动搜索尚未配置，暂未取得当前地址的活动来源；这不代表当地没有活动。';
  await page.evaluate(()=>window.dispatchEvent(new Event('staycraft-profile-changed')));
  await page.locator('.gemini-promo-pool').getByText(eventNote,{exact:true}).waitFor();
  assert.equal(await page.locator('.gemini-promo-pool').getByText('暂未获取可用活动线索',{exact:true}).count(),1,'no-source state is distinct from no local events');
  assert.deepEqual(errors,[]);
  console.log('PASS promotion context: delayed URL preserves edits; changed address invalidates selected clues and late old-city responses; new-city selection preserves event dates and old records; no page errors');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
