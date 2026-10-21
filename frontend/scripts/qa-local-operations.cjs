// Uses a fresh isolated fictional database: records both existing owner plans.
const { chromium } = require('C:/Users/86299/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const base = 'http://127.0.0.1:' + (process.env.QA_PORT || '3102');
    await page.request.put(base+'/api/local/facts', { data: { checkin: '15:00' } });
    await page.goto(base+'/native-work', { waitUntil:'networkidle' });
    const arrival = page.locator('#operation-arrival');
    await arrival.getByText('Room 102 · Taylor · 2026-09-17', {exact:true}).waitFor();
    await arrival.getByRole('button',{name:'Review advice',exact:true}).click();
    await arrival.getByText('Standard check-in: 15:00', {exact:true}).waitFor();
    await page.request.post(base+'/api/local/room-clean',{data:{room_number:'102'}});
    await arrival.getByRole('button',{name:'Record standard time',exact:true}).click();
    await arrival.getByText('The basis or saved plan changed.',{exact:false}).waitFor();
    await arrival.getByRole('button',{name:'Review again',exact:true}).click();
    await arrival.getByText('Room checks passed. You can consider the request.',{exact:true}).waitFor();
    let requestId;
    await page.route('**/api/local/operation-decision', route => {
      requestId=route.request().postDataJSON().request_id;
      return route.fulfill({status:503,json:{}});
    });
    await arrival.getByRole('button',{name:'Record early-arrival plan',exact:true}).click();
    await arrival.getByText('Not saved. Please retry; this request remains pending.',{exact:true}).waitFor();
    await page.unroute('**/api/local/operation-decision');
    await page.route('**/api/local/operation-decision', async route => {
      assert.equal(route.request().postDataJSON().request_id,requestId);
      await new Promise(resolve=>setTimeout(resolve,300));
      await route.continue();
    });
    await arrival.getByRole('button',{name:'Record early-arrival plan',exact:true}).click();
    await arrival.getByRole('button',{name:'Saving…',exact:true}).waitFor();
    await page.getByText('Check-in plan recorded',{exact:true}).waitFor();
    await page.unroute('**/api/local/operation-decision');
    await page.reload({waitUntil:'networkidle'});
    assert.equal(await page.locator('#operation-arrival').count(),0);
    await page.getByText('Early arrival plan · Not executed',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Reset demo',exact:true}).click();
    assert.equal(await page.locator('#operation-arrival').count(),0);
    await page.getByRole('navigation').getByRole('link',{name:'Home',exact:true}).click();
    await page.locator('.native-pending-head').getByText('1',{exact:true}).waitFor();
    assert.equal(await page.locator('a[href="/native-work#operation-arrival"]').count(),0);
    await page.locator('a[href="/native-work#operation-refund"]').click();
    const refund=page.locator('#operation-refund');
    await refund.getByRole('button',{name:'Review advice',exact:true}).click();
    await refund.getByText('Order: future-204',{exact:true}).waitFor();
    await refund.getByText('Proposed refund: ¥1,040',{exact:true}).waitFor();
    await refund.getByRole('button',{name:'Record refund proposal',exact:true}).click();
    await page.getByText('Refund plan recorded',{exact:true}).waitFor();
    await page.reload({waitUntil:'networkidle'});
    await page.getByText('Refund proposal · No money moved',{exact:true}).waitFor();
    const result=await(await page.request.get(base+'/api/local/operations')).json();
    assert.equal(result.decisions.length,2);
    assert.ok(result.decisions.every(d=>d.external_status==='not_started'));
    await page.locator('.native-language').click();
    await page.getByText('退款方案已记录',{exact:true}).waitFor();
    for(const width of [320,360,390,430]){
      await page.setViewportSize({width,height:844});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    }
    await page.screenshot({path:'qa-local-operations.png',animations:'disabled'});
    await page.locator('.native-language').click();
    await page.route('**/api/local/operations', route=>route.fulfill({status:503,json:{}}));
    await page.reload({waitUntil:'networkidle'});
    await page.locator('.work-needs [role=alert]').waitFor();
    await page.unroute('**/api/local/operations');
    await page.locator('.work-needs').getByRole('button',{name:'Retry',exact:true}).click();
    await page.locator('.work-all-clear').waitFor();
    assert.equal((await page.request.post(base+'/api/local/operation-decision',{headers:{origin:'https://foreign.example'},data:{}})).status(),403);
    console.log('PASS: order/fact/room linkage, stale advice rejected, save failure and same-ID retry, persisted plans, Home sync, reset preserves records, Chinese/mobile, read failure/retry, no external execution');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1});
