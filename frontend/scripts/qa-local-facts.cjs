const { chromium } = require('C:/Users/86299/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: {width: 390,height:844} });
  const base = 'http://127.0.0.1:' + (process.env.QA_PORT || '3100');
  const response = await page.request.get(base + '/api/local/facts');
  assert.equal(response.status(),200,'Enable local data on both servers');
  const previous = Object.fromEntries((await response.json()).facts.map(f => [f.key,f.value]));
  const save = page.getByRole('button',{name:'Confirm & save',exact:true});
  async function mine() { await page.goto(base+'/native-mine',{waitUntil:'networkidle'}); await page.locator('#fact-breakfast').waitFor(); }
  async function ask(text) {
    await page.goto(base+'/native-work',{waitUntil:'networkidle'});
    await page.locator('#work-demo-question').fill(text);
    await page.getByRole('button',{name:'Check reply',exact:true}).click();
    await page.locator('.work-try-result').waitFor();
    return page.locator('.work-try-result').innerText();
  }
  try {
    await page.request.put(base+'/api/local/facts',{data:{}});
    assert.match(await ask('What time is breakfast?'),/Needs your review/);
    await mine();
    assert.equal(await page.locator('#fact-breakfast').inputValue(),'');
    await page.locator('#fact-breakfast').fill('08:00-10:30');
    await page.locator('#fact-checkin').fill('15:00');
    await save.click();
    await page.getByRole('status').getByText('Saved on this computer.').waitFor();
    await page.reload({waitUntil:'networkidle'});
    assert.equal(await page.locator('#fact-breakfast').inputValue(),'08:00–10:30');
    assert.match(await ask('What time is breakfast?'),/08:00–10:30/);
    assert.match(await ask('What time is check-in?'),/15:00/);
    await mine();
    await page.locator('#fact-breakfast').fill('09:00–11:00');
    await save.click(); await page.getByRole('status').waitFor();
    assert.match(await ask('What time is breakfast?'),/09:00–11:00/);
    await mine();
    await page.locator('#fact-breakfast').fill('25:00–26:00');
    await save.click(); await page.locator('.local-facts').getByRole('alert').waitFor();
    await page.reload({waitUntil:'networkidle'});
    assert.equal(await page.locator('#fact-breakfast').inputValue(),'09:00–11:00');
    // Delay requests to verify visible loading and disabled save.
    await page.route('**/api/local/facts', async route => { await new Promise(r=>setTimeout(r,600)); await route.continue(); });
    await page.locator('#fact-breakfast').fill('');
    await save.click();
    assert.equal(await page.getByRole('button',{name:'Saving…'}).isDisabled(),true);
    await page.getByRole('status').waitFor();
    await page.unroute('**/api/local/facts');
    assert.match(await ask('What time is breakfast?'),/Needs your review/);
    await page.route('**/api/local/facts', route=>route.fulfill({status:503,body:'{}'}));
    await page.goto(base+'/native-mine',{waitUntil:'networkidle'});
    await page.locator('.local-facts').getByRole('alert').waitFor();
    await page.unroute('**/api/local/facts');
    await page.getByRole('button',{name:'Retry',exact:true}).click();
    await page.locator('#fact-breakfast').waitFor();
    await page.route('**/api/local/facts', route=>route.request().method()==='PUT'?route.fulfill({status:503,body:'{}'}):route.continue());
    await page.locator('#fact-breakfast').fill('07:00–09:00');
    await save.click(); await page.locator('.local-facts').getByRole('alert').waitFor();
    assert.equal(await page.locator('#fact-breakfast').inputValue(),'07:00–09:00');
    await page.unroute('**/api/local/facts');
    await save.click(); await page.getByRole('status').waitFor();
    await page.locator('.local-facts').screenshot({path:'qa-local-facts.png'});
    for (const width of [360,390,430]) {
      await page.setViewportSize({width,height:844});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    }
    await page.getByRole('button',{name:'中文',exact:true}).click();
    await page.getByRole('heading',{name:'回复依据'}).waitFor();
    assert.equal((await page.request.put(base+'/api/local/facts',{headers:{origin:'https://other.example'},data:{}})).status(),403);
    assert.equal((await page.request.post(base+'/api/local/reply-decision',{data:{question:'breakfast?',facts:[]}})).status(),422);
    console.log('PASS: empty, save, reload, updated drafts, validation, deletion, loading, read/write failure retry, mobile, Chinese, origin and fact-injection guards');
  } finally {
    await page.request.put(base+'/api/local/facts',{data:previous});
    await browser.close();
  }
})().catch(error=>{console.error(error);process.exitCode=1;});

