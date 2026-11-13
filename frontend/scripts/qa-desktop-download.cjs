const {chromium}=require('./qa-browser.cjs'),assert=require('node:assert/strict'),path=require('node:path'),os=require('node:os');
const {spawn}=require('node:child_process');
const release=require('../desktop-release.json');
const url=`https://github.com/Flesymevoli/staycraft/releases/download/v${release.version}/${release.filename}`;
(async()=>{let browser,server;try{
 const base=process.env.QA_BASE||'http://127.0.0.1:3199';
 if(!process.env.QA_BASE){
  server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3199'],{windowsHide:true,stdio:['ignore','pipe','pipe'],env:{...process.env,DESKTOP_DOWNLOAD_URL:url,MODEL_ENABLED:'0',FORMAL_MODEL_ENABLED:'0'}});
  for(let attempt=0;;attempt++){if(attempt===60||server.exitCode!==null)throw Error('Download preview startup failed');try{if((await fetch(base+'/download')).ok)break;}catch{}await new Promise(r=>setTimeout(r,500));}
 }
 browser=await chromium.launch();const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const lang of ['zh','en'])for(const width of [1366,390]){
  await page.setViewportSize({width,height:900});const response=await page.goto(base+'/download?lang='+lang);assert.equal(response.status(),200);
  assert.equal(await page.getByRole('link',{name:lang==='zh'?'下载 Windows 版 ↓':'Download for Windows ↓',exact:true}).getAttribute('href'),url);
  assert.equal(await page.locator(`a[href="${url}.sha256"]`).count(),1);
  assert((await page.locator('main').innerText()).includes('v'+release.version));
  assert((await page.locator('main').innerText()).includes('StayCraft.exe'));
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.screenshot({path:path.join(os.tmpdir(),`staycraft-download-${lang}-${width}.png`),fullPage:true});
 }
 assert.deepEqual(errors,[]);console.log('PASS download page: Chinese/English, desktop/mobile, release version, artifact and checksum links, extraction instructions.');
}finally{await browser?.close();server?.kill();}})().catch(e=>{console.error(e.message);process.exitCode=1});
