// Opt-in: real demo Auth and database, local production UI; no model calls.
// Restores the demo's original promotion sources/drafts after verification.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const {chromium}=require('./qa-browser.cjs');
assert.equal(process.env.RUN_LIVE_DEMO_QA,'1','Requires RUN_LIVE_DEMO_QA=1');
const base='http://127.0.0.1:3114';
(async()=>{
 const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3114'],{windowsHide:true,stdio:['ignore','pipe','pipe'],env:{...process.env,HTTP_PROXY:'',HTTPS_PROXY:'',ALL_PROXY:'',STAYCRAFT_QA_AUTH_FIXTURES:'0',STAYCRAFT_QA_FORMAL_STAYS:'0',STAYCRAFT_OPERATOR_SAMPLE:'0',MODEL_ENABLED:'0',FORMAL_MODEL_ENABLED:'0',FORMAL_AUTO_REPLY_ENABLED:'0',HOMESTAY_LOCAL_DATA:'0',STAYCRAFT_HOSTED:'0',VERCEL:'0'}});
 let output='',browser,context,original,changed=false,restore=false;server.stdout.on('data',d=>output+=d);server.stderr.on('data',d=>output+=d);
 try{
  await new Promise((resolve,reject)=>{const interval=setInterval(()=>{if(output.includes('Ready in')){clearInterval(interval);resolve()}},100);server.once('exit',()=>{clearInterval(interval);reject(Error('Local server exited'))});setTimeout(()=>{clearInterval(interval);reject(Error('Local server startup timeout'))},20000).unref()});
  browser=await chromium.launch();context=await browser.newContext({viewport:{width:390,height:844}});const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await page.goto(base+'/login');await page.locator('#email').fill('demo@example.invalid');await page.locator('#password').fill('staycraft-demo');await page.locator('button[type=submit]').click();await page.waitForURL(base+'/app',{timeout:60000});
  const inventory=await(await context.request.get(base+'/api/workspace/inventory')).json();assert.equal(inventory.inventory.rooms.length,6);const profile=await(await context.request.get(base+'/api/workspace/profile')).json();assert.match(profile.profile.name,/虚构|演示/,'Only the fictional demo property is allowed');
  original=await(await context.request.get(base+'/api/workspace/promotion')).json();assert(original.state);assert.equal(original.state.sources.length,0,'Do not alter an existing user workspace');assert.equal(original.state.drafts.length,0);
  await page.goto(base+'/app/explore?start=2026-10-30&end=2026-11-02');const create=page.getByRole('button',{name:'生成推广草稿',exact:true});await create.waitFor({timeout:60000});assert.equal(await page.getByLabel('开始日期',{exact:true}).inputValue(),'2026-10-30');
  await page.locator('.promotion-sources').getByRole('button',{name:'添加',exact:true}).click();await page.getByLabel('线索标题',{exact:true}).fill('验收用虚构线索（完成后移除）');await page.getByLabel('来源网址（HTTPS）',{exact:true}).fill('https://example.org/demo-reference');await page.getByLabel('已核实的信息',{exact:true}).fill('仅用于验证保存与来源共享，不代表真实活动。');await page.getByLabel('适用开始日期',{exact:true}).fill('2026-10-30');await page.getByLabel('适用结束日期',{exact:true}).fill('2026-11-02');await page.getByRole('checkbox',{name:'我已对照来源核对以上事实与适用日期。',exact:true}).check();changed=true;await page.getByRole('button',{name:'保存线索',exact:true}).click();await page.getByText('线索已保存，作为你核对的参考资料，不代表市场需求预测。',{exact:true}).waitFor({timeout:60000});
  await create.click();const editor=page.getByLabel('核对并编辑',{exact:true});await editor.waitFor({timeout:60000});assert((await editor.inputValue()).includes('虚构'));await editor.fill((await editor.inputValue())+'\n云端保存验收（虚构）');await page.getByRole('button',{name:'保存草稿',exact:true}).click();await page.getByText('已保存到当前账号，未发布。',{exact:true}).waitFor({timeout:60000});
  await page.reload();await page.locator('.promotion-draft-open').first().click();await editor.waitFor();assert((await editor.inputValue()).includes('云端保存验收（虚构）'));await editor.scrollIntoViewIfNeeded();await page.screenshot({path:'qa-promotion-cloud-editor.png'});
  const saved=await(await context.request.get(base+'/api/workspace/promotion')).json();assert.equal(saved.state.sources.length,1);assert.equal(saved.state.drafts.length,1);assert.equal(saved.state.drafts[0].engine,'rules_v1');
  const conflict=await context.request.put(base+'/api/workspace/promotion',{headers:{Origin:base},data:{state:saved.state,revision:original.revision}});assert.equal(conflict.status(),409);
  console.log('Verified real source/draft persistence and stale revision refusal.');
  await page.goto(base+'/app/analysis');await page.getByRole('link',{name:/验收用虚构线索（完成后移除）/}).waitFor({timeout:60000});
  await page.goto(base+'/app/work');await page.locator('.inventory-room').first().waitFor({timeout:60000});assert.equal(await page.locator('.inventory-room').count(),6);await page.screenshot({path:'qa-work-cloud-current.png'});
  await page.goto(base+'/app/mine');await page.getByRole('button',{name:'退出登录',exact:true}).click();await page.waitForURL(base+'/login',{timeout:60000});assert.equal((await context.request.get(base+'/api/workspace/promotion')).status(),401);
  // Reauthenticate through the real login form to verify normal session recovery.
  await page.locator('#email').fill('demo@example.invalid');await page.locator('#password').fill('staycraft-demo');await page.locator('button[type=submit]').click();await page.waitForURL(base+'/app',{timeout:60000});
  assert.deepEqual(errors,[]);
  fs.writeFileSync('qa-promotion-cloud-report.json',JSON.stringify({date:'2026-10-30',realAuth:true,realDatabase:true,localProductionUI:true,modelCalls:0,saveReload:true,sourceShared:true,staleRevisionRejected:true,logout401:true,relogin:true},null,2));
 }finally{
  if(changed&&context&&original){const current=await(await context.request.get(base+'/api/workspace/promotion')).json();if(current.state){const response=await context.request.put(base+'/api/workspace/promotion',{headers:{Origin:base},data:{state:original.state,revision:current.revision}});assert.equal(response.status(),200,'Could not restore original demo promotion workspace');restore=true}}
  if(browser)await browser.close();server.kill();if(restore)console.log('Restored original demo sources/drafts.');
 }
 console.log('PASS real demo login, cloud source/draft save and reload, Analysis source sharing, revision conflict, logout and relogin. Local production UI; no model requests or public deployment.');
})().catch(e=>{console.error(e.message);process.exitCode=1});
