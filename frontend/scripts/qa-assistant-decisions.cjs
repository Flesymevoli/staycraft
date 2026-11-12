const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const {readFileSync} = require('node:fs');
const ts = require('typescript');

function checkEvidenceRules(){
 const existing = require.extensions['.ts'];
 require.extensions['.ts'] = (module,path) => module._compile(ts.transpileModule(readFileSync(path,'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
 }).outputText,path);
 try {
  const {evaluateDecision} = require('../src/lib/assistant-decisions.ts');
  const today = '2026-11-11';
  const metrics = {period_start:today,period_end:'2026-11-17',period_days:7,capacity_room_nights:35,booked_pct:40,
   as_of:today,daily:[{date:'2026-11-10',available:6},{date:today,available:2},{date:'2026-11-12',available:4}]};
  const base = {metrics,today};
  const ask = (id,inputs={}) => evaluateDecision(id,{...base,...inputs},true);
  assert.match(ask('vacancy').evidence,/11-12.+11-11/);
  assert.doesNotMatch(ask('vacancy').evidence,/11-10/);
  const previous = {status:'completed',generatedAt:'2026-11-04T06:00:00Z',period:{start:'2026-11-04',end:'2026-11-10'},
   metrics:{bookedPct:60,capacityRoomNights:35}};
  const week=Array.from({length:7},(_,i)=>({date:'2026-11-'+(11+i),capacity:5}));
  previous.dailyMetrics=week.map((day,i)=>({...day,date:'2026-11-'+String(4+i).padStart(2,'0')}));
  const comparePace=prior=>ask('pace',{previous:prior,metrics:{...metrics,daily:week}});
  assert.match(comparePace(previous).evidence,/-20 个百分点/);
  assert.equal(comparePace({...previous,dailyMetrics:previous.dailyMetrics.map((day,i)=>({...day,capacity:i===0?4:5}))}).ready,false);
  assert.equal(ask('pace',{previous:{...previous,generatedAt:'2026-11-05T06:00:00Z'}}).ready,false);
  const orders = ['OTA','OTA','OTA','OTA','direct'].map(external_channel=>({external_channel,status:'confirmed'}));
  assert.match(ask('channels',{orders}).evidence,/4\/5 单（80%）/);
  assert.equal(ask('channels',{orders:[...orders,{external_channel:null,status:'confirmed'}]}).ready,false);
  const event = {title:'演出',start:'2026-11-12',end:'2026-11-12',distanceKm:2,verified:true,observedAt:today,sourceUrl:'https://example.invalid/event'};
  assert.match(ask('events',{events:[event]}).evidence,/演出.+4 间空房/);
  assert.equal(ask('events',{events:[{...event,verified:false}]}).ready,false);
  const quote = {id:'q',source:'platform',sourceName:'Snapshot',capturedAt:today,stayDate:today,
   status:'available',nights:1,adults:2,priceType:'calendar',priceCny:299};
  const positioning = ask('positioning',{quotes:[quote]});
  assert.equal(positioning.ready,false);
  assert.match(positioning.evidence,/1 家住宿/);
  const period = {start:today,end:'2026-11-17'};
  const planRun = {period,generatedAt:'2026-11-11T04:00:00Z',actionPlan:{createdAt:'2026-11-11T05:00:00Z',
   metricBaseline:{name:'open_room_nights',value:12,direction:'lower_better',window:period,unit:'room_nights',kind:'gap_window',comparison:'capacity_ratio'}}};
  const followUp = {period,generatedAt:'2026-11-12T04:00:00Z',signals:[{kind:'gap_window',window:period,baseline:{kind:'capacity_ratio'},metric:{name:'open_room_nights',value:8,unit:'room_nights'}}]};
  assert.match(ask('progress',{planRun,followUp}).title,/已有改善/);
  assert.equal(ask('progress',{planRun,followUp:{...followUp,period:{...period,start:'2026-11-12'}}}).ready,false);
  console.log('PASS: decision evidence and insufficient-data cases across all six topics');
 } finally {
  if(existing)require.extensions['.ts']=existing;
  else delete require.extensions['.ts'];
 }
}

// Run against the isolated desktop sample, with no model or live market calls.
const origin = 'http://127.0.0.1:3190';
(async () => {
 checkEvidenceRules();
 const browser = await chromium.launch();
 try {
  const page = await browser.newPage({viewport:{width:390,height:844}});
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(origin+'/login');
  await page.locator('input[name=email]').fill('demo@example.invalid');
  await page.locator('input[name=password]').fill('staycraft-demo');
  await page.locator('.auth-submit').click();
  await page.waitForURL('**/app');
  await page.evaluate(() => localStorage.setItem('staycraft-operator-language','zh'));
  await page.reload();
  await page.getByRole('button',{name:'问问 AI'}).click();
  const recommended = page.locator('.workspace-assistant .native-suggestions button');
  const vacancy = recommended.filter({hasText:'这周哪天最空，先推哪几天？'});
  await vacancy.waitFor();
  assert.ok(await recommended.count() <= 3);
  const toggle = page.getByRole('button',{name:'全部问题'});
  await toggle.click();
  const bank = page.locator('.workspace-assistant-library-panel');
  const questions = bank.locator('.workspace-assistant-library-item[data-expanded="true"]');
  assert.equal(await questions.count(),6);
  await vacancy.dblclick();
  await page.getByRole('heading',{name:'优先推广空房最多的日期'}).waitFor();
  assert.equal(await vacancy.count(),0);
  assert.equal(await page.locator('.workspace-assistant-turn').count(),1);
  assert.equal(await questions.count(),5);
  let releaseAnswer;
  const waitForSelection = new Promise(resolve=>{releaseAnswer=resolve;});
  await page.route('**/api/workspace/assistant',async route=>{
   if(route.request().postDataJSON().questionId==='pace')await waitForSelection;
   await route.continue();
  });
  const pace = questions.getByRole('button',{name:'进单比上周慢了吗？'});
  await pace.click();
  try {
   assert.equal(await pace.count(),0);
   const pending = page.locator('.workspace-assistant-turn').last();
   await pending.getByRole('heading',{name:'进单比上周慢了吗？'}).waitFor();
   await pending.getByRole('status').waitFor();
   assert.ok(await bank.evaluate(element=>Boolean(element.compareDocumentPosition(
    document.querySelector('.workspace-assistant-turns')) & Node.DOCUMENT_POSITION_FOLLOWING)));
  } finally {
   releaseAnswer();
  }
  await page.getByRole('heading',{name:'缺少同提前量的预订对比'}).waitFor();
  await bank.getByRole('button',{name:'我的价格在同行里偏高还是偏低？'}).click();
  await page.getByRole('heading',{name:'现有报价不足以判断房价高低'}).waitFor();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth <= window.innerWidth));
  assert.deepEqual(errors,[]);
  console.log('PASS 390px: flat library, double-click, immediate removal and pending question below, pace and price gaps, no overflow');
 } finally {
  await browser.close();
 }
})().catch(error=>{console.error(error);process.exitCode=1});
