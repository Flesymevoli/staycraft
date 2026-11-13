// Current Gemini desktop UI -> real local routes -> isolated PostgreSQL/WASM.
// Browser plugin not available: use the repository's existing Playwright runtime.
// Run after npm run build. No external network, live accounts, model or cloud writes.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawn}=require('node:child_process');
const {chromium}=require('./qa-browser.cjs');
const root=path.resolve(__dirname,'..');
const port=3294,base=`http://127.0.0.1:${port}`;
const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai'}).format(new Date());
const day=offset=>new Date(Date.parse(today+'T00:00:00Z')+offset*86400000).toISOString().slice(0,10);
const envKeys=['PATH','Path','SystemRoot','SYSTEMROOT','WINDIR','TEMP','TMP','USERPROFILE','LOCALAPPDATA','APPDATA','COMSPEC','ComSpec','PATHEXT','PROCESSOR_ARCHITECTURE','NUMBER_OF_PROCESSORS'];
const env=Object.fromEntries(envKeys.filter(key=>process.env[key]!==undefined).map(key=>[key,process.env[key]]));
Object.assign(env,{
 NODE_ENV:'production',STAYCRAFT_QA_AUTH_FIXTURES:'1',STAYCRAFT_QA_FORMAL_STAYS:'1',
 STAYCRAFT_QA_IMPORT_DB:'1',STAYCRAFT_QA_DESKTOP_JOURNEY:'1',STAYCRAFT_QA_DESKTOP_SYNC:'1',
 STAYCRAFT_OPERATOR_SAMPLE:'0',STAYCRAFT_DESKTOP_DEV:'0',
 STAYCRAFT_SAMPLE_DATE:today,STAYCRAFT_SAMPLE_LIVE_MODEL:'0',STAYCRAFT_SAMPLE_LIVE_AMAP:'0',
 NEXT_PUBLIC_SUPABASE_URL:'https://staycraft-qa.invalid',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'fixture-key',
 DEMO_LOGIN_EMAIL:'',MODEL_ENABLED:'0',FORMAL_MODEL_ENABLED:'0',FORMAL_AUTO_REPLY_ENABLED:'0',HOMESTAY_LOCAL_DATA:'0',
});

