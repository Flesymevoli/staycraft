// Opt-in paid API smoke test: fictional data only, one model call.
const {chromium}=require('C:/Users/86299/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
 if(process.env.RUN_PAID_MODEL_TEST!=='1') throw Error('Explicitly set RUN_PAID_MODEL_TEST=1; this test makes one paid model call.');
 const browser=await chromium.launch();const page=await browser.newPage({viewport:{width:390,height:844}});
 const base='http://127.0.0.1:'+(process.env.QA_PORT||'3101');
 const res=await page.request.get(base+'/api/local/facts');assert.equal(res.status(),200);
 const previous=Object.fromEntries((await res.json()).facts.map(f=>[f.key,f.value]));
 try {
  // Replace all facts with a deliberately fabricated fixture before requesting a model draft.
  assert.equal((await page.request.put(base+'/api/local/facts',{data:{breakfast:'08:00–09:00',checkin:'15:00'}})).status(),200);
  await page.goto(base+'/native-work',{waitUntil:'networkidle'});
  await page.locator('#work-demo-question').fill('What time is breakfast?');
  const responsePromise=page.waitForResponse(r=>r.url().endsWith('/api/local/reply-decision')&&r.request().method()==='POST');
  await page.getByRole('button',{name:'Check reply',exact:true}).click();
  const response=await responsePromise;const data=await response.json();
  assert.equal(data.engine,'model_v1',JSON.stringify(data));
  assert.equal(data.reason_code,'model_review');assert.equal(data.sent,false);
  assert.match(data.draft,/08:00–09:00/);
  await page.locator('.work-try-result').getByText('AI-generated').waitFor();
  await page.locator('.work-try-section').screenshot({path:'qa-model-draft.png'});
  console.log(JSON.stringify({result:'PASS live fictional draft',draft:data.draft,engine:data.engine,sent:data.sent}));
  // Failure presentation is stubbed: no second paid model request.
  await page.route('**/api/local/reply-decision',route=>route.fulfill({json:{...data,engine:'rules_v1',reason_code:'model_unavailable',draft:'Breakfast hours: 08:00–09:00.'}}));
  await page.getByRole('button',{name:'Check reply',exact:true}).click();
  await page.locator('.work-try-result').getByText('Showing the rules fallback').waitFor();
  assert.equal(await page.locator('.work-try-result').getByText('Not AI-generated').count(),1);
  console.log('PASS: clearly labelled fallback UI');
 }finally{await page.request.put(base+'/api/local/facts',{data:previous});await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
