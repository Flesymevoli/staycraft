const assert=require('node:assert/strict'),path=require('node:path');
const {spawn,spawnSync}=require('node:child_process');
const {chromium}=require('C:/Users/86299/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {createSample}=require('./operator-sample-data.cjs');
const date='2026-10-22',base='http://127.0.0.1:3104';
const rollover=createSample('2026-12-31');assert.equal(rollover.bookings[2].departure,'2027-01-03');
assert.throws(()=>createSample('2026-02-30'));
const guard=spawnSync(process.execPath,['--require',path.resolve('scripts/qa-workspace-fixture.cjs'),'-e',''],{env:{...process.env,STAYCRAFT_OPERATOR_SAMPLE:'1',STAYCRAFT_QA_AUTH_FIXTURES:'1',STAYCRAFT_HOSTED:'1'},encoding:'utf8'});
assert.notEqual(guard.status,0);assert.match(guard.stderr,/loopback-only/);
const network=spawnSync(process.execPath,['--require',path.resolve('scripts/qa-workspace-fixture.cjs'),'-e',"fetch('https://example.invalid').then(()=>process.exit(1)).catch(()=>process.exit(0))",'127.0.0.1'],{env:{...process.env,STAYCRAFT_OPERATOR_SAMPLE:'1',STAYCRAFT_QA_AUTH_FIXTURES:'1'},encoding:'utf8'});assert.equal(network.status,0,network.stderr);
function start(){
 const child=spawn(process.execPath,['--require',path.resolve('scripts/qa-workspace-fixture.cjs'),'node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3104'],{env:{...process.env,STAYCRAFT_OPERATOR_SAMPLE:'1',STAYCRAFT_QA_AUTH_FIXTURES:'1',STAYCRAFT_SAMPLE_DATE:date,HOMESTAY_LOCAL_DATA:'0'},stdio:['ignore','pipe','pipe']});
 let output='';child.stdout.on('data',c=>{output+=c;process.stdout.write(c)});child.stderr.on('data',c=>{output+=c;process.stderr.write(c)});
 return {child,ready:new Promise((resolve,reject)=>{const timer=setInterval(()=>{if(output.includes('Ready in')){clearInterval(timer);resolve()}},100);setTimeout(()=>{clearInterval(timer);reject(new Error(output))},20000).unref()})};
}
async function stop(child){if(child.exitCode!==null)return;await new Promise(resolve=>{child.once('exit',resolve);child.kill()})}
(async()=>{let server=start(),browser;try{
 await server.ready;browser=await chromium.launch();const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();
 const external=[];page.on('request',request=>{if(!request.url().startsWith(base)&&!request.url().startsWith('data:'))external.push(request.url())});
 await context.addCookies([{name:'sb-husrpqalpjjswpvrkxet-auth-token',value:'formal-session-sentinel',url:base}]);
 await page.clock.install({time:new Date(date+'T04:00:00Z')});await page.goto(base+'/app');await page.waitForURL('**/login');
 await page.locator('#email').fill('demo@example.invalid');await page.locator('#password').fill('incorrect');await page.getByRole('button',{name:'登录',exact:true}).click();await page.getByRole('alert').waitFor();
 await page.reload();
 await page.locator('#email').fill('demo@example.invalid');await page.locator('#password').fill('staycraft-demo');await page.getByRole('button',{name:'登录',exact:true}).click();try{await page.waitForURL('**/app')}catch(error){console.error(await page.locator('body').innerText());throw error;}
 await page.getByLabel('虚构演示环境').waitFor();
 await page.locator('.room-preview-calendar input[type=date]').fill(date);
 await page.locator('.home-todos').getByRole('heading',{name:'当日待办',exact:true}).waitFor();assert.equal(await page.locator('.home-todos').getByText(/虚构|林小夏|陈小舟|许知遥/).count(),0);await page.getByRole('button',{name:/展开其余/}).click();await page.locator('.home-todos').getByText('计划离店',{exact:true}).waitFor();assert.equal(await page.locator('.home-todo-row').count(),5);await page.getByRole('button',{name:'收起',exact:true}).click();assert.equal(await page.locator('.home-todo-row').count(),3);
 await page.screenshot({path:'qa-home-todos.png',fullPage:true});const cookies=await context.cookies();assert.equal(cookies.find(c=>c.name==='sb-husrpqalpjjswpvrkxet-auth-token').value,'formal-session-sentinel');assert.ok(cookies.some(c=>c.name.startsWith('staycraft-operator-sample-auth')));
 await page.goto(base+'/app/work');await page.getByText('启用客房').waitFor();await page.getByText('取消申请待审核',{exact:false}).waitFor();
 assert.equal(await page.locator('.room-grid a').count(),6);assert.equal(await page.getByRole('link',{name:/查看客人预订页/}).count(),0);
 const inv=await (await context.request.get(base+'/api/workspace/inventory')).json();
 const changed=structuredClone(inv.inventory);changed.rooms.find(r=>r.number==='102').housekeeping='clean';changed.rooms.find(r=>r.number==='101').number='A101';
 let response=await context.request.put(base+'/api/workspace/inventory',{headers:{origin:base},data:{inventory:changed,revision:inv.revision}});assert.equal(response.status(),200);
 response=await context.request.put(base+'/api/workspace/inventory',{headers:{origin:base},data:{inventory:inv.inventory,revision:inv.revision}});assert.equal(response.status(),409);
 await page.reload();await page.getByText('A101 · 林小夏（虚构）',{exact:true}).waitFor();await page.locator('.room-grid a').filter({hasText:'102'}).getByText('可入住',{exact:true}).waitFor();
 await page.goto(base+'/app/mine');await page.getByRole('heading',{name:'湖畔小筑 · 虚构演示',exact:true}).waitFor();
 await page.goto(base+'/app/analysis');await page.getByText('尚未接入',{exact:true}).first().waitFor();
 for(const width of [320,390,658,1280]){await page.setViewportSize({width,height:900});await page.goto(base+'/app/work');await page.locator('.room-grid a').first().waitFor();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),String(width));}
 await page.screenshot({path:'qa-operator-sample.png',fullPage:true});
 await page.goto(base+'/app');await page.locator('.home-todo-clean').first().waitFor();assert.equal(await page.locator('.home-todo-clean').count(),1);assert.equal(await page.locator('.home-todo-clean').getByText('102',{exact:true}).count(),0);await stop(server.child);server=start();await server.ready;
 response=await context.request.get(base+'/api/workspace/inventory');const reset=await response.json();assert.ok(reset.inventory.rooms.some(r=>r.number==='101'));assert.equal(reset.inventory.rooms.find(r=>r.number==='102').housekeeping,'dirty');
 await page.goto(base+'/app');await page.locator('.home-todo-clean').first().waitFor();assert.equal(await page.locator('.home-todo-clean').count(),2);await page.route('**/api/workspace/bookings*',route=>route.fulfill({status:503,contentType:'application/json',body:'{}'}));await page.getByRole('button',{name:'刷新待办',exact:true}).click();await page.locator('.home-todos').getByRole('alert').waitFor();assert.equal(await page.locator('.home-todo-arrival').count(),0);await page.unroute('**/api/workspace/bookings*');assert.deepEqual(external,[]);await page.goto(base+'/app/mine');await page.getByRole('button',{name:'退出登录',exact:true}).click();await page.waitForURL('**/login');assert.equal((await context.request.get(base+'/api/workspace/inventory')).status(),401);
 console.log('PASS operator sample: fictional dates/room states/orders, real page login/edit/filter/render, cookie isolation, conflict/restart reset, no external fetch, hosted refusal, logout and responsive widths. No cloud writes.');
 }finally{if(browser)await browser.close();await stop(server.child)}})().catch(error=>{console.error(error);process.exitCode=1});
