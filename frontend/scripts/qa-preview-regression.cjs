// Exercises the actual standalone renderer; never reads or exports credentials.
const { _electron } = require('playwright');
const path = require('node:path');
const assert = require('node:assert/strict');
const commitAutoTest=process.argv.includes('--commit-auto-test');
(async()=>{
 const app=await _electron.launch({executablePath:require('electron'),args:[path.resolve('desktop/main.cjs'),'--standalone'],timeout:60000});
 try{
  const page=await app.firstWindow();
  page.on('pageerror',error=>console.log('Renderer error:',error.message));
  await page.waitForURL('**/app',{timeout:60000});
  assert.match(await page.locator('body').innerText(),/test1/,'Use the designated test account');
  await page.getByRole('link',{name:'经营数据',exact:true}).click();
  await page.getByRole('button',{name:'订单与导入',exact:true}).click();
  await page.locator('.booking-import-disclosure summary').click();
  const chooseFile=async()=>{
   if(commitAutoTest)await page.locator('input[type=file]').setInputFiles({name:'验收订单-虚构.csv',mimeType:'text/csv',buffer:Buffer.from('channel,external_id,room_type,room_number,arrival,departure,status,total,currency,source_updated_at\nQA-AUTO-IMPORT,QA-20261113-1,验收房型（虚构）,,2026-11-20,2026-11-21,confirmed,300.00,CNY,2026-11-13T04:00:00Z\nQA-AUTO-IMPORT,QA-20261113-2,验收房型（虚构）,QA201,2026-11-21,2026-11-22,confirmed,320.00,CNY,2026-11-13T04:00:00Z')});
   else await page.locator('input[type=file]').setInputFiles(path.resolve('scripts/demo-data/orders-baseline.csv'));
  };
  await chooseFile();
  const response=page.waitForResponse(r=>r.url().includes('/api/workspace/booking-import')&&r.request().method()==='POST',{timeout:30000});
  await page.getByRole('button',{name:'校验并预览',exact:true}).click();
  const result=await response;
  const body=await result.json();
  console.log('Import preview:',JSON.stringify({status:result.status(),error:body.error,counts:body.counts,saved:body.saved}));
  console.log('Import UI:',await page.locator('.booking-import-panel [role=status]').first().innerText());
  await page.screenshot({path:'qa-preview-import.png'});
  if(commitAutoTest){
   assert.equal(result.status(),200);assert.equal(body.canCommit,true);assert.equal(body.saved,false);
   assert(body.newRoomTypes.includes('验收房型（虚构）')||body.rows.every(r=>r.action==='duplicate'));
   if(body.newRoomTypes.length){
    await page.getByText(/确认后将新增房型：验收房型（虚构）/).waitFor();
    const committed=page.waitForResponse(r=>r.url().includes('/api/workspace/booking-import')&&r.request().method()==='POST');
    await page.getByRole('button',{name:'确认导入',exact:true}).click();
    const saved=await committed;assert.equal(saved.status(),200);assert.equal((await saved.json()).saved,true);
    await page.getByText('订单已导入。',{exact:true}).waitFor();
   }
   const inventory=await page.evaluate(async()=>{const response=await fetch('/api/workspace/inventory');return {status:response.status,body:await response.json()};});assert.equal(inventory.status,200);
   const types=inventory.body.inventory.types.filter(t=>t.name==='验收房型（虚构）');
   assert.equal(types.length,1);assert.equal(types[0].price,null);assert.equal(types[0].capacity,null);
   await chooseFile();
   const repeated=page.waitForResponse(r=>r.url().includes('/api/workspace/booking-import')&&r.request().method()==='POST');
   await page.getByRole('button',{name:'校验并预览',exact:true}).click();
   const repeat=await (await repeated).json();assert(repeat.rows.every(r=>r.action==='duplicate'));assert.deepEqual(repeat.newRoomTypes,[]);
   await page.goto(new URL('/app/mine#room-types',page.url()).href);
   const type=page.locator('.room-type-summary').filter({hasText:'验收房型（虚构）'});
   await type.getByText(/价格待补充/).waitFor();
   await type.getByRole('button',{name:'编辑',exact:true}).click();
   assert.equal(await page.getByLabel('每晚价格（元）',{exact:true}).inputValue(),'');
   assert.equal(await page.getByLabel('最多入住人数',{exact:true}).inputValue(),'');
   await page.screenshot({path:'qa-preview-auto-room-type.png'});
   console.log('PASS actual standalone Preview + hosted test1: preview, confirmed import, one new room type, null defaults, duplicate detection and editable room type.');
   return;
  }
  const discovery=page.waitForResponse(r=>r.url().includes('/api/workspace/discovery')&&r.request().method()==='POST',{timeout:45000});
  await page.getByRole('link',{name:'推广方案',exact:true}).click();
  const eventResponse=await discovery;
  const eventBody=await eventResponse.json();
  console.log('Activity response:',JSON.stringify({status:eventResponse.status(),error:eventBody.error,count:eventBody.events?.length,source:eventBody.eventSource}));
  await page.screenshot({path:'qa-preview-activities.png'});
 }finally{await app.close();}
})().catch(error=>{console.error(error.message);process.exitCode=1});
