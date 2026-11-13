const {app,utilityProcess}=require('electron');
const {mkdtemp,writeFile}=require('node:fs/promises');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const os=require('node:os');
const {systemEnvironment,developmentResources}=require('../desktop/runtime.cjs');
app.whenReady().then(async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'sc-profile-probe-'));
 const resources=await developmentResources(path.resolve(__dirname,'..'));
 const probe=path.join(dir,'probe.mjs');
 await writeFile(probe,`import {launchPriceBrowser} from ${JSON.stringify(pathToFileURL(path.join(resources,'collector','scripts','price-monitor-browser.mjs')).href)};let context;try{context=await launchPriceBrowser(process.env.PROBE_PROFILE,{timeout:15000});const page=context.pages()[0]||await context.newPage();await page.goto('data:text/html,<title>StayCraft profile check</title>');if(await page.title()!=='StayCraft profile check')throw Error('browser_page_unavailable');console.log('PERSISTENT_PROFILE_OK');}finally{await context?.close();}`);
 const profile=path.join(dir,'isolated-browser-profile');
 const child=utilityProcess.fork(path.resolve('desktop/collector-runner.cjs'),[probe],{cwd:dir,env:{...systemEnvironment(),PLAYWRIGHT_BROWSERS_PATH:path.join(resources,'playwright-browsers'),PROBE_PROFILE:profile},stdio:'pipe'});
 child.stdout.on('data',data=>process.stdout.write(data));
 child.stderr.on('data',()=>{});
 const timer=setTimeout(()=>{child.kill();app.exit(1)},25000);
 child.once('exit',code=>{clearTimeout(timer);console.log('UTILITY_EXIT',code);app.exit(code)});
});
app.on('window-all-closed',()=>{});
