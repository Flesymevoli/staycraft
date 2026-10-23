const {chromium}=require('./qa-browser.cjs');
const assert=require('node:assert/strict');
(async()=>{
  const browser=await chromium.launch();
  try{
    const page=await browser.newPage({viewport:{width:390,height:844}});
    const base='http://127.0.0.1:'+(process.env.QA_PORT||'3102');
    const metrics=await(await page.request.get(base+'/api/local/operation-metrics?days=7')).json();
    await page.goto(base+'/native-work',{waitUntil:'networkidle'});
    assert.equal(await page.locator('.work-working [role=progressbar]').count(),0);
    await page.getByRole('button',{name:'Prepare insight',exact:true}).click();
    const task=page.locator('.work-task-card').filter({hasText:'Weekday occupancy insight'});
    await task.getByRole('button',{name:'Review insight',exact:true}).click();
    const text=await page.locator('#work-text-analysis').inputValue();
    assert.ok(text.includes(metrics.weekday_pct+'%'));
    assert.ok(text.includes(metrics.weekend_pct+'%'));
    await task.getByText(metrics.period_start+' – '+metrics.period_end,{exact:false}).waitFor();
    await page.locator('.native-language').click();
    assert.ok((await page.locator('#work-text-analysis').inputValue()).includes('工作日平均入住率为 '+metrics.weekday_pct+'%'));
    for(const width of [320,360,390,430]){
      await page.setViewportSize({width,height:844});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    }
    await page.locator('.native-language').click();
    await task.getByRole('button',{name:'Mark as reviewed',exact:true}).click();
    await page.locator('.work-done').getByText('Occupancy insight reviewed',{exact:true}).waitFor();
    await page.evaluate(()=>{sessionStorage.removeItem('homestay-demo:analysisReady');sessionStorage.removeItem('homestay-demo:confirmed')});
    await page.route('**/api/local/operation-metrics?**',r=>r.fulfill({status:503,json:{}}));
    await page.reload({waitUntil:'networkidle'});
    await page.locator('.work-working [role=alert]').waitFor();
    assert.equal(await page.getByRole('button',{name:'Prepare insight',exact:true}).count(),0);
    await page.unroute('**/api/local/operation-metrics?**');
    await page.locator('.work-working').getByRole('button',{name:'Retry',exact:true}).click();
    await page.getByRole('button',{name:'Prepare insight',exact:true}).waitFor();
    const empty={...metrics,capacity_room_nights:0,occupancy_pct:null,weekday_pct:null,weekend_pct:null};
    await page.route('**/api/local/operation-metrics?**',r=>r.fulfill({json:empty}));
    await page.reload({waitUntil:'networkidle'});
    await page.locator('.work-working').getByText('No room inventory available.',{exact:true}).waitFor();
    assert.equal(await page.getByRole('button',{name:'Prepare insight',exact:true}).count(),0);
    console.log('PASS: Work insight matches order metrics, changes language, review flow, no fake running state, failure/retry, empty and mobile');
  }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
