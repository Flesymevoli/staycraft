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
await block.getByRole('button',{name:'确认导入',exact:true}).click();await block.getByText(/暂时无法导入/).waitFor();assert.equal(await block.locator('input[type=file]').inputValue().then(Boolean),true);await block.getByRole('button',{name:'确认导入',exact:true}).click();await block.getByText('订单已导入。',{exact:true}).waitFor();
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
const autoCsv=header+`\nQA,AUTO-UI,导入新增山景房,新301,${day(10)},${day(11)},confirmed,450.00,CNY,${stamp}`;
await block.locator('input[type=file]').setInputFiles({name:'qa-new-room-type.csv',mimeType:'text/csv',buffer:Buffer.from(autoCsv)});
await block.getByRole('button',{name:'校验并预览',exact:true}).click();
await block.getByText(/确认后将新增房型：导入新增山景房/).waitFor();
await block.getByText(/未建档房号.*新301/).waitFor();
await block.getByRole('button',{name:'确认导入',exact:true}).click();
await block.getByText(/已添加房型：导入新增山景房/).waitFor();
await page.screenshot({path:'qa-auto-room-type-import.png',fullPage:true});
await page.goto(base+'/app/mine#room-types');
const newType=page.locator('.room-type-summary').filter({hasText:'导入新增山景房'});
await newType.getByText(/价格待补充/).waitFor();
await newType.getByRole('button',{name:'编辑',exact:true}).click();
assert.equal(await page.getByLabel('最多入住人数',{exact:true}).inputValue(),'');
assert.equal(await page.getByLabel('每晚价格（元）',{exact:true}).inputValue(),'');
await page.screenshot({path:'qa-auto-room-type-details.png',fullPage:true});
if(!process.argv.includes('--import-only')){
await page.goto(base+'/app/promotion');
await page.getByRole('button',{name:'使用模板',exact:true}).click();
const editor=page.locator('#workspace-promotion-copy');
await editor.fill((await editor.inputValue())+'\n隔离验收草稿');
await page.getByRole('button',{name:'保存文案',exact:true}).click();
await page.getByText('已保存到当前账号，未发布。',{exact:true}).waitFor();
await page.reload();
await page.locator('.promotion-draft-open').first().click();
assert.match(await editor.inputValue(),/隔离验收草稿/);
}
await asUser('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
const foreign=await context.request.get(base+'/api/workspace/booking-import?view=state');
assert(!JSON.stringify(await foreign.json()).includes('QA'));
await context.clearCookies();
assert.equal((await context.request.get(base+'/api/workspace/booking-import?view=state')).status(),401);
assert.deepEqual(errors,[]);
console.log('PASS isolated browser import, auto-created room types and empty fields, correction, cancellation, metrics and account isolation'+(process.argv.includes('--import-only')?'':'; promotion draft reload'));
}finally{await browser?.close();server.kill()}})().catch(error=>{console.error(error);process.exitCode=1});
