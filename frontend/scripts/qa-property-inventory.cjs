const {chromium}=require('C:/Users/86299/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {spawn}=require('node:child_process');const path=require('node:path');const assert=require('node:assert/strict');
const base='http://127.0.0.1:3104';
const ids=['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'];
function cookie(index){const enc=v=>Buffer.from(JSON.stringify(v)).toString('base64url');const token=`${enc({alg:'HS256',typ:'JWT'})}.${enc({sub:ids[index],exp:4102444800,iat:1700000000,aud:'authenticated',role:'authenticated'})}.qa-signature`;return {name:'sb-husrpqalpjjswpvrkxet-auth-token',value:'base64-'+enc({access_token:token,refresh_token:'qa',expires_at:4102444800,expires_in:3600,token_type:'bearer',user:{id:ids[index]}}),url:base};}
(async()=>{
 const child=spawn(process.execPath,['--require',path.resolve('scripts/qa-workspace-fixture.cjs'),'node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3104'],{env:{...process.env,STAYCRAFT_QA_AUTH_FIXTURES:'1',HOMESTAY_LOCAL_DATA:'0'},stdio:['ignore','pipe','pipe']});let output='';child.stdout.on('data',x=>output+=x);child.stderr.on('data',x=>output+=x);let browser;
 try{
  await new Promise((resolve,reject)=>{const end=setTimeout(()=>reject(new Error(output)),15000);const timer=setInterval(()=>{if(output.includes('Ready in')){clearTimeout(end);clearInterval(timer);resolve();}},100);});
  browser=await chromium.launch();const context=await browser.newContext({viewport:{width:390,height:844}});await context.addCookies([cookie(1)]);const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const anon=await browser.newContext();assert.equal((await anon.request.get(base+'/api/workspace/inventory')).status(),401);
  const unassigned=await browser.newContext();await unassigned.addCookies([cookie(0)]);assert.equal((await unassigned.request.get(base+'/api/workspace/inventory')).status(),403);
  await page.goto(base+'/app');await page.getByText('先添加房型和房号，这里就会显示你的客房。',{exact:true}).waitFor();assert.equal(await page.locator('.inventory-room').count(),0);
  assert.equal(await page.locator('.native-home-page').evaluate(el=>getComputedStyle(el).backgroundImage),'none');
  await page.getByRole('link',{name:'设置房间',exact:true}).click();await page.getByRole('button',{name:'添加房型',exact:true}).waitFor();
  await page.getByRole('button',{name:'添加房型',exact:true}).click();await page.getByLabel('每晚价格（元）',{exact:true}).fill('520');
  await page.getByLabel('房型 1 图片',{exact:true}).setInputFiles(path.resolve('public/images/garden-house-sample.webp'));
  await page.locator('.inventory-photo img').waitFor();await page.waitForFunction(()=>!document.querySelector('.inventory-fields').disabled);
  const photo=await page.locator('.inventory-photo img').getAttribute('src');assert.equal((await context.request.get(base+photo)).status(),200);
  await page.getByRole('button',{name:'添加房间',exact:true}).click();await page.getByLabel('房间 1 房号',{exact:true}).fill('101');
  await page.getByRole('button',{name:'添加房间',exact:true}).click();await page.getByLabel('房间 2 房号',{exact:true}).fill('101');
  await page.getByRole('button',{name:'保存房间设置',exact:true}).click();await page.getByRole('alert').filter({hasText:'房号不能重复'}).waitFor();
  await page.getByLabel('房间 2 房号',{exact:true}).fill('201');await page.getByLabel('房间 2 楼层',{exact:true}).fill('2 楼');await page.getByLabel('房间 2 清洁状态',{exact:true}).selectOption('dirty');
  await page.getByRole('button',{name:'保存房间设置',exact:true}).click();await page.getByText('已保存，首页将显示这些房间。',{exact:true}).waitFor();
  await page.reload();await page.getByLabel('房间 1 房号',{exact:true}).waitFor();assert.equal(await page.getByLabel('房间 1 房号',{exact:true}).inputValue(),'101');
  await page.getByLabel('房间 1 房号',{exact:true}).fill('A101');await page.locator('.inventory-room-row').nth(1).getByLabel('启用',{exact:true}).uncheck();
  await page.getByRole('button',{name:'保存房间设置',exact:true}).click();await page.getByText('已保存，首页将显示这些房间。',{exact:true}).waitFor();
  await page.screenshot({path:'qa-inventory-editor.png',fullPage:true});
  await page.getByRole('navigation',{name:'主导航'}).getByRole('link',{name:'首页',exact:true}).click();await page.getByRole('button',{name:'A101 已清洁',exact:true}).waitFor();await page.getByRole('button',{name:'201 停用',exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'101 已清洁',exact:true}).count(),0);await page.getByRole('button',{name:'A101 已清洁',exact:true}).click();await page.getByText('A101 · 大床房',{exact:true}).waitFor();await page.screenshot({path:'qa-inventory-home.png',fullPage:true});
  const saved=await(await context.request.get(base+'/api/workspace/inventory')).json();
  const duplicate=structuredClone(saved.inventory);duplicate.rooms[1].number='a101';
  assert.equal((await context.request.put(base+'/api/workspace/inventory',{headers:{origin:base},data:{inventory:duplicate,revision:saved.revision}})).status(),400);
  assert.equal((await context.request.put(base+'/api/workspace/inventory',{headers:{origin:'https://elsewhere.invalid'},data:saved})).status(),403);
  const removed=structuredClone(saved.inventory);removed.rooms.pop();assert.equal((await context.request.put(base+'/api/workspace/inventory',{headers:{origin:base},data:{inventory:removed,revision:saved.revision}})).status(),400);
  const wrongPhoto=structuredClone(saved.inventory);wrongPhoto.types[0].photo='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.webp';assert.equal((await context.request.put(base+'/api/workspace/inventory',{headers:{origin:base},data:{inventory:wrongPhoto,revision:saved.revision}})).status(),400);
  assert.equal((await context.request.get(base+'/api/workspace/room-photo?path='+encodeURIComponent(wrongPhoto.types[0].photo))).status(),404);
  assert.equal((await context.request.put(base+'/api/workspace/inventory',{headers:{origin:base},data:{inventory:saved.inventory,revision:saved.revision}})).status(),200);
  assert.equal((await context.request.put(base+'/api/workspace/inventory',{headers:{origin:base},data:{inventory:saved.inventory,revision:saved.revision}})).status(),409);
  await page.goto(base+'/app/mine');await page.getByLabel('房型名称',{exact:true}).fill('QA_SAVE_FAILURE');await page.getByRole('button',{name:'保存房间设置',exact:true}).click();await page.getByRole('alert').filter({hasText:'保存未成功'}).waitFor();assert.equal(await page.getByLabel('房型名称',{exact:true}).inputValue(),'QA_SAVE_FAILURE');
  for(const width of [320,390,658,1280]){await page.setViewportSize({width,height:900});for(const route of ['/app/mine','/app']){await page.goto(base+route);await page.locator('.inventory-fields,.inventory-home').first().waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`overflow ${width} ${route}`);}}
  const offline=await browser.newContext({viewport:{width:390,height:844}});await offline.addCookies([cookie(1)]);const draftPage=await offline.newPage();let block=true;
  await draftPage.route('**/api/workspace/inventory',route=>block?route.fulfill({status:503,contentType:'application/json',body:'{"error":"inventory_unavailable"}'}):route.continue());
  await draftPage.goto(base+'/app/mine');await draftPage.getByText(/暂时无法连接，可先编辑房型和房号/).waitFor();
  assert.equal(await draftPage.getByLabel('房型模板',{exact:true}).isEnabled(),true);
  await draftPage.getByLabel('房型模板',{exact:true}).selectOption('twin');await draftPage.getByRole('button',{name:'添加房型',exact:true}).click();await draftPage.getByLabel('每晚价格（元）',{exact:true}).fill('580');
  await draftPage.getByRole('button',{name:'添加房间',exact:true}).click();await draftPage.getByLabel('房间 1 房号',{exact:true}).fill('DRAFT-301');
  assert.equal(await draftPage.getByRole('button',{name:'保存房间设置',exact:true}).isDisabled(),true);
  assert.equal(await draftPage.getByLabel('房型 1 图片',{exact:true}).isDisabled(),true);
  await draftPage.locator('.inventory-status').getByRole('button',{name:'重试',exact:true}).click();await draftPage.getByText(/暂时无法连接，可先编辑房型和房号/).waitFor();assert.equal(await draftPage.getByLabel('房间 1 房号',{exact:true}).inputValue(),'DRAFT-301');
  await draftPage.screenshot({path:'qa-inventory-offline-edit.png',fullPage:true});
  block=false;await draftPage.locator('.inventory-status').getByRole('button',{name:'重试',exact:true}).click();await draftPage.getByRole('alert').filter({hasText:'云端已有房间设置'}).waitFor();assert.equal(await draftPage.getByLabel('房间 1 房号',{exact:true}).inputValue(),'DRAFT-301');assert.equal(await draftPage.getByRole('button',{name:'保存房间设置',exact:true}).isDisabled(),true);
  await draftPage.getByRole('button',{name:'重新读取已保存设置',exact:true}).click();await draftPage.getByLabel('房间 1 房号',{exact:true}).waitFor();await draftPage.waitForFunction(()=>document.querySelector('input[aria-label="房间 1 房号"]')?.value==='A101');assert.equal(await draftPage.getByRole('button',{name:'保存房间设置',exact:true}).isEnabled(),true);
  assert.deepEqual(errors,[]);console.log('PASS inventory: templates/photo/rooms/duplicate validation/rename/archive/home refresh; access/conflict guards; offline edits/retry preservation/reconnect conflict/reload; 320/390/658/1280. Cloud is mocked.');
 }finally{if(browser)await browser.close();child.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
