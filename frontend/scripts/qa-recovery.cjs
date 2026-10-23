const {chromium}=require('./qa-browser.cjs');
const {spawn}=require('node:child_process'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const base='http://127.0.0.1:3104';
 const child=spawn(process.execPath,['--require',path.resolve('scripts/qa-workspace-fixture.cjs'),'node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3104'],{env:{...process.env,STAYCRAFT_QA_AUTH_FIXTURES:'1',STAYCRAFT_OPERATOR_SAMPLE:'1',HOMESTAY_LOCAL_DATA:'0'},stdio:['ignore','pipe','pipe'],windowsHide:true});
 let output='',browser;child.stdout.on('data',c=>output+=c);child.stderr.on('data',c=>output+=c);
 try{
  await new Promise((resolve,reject)=>{const timer=setInterval(()=>{if(output.includes('Ready in')){clearInterval(timer);resolve()}},100);setTimeout(()=>{clearInterval(timer);reject(new Error(output))},20000).unref()});
  browser=await chromium.launch();const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();
  await page.goto(base+'/missing-release-page');await page.getByRole('heading',{name:'这个页面不存在'}).waitFor();
  await page.evaluate(()=>localStorage.setItem('staycraft-operator-language','en'));await page.reload();await page.getByRole('heading',{name:'Page not found'}).waitFor();
  for(const width of [320,390,658,1280]){await page.setViewportSize({width,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1))}
  const enc=v=>Buffer.from(JSON.stringify(v)).toString('base64url'),id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',token=`${enc({alg:'HS256',typ:'JWT'})}.${enc({sub:id,exp:4102444800,iat:1700000000,aud:'authenticated',role:'authenticated'})}.qa-signature`;
  await context.addCookies([{name:'staycraft-operator-sample-auth',url:base,value:'base64-'+enc({access_token:token,refresh_token:'qa',expires_at:4102444800,token_type:'bearer',user:{id}})}]);
  // Exercise a real client rendering exception, then recover the same segment.
  await page.route('**/api/workspace/bookings*',route=>route.fulfill({status:200,contentType:'application/json',body:'{"bookings":{"invalid":true}}'}));
  await page.goto(base+'/app/bookings/10000000-0000-4000-8000-000000000033');await page.getByRole('heading',{name:'This page could not be opened'}).waitFor();
  assert.doesNotMatch(await page.locator('main').innerText(),/TypeError|stack|invalid.*true/);
  await page.unroute('**/api/workspace/bookings*');await page.getByRole('button',{name:'Try again'}).click();await page.getByRole('heading',{name:'Reservation',exact:true}).waitFor();
  const robots=await context.request.get(base+'/robots.txt');assert.match(await robots.text(),/Disallow: \//);
  const response=await context.request.get(base+'/login');assert.match(await response.text(),/noindex/);
  await page.setViewportSize({width:390,height:844});await page.goto(base+'/missing-release-page');await page.screenshot({path:'qa-recovery.png'});
  console.log('PASS recovery: bilingual 404, width checks, real render failure, retry recovery, no exception details, robots/noindex.');
 }finally{if(browser)await browser.close();child.kill()}
})().catch(error=>{console.error(error);process.exitCode=1});
