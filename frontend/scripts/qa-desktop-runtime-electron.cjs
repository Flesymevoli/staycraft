// Run with Electron, after desktop:runtime:build. Uses no model or collection APIs.
const {app,BrowserWindow,utilityProcess}=require('electron');
const path=require('node:path');
const os=require('node:os');
const {mkdtempSync}=require('node:fs');
const {writeFile,rm}=require('node:fs/promises');
const {startRuntime,developmentResources,systemEnvironment}=require('../desktop/runtime.cjs');
const temporary=mkdtempSync(path.join(os.tmpdir(),'staycraft-runtime-electron-'));
app.setPath('userData',temporary);
let runtime,collector,window;
async function verifyCollector(){
 const probe=path.join(temporary,'collector-probe.cjs');
 await writeFile(probe,`const {createRequire}=require('node:module');const {pathToFileURL}=require('node:url');const path=require('node:path');(async()=>{const root=process.argv[2];const library=await import(pathToFileURL(path.join(root,'src/lib/competitor-observations.ts')).href);if(typeof library.parseCalendar!=='function')throw Error('missing TS parser');const {chromium}=createRequire(path.join(root,'package.json'))('playwright');const browser=await chromium.launch({headless:true});try{const page=await browser.newPage();await page.goto('data:text/html,<title>StayCraft collector probe</title>');if(await page.title()!=='StayCraft collector probe')throw Error('browser unavailable');process.parentPort.postMessage({ok:true,node:process.versions.node});}finally{await browser.close();}})().then(()=>process.exit(0),()=>process.exit(1));`);
 await new Promise((resolve,reject)=>{
  collector=utilityProcess.fork(probe,[runtime.collector],{cwd:runtime.collector,env:{...systemEnvironment(),PLAYWRIGHT_BROWSERS_PATH:runtime.browsers},stdio:'ignore'});
  let result;
  const timer=setTimeout(()=>{collector.kill();reject(Error('Collector utility process timed out'));},30000);
  collector.on('message',value=>{result=value});
  collector.once('exit',code=>{clearTimeout(timer);collector=undefined;code===0&&result?.ok?resolve():reject(Error('Collector utility process failed'));});
 });
}
app.whenReady().then(async()=>{
 try{
  runtime=await startRuntime({resources:await developmentResources(path.resolve(__dirname,'..')),fork:utilityProcess.fork});
  window=new BrowserWindow({show:false,webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true}});
  await window.loadURL(runtime.origin+'/login');
  const rendered=await window.webContents.executeJavaScript('!!document.querySelector("img[alt=StayCraft]") && !!document.querySelector("input[name=email]") && !!document.querySelector("input[name=password]")');
  if(!rendered)throw Error('Production desktop login did not render');
  await window.webContents.executeJavaScript('document.querySelector(".auth-switch").click()');
  let interactive=false;
  for(let attempt=0;attempt<20&&!interactive;attempt++){
   await new Promise(resolve=>setTimeout(resolve,100));
   interactive=await window.webContents.executeJavaScript('!!document.querySelector("input[name=username]")');
  }
  if(!interactive)throw Error('Production desktop login did not hydrate');
  await verifyCollector();
  console.log('Electron standalone smoke passed: rendered local login, utility process TypeScript import, bundled Playwright and Chromium launch.');
 }catch(error){console.error(error.message);process.exitCode=1}
 finally{collector?.kill();runtime?.stop();window?.destroy();await new Promise(resolve=>setTimeout(resolve,150));app.exit(process.exitCode||0)}
});
app.on('window-all-closed',()=>{});
app.on('quit',()=>{
 const relative=path.relative(os.tmpdir(),temporary);
 if(relative.startsWith('staycraft-runtime-electron-')&&!relative.includes(path.sep))void rm(temporary,{recursive:true,force:true}).catch(()=>{});
});
