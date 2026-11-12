const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const path=require('node:path');
const {mkdtempSync}=require('node:fs');
const {tmpdir}=require('node:os');
const {_electron}=require('playwright');
const testPort='3290';
process.env.STAYCRAFT_DESKTOP_TEST_PORT=testPort;
const base='http://127.0.0.1:'+testPort;
const env={...process.env,STAYCRAFT_DESKTOP_DEV:'1',STAYCRAFT_OPERATOR_SAMPLE:'1',STAYCRAFT_QA_AUTH_FIXTURES:'1',STAYCRAFT_QA_DESKTOP_SYNC:'1',HOMESTAY_LOCAL_DATA:'0',MODEL_ENABLED:'0',FORMAL_MODEL_ENABLED:'0'};
const server=spawn(process.execPath,[path.resolve('desktop/sample-web.cjs'),'127.0.0.1'],{env,windowsHide:true,stdio:['ignore','pipe','pipe']});
server.stdout.on('data',data=>process.stdout.write(data));server.stderr.on('data',data=>process.stderr.write(data));
(async()=>{
 let app;
 try{
  for(let i=0;;i++){
   if(i===60||server.exitCode!==null)throw Error('desktop_web_start_failed');
   try{if((await fetch(base+'/login',{signal:AbortSignal.timeout(4000)})).ok)break}catch{}
   await new Promise(resolve=>setTimeout(resolve,500));
  }
  app=await _electron.launch({executablePath:require('electron'),args:[path.resolve('desktop/main.cjs')],env:{...process.env,STAYCRAFT_DESKTOP_SAMPLE:'1',STAYCRAFT_DESKTOP_NODE:process.execPath,STAYCRAFT_DESKTOP_TEST_DATA:mkdtempSync(path.join(tmpdir(),'staycraft-desktop-qa-'))}});
  const p=await app.firstWindow();
  p.on('pageerror',error=>console.error('Desktop page error:',error.message));
  async function login(email){
   await p.goto(base+'/login');
   await p.locator('input[name=email]').fill(email);
   await p.locator('input[name=password]').fill('staycraft-demo');
   await p.locator('.auth-submit').click();
   await p.waitForURL('**/app');
   const themedShell=p.locator('.workbench-shell[data-desktop-theme="soft"]');
   await themedShell.waitFor();
   assert.ok(await p.evaluate(async()=>(
    await document.fonts.load('500 16px "Noto Sans SC"','经营工作台')
   ).length>0));
   for(const width of [835,1440]){
    await p.setViewportSize({width,height:956});
    const layout=await p.locator('.workbench-property-heading strong').evaluate(element=>{
     const original=element.textContent;
     element.textContent='很长的民宿名称用于检查桌面窗口中的单行截断'.repeat(8);
     const result={
      nowrap:getComputedStyle(element).whiteSpace,
      clipped:element.scrollWidth>element.clientWidth,
      overflow:document.documentElement.scrollWidth>window.innerWidth,
     };
     element.textContent=original;
     return result;
    });
    assert.deepEqual(layout,{nowrap:'nowrap',clipped:true,overflow:false});
   }
   const revenue=await p.evaluate(async()=>{
    const response=await fetch('/api/workspace/revenue/overview');
    return {status:response.status,body:await response.json()};
   });
   assert.equal(revenue.status,200);
   assert.equal(typeof revenue.body.completed.amountCny,'number');
   const metrics=await p.evaluate(async()=>{
    const response=await fetch('/api/workspace/metrics?days=7');
    return {status:response.status,body:await response.json()};
   });
   assert.equal(metrics.status,200);
   assert.equal(metrics.body.daily.length,7);
   assert.ok(metrics.body.booked_room_nights<=metrics.body.capacity_room_nights);
   if(metrics.body.booked_pct!=null){
    const gauge=p.locator('.desktop-occupancy-gauge strong');
    await gauge.waitFor();
    assert.equal(await gauge.textContent(),metrics.body.booked_pct+'%');
   }
   if(process.env.STAYCRAFT_QA_HOME_SCREENSHOT&&email==='demo@example.invalid'){
    await p.locator('.desktop-dashboard-review .wb-agent-summary').waitFor();
    await p.screenshot({path:process.env.STAYCRAFT_QA_HOME_SCREENSHOT});
   }
   await p.evaluate(()=>localStorage.setItem('staycraft-operator-language','zh'));
   const nav=p.locator('.workbench-primary-nav');
   for(const section of ['analysis','promotion','mine','explore']){
    const link=nav.locator('a[href="/app/'+section+'"]');
    await link.click();
    await p.waitForURL(base+'/app/'+section);
    await link.waitFor({state:'visible'});
    assert.equal(await link.getAttribute('aria-current'),'page');
    if(section==='analysis'&&metrics.body.active_rooms>0){
     await p.locator('.booking-analysis-table table').waitFor();
     const columns=await p.locator('.booking-analysis-panel:has(.booking-analysis-table)').evaluate(el=>getComputedStyle(el).gridTemplateColumns);
     assert.equal(columns.split(' ').length,2);
    }
    if(process.env.STAYCRAFT_QA_SCREENSHOT_DIR&&email==='demo@example.invalid'){
     await p.waitForTimeout(1000);
     await p.screenshot({path:path.join(process.env.STAYCRAFT_QA_SCREENSHOT_DIR,'staycraft-align-'+section+'.png')});
    }
    if(section==='promotion'){
     const positions=()=>p.evaluate(()=>{
      const sources=document.querySelector('.promotion-layout-sources > .nearby-discovery').getBoundingClientRect();
      const copy=document.querySelector('.promotion-brief').getBoundingClientRect();
      return {alongside:copy.left>=sources.right,below:copy.top>=sources.bottom};
     });
     assert.equal((await positions()).alongside,true);
     if(process.env.STAYCRAFT_QA_LAYOUT_SCREENSHOT&&email==='demo@example.invalid'){
      await p.screenshot({path:process.env.STAYCRAFT_QA_LAYOUT_SCREENSHOT});
     }
     await p.setViewportSize({width:835,height:956});
     assert.deepEqual(await positions(),{alongside:false,below:true});
     await p.setViewportSize({width:1440,height:956});
    }
   }
   await p.evaluate(()=>window.location.assign('/app'));
   await p.waitForURL(base+'/app');
   await nav.locator('a[href="/app/explore"]').click();
   await p.waitForURL(base+'/app/explore');
   const collection=p.locator('details.mo-collection');
   await collection.locator('summary').click();
   await p.getByText('开发演示使用虚构报价，重启后工作区数据会还原。').waitFor({timeout:15000});
   return p.evaluate(()=>fetch('/api/workspace/market/sync').then(response=>response.json()));
  }
  async function collect(id,name){
   await p.locator('#desktop-hotel-list').fill('https://hotels.ctrip.com/hotels/'+id+'.html '+name);
   await p.getByRole('button',{name:'采集并同步'}).click();
   await p.getByText('已同步 · 有效报价 7 · 缺失 0 · 失败住宿 0').waitFor({timeout:15000});
   await p.locator('.mo-panel').getByText(name,{exact:true}).first().waitFor({timeout:10000});
  }
  const a=await login('demo@example.invalid');await collect('78901','虚构采集 A');
  // Shared demo intentionally hides logout. Reset only the isolated Electron session.
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].webContents.session.clearStorageData({storages:['cookies']}));
  const b=await login('desktop-b@example.invalid');
  assert.notEqual(a.userId,b.userId);assert.notEqual(a.propertyId,b.propertyId);
  await p.locator('.mo-panel[aria-busy=false]').waitFor();
  assert.equal(await p.getByText('虚构采集 A',{exact:true}).count(),0);
  await collect('78902','虚构采集 B');
  assert.equal(await p.getByText('虚构采集 A',{exact:true}).count(),0);
  console.log('PASS Electron: account A sync/read, account B sync/read, isolation');
 }finally{await app?.close();server.kill();}
})().catch(error=>{console.error(error);process.exitCode=1});
