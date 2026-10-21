const {chromium}=require('C:/Users/86299/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
  const browser=await chromium.launch();
  try{
    const page=await browser.newPage({viewport:{width:390,height:844}});
    const base='http://127.0.0.1:'+(process.env.QA_PORT||'3102');
    await page.request.put(base+'/api/local/facts',{data:{checkin:'15:00'}});
    const schedule=await(await page.request.get(base+'/api/local/schedule')).json();
    await page.goto(base+'/native-home',{waitUntil:'networkidle'});
    await page.getByRole('button',{name:'9/17/2026',exact:true}).click();
    const selected=schedule.items.filter(e=>e.date==='2026-09-17');
    assert.equal(await page.locator('.native-event').count(),selected.length);
    assert.deepEqual(await page.locator('.native-event time').allTextContents(),selected.map(e=>e.time??'—'));
    await page.locator('#native-schedule').getByText('Room 102 · Sample reservation · Standard time',{exact:true}).waitFor();
    await page.locator('#native-schedule').getByText('Room 201 · Sample reservation · Time not recorded',{exact:true}).waitFor();
    await page.getByRole('button',{name:'9/30/2026',exact:true}).click();
    await page.getByText('No events for this date.',{exact:true}).waitFor();
    await page.locator('.native-language').click();
    await page.getByRole('button',{name:'2026/9/17',exact:true}).click();
    await page.locator('#native-schedule').getByText('房间 102 · 示例预订 · 常规时间',{exact:true}).waitFor();
    for(const width of [320,360,390,430]){
      await page.setViewportSize({width,height:844});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    }
    await page.screenshot({path:'qa-home-schedule.png',animations:'disabled'});
    await page.locator('.native-language').click();
    await page.route('**/api/local/schedule',r=>r.fulfill({status:503,json:{}}));
    await page.reload({waitUntil:'networkidle'});
    await page.getByRole('button',{name:'9/17/2026',exact:true}).click();
    await page.locator('#native-schedule [role=alert]').waitFor();
    await page.unroute('**/api/local/schedule');
    await page.locator('#native-schedule').getByRole('button',{name:'Retry',exact:true}).click();
    await page.locator('.native-event').first().waitFor();
    await page.route('**/api/local/schedule',async route=>{await new Promise(resolve=>setTimeout(resolve,600));await route.continue();});
    await page.reload({waitUntil:'domcontentloaded'});
    await page.getByRole('button',{name:'9/17/2026',exact:true}).click();
    await page.locator('#native-schedule [role=status]').waitFor();
    await page.locator('.native-event').first().waitFor();
    console.log('PASS: schedule matches orders, times labelled, date selection/collapse, empty/loading/failure/retry, Chinese and mobile');
  }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
