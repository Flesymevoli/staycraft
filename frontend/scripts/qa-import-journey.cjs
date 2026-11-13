// Browser + isolated PostgreSQL/WASM integration with a non-demo workspace.
const {chromium}=require('./qa-browser.cjs'),assert=require('node:assert/strict'),path=require('node:path');
const {spawn}=require('node:child_process');
(async()=>{
const base='http://127.0.0.1:3291';
const server=spawn(process.execPath,['--require',path.resolve('scripts/qa-workspace-fixture.cjs'),'node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port','3291'],{
 env:{...process.env,STAYCRAFT_QA_AUTH_FIXTURES:'1',STAYCRAFT_QA_FORMAL_STAYS:'1',STAYCRAFT_QA_IMPORT_DB:'1',STAYCRAFT_OPERATOR_SAMPLE:'0',STAYCRAFT_DESKTOP_DEV:'1',STAYCRAFT_DESKTOP_TEST_PORT:'3291',STAYCRAFT_QA_DESKTOP_SYNC:'1',NEXT_PUBLIC_SUPABASE_URL:'https://staycraft-qa.invalid',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'fixture-key',DEMO_LOGIN_EMAIL:'',MODEL_ENABLED:'0',FORMAL_MODEL_ENABLED:'0'},stdio:'inherit',windowsHide:true
});
let browser;
try{
 for(let attempt=0;;attempt++){
  if(attempt===40||server.exitCode!==null)throw Error('Import fixture server did not start');
  try{if((await fetch(base+'/login',{signal:AbortSignal.timeout(2000)})).ok)break;}catch{}
  await new Promise(resolve=>setTimeout(resolve,500));
 }
 browser=await chromium.launch();
 const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),errors=[];
 page.setDefaultTimeout(10000);
 page.on('pageerror',error=>errors.push(error.message));
const enc=v=>Buffer.from(JSON.stringify(v)).toString('base64url');
async function asUser(id){const token=`${enc({alg:'HS256',typ:'JWT'})}.${enc({sub:id,exp:4102444800,iat:1700000000,aud:'authenticated',role:'authenticated'})}.qa-signature`;await context.clearCookies();await context.addCookies([{name:'sb-staycraft-qa-auth-token',url:base,value:'base64-'+enc({access_token:token,refresh_token:'qa',expires_at:4102444800,expires_in:3600,token_type:'bearer',user:{id}})}])}
await page.goto(base+'/login');await page.locator('input[name=email]').fill('demo@example.invalid');await page.locator('input[name=password]').fill('staycraft-demo');await page.locator('.auth-submit').click();await page.waitForURL(base+'/app');await page.goto(base+'/app/work');
const block=page.locator('section').filter({has:page.getByRole('heading',{name:'订单数据导入',exact:true})}).first();await block.getByText('暂无到期的导入任务。',{exact:true}).waitFor();
assert.equal(await block.locator('.booking-import-disclosure').evaluate(el=>el.open),false);
for(const width of [320,390,474]){await page.setViewportSize({width,height:714});assert((await block.boundingBox()).height<310,`compact import too tall at ${width}`);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
await page.setViewportSize({width:390,height:844});
const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai'}).format(new Date()),day=n=>{const d=new Date(today+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)},stamp=new Date().toISOString();
const header='channel,external_id,room_type,room_number,arrival,departure,status,total,currency,source_updated_at';
const csv=header+`\nQA,A1,花园大床房,,${today},${day(1)},confirmed,300.01,CNY,${stamp}\nQA,H1,花园大床房,,${day(-6)},${day(-4)},completed,100.01,CNY,${stamp}`;
await block.locator('.booking-import-disclosure > summary').click();await block.locator('input[type=file]').setInputFiles({name:'qa-orders.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});await block.getByRole('button',{name:'校验并预览',exact:true}).click();await block.getByRole('button',{name:'确认导入',exact:true}).waitFor();
let fail=true;await page.route('**/api/workspace/booking-import',async route=>{if(route.request().method()==='POST'&&route.request().postDataJSON().commit&&fail){fail=false;return route.fulfill({status:503,json:{error:'temporary_failure'}})}return route.continue()});
await block.getByRole('button',{name:'确认导入',exact:true}).click();await block.getByText(/暂时无法导入/).waitFor();assert.equal(await block.locator('input[type=file]').inputValue().then(Boolean),true);assert.equal(await block.getByRole('button',{name:'确认导入',exact:true}).isDisabled(),true);await block.getByRole('button',{name:'核对导入结果',exact:true}).click();await block.getByText('未找到本次导入回执',{exact:true}).waitFor();await block.getByRole('button',{name:'校验并预览',exact:true}).click();await block.getByRole('button',{name:'确认导入',exact:true}).click();await block.getByText('订单已导入。',{exact:true}).waitFor();
const api=async(p,body,method='POST')=>{const r=await context.request.fetch(base+p,{method,data:body,headers:{Origin:base,'Content-Type':'application/json'}});let data;try{data=await r.json()}catch{data=null}return {status:r.status(),data}};
let state=(await context.request.get(base+'/api/workspace/booking-import?view=state')).json();state=await state;assert.equal(state.batches.length,1);assert.equal(state.tasks.length,3);
const repeated=await api('/api/workspace/booking-import',{csv,commit:false});assert.equal(repeated.status,200);assert(repeated.data.rows.every(r=>r.action==='duplicate'));await api('/api/workspace/booking-import',{csv,commit:true,revision:repeated.data.revision});let after=await (await context.request.get(base+'/api/workspace/booking-import?view=state')).json();assert.equal(after.tasks.length,3);
const task=after.tasks.find(t=>t.kind==='arrival');assert.equal((await api('/api/workspace/booking-import',{task:task.id},'PUT')).status,200);
const nextStamp=new Date(Date.parse(stamp)+1000).toISOString(),changed=csv.replace(`,${day(1)},confirmed,300.01`,`,${day(2)},confirmed,350.01`).replaceAll(stamp,nextStamp);
let preview=await api('/api/workspace/booking-import',{csv:changed,commit:false});assert.equal(preview.status,200);assert.equal((await api('/api/workspace/booking-import',{csv:changed,commit:true,revision:preview.data.revision})).status,200);
assert.equal((await api('/api/workspace/booking-import',{csv,commit:false})).status,409);
const cancelled=changed.replace(',confirmed,350.01',',cancelled,350.01').replaceAll(nextStamp,new Date(Date.parse(stamp)+2000).toISOString());
preview=await api('/api/workspace/booking-import',{csv:cancelled,commit:false});assert.equal(preview.data.rows[0].action,'cancelled');assert.equal((await api('/api/workspace/booking-import',{csv:cancelled,commit:true,revision:preview.data.revision})).status,200);
const all=await (await context.request.get(base+'/api/workspace/bookings')).json();assert.equal(all.bookings.find(b=>b.external_id==='A1').status,'cancelled');

const metrics=await (await context.request.get(base+`/api/workspace/metrics?start=${day(-6)}&end=${day(-4)}`)).json();assert.equal(metrics.amount_cents,10001);assert.equal(metrics.booked_order_room_nights,2);assert.equal(metrics.booked_pct,null);const revenue=await (await context.request.get(base+'/api/workspace/revenue?month='+day(-6).slice(0,7))).json();assert(revenue.orders.some(o=>o.totalCents===10001));
await page.goto(base+'/app/analysis');await page.locator('.booking-analysis-cards').waitFor();await page.locator('.booking-period-picker > summary').click();await page.getByLabel('开始日期',{exact:true}).fill(day(-6));await page.getByLabel('结束日期',{exact:true}).fill(day(-4));await page.getByRole('button',{name:'应用',exact:true}).click();await page.getByText(/缺少历史房量，不展示历史占用率/).waitFor();
await page.getByLabel('开始日期',{exact:true}).fill(today);await page.getByLabel('结束日期',{exact:true}).fill(day(6));await Promise.all([page.waitForResponse(r=>r.url().includes('/api/workspace/metrics')&&r.status()===200),page.getByRole('button',{name:'应用',exact:true}).click()]);
for(const [index,title] of ['每日预订占用率','每日已订间夜','每日预订金额','每日平均预订房价'].entries()){await page.locator('.booking-analysis-cards>button').nth(index).click();await page.getByRole('img',{name:title,exact:true}).waitFor();const slider=page.getByRole('slider',{name:'选择预订图表日期',exact:true});await slider.focus();await slider.press('ArrowRight');assert.match(await page.locator('.booking-analysis-readout .chart-readout-label').innerText(),/^\d{4}-\d{2}-\d{2}$/);}
await page.goto(base+'/app/work');
await block.locator('.booking-import-disclosure > summary').click();
const autoCsv=header+'\n'+Array.from({length:40},(_,i)=>`QA,AUTO-UI-${i},导入新增山景房,新301,${day(10+i)},${day(11+i)},confirmed,450.00,CNY,${stamp}`).join('\n');
await page.locator('.wb-booking-records > summary').click();
await block.locator('input[type=file]').setInputFiles({name:'qa-new-room-type.csv',mimeType:'text/csv',buffer:Buffer.from(autoCsv)});
await block.getByRole('button',{name:'校验并预览',exact:true}).click();
await block.getByText(/确认后将新增房型：导入新增山景房/).waitFor();
await block.getByText('确认后将按房号新增 1 间客房并分配订单。',{exact:true}).waitFor();
await block.getByRole('button',{name:'确认导入',exact:true}).click();
await block.getByText('订单已导入。',{exact:true}).waitFor();
await block.locator('.booking-import-result').getByText('新增 40 · 新增房型 1 个 · 新增客房 1 间',{exact:true}).waitFor();
assert.equal(await block.locator('.booking-import-disclosure').evaluate(el=>el.open),false,'success closes the import form');
assert.equal(await page.locator('.wb-booking-records').evaluate(el=>el.open),false,'import collapses the reservation list too');
assert.equal(await block.locator('.booking-import-row-preview').count(),0,'success removes every order preview row');
assert.equal(await block.locator('input[type=file]').inputValue(),'','success clears the file');
for(const width of [320,390,1366]){await page.setViewportSize({width,height:900});assert((await block.locator('.booking-import-result').boundingBox()).height<180,'40 orders still produce a compact summary');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
const importedInventory=await (await context.request.get(base+'/api/workspace/inventory')).json();
assert.equal(importedInventory.inventory.rooms.filter(r=>r.number==='新301').length,1,'40 orders create only one numbered room');
const importedOrders=await (await context.request.get(base+'/api/workspace/bookings')).json();
assert.equal(importedOrders.bookings.filter(b=>b.external_id?.startsWith('AUTO-UI-')&&b.room_number==='新301').length,40,'all numbered orders are assigned');
await page.screenshot({path:require('node:os').tmpdir()+'/staycraft-import-compact-result.png',fullPage:true});
await page.screenshot({path:'qa-auto-room-type-import.png',fullPage:true});
await page.goto(base+'/app/mine#room-types');
const newType=page.locator('.room-type-summary').filter({hasText:'导入新增山景房'});
await newType.waitFor();
await newType.getByRole('button',{name:'编辑',exact:true}).click();
assert.equal(await page.getByLabel('最多入住人数',{exact:true}).inputValue(),'');
assert.equal(await page.getByLabel('备用每晚价格（元）',{exact:true}).inputValue(),'');
await page.screenshot({path:'qa-auto-room-type-details.png',fullPage:true});
await page.getByLabel('备用每晚价格（元）',{exact:true}).fill('388');
await page.getByLabel('最多入住人数',{exact:true}).fill('3');
await page.getByRole('button',{name:'保存房型',exact:true}).click();
await page.getByText('房型已保存到云端。',{exact:true}).waitFor();
await page.reload();
await newType.getByText(/¥388/).waitFor();
await newType.getByRole('button',{name:'编辑',exact:true}).click();
assert.equal(await page.getByLabel('备用每晚价格（元）',{exact:true}).inputValue(),'388');
assert.equal(await page.getByLabel('最多入住人数',{exact:true}).inputValue(),'3');
if(!process.argv.includes('--import-only')){
await context.addInitScript(()=>{window.staycraftDesktop={};});
await page.setViewportSize({width:1366,height:900});
 // UI evidence is isolated; no search/model requests are made by these fixtures.
 let evidenceMode='mixed';
 await page.route('**/api/workspace/discovery',async route=>{
  if(evidenceMode==='failed')return route.fulfill({status:503,json:{error:'service_unavailable'}});
  const {start,end}=route.request().postDataJSON(),observedAt=new Date().toISOString();
  const source={id:'events',authority:'public',observedAt,coverage:{from:start,to:end,kind:'partial'},confidence:'low'};
  const events=evidenceMode==='mixed'?[{id:'qa-event',title:'隔离样本：已核实展览',start,end,venue:'隔离文化馆',distanceKm:2,category:'exhibition',verified:true,sourceUrl:'https://events.example/verified',observedAt,source}]:[];
  return route.fulfill({json:{location:'隔离测试地址',events,eventSource:source,review:{raw:2,pages:2,parsed:events.length,final:events.length,query:'隔离城市 及周边 活动预告 演出或市集或节庆或展览',observedAt,cached:false,rows:[{title:'隔离样本：展览来源',url:'https://events.example/verified',reason:events.length?'accepted':'evidence_unpaired',events:events.map(event=>({title:event.title,reason:'accepted'}))},{title:'隔离样本：日期未公布的市集报道',url:'https://events.example/pending',reason:'date_pending',candidate:true,events:[]}]}}});
 });
await page.goto(base+'/app/promotion');
 await page.getByRole('heading',{name:'已核实活动 · 1 项',exact:true}).waitFor();
 const pending=page.getByRole('region',{name:'待确认线索',exact:true});
 await pending.getByText('日期待确认',{exact:true}).waitFor();
 assert.equal(await pending.getByRole('button').count(),0,'unconfirmed evidence cannot enter the copy studio');
 await page.getByText('搜索核验详情',{exact:true}).click();
 await page.getByText('原始结果 2 条 → 可读页面 2 篇 → 解析活动 1 项 → 筛选保留 1 项',{exact:true}).waitFor();
 const opportunities=page.getByRole('region',{name:'经营机会',exact:true});
 await opportunities.getByText('经营机会 · 日历建议',{exact:true}).waitFor();
 assert.equal(await opportunities.getByRole('button').count(),0,'calendar ideas are not selectable as real activities');
 for(const width of [390,1366]){await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'evidence layout does not overflow');await page.screenshot({path:require('node:os').tmpdir()+`/staycraft-evidence-${width}.png`,fullPage:true});}
 evidenceMode='empty';await page.getByRole('button',{name:'重新读取线索',exact:true}).click();
 await page.getByRole('heading',{name:'已核实活动 · 0 项',exact:true}).waitFor();await opportunities.waitFor();
 assert.equal(await page.getByRole('button',{name:'选用线索',exact:true}).count(),0);
 evidenceMode='failed';await page.getByRole('button',{name:'重新读取线索',exact:true}).click();
 await page.getByText('活动线索暂时无法读取',{exact:true}).waitFor();
 assert.equal(await page.getByText('隔离样本：日期未公布的市集报道',{exact:true}).count(),0,'failed refresh clears previous candidates');
 await opportunities.waitFor();
await page.getByRole('button',{name:'固定文案库',exact:true}).click();
await page.getByRole('button',{name:'生成推广文案',exact:true}).click();
const editor=page.locator('#workspace-promotion-copy');
await page.waitForFunction(()=>document.querySelector('#workspace-promotion-copy')?.readOnly===false);
await editor.fill((await editor.inputValue())+'\n隔离验收草稿');
await page.getByRole('button',{name:'保存草稿',exact:true}).click();
await page.getByText('已保存到当前账号，未发布。',{exact:true}).waitFor();
await page.reload();
await page.locator('.gemini-promo-saved-row').first().getByRole('button').first().click();
assert.match(await editor.inputValue(),/隔离验收草稿/);
await page.screenshot({path:require('node:os').tmpdir()+'/staycraft-promotion-regression.png',fullPage:true});
await context.addInitScript(()=>{window.staycraftDesktop={
 status:async()=>({state:'idle'}),
 readTargets:async()=>({state:'idle',contextKey:'isolated-qa',location:'隔离地址',hotels:''}),
 collectAndSync:async()=>({state:'failed',error:'no_quotes'}),
};});
await page.goto(base+'/app/explore');
await page.getByRole('button',{name:'打开采集抽屉',exact:true}).first().click();
await page.getByLabel('城市',{exact:true}).fill('无锡');
await page.getByRole('button',{name:'采集并同步',exact:true}).click();
await page.locator('p[role="alert"]').filter({hasText:'当前城市、日期和星级下没有可读取的报价。请核对筛选条件和携程登录状态后重试。'}).waitFor();
await page.screenshot({path:require('node:os').tmpdir()+'/staycraft-collection-empty.png',fullPage:true});
}
await asUser('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
const foreign=await context.request.get(base+'/api/workspace/booking-import?view=state');
assert(!JSON.stringify(await foreign.json()).includes('QA'));
await context.clearCookies();
assert.equal((await context.request.get(base+'/api/workspace/booking-import?view=state')).status(),401);
assert.deepEqual(errors,[]);
console.log('PASS isolated browser import, auto-created room types and empty fields, correction, cancellation, metrics and account isolation'+(process.argv.includes('--import-only')?'':'; promotion draft reload'));
}finally{await browser?.close();server.kill()}})().catch(error=>{console.error(error);process.exitCode=1});
