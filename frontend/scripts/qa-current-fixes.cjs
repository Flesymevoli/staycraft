// Isolated local UI/API acceptance. No production data, search or model calls.
const {chromium}=require('./qa-browser.cjs'),assert=require('node:assert/strict'),path=require('node:path');
const {spawn}=require('node:child_process');
const base='http://127.0.0.1:3291';
(async()=>{
 const server=spawn(process.execPath,['--require',path.resolve('scripts/qa-workspace-fixture.cjs'),'node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port','3291'],{env:{...process.env,STAYCRAFT_QA_AUTH_FIXTURES:'1',STAYCRAFT_QA_FORMAL_STAYS:'1',STAYCRAFT_QA_IMPORT_DB:'1',STAYCRAFT_OPERATOR_SAMPLE:'0',STAYCRAFT_DESKTOP_DEV:'1',STAYCRAFT_DESKTOP_TEST_PORT:'3291',STAYCRAFT_QA_DESKTOP_SYNC:'1',NEXT_PUBLIC_SUPABASE_URL:'https://staycraft-qa.invalid',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'fixture-key',DEMO_LOGIN_EMAIL:'',MODEL_ENABLED:'0',FORMAL_MODEL_ENABLED:'0'},stdio:'inherit',windowsHide:true});
 let browser;
 try{
  for(let n=0;;n++){if(n===80||server.exitCode!==null)throw Error('fixture server startup failed');try{if((await fetch(base+'/login',{signal:AbortSignal.timeout(2000)})).ok)break;}catch{}await new Promise(r=>setTimeout(r,500));}
  browser=await chromium.launch();const context=await browser.newContext({viewport:{width:1366,height:900}});
  await context.addInitScript(()=>{window.staycraftDesktop={status:async()=>({state:'idle'})}});
  const page=await context.newPage();page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/workspace/discovery**',r=>r.fulfill({json:{events:[]}}));
  await page.route('**/api/workspace/agent',r=>r.fulfill({json:{runs:[]}}));
  await page.goto(base+'/login');await page.locator('input[name=email]').fill('demo@example.invalid');await page.locator('input[name=password]').fill('staycraft-demo');await page.locator('.auth-submit').click();await page.waitForURL(base+'/app');await page.goto(base+'/app/mine');
  const api=async(url,method='GET',body)=>page.evaluate(async({url,method,body})=>{const r=await fetch(url,{method,headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined});return {status:r.status,body:await r.json()}},{url,method,body});
  const beforeInventory=await api('/api/workspace/inventory');
  const csv='channel,external_id,room_type,room_number,arrival,departure,status,total,currency,source_updated_at\n';
  const template=await page.evaluate(async()=>await(await fetch('/api/workspace/booking-import')).text());
  const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai'}).format(new Date());
  const next=new Date(Date.parse(today)+86400000).toISOString().slice(0,10);
  const upload=template.trim()+'\n清理回归,CLEAR-QA,清理回归房,QA901,'+today+','+next+',confirmed,688.00,CNY,'+today+'T00:00:00+08:00\n';
  let imp=await api('/api/workspace/booking-import','POST',{csv:upload,commit:false});assert.equal(imp.status,200);assert(imp.body.revision,JSON.stringify(imp.body));
  assert.equal((await api('/api/workspace/booking-import','POST',{csv:upload,commit:true,revision:imp.body.revision})).body.saved,true);
  const inventory=await api('/api/workspace/inventory');assert.equal(inventory.status,200);
  await page.getByRole('button',{name:'账户设置',exact:true}).click();await page.getByRole('button',{name:'清空导入数据',exact:true}).click();
  const dialog=page.getByRole('dialog');await dialog.getByText('导入订单',{exact:true}).waitFor();assert(await dialog.getByRole('button',{name:'确认清空',exact:true}).isDisabled());
  for(const width of [1366,390]){await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
  await page.setViewportSize({width:1366,height:900});
  await dialog.getByRole('checkbox').check();await dialog.getByRole('button',{name:'确认清空',exact:true}).click();await page.getByText(/已清除 1 条导入订单/).first().waitFor();
  const cleared=await api('/api/workspace/booking-import/clear');assert.equal(cleared.body.orders,0);assert.equal(cleared.body.tasks,0);assert.equal(cleared.body.batches,0);assert.deepEqual((await api('/api/workspace/inventory')).body,inventory.body);
  assert.equal((await api('/api/workspace/booking-import/clear','DELETE',{revision:cleared.body.revision})).status,400);
  assert.equal(await page.evaluate(async()=>{const r=await fetch('/api/workspace/booking-import/clear',{method:'DELETE',headers:{'Content-Type':'application/json','Origin':'https://evil.invalid'},body:'{}'});return r.status}),400); // browser protects Origin; malformed confirmation is still rejected
  await page.screenshot({path:'qa-clear-imported-data.png'});
  // Lost responses after successful writes must be resolved with read-only receipts.
  let importWrites=0,clearWrites=0;
  await page.route('**/api/workspace/booking-import',async route=>{if(route.request().method()==='POST'&&route.request().postDataJSON().commit){importWrites++;await route.fetch();await route.abort();}else await route.continue();});
  await page.goto(base+'/app/work');const imports=page.locator('.booking-import-panel').first();await imports.locator('.booking-import-disclosure summary').click();await imports.locator('input[type=file]').setInputFiles({name:'recovery.csv',mimeType:'text/csv',buffer:Buffer.from(upload)});await imports.getByRole('button',{name:'校验并预览',exact:true}).click();await imports.getByRole('button',{name:'确认导入',exact:true}).click();await imports.getByText('导入结果待核对',{exact:true}).waitFor();
  await page.goto(base+'/app/mine');await page.goto(base+'/app/work');await page.getByRole('button',{name:'核对导入结果',exact:true}).click();await page.getByText('导入与任务已更新',{exact:true}).waitFor();assert.equal(importWrites,1);assert.equal((await api('/api/workspace/booking-import?view=state')).body.batches.length,1);await page.unroute('**/api/workspace/booking-import');
  await page.route('**/api/workspace/booking-import/clear',async route=>{if(route.request().method()==='DELETE'){clearWrites++;await route.fetch();await route.abort();}else await route.continue();});
  await page.goto(base+'/app/mine');await page.getByRole('button',{name:'账户设置',exact:true}).click();await page.getByRole('button',{name:'清空导入数据',exact:true}).click();await page.getByRole('dialog').last().getByRole('checkbox').check();await page.getByRole('button',{name:'确认清空',exact:true}).click();await page.getByRole('dialog').last().getByRole('button',{name:'核对清除结果',exact:true}).click();await page.getByText('已核实清除完成',{exact:true}).waitFor();assert.equal(clearWrites,1);assert.equal((await api('/api/workspace/booking-import/clear')).body.orders,0);await page.unroute('**/api/workspace/booking-import/clear');
  const profile=await api('/api/workspace/profile');const location=profile.body.profile.location;
  const source={id:'88888888-8888-4888-8888-888888888888',title:'本地回归活动',url:'https://example.com/event',summary:'测试活动地点',start:today,end:next,checkedOn:today,location};
  const saved=await api('/api/workspace/promotion');assert.equal((await api('/api/workspace/promotion','PUT',{state:{sources:[source],drafts:[]},revision:saved.body.revision})).status,200);
  await page.route('**/api/workspace/discovery**',r=>r.fulfill({json:{location,events:[{id:source.id,title:source.title,start:today,end:next,verified:true,venue:source.summary,sourceUrl:source.url}]}}));
  await page.route('**/api/workspace/nearby?*',r=>r.fulfill({json:{weather:{status:'unavailable'},centerLabel:location}}));
  await page.goto(base+'/app/promotion');await page.getByRole('button',{name:'选用线索',exact:true}).click();
  const generate=page.getByRole('button',{name:'生成推广文案',exact:true});await generate.click();await page.waitForFunction(()=>document.querySelector('#workspace-promotion-copy')?.value?.includes('本地回归活动'));
  const text=await page.locator('#workspace-promotion-copy').inputValue();assert.doesNotMatch(text,/null|undefined/);
  await page.getByText('草稿已自动保存在本机，尚未保存到账号。',{exact:true}).waitFor();
  await page.reload();await page.locator('#workspace-promotion-copy').waitFor();assert.equal(await page.locator('#workspace-promotion-copy').inputValue(),text,'unsaved draft survives full reload');
  // A real navigation click, not page.goto: confirm must navigate exactly once,
  // cancellation/Escape must keep the editor, and returning must restore its text.
  let nativeDialogs=0;const countDialog=async d=>{nativeDialogs++;await d.dismiss()};page.on('dialog',countDialog);
  const mine=()=>page.locator('.workbench-primary-nav a[href="/app/mine"]');
  await mine().click();await page.getByRole('button',{name:'继续编辑',exact:true}).click();assert.equal(page.url(),base+'/app/promotion');assert.equal(await page.locator('#workspace-promotion-copy').inputValue(),text);
  await mine().click();await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'detached'});assert.equal(page.url(),base+'/app/promotion');
  await mine().click();await page.getByRole('button',{name:'确认离开',exact:true}).click();await page.waitForURL(base+'/app/mine');assert.equal(nativeDialogs,0,'in-app leave confirmation must not use native dialogs');
  await page.locator('.workbench-primary-nav a[href="/app/promotion"]').click();await page.waitForURL(base+'/app/promotion');assert.equal(await page.locator('#workspace-promotion-copy').inputValue(),text);page.off('dialog',countDialog);

  await page.getByRole('button',{name:'AI 创意生成',exact:true}).click();await page.getByRole('button',{name:'生成推广文案',exact:true}).click();await page.getByRole('button',{name:'直接按本店资料生成',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#workspace-promotion-copy')?.value?.includes('本地回归活动'));
  // A stuck response must be cancellable, and must never overwrite the draft later.
  let release;const wait=new Promise(r=>release=r);await page.route('**/api/workspace/promotion/generate',async r=>{await wait;await r.fulfill({status:503,json:{error:'promotion_unavailable'}}).catch(()=>{});});
  await page.getByRole('button',{name:'重新生成文案',exact:true}).click();await page.getByRole('button',{name:'取消本次生成',exact:true}).click();await page.getByText('已停止等待，服务端可能仍在生成；当前文字已保留。',{exact:true}).waitFor();assert((await page.locator('#workspace-promotion-copy').inputValue()).includes('本地回归活动'));release();await page.unroute('**/api/workspace/promotion/generate');
  await page.screenshot({path:'qa-promotion-recovery.png'});
  // A completed generation whose response is lost is recovered without another POST.
  let generationWrites=0;
  await page.route('**/api/workspace/promotion/generate',async route=>{generationWrites++;await route.fetch();await route.abort();});
  await page.getByRole('button',{name:'重新生成文案',exact:true}).click();await page.getByRole('button',{name:'核对本次结果',exact:true}).click();await page.getByText('已找回本次文案',{exact:true}).waitFor();assert.equal(generationWrites,1);await page.unroute('**/api/workspace/promotion/generate');
  // Shorten only the browser timeout in this isolated page to test a stalled body.
  await page.addInitScript(()=>{const original=AbortSignal.timeout.bind(AbortSignal);AbortSignal.timeout=ms=>original(Math.min(ms,1500));});
  await page.route('**/api/workspace/promotion/plan',async r=>{await new Promise(resolve=>setTimeout(resolve,2500));await r.fulfill({status:503,json:{error:'promotion_unavailable'}}).catch(()=>{});});
  await page.evaluate(()=>{for(const key of Object.keys(localStorage)){if(!key.startsWith('staycraft-local-promotion:'))continue;const saved=JSON.parse(localStorage.getItem(key));saved.value.savedPlan=null;saved.value.planEvidence='';localStorage.setItem(key,JSON.stringify(saved));}});
  await page.reload();await page.getByText('读取客群方案超时，请点击重新读取。',{exact:false}).waitFor();await page.unroute('**/api/workspace/promotion/plan');await page.getByRole('button',{name:'重新读取',exact:true}).click();await page.getByRole('button',{name:'重新生成文案',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#workspace-promotion-copy')?.value?.length>0);
  await page.addInitScript(()=>{
   window.__collectionCounts={collect:0,sync:0,cancel:0};window.__failRefresh=true;
   let value={state:'idle'},finish;
   window.staycraftDesktop={status:async()=>value,readTargets:async()=>({state:'idle',contextKey:'fixture-location',location:'隔离测试地点'}),collectAndSync:async()=>{window.__collectionCounts.collect++;value={state:'idle',active:true,operation:{id:'test-operation',phase:'running',stage:'collect-date',currentDate:'2026-11-13',completedDates:1,totalDates:7,observed:5}};return new Promise(r=>finish=r)},cancel:async()=>{window.__collectionCounts.cancel++;value={state:'pending',active:false,observed:5,error:'collection_cancelled',operation:{id:'test-operation',phase:'cancelled',stage:'collect',observed:5}};finish(value);return value},retrySync:async()=>{window.__collectionCounts.sync++;value={state:'saved',active:false,observed:5,batchId:'test-batch',start:'2026-11-13',end:'2026-11-19',syncStatus:'saved',operation:{id:'test-operation',phase:'refreshing',stage:'saved',observed:5}};return value},openLogin:async()=>({state:'idle'})};
  });
  await page.route('**/api/workspace/market/sample',async route=>{if(await page.evaluate(()=>window.__failRefresh&&window.__collectionCounts?.sync>0))await route.fulfill({status:503,json:{error:'fixture_refresh_failure'}});else if(await page.evaluate(()=>window.__collectionCounts?.sync>0))await route.fulfill({json:{sample:{window:{start:'2026-11-13',end:'2026-11-19'},quotes:[],stats:{n:0},comparability:'none',unknowns:[]},snapshot:{status:'imported',locationStatus:'matched'}}});else await route.continue();});
  await page.goto(base+'/app/explore');await page.getByRole('button',{name:'桌面实时采集',exact:true}).click();await page.getByLabel('城市',{exact:true}).fill('太仓');await page.getByRole('button',{name:'采集并同步',exact:true}).click();await page.getByText(/已完成 1\/7 个日期/).waitFor();
  await page.getByRole('dialog').getByRole('button',{name:'Close / 关闭',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});await page.getByRole('button',{name:'桌面实时采集',exact:true}).click();await page.getByText(/已完成 1\/7 个日期/).waitFor();assert.doesNotMatch(await page.getByRole('dialog').locator('.operation-status').innerText(),/\d+%/);
  await page.getByRole('button',{name:'停止本次操作',exact:true}).click();await page.getByRole('button',{name:'核对结果并重试同步',exact:true}).click();await page.getByText('数据已保存，统计刷新失败',{exact:true}).waitFor();await page.evaluate(()=>window.__failRefresh=false);await page.getByRole('button',{name:'只重新加载统计',exact:true}).click();await page.getByText('报价与统计已就绪',{exact:true}).waitFor();assert.deepEqual(await page.evaluate(()=>window.__collectionCounts),{collect:1,sync:1,cancel:1});await page.screenshot({path:'qa-collection-recovery.png'});
  assert.deepEqual(errors,[]);console.log('PASS isolated UI: clear/import lost-response receipts without duplicate writes, promotion result recovery without another generation, collector close/reopen real-count progress, stop/partial retention, sync-only retry and reload-only recovery, plan timeout and desktop/narrow layouts.');
 }finally{if(browser)await browser.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1});
