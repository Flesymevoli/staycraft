const {chromium}=require('./qa-browser.cjs');
const assert=require('node:assert/strict');
const base=process.env.GUEST_QA_URL || 'http://127.0.0.1:3105';
(async()=>{
 const browser=await chromium.launch();
 try {
  const context=await browser.newContext({viewport:{width:390,height:844}});
  const page=await context.newPage();const errors=[];const businessRequests=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().includes('/api/') || /supabase|deepseek/.test(r.url())) businessRequests.push(r.url());});
  await page.goto(base+'/guest/orders');await page.getByRole('heading',{name:'下一段旅程，从这里开始'}).waitFor();
  await page.getByRole('link',{name:'去看看房型'}).click();
  await page.getByLabel('入住日期').fill('2026-11-10');await page.getByLabel('离店日期').fill('2026-11-09');
  await page.getByRole('button',{name:'查看房型',exact:true}).click();await page.getByRole('alert').filter({hasText:'离店须晚于入住'}).waitFor();
  await page.getByLabel('离店日期').fill('2026-11-12');assert.equal(await page.getByLabel('入住人数').count(),0);
  await page.getByRole('button',{name:'查看房型',exact:true}).click();await page.getByText('11月10日 — 11月12日 · 2 晚',{exact:true}).waitFor();
  await page.getByRole('link',{name:'预订花园大床房',exact:true}).click();await page.getByRole('heading',{name:'确认订单'}).waitFor();
  assert.equal(await page.getByLabel('入住日期').inputValue(),'2026-11-10');
  assert.equal(await page.getByLabel('预计到店时间',{exact:true}).evaluate(el=>el.validity.valueMissing),true);
  assert.equal(await page.getByRole('option',{name:'暂未确定',exact:true}).count(),0);
  assert.deepEqual(await page.getByLabel('预计到店时间',{exact:true}).locator('option:not([disabled])').allTextContents(),['14:00 前','18:00 前','22:00 前','次日 02:00 前']);
  await page.getByLabel('入住人姓名',{exact:true}).fill('虚构旅客');await page.getByLabel('联系电话',{exact:true}).fill('wrong-number');
  await page.getByLabel('预计到店时间',{exact:true}).selectOption('18:00 前');
  await page.getByLabel('我已了解：此为交互原型，订单仅在本机自动确认，不会实际锁房或付款。',{exact:true}).check();
  await page.getByRole('button',{name:'提交预订'}).click();await page.getByRole('alert').filter({hasText:'示例联系电话'}).waitFor();
  await page.getByLabel('联系电话',{exact:true}).fill('13800000000');assert.equal(await page.getByLabel('入住人数').count(),0);await page.getByLabel('预计到店时间',{exact:true}).selectOption('18:00 前');
  await page.getByRole('button',{name:'提交预订'}).click();await page.getByRole('heading',{name:'预订已确认'}).waitFor();
  await page.getByRole('link',{name:'查看我的订单'}).click();await page.getByText('预订已确认',{exact:true}).waitFor();
  await page.getByRole('button',{name:'订单详情'}).click();await page.getByText('虚构旅客',{exact:true}).waitFor();await page.getByText('18:00 前',{exact:true}).waitFor();assert.match(await page.locator('.guest-order-summary').innerText(),/1040/);
  await page.reload();await page.getByRole('button',{name:'订单详情'}).click();await page.getByText('虚构旅客',{exact:true}).waitFor();await page.getByText('18:00 前',{exact:true}).waitFor();
  await page.getByRole('button',{name:'已确认',exact:true}).click();await page.locator('.guest-order').getByText('预订已确认',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'待确认',exact:true}).count(),0);await page.getByRole('button',{name:'已取消',exact:true}).click();await page.getByRole('heading',{name:'暂无这类订单'}).waitFor();await page.getByRole('button',{name:'已确认',exact:true}).click();await page.screenshot({path:'qa-guest-auto-confirm.png',fullPage:true});
  await page.locator('.guest-order').getByRole('link',{name:'联系民宿',exact:true}).click();await page.getByText(/关联订单 SC-/).waitFor();
  await page.getByRole('button',{name:'几点可以入住？'}).click();await page.locator('.guest-host').filter({hasText:'常规入住时间为 15:00 后。提前入住需要由民宿另行确认。'}).waitFor();
  await page.getByLabel('咨询内容').fill('虚构咨询：可以带行李吗？');await page.getByRole('button',{name:'发送示例消息'}).click();await page.locator('.guest-guest').filter({hasText:'虚构咨询：可以带行李吗？'}).waitFor();
  await page.reload();await page.locator('.guest-guest').filter({hasText:'虚构咨询：可以带行李吗？'}).waitFor();
  await page.getByRole('navigation',{name:'客人导航'}).getByRole('link',{name:'联系民宿',exact:true}).click();await page.locator('.guest-guest').filter({hasText:'虚构咨询：可以带行李吗？'}).waitFor({state:'hidden'});
  for(const width of [320,390,658,1280]){
   await page.setViewportSize({width,height:900});
   for(const route of ['/guest','/guest/orders','/guest/contact','/guest/book?room=courtyard&arrival=2026-11-10&departure=2026-11-12']){
    await page.goto(base+route);await page.locator('.guest-nav').waitFor();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`overflow ${route} ${width}`);
    await page.locator('.guest-footer').scrollIntoViewIfNeeded();
    const footer=await page.locator('.guest-footer').boundingBox();const nav=await page.locator('.guest-nav').boundingBox();assert.ok(footer.y+footer.height<=nav.y+1,`footer covered ${route} ${width}`);
   }
  }
  await page.setViewportSize({width:390,height:844});await page.goto(base+'/guest');await page.getByLabel('入住日期').fill('2026-11-10');await page.getByLabel('离店日期').fill('2026-11-12');await page.screenshot({path:'qa-guest-home.png',fullPage:true});
  const isolated=await browser.newContext();const other=await isolated.newPage();await other.goto(base+'/guest/orders');await other.getByRole('heading',{name:'下一段旅程，从这里开始'}).waitFor();
  const blocked=await browser.newContext();await blocked.addInitScript(()=>{Storage.prototype.getItem=function(){throw new Error('blocked')};Storage.prototype.setItem=function(){throw new Error('blocked')};});const blockedPage=await blocked.newPage();await blockedPage.goto(base+'/guest/orders');await blockedPage.getByText(/本机记录暂时无法读取/).waitFor();await blockedPage.getByRole('link',{name:'去看看房型'}).waitFor();
  const failedSave=await browser.newContext();const failedPage=await failedSave.newPage();await failedPage.goto(base+'/guest/book?room=garden&arrival=2026-11-10&departure=2026-11-12');await failedPage.getByLabel('入住人姓名',{exact:true}).fill('保存失败旅客');await failedPage.getByLabel('联系电话',{exact:true}).fill('13800000000');await failedPage.getByLabel('预计到店时间',{exact:true}).selectOption('18:00 前');await failedPage.getByLabel('我已了解：此为交互原型，订单仅在本机自动确认，不会实际锁房或付款。',{exact:true}).check();await failedPage.evaluate(()=>{Storage.prototype.setItem=function(){throw new Error('QA write failure')};});await failedPage.getByRole('button',{name:'提交预订'}).click();await failedPage.getByRole('alert').filter({hasText:'预订未保存，尚未确认'}).waitFor();assert.equal(await failedPage.getByRole('heading',{name:'预订已确认',exact:true}).count(),0);assert.equal(await failedPage.getByLabel('入住人姓名',{exact:true}).inputValue(),'保存失败旅客');assert.equal(await failedPage.evaluate(()=>localStorage.getItem('staycraft-guest-prototype-orders-v1')),null);
  assert.deepEqual(errors,[]);assert.deepEqual(businessRequests,[]);
  console.log('PASS guest: booking validation, total, auto-confirmed orders, refresh, filters, contextual chat, isolated storage, storage failure, 320/390/658/1280 layouts; no business API calls.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});


