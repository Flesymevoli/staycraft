const {chromium} = require('./qa-browser.cjs');
const {spawn} = require('node:child_process'), path = require('node:path'), assert = require('node:assert/strict');
(async () => {
  const child = spawn(process.execPath, ['--require', path.resolve('scripts/qa-workspace-fixture.cjs'), 'node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3104'], {
    env: {...process.env, STAYCRAFT_QA_AUTH_FIXTURES:'1', STAYCRAFT_QA_FORMAL_STAYS:'1', STAYCRAFT_OPERATOR_SAMPLE:'0', HOMESTAY_LOCAL_DATA:'0', MODEL_ENABLED:'0', FORMAL_MODEL_ENABLED:'0', FORMAL_AUTO_REPLY_ENABLED:'0'},
    stdio:['ignore','pipe','pipe'], windowsHide:true,
  });
  let output='', browser;
  child.stdout.on('data', chunk => output += chunk); child.stderr.on('data', chunk => output += chunk);
  try {
    await new Promise((resolve,reject) => {const timer=setInterval(()=>{if(output.includes('Ready in')){clearInterval(timer);resolve()}},100);setTimeout(()=>{clearInterval(timer);reject(new Error('Isolated startup failed'))},20000).unref()});
    browser=await chromium.launch(); const base='http://127.0.0.1:3104', property='dddddddd-dddd-4ddd-8ddd-dddddddddddd', id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    const enc=value=>Buffer.from(JSON.stringify(value)).toString('base64url'), token=`${enc({alg:'HS256',typ:'JWT'})}.${enc({sub:id,exp:4102444800,iat:1700000000,aud:'authenticated',role:'authenticated'})}.qa-signature`;
    const owner=await browser.newContext(); await owner.addCookies([{name:'sb-husrpqalpjjswpvrkxet-auth-token',url:base,value:'base64-'+enc({access_token:token,refresh_token:'qa',expires_at:4102444800,expires_in:3600,token_type:'bearer',user:{id}})}]);
    let saved=await (await owner.request.get(base+'/api/workspace/profile')).json();
    const guest=await browser.newContext({viewport:{width:390,height:844}}), page=await guest.newPage(), errors=[];page.on('pageerror',error=>errors.push(error.message));
    const save=async changes=>{const response=await owner.request.put(base+'/api/workspace/profile',{headers:{Origin:base},data:{profile:{...saved.profile,...changes},revision:saved.revision,confirmed:true}});assert.equal(response.status(),200);saved=await response.json()};
    await save({name:'联调山居民宿（虚构）',location:'虚构湖畔路88号',breakfast:'07:30–10:00',checkin:'15:00',notes:'PRIVATE INTERNAL NOTES',guestNotes:'21:00后请保持安静。\n请勿室内吸烟。'});
    const catalog=await (await guest.request.get(base+`/api/guest?property=${property}`)).json();
    assert.equal(catalog.name,'联调山居民宿（虚构）');assert.deepEqual(Object.keys(catalog.profile).sort(),['location','breakfast','checkin','notes'].sort());assert(!JSON.stringify(catalog).includes('PRIVATE'));
    await page.goto(base+`/guest?property=${property}`);
    const information=page.getByRole('region',{name:'民宿信息',exact:true});await information.getByText('虚构湖畔路88号',{exact:true}).waitFor();await information.getByText('07:30–10:00',{exact:true}).waitFor();
    await information.getByText('入住须知',{exact:true}).click();await information.getByText('21:00后请保持安静。\n请勿室内吸烟。',{exact:true}).waitFor();
    assert(!(await page.locator('body').innerText()).includes('PRIVATE'));
    const editor=await owner.newPage();await editor.goto(base+'/app/mine');await editor.getByText('客人端入住须知（公开）',{exact:true}).waitFor();
    await save({location:'虚构更新地址',guestNotes:''});await page.reload();await information.getByText('虚构更新地址',{exact:true}).waitFor();assert.equal(await information.getByText('入住须知',{exact:true}).count(),0);
    await page.getByRole('link',{name:'联系民宿',exact:true}).click();await page.waitForURL('**/guest/contact?property=*');await information.getByText('虚构更新地址',{exact:true}).waitFor();
    for(const width of [320,390,658,1280]){await page.setViewportSize({width,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1))}
    await page.setViewportSize({width:390,height:844});await information.screenshot({path:'qa-guest-profile.png',animations:'disabled'});
    await page.route('**/api/guest?*',route=>route.fulfill({status:503,json:{error:'property_unavailable'}}));await page.reload();await page.getByRole('alert').waitFor();assert.equal(await page.getByRole('region',{name:'民宿信息',exact:true}).count(),0);
    await page.unroute('**/api/guest?*');await page.getByRole('button',{name:'重新读取',exact:true}).click();await information.getByText('虚构更新地址',{exact:true}).waitFor();
    assert.deepEqual(errors,[]);console.log('PASS guest profile: owner save -> public whitelist -> stay/contact display, legacy notes private, updates/blank notes/failure retry, Mine field, narrow layouts. Isolated fixtures only.');
  } finally {if(browser)await browser.close();child.kill()}
})().catch(error=>{console.error(error);process.exitCode=1});