async function main(){
 assert(fs.existsSync(path.join(root,'.next/BUILD_ID')),'Run npm run build before the desktop journey');
 const output=fs.mkdtempSync(path.join(os.tmpdir(),'staycraft-desktop-journey-'));
 let server,browser,page,serverOutput='';
 const steps=[],errors=[],consoleErrors=[],external=[],expectedResourceFailures=new Set();
 // Geocoding has no private configuration in this isolated process. Its 503 is
 // an intentional unavailable-source case, asserted in the promotion UI below.
 expectedResourceFailures.add(base+'/api/workspace/discovery');
 const step=name=>{steps.push(name);console.log('PASS '+name)};
 const unexpectedConsole=()=>consoleErrors.filter(item=>!(/Failed to load resource/.test(item.text)&&expectedResourceFailures.has(item.url)));
 try{
  // Refuse to inspect or reuse an unrelated service on the fixed fixture port.
  const probe=require('node:net').createServer();
  await new Promise((resolve,reject)=>{probe.once('error',reject);probe.listen(port,'127.0.0.1',()=>probe.close(resolve));});
  server=spawn(process.execPath,['--require',path.join(root,'scripts/qa-workspace-fixture.cjs'),path.join(root,'node_modules/next/dist/bin/next'),'start','--hostname','127.0.0.1','--port',String(port)],{cwd:root,env,windowsHide:true,stdio:['ignore','pipe','pipe']});
  server.stdout.on('data',chunk=>{serverOutput+=chunk});server.stderr.on('data',chunk=>{serverOutput+=chunk});
  for(let attempt=0;;attempt++){
   if(server.exitCode!==null||attempt>=60)throw Error('Isolated fixture server did not start: '+serverOutput.slice(-4000));
   try{if((await fetch(base+'/login',{signal:AbortSignal.timeout(1500)})).ok)break;}catch{}
   await new Promise(resolve=>setTimeout(resolve,500));
  }
  browser=await chromium.launch();
  const context=await browser.newContext({viewport:{width:1440,height:1000},locale:'zh-CN'});
  await context.route('**/*',route=>{
   const url=new URL(route.request().url());
   if(url.origin===base||['data:','blob:'].includes(url.protocol))return route.continue();
   external.push(url.origin+url.pathname);return route.abort('blockedbyclient');
  });
  await context.addInitScript(()=>{
   localStorage.setItem('staycraft-operator-language','zh');
   const targets={state:'idle',contextKey:'fixture-property-address',location:'隔离测试地址',hotels:'',savedAt:null};
   window.staycraftDesktop={
    status:async()=>({state:'idle'}),readTargets:async()=>targets,
    saveTargets:async input=>({...targets,hotels:input.hotels,savedAt:new Date().toISOString()}),
    openLogin:async()=>({state:'failed',error:'verification_required'}),
    collectAndSync:async()=>({state:'failed',error:'verification_required'}),
   };
  });
  page=await context.newPage();page.setDefaultTimeout(15000);
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')consoleErrors.push({text:message.text(),url:message.location().url})});
  const goto=async route=>{await page.goto(base+route,{waitUntil:'domcontentloaded'});await page.locator('.workbench-body').waitFor();};
  const checkPage=async()=>{
   assert(page.url().startsWith(base+'/app'));
   await page.waitForFunction(()=>/StayCraft/i.test(document.title));
   assert.match(await page.title(),/StayCraft/i);
   assert((await page.locator('.workbench-body').innerText()).trim().length>20,'Meaningful rendered workspace');
   assert.equal(await page.locator('nextjs-portal [data-nextjs-dialog],#nextjs__container_errors_label').count(),0,'No framework overlay');
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No horizontal document overflow');
  };
  const api=async(url,body)=>{
   const response=await context.request.fetch(base+url,body===undefined?{}:{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},data:body});
   assert(response.ok(),`Fixture API ${url}: ${response.status()} ${await response.text()}`);
   return response.json();
  };
  await page.goto(base+'/login');
  assert.equal(await page.locator('a[href="/native-home"],.auth-demo-link').count(),0,'Login does not link to the old prototype');
  await page.locator('input[name=email]').fill('demo@example.invalid');
  await page.locator('input[name=password]').fill('staycraft-demo');
  await page.locator('.auth-submit').click();await page.waitForURL(base+'/app');
  await page.locator('.gemini-workbench-home').waitFor();await checkPage();
  step('isolated login renders the actual Gemini desktop workbench');

  await goto('/app/mine');await page.locator('.gemini-property-workspace').waitFor();
  assert.match(await page.locator('.workbench-body').innerText(),/民宿|房型/);await checkPage();
  step('current desktop property page reads the isolated saved profile');
  const emptyRooms=route=>route.request().method()==='GET'?route.fulfill({json:{inventory:{types:[],rooms:[]},revision:null}}):route.continue();
  await page.route('**/api/workspace/inventory',emptyRooms);await page.reload();
  await page.getByRole('heading',{name:'添加第一间客房，建立你的房态棋盘',exact:true}).waitFor();
  await page.unroute('**/api/workspace/inventory',emptyRooms);await page.reload();
  await page.locator('.property-room-tile').first().waitFor();
  step('empty inventory renders an actionable setup state without changing saved rooms');

  await goto('/app/work');
  const panel=page.locator('.booking-import-panel');
  await panel.getByRole('heading',{name:'订单数据导入',exact:true}).waitFor();
  await panel.locator('.booking-import-disclosure > summary').click();
  const stamp=new Date().toISOString(),externalId='DESKTOP-JOURNEY-001';
  const csv='channel,external_id,room_type,room_number,arrival,departure,status,total,currency,source_updated_at\n'+`QA,${externalId},花园大床房,,${day(3)},${day(4)},confirmed,325.50,CNY,${stamp}`;
  await panel.locator('input[type=file]').setInputFiles({name:'empty-template.csv',mimeType:'text/csv',buffer:Buffer.from(csv.split('\n')[0])});
  await panel.getByRole('button',{name:'校验并预览',exact:true}).click();
  await panel.getByText('文件里没有订单数据，请填写模板后再导入。',{exact:true}).waitFor();
  assert.equal(await panel.getByRole('button',{name:'确认导入',exact:true}).count(),0);
  await panel.locator('input[type=file]').setInputFiles({name:'isolated-desktop-orders.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});
  await panel.getByRole('button',{name:'校验并预览',exact:true}).click();
  await panel.getByRole('button',{name:'确认导入',exact:true}).waitFor();
  let failCommit=true;
  const importRoute=async route=>{
   if(route.request().method()==='POST'&&route.request().postDataJSON().commit&&failCommit){failCommit=false;expectedResourceFailures.add(route.request().url());return route.fulfill({status:503,json:{error:'temporary_failure'}})}
   return route.continue();
  };
  await page.route('**/api/workspace/booking-import',importRoute);
  await panel.getByRole('button',{name:'确认导入',exact:true}).click();
  await panel.getByText(/暂时无法导入/).waitFor();
  assert((await panel.locator('input[type=file]').inputValue()).length>0,'CSV remains selected after failure');
  await panel.getByRole('button',{name:'确认导入',exact:true}).click();
  await panel.getByText('订单已导入。',{exact:true}).waitFor();
  await page.unroute('**/api/workspace/booking-import',importRoute);
  const imported=await api('/api/workspace/bookings');
  assert(imported.bookings.some(item=>item.external_id===externalId));
  const retry=await api('/api/workspace/booking-import',{csv,commit:false});
  assert(retry.rows.every(item=>item.action==='duplicate'));
  step('CSV preview, failed commit recovery, real local import and duplicate detection');

  const search=page.getByRole('dialog',{name:'搜索订单、房型与功能'});
  const searchInput=search.getByRole('textbox',{name:'搜索订单、房型或功能'});
  await page.locator('.desktop-search-trigger').click();await searchInput.fill(externalId);
  const record=search.getByRole('navigation',{name:'订单搜索结果'}).getByRole('link').first();
  await record.waitFor();assert.match(await record.innerText(),new RegExp(externalId));
  await record.click();await page.waitForURL(/\/app\/bookings\/[a-f\d-]+$/);
  await page.waitForFunction(value=>document.querySelector('.workbench-body')?.textContent.includes(value),externalId);
  assert.match(await page.locator('.workbench-body').innerText(),new RegExp(externalId));
  await page.locator('.desktop-search-trigger').click();await searchInput.fill('不存在的隔离订单XYZ');
  await search.getByText(/没有找到匹配的订单或客房/).waitFor();
  let failSearch=true;
  const searchRoute=async route=>{if(failSearch){failSearch=false;expectedResourceFailures.add(route.request().url());return route.fulfill({status:503,json:{error:'search_unavailable'}})}return route.continue();};
  await page.route('**/api/workspace/search?*',searchRoute);await searchInput.fill('花园大床房');
  await search.getByText('暂时无法搜索订单与客房，请重试。',{exact:true}).waitFor();
  await search.getByRole('button',{name:'重试',exact:true}).click();
  await search.getByRole('navigation',{name:'房型搜索结果'}).getByRole('link').first().waitFor();
  await search.getByRole('button',{name:'关闭',exact:true}).click();await page.unroute('**/api/workspace/search?*',searchRoute);
  step('imported-order search opens its detail; no-result and failed-search retry render correctly');

  await goto('/app');
  await page.getByRole('button',{name:'完整诊断报告',exact:true}).waitFor({state:'visible'});
  await page.waitForFunction(()=>!document.querySelector('.gemini-workbench-home .header-controls button:last-child')?.disabled);
  assert.equal(await page.locator('.home-status[role=alert]').count(),0,'Local diagnosis finishes');
  const chart=page.locator('.hero-chart'),point=chart.locator('.hero-chart-point').first();
  await point.waitFor();assert.equal(await chart.getByRole('tooltip').count(),0);
  await point.hover();await chart.getByRole('tooltip').waitFor();await page.locator('.section-header h1').hover();
  await chart.getByRole('tooltip').waitFor({state:'detached'});
  const opportunity=page.locator('.opp-card').filter({has:page.getByRole('link',{name:/制定推广文案/})}).first();
  await opportunity.getByRole('button',{name:'+ 加入计划',exact:true}).click();
  const plan=page.getByRole('region',{name:'行动计划',exact:true});
  await plan.locator('.ap-item').first().waitFor();
  const checkbox=plan.getByRole('checkbox').first();
  const toggleResponse=page.waitForResponse(response=>response.url()===base+'/api/workspace/agent/plan'&&response.request().method()==='POST');
  await checkbox.click();assert((await toggleResponse).ok(),'Action-plan update succeeds');
  await page.waitForFunction(()=>document.querySelector('.desktop-plan-check')?.checked===true);
  await plan.getByRole('link',{name:/制定推广/}).first().click();await page.waitForURL(/\/app\/promotion\?/);
  const linkedDiagnosis=Object.fromEntries(new URL(page.url()).searchParams);
  step('rules diagnosis, hover-only chart and persisted action plan lead into promotion');

  await page.locator('.gemini-promo-audience .promotion-audience-result').waitFor();
  await page.getByText('活动线索暂时无法读取',{exact:true}).waitFor();
  await page.getByText('天气预报暂时无法读取',{exact:true}).waitFor();
  const generate=page.getByRole('button',{name:'生成推广文案',exact:true});
  await generate.click();const editor=page.locator('#workspace-promotion-copy');
  await page.waitForFunction(()=>Boolean(document.querySelector('#workspace-promotion-copy')?.value));
  const marker='隔离桌面流程验收草稿';await editor.fill((await editor.inputValue())+'\n'+marker);
  let failSave=true;
  const saveRoute=async route=>{if(route.request().method()==='PUT'&&failSave){failSave=false;expectedResourceFailures.add(route.request().url());return route.fulfill({status:503,json:{error:'temporary_failure'}})}return route.continue();};
  await page.route('**/api/workspace/promotion',saveRoute);
  await page.getByRole('button',{name:'保存草稿',exact:true}).click();
  await page.getByText('操作未完成，当前文字已保留，请重试。',{exact:true}).waitFor();
  assert.match(await editor.inputValue(),new RegExp(marker));
  await page.getByRole('button',{name:'保存草稿',exact:true}).click();
  await page.getByText('已保存到当前账号，未发布。',{exact:true}).waitFor();
  await page.unroute('**/api/workspace/promotion',saveRoute);
  const state=await api('/api/workspace/promotion');const storedDraft=state.state.drafts.find(draft=>draft.content.includes(marker));
  assert(storedDraft);assert.equal(storedDraft.engine,'rules_v1');
  assert.equal(storedDraft.plan?.diagnosis?.runId,linkedDiagnosis.runId,'Saved draft retains the original diagnosis');
  assert.equal(storedDraft.plan?.diagnosis?.opportunityId,linkedDiagnosis.opportunityId,'Saved draft retains the selected opportunity');
  await page.reload();await page.locator('.gemini-promo-saved-row > button').first().click();
  assert.match(await editor.inputValue(),new RegExp(marker));await checkPage();
  await page.locator('.workbench-page-heading h1').click();await page.evaluate(()=>window.scrollTo(0,0));
  await page.screenshot({path:path.join(output,'promotion-saved.png'),fullPage:true});
  step('property-based promotion preserves the source plan, recovers from save failure and reloads the saved draft');

  // A deliberate read failure checks the empty/error surface without changing stored data.
  const promotionRead=async route=>{if(route.request().method()==='GET'){expectedResourceFailures.add(route.request().url());return route.fulfill({status:503,json:{error:'temporary_failure'}})}return route.continue();};
  await page.route('**/api/workspace/promotion',promotionRead);await page.reload();
  await page.getByText('暂时无法读取已保存的草稿。',{exact:true}).waitFor();
  await page.unroute('**/api/workspace/promotion',promotionRead);
  await page.getByRole('button',{name:'重新读取',exact:true}).last().click();await page.locator('.gemini-promo-saved-row').first().waitFor();
  step('saved-draft load failure recovers without deleting stored copy');

  await goto('/app');await page.locator('.hero-chart-point').first().waitFor();await checkPage();
  await page.screenshot({path:path.join(output,'workbench.png'),fullPage:true});
  await page.setViewportSize({width:1280,height:800});await checkPage();
  assert.deepEqual(external,[],'Browser makes no external requests');assert.deepEqual(errors,[],'No uncaught browser exceptions');assert.deepEqual(unexpectedConsole(),[],'No unexpected console errors');
  step('page identity, nonblank UI, two desktop widths, framework overlay, console and network checks');
  console.log(JSON.stringify({passed:steps.length,steps,base,viewports:['1440x1000','1280x800'],screenshots:output,scope:'Seeded fictional account and PGlite only. No real signup, Electron IPC, external APIs or model calls.'},null,2));
 }catch(error){
  if(page)await page.screenshot({path:path.join(output,'failure.png'),fullPage:true}).catch(()=>{});
  console.error(JSON.stringify({completedSteps:steps,error:error.message,errors,consoleErrors:unexpectedConsole(),external,screenshots:output,serverTail:serverOutput.slice(-3500)},null,2));
  throw error;
 }finally{await browser?.close();server?.kill();}
}
main().catch(error=>{console.error(error.message);process.exitCode=1});
