const {chromium}=require('./qa-browser.cjs');
const {spawn}=require('node:child_process'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{const child=spawn(process.execPath,['--require',path.resolve('scripts/qa-workspace-fixture.cjs'),'node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3104'],{env:{...process.env,STAYCRAFT_QA_AUTH_FIXTURES:'1',STAYCRAFT_OPERATOR_SAMPLE:'0',STAYCRAFT_QA_FORMAL_STAYS:'1',HOMESTAY_LOCAL_DATA:'0'},stdio:['ignore','pipe','pipe']});let output='',browser;child.stdout.on('data',c=>output+=c);child.stderr.on('data',c=>output+=c);
try{await new Promise((resolve,reject)=>{const timer=setInterval(()=>{if(output.includes('Ready in')){clearInterval(timer);resolve()}},100);setTimeout(()=>{clearInterval(timer);reject(new Error(output))},20000).unref()});browser=await chromium.launch();const context=await browser.newContext({viewport:{width:390,height:844}}),base='http://127.0.0.1:3104',id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',enc=v=>Buffer.from(JSON.stringify(v)).toString('base64url'),token=`${enc({alg:'HS256',typ:'JWT'})}.${enc({sub:id,exp:4102444800,iat:1700000000,aud:'authenticated',role:'authenticated'})}.qa-signature`;
await context.addCookies([{name:'sb-husrpqalpjjswpvrkxet-auth-token',url:base,value:'base64-'+enc({access_token:token,refresh_token:'qa',expires_at:4102444800,expires_in:3600,token_type:'bearer',user:{id}})}]);const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));


let mode='dirty';
const inventoryResponse=await page.request.get(base+'/api/workspace/inventory');const inventory=(await inventoryResponse.json()).inventory;
const dirty=inventory.rooms.find(room=>room.active&&room.housekeeping==='dirty');assert(dirty);
const original=await page.request.get(base+'/api/workspace/inventory');const inventoryBody=await original.json();
await page.route('**/api/workspace/inventory',route=>mode==='inventory-error'?route.fulfill({status:503,json:{}}):route.fulfill({json:{...inventoryBody,inventory:{...inventory,rooms:inventory.rooms.map(room=>room.id===dirty.id?{...room,housekeeping:mode==='clean'?'clean':'dirty'}:room)}}}));
await page.route('**/api/workspace/bookings?date=*',route=>{const date=new URL(route.request().url()).searchParams.get('date');return mode==='booking-error'?route.fulfill({status:503,json:{}}):route.fulfill({json:{bookings:[{id:'10000000-0000-4000-8000-000000000001',room_id:dirty.id,room_number:dirty.number,arrival:date,departure:'2099-12-31',expected_arrival:'18:00 前',status:mode==='cancelled'?'cancelled':'confirmed'}]}})});
await page.route('**/api/workspace/stays',route=>mode==='stays-error'?route.fulfill({status:503,json:{}}):route.fulfill({json:{bookings:[{id:'10000000-0000-4000-8000-000000000001',stay_state:mode==='checked-in'?'checked_in':mode==='completed'?'completed':'pending'}]}}));
async function visit(){await page.goto(base+'/app');await page.locator('.home-todos-counts').waitFor();}
await visit();const urgent=page.locator('.home-todo-prepare');await urgent.waitFor();assert.match(await urgent.innerText(),/18:00 前.*待清洁/);assert.equal(await urgent.getAttribute('href'),'/app/rooms/'+dirty.id);assert.equal(await page.locator('.home-todo-clean,.home-todo-arrival').filter({has:page.locator('strong',{hasText:new RegExp('^'+dirty.number+'$')})}).count(),0);assert.match(await page.locator('.home-todos-counts').innerText(),/到店 +1/);
for(const width of [320,390,658,1280]){await page.setViewportSize({width,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
await page.setViewportSize({width:390,height:844});await page.screenshot({path:'qa-arrival-cleaning.png',fullPage:true});
await page.getByRole('button',{name:'EN',exact:true}).click();assert.match(await urgent.innerText(),/cleaning needed/);await page.getByRole('button',{name:'中文',exact:true}).click();
mode='clean';await page.getByRole('button',{name:'刷新待办',exact:true}).click();await page.locator('.home-todo-arrival').waitFor();assert.equal(await urgent.count(),0);
mode='dirty';await page.getByRole('button',{name:'刷新待办',exact:true}).click();await urgent.waitFor();
for(const next of ['cancelled','checked-in','completed']){mode=next;await visit();assert.equal(await urgent.count(),0);assert.equal(await page.locator('.home-todo-arrival').count(),0);}
for(const next of ['inventory-error','booking-error','stays-error']){mode=next;await visit();await page.locator('.home-todos').getByRole('alert').waitFor();assert.equal(await urgent.count(),0);}
mode='dirty';await page.getByRole('button',{name:'刷新待办',exact:true}).click();await urgent.waitFor();await page.goto(base+'/app/work');await page.getByRole('region',{name:'需优先处理',exact:true}).locator('.home-todo-prepare').waitFor();mode='clean';await page.getByRole('button',{name:'刷新待办',exact:true}).click();await page.getByRole('region',{name:'需优先处理',exact:true}).waitFor({state:'detached'});assert.deepEqual(errors,[]);
console.log('PASS linked arrival/cleaning to-do: priority, deduplication, counts, room destination, languages, widths, cleaning refresh, cancellation/stay suppression, failures and retry. Isolated fixtures only.');
}finally{if(browser)await browser.close();child.kill()}})().catch(error=>{console.error(error);process.exitCode=1});

