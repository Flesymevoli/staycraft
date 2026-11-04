const {chromium}=require('./qa-browser.cjs'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch();try{
 const context=await browser.newContext({permissions:['geolocation'],geolocation:{latitude:31.566,longitude:121.068},viewport:{width:390,height:844}}),page=await context.newPage();
 let requests=[];
 await page.route('**/api/workspace/discovery',r=>r.fulfill({json:{places:[],location:'测试'}}));
 await page.route('**/api/workspace/market-prices',r=>{const input=r.request().postDataJSON();requests.push(input);return r.fulfill({json:{hotels:[],location:input.coordinates?'定位后的街道地址':'民宿地址',locationPrecision:input.coordinates?'address':'property',start:input.start,end:input.end,checkedAt:new Date().toISOString()}})});
 await page.goto('http://127.0.0.1:3114/login');await page.getByRole('button',{name:/体验演示|Try StayCraft/}).click();await page.waitForURL('**/app');await page.goto('http://127.0.0.1:3114/app/explore');
 const market=page.locator('.market-prices'),query=market.getByRole('button',{name:'查询真实房价'});
 await market.getByRole('button',{name:'使用我的位置'}).click();await page.waitForFunction(()=>!document.querySelector('.market-query').disabled);
 await context.setGeolocation({latitude:31.6,longitude:121.1});await query.click();await market.getByText('定位后的街道地址',{exact:false}).waitFor();assert.equal(requests.at(-1).coordinates.latitude,31.6);
 await context.setGeolocation({latitude:31.7,longitude:121.2});await query.click();await market.getByText('定位后的街道地址',{exact:false}).waitFor();assert.equal(requests.at(-1).coordinates.latitude,31.7);
 const before=requests.length;
 await page.evaluate(()=>{navigator.geolocation.getCurrentPosition=(_success,error)=>error({code:1,message:'denied'})});
 await query.click();await market.getByText('定位未获授权或超时，请允许定位后重试。',{exact:true}).waitFor();assert.equal(requests.length,before);
 await page.getByLabel('酒店查询位置').selectOption('property');await query.click();await market.getByText('民宿地址',{exact:false}).waitFor();assert(!requests.at(-1).coordinates);
 for(const width of [320,390,768]){await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
 console.log('PASS visible location action, fresh GPS on each query, denied GPS sends no hotel request, explicit property mode and three widths. Mock providers only.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
