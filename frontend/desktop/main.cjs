const {app,BrowserWindow,ipcMain,shell,dialog,utilityProcess}=require('electron');
const {spawn}=require('node:child_process');
const {randomUUID}=require('node:crypto');
const {mkdirSync}=require('node:fs');
const {mkdir,readFile,writeFile,rename}=require('node:fs/promises');
const path=require('node:path');
const {startRuntime,developmentResources,systemEnvironment}=require('./runtime.cjs');
const {normalizedLocation,collectionFile,checkContext,parseHotels,readTargets,saveTargets}=require('./collection-targets.cjs');

const hosted=process.argv.includes('--hosted');
const standalone=!hosted&&(app.isPackaged||process.argv.includes('--standalone'));
const testPort=!hosted&&process.env.STAYCRAFT_DESKTOP_TEST_DATA
 ?process.env.STAYCRAFT_DESKTOP_TEST_PORT:undefined;
let origin=hosted?'https://staycraft.online':'http://127.0.0.1:'+(testPort||3190);
let endpoint=origin+'/api/workspace/market/sync';
const project=path.resolve(__dirname,'..');
const sample=!hosted&&!standalone&&process.env.STAYCRAFT_DESKTOP_SAMPLE==='1';
const applicationId='online.staycraft.desktop'+(app.isPackaged||hosted?'':standalone?'.test':sample?'.sample':'.dev');
const applicationIcon=process.platform==='win32'
 ?path.join(__dirname,'assets','staycraft.ico'):path.join(__dirname,'assets','staycraft.png');
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
let window,active,activeFile,child,runtime,launching,quitting=false,stopRequested=false;
let demoWindow,demoRuntime,demoStarting;
async function openDemo(){
 if(demoWindow&&!demoWindow.isDestroyed()){demoWindow.show();demoWindow.focus();return {ok:true}}
 if(demoStarting)return demoStarting;
 demoStarting=(async()=>{try{
  const resources=app.isPackaged?process.resourcesPath:await developmentResources(project);
  demoRuntime=await startRuntime({resources,fork:utilityProcess.fork,demo:true,timeoutMs:60000,onFailure:()=>{demoWindow?.destroy();demoRuntime=undefined}});
  const demoOrigin=demoRuntime.origin;
  demoWindow=new BrowserWindow({width:1320,height:900,minWidth:390,minHeight:640,title:'StayCraft · 本地演示',autoHideMenuBar:true,icon:applicationIcon,webPreferences:{preload:path.join(__dirname,'demo-preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,partition:'staycraft-demo-'+randomUUID()}});
  const local=url=>{try{return new URL(url).origin===demoOrigin}catch{return false}};
  demoWindow.webContents.session.webRequest.onBeforeRequest((details,callback)=>callback({cancel:!local(details.url)&&!details.url.startsWith('data:')&& !details.url.startsWith('blob:')}));
  demoWindow.webContents.on('will-navigate',event=>{if(!local(event.url))event.preventDefault()});
  demoWindow.webContents.on('will-redirect',event=>{if(!local(event.url))event.preventDefault()});
  demoWindow.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  demoWindow.on('closed',()=>{demoWindow=undefined;demoRuntime?.stop();demoRuntime=undefined});
  await demoWindow.loadURL(demoOrigin+'/login');return {ok:true};
 }catch{demoRuntime?.stop();demoRuntime=undefined;return {ok:false,error:'demo_start_failed'}}finally{demoStarting=undefined}})();
 return demoStarting;
}
async function progress(file,change){const previous=await readJson(file+'.operation.json')||{};const next={...previous,...change,updatedAt:new Date().toISOString()};await saveJson(file+'.operation.json',next);return next;}
async function collectionStatus(base,file){const result=summary(await readJson(file)),operation=await readJson(file+'.operation.json');if(!operation)return result;let detail=null;if(uuid.test(operation.runId||''))detail=await readJson(path.join(base,'runs',operation.runId,'progress.json'));const running=activeFile===file;return {...result,operation:{...operation,...(running&&detail&&['starting','running'].includes(operation.phase)?detail:{}),...(!running&&['starting','running','waiting','saving'].includes(operation.phase)?{phase:'uncertain'}:{})},active:running};}

function sameOrigin(value){try{return new URL(value).origin===origin}catch{return false}}
async function scope(){
 const response=await window.webContents.session.fetch(endpoint,{credentials:'include',redirect:'error',signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error(response.status===403?'demo_only':response.status===401?'sign_in':'desktop_unavailable');
 const identity=await response.json();
 if(!uuid.test(identity.userId)||!uuid.test(identity.propertyId))throw Error('sign_in');
 return identity;
}
function folder(identity){
 return path.join(app.getPath('userData'),'collections',identity.userId,identity.propertyId);
}
async function readJson(file){
 try{return JSON.parse(await readFile(file,'utf8'))}catch(error){if(error.code==='ENOENT')return null;throw error}
}
async function saveJson(file,value){
 const temporary=file+'.'+randomUUID()+'.tmp';
 await writeFile(temporary,JSON.stringify(value));
 await rename(temporary,file);
}
function runScript(script,args,root,profile){
 if(stopRequested)return Promise.resolve(1);
 return new Promise((resolve,reject)=>{
  // Keep only the system variables needed by Node and the browser process.
  const env=systemEnvironment();
  const node=hosted?process.execPath:process.env.STAYCRAFT_DESKTOP_NODE;
  const browsers=runtime?.browsers||(app.isPackaged?path.join(process.resourcesPath,'playwright-browsers'):process.env.PLAYWRIGHT_BROWSERS_PATH);
  const browserEnv=browsers?{PLAYWRIGHT_BROWSERS_PATH:browsers}:{};
  const file=path.join(runtime?.collector||(app.isPackaged?path.join(process.resourcesPath,'collector'):project),'scripts',script);
  const options={cwd:root,env:{...env,...browserEnv,STAYCRAFT_PRICE_ROOT:root,STAYCRAFT_PRICE_PROFILE:profile},windowsHide:true,stdio:'ignore'};
  child=standalone?utilityProcess.fork(path.join(__dirname,'collector-runner.cjs'),[file,...(Array.isArray(args)?args:[args])],options)
   :spawn(node,[file,...(Array.isArray(args)?args:[args])],{...options,env:{...options.env,...(hosted?{ELECTRON_RUN_AS_NODE:'1'}:{})}});
  child.once('error',reject);
  child.once('exit',code=>{child=undefined;resolve(code)});
 });
}
async function sync(file,pending){
 await progress(file,{phase:'saving',stage:'check-sync',observed:pending.observed});
 const current=await scope().catch(()=>null);
 if(!current)return {...summary(pending),error:'sync_failed'};
 if(current.userId!==pending.body.userId||current.propertyId!==pending.body.propertyId)throw Error('account_changed');
 if(pending.body.collectionLocation!==undefined&&normalizedLocation(current.location)!==normalizedLocation(pending.body.collectionLocation))throw Error('location_changed');
 const send=checkOnly=>window.webContents.session.fetch(endpoint,{method:'POST',credentials:'include',redirect:'error',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({...pending.body,...(checkOnly?{checkOnly:true}:{})}),signal:AbortSignal.timeout(20000)}).catch(()=>null);
 const checked=await send(true);const receipt=await checked?.json().catch(()=>null);
 if(!checked?.ok||!['not_saved','already_saved'].includes(receipt?.status)){await progress(file,{phase:'uncertain',stage:'check-sync',error:'sync_failed'});return {...summary(pending),error:'sync_failed'};}
 if(receipt.status==='already_saved'){const complete={...pending,state:'saved',batchId:receipt.batch.id,completedAt:new Date().toISOString(),syncStatus:'already_saved'};await saveJson(file,complete);await progress(file,{phase:'refreshing',stage:'saved',completedAt:complete.completedAt,observed:pending.observed});return summary(complete);}
 await progress(file,{phase:'saving',stage:'sync',observed:pending.observed});
 const response=await send(false);
 if(!response?.ok){
  const problem=await response?.json().catch(()=>null);
  await progress(file,{phase:'uncertain',stage:'sync',error:'sync_failed'});
  return {...summary(pending),error:problem?.error==='market_sync_location_changed'?'location_changed':response?.status===409?'sync_conflict':'sync_failed'};
 }
 const result=await response.json();
 if(!['saved','already_saved'].includes(result.status)||typeof result.batch?.id!=='string')throw Error('sync_failed');
 const complete={...pending,state:'saved',batchId:result.batch.id,completedAt:new Date().toISOString(),syncStatus:result.status};
 await saveJson(file,complete);
 await progress(file,{phase:'refreshing',stage:'saved',completedAt:complete.completedAt,observed:pending.observed});
 return summary(complete);
}
function summary(run){
 if(!run)return {state:'idle',sample};
 return {state:run.state,observed:run.observed,missing:run.missing,failedHotels:run.failedHotels,error:run.error,batchId:run.batchId,startedAt:run.startedAt,completedAt:run.completedAt,syncStatus:run.syncStatus,start:run.body?.start,end:run.body?.end,sample};
}
async function collect(input,identity,base,file){
 let selection;
 if(input&&typeof input==='object'){
  checkContext(identity,input.contextKey);
  selection=input;input=input.hotels;
 }
 const old=await readJson(file);
 if(old?.state==='pending')return sync(file,old);
 if(!sample&&old?.startedAt&&Date.now()-Date.parse(old.startedAt)<300000)throw Error('cooldown');
 let hotels=[];
 let listUrl;
 const star=selection?.star;
 if(star!==undefined&&(typeof star!=='string'||!/^[2-5]$/.test(star)))throw Error('invalid_hotels');
 if(!sample&&typeof input==='string'&&/^https:\/\/hotels\.ctrip\.com\/hotels\/list(?:\?|$)/.test(input.trim())){
  try{
   if(typeof input!=='string'||input.length>4000)throw Error();
   listUrl=new URL(input.trim());
   if(listUrl.origin!=='https://hotels.ctrip.com'||listUrl.pathname!=='/hotels/list'||listUrl.username||listUrl.password)throw Error();
  }catch{throw Error('invalid_hotels');}
 }else hotels=parseHotels(input);
 if(hotels.length&&selection)await saveTargets(base,identity,selection);
 const runId=randomUUID(),run=path.join(base,'runs',runId);
 await mkdir(run,{recursive:true});
 const profile=path.join(base,'browser-profile');
 const startedAt=new Date().toISOString();
 await saveJson(file,{state:'idle',startedAt});
 await progress(file,{id:randomUUID(),runId,phase:'starting',stage:'launch-browser',startedAt,observed:0,error:null});
 let observations,job;
 if(sample){
  const {monitorDates}=await import('../scripts/price-monitor-dates.mjs');
  const dates=monitorDates(null,new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai'}).format(new Date()));
  job={dates,results:hotels.map(hotel=>({hotelId:hotel.id,status:'succeeded'}))};
  observations=hotels.flatMap((hotel,index)=>dates.map(stayDate=>({
   hotelId:hotel.id,hotelName:hotel.name,stayDate,capturedAt:new Date().toISOString(),
   amount:330+index*40,currency:'CNY',kind:'calendar_reference',status:'observed',
   rooms:1,adults:2,children:0,nights:1,sourceUrl:'https://hotels.ctrip.com/hotels/'+hotel.id+'.html'
  })));
 }else if(hotels.length){
  // The calendar collector reads only this run's selected hotels and local session metadata.
  // Browser cookies remain in the same account/property's dedicated browser profile.
  await saveJson(path.join(run,'homestays.json'),hotels);
  const session=await readJson(path.join(base,'session.json'));
  if(session?.scope)await saveJson(path.join(run,'session.json'),{scope:session.scope});
  const code=await runScript('collect-public-prices.mjs',['--collect-public-prices',hotels.map(hotel=>hotel.id).join(',')],run,profile);
  job=await readJson(path.join(run,'job.json'))||{error:code===0?'no_quotes':'browser_unavailable'};
  observations=await readJson(path.join(run,'history.json'))||[];
 }else{
  const reportFile=path.join(run,'list-prices.json');
  const args=[listUrl.href,reportFile,...(star===undefined?[]:[star])];
  const code=await runScript('collect-ctrip-list-prices.mjs',args,run,profile);
  const report=await readJson(reportFile);
  job={dates:report?.dates,error:report?.status==='complete'?undefined:report?.error||(code===0?'no_quotes':'browser_unavailable')};
  observations=(report?.days||[]).flatMap(day=>{
   const occupancy=/^1间, ([1-9]|10)成人, 0儿童$/.exec(day.occupancy);
   if(!occupancy)return [];
   return day.rows.filter(row=>row.priceCny!==null).map(row=>({
    hotelName:row.name,stayDate:day.date,capturedAt:day.capturedAt,amount:row.priceCny,
    currency:'CNY',kind:'display_starting_price',status:'observed',rooms:1,adults:Number(occupancy[1]),children:0,nights:1
   }));
  });
 }
 const observed=observations.filter(row=>row.status==='observed').length;
 const missing=hotels.length?hotels.length*(job?.dates?.length||7)-observed:undefined;
 const failedHotels=hotels.length?hotels.length-(job?.results?.filter(row=>['succeeded','partial'].includes(row.status)).length||0):undefined;
 const barrier=job?.results?.find(row=>['login_required','verification_required','access_restricted'].includes(row.error))?.error;
 if(!observed||barrier){
  const failed={state:'failed',startedAt,observed,missing,failedHotels,error:stopRequested?'collection_cancelled':barrier||job?.error||'no_quotes'};
  await saveJson(file,failed);
  await progress(file,{phase:stopRequested?'cancelled':['login_required','verification_required'].includes(failed.error)?'waiting':'failed',stage:'collect',error:failed.error,observed});
  return summary(failed);
 }
 const keys=['hotelId','hotelName','sourceUrl','capturedAt','stayDate','amount','currency','kind','status','rooms','adults','children','nights'];
 const pending={state:'pending',startedAt,observed,missing,failedHotels,body:{
  userId:identity.userId,propertyId:identity.propertyId,...(normalizedLocation(identity.location)?{collectionLocation:identity.location}:{}),start:job.dates[0],end:job.dates.at(-1),
  observations:observations.map(row=>Object.fromEntries(keys.map(key=>[key,row[key]])))
 }};
 await saveJson(file,pending);
 if(stopRequested||job?.error){await progress(file,{phase:stopRequested?'cancelled':'failed',stage:'collect',error:stopRequested?'collection_cancelled':job.error,observed});return {...summary(pending),error:stopRequested?'collection_cancelled':job.error};}
 return sync(file,pending);
}

function handle(name,handler){
 ipcMain.handle('staycraft:'+name,async(event,arg)=>{
  if(event.sender!==window?.webContents||event.senderFrame!==window.webContents.mainFrame||!sameOrigin(event.senderFrame.url))return {state:'failed',error:'invalid_window'};
  const stopped=()=>({state:'idle',operation:{phase:'cancelled',stage:'stopping'},active:false});
  if(name==='cancel'&&launching&&!active){launching.cancelled=true;return stopped();}
  const starts=name==='collect'||name==='login';
  if(starts&&(active||launching))return {state:'failed',error:'busy'};
  const launch=starts?{cancelled:false}:null;if(launch)launching=launch;
  try{
   const identity=await scope();
   const base=folder(identity);
   await mkdir(base,{recursive:true});
   const file=normalizedLocation(identity.location)?collectionFile(base,identity):path.join(base,'latest.json');
   await mkdir(path.dirname(file),{recursive:true});
   if(launch?.cancelled)return stopped();
   return await handler(identity,base,file,arg);
  }catch(error){
   const known=['sign_in','demo_only','invalid_hotels','account_changed','sync_conflict','sync_failed','busy','login_failed','browser_unavailable','cooldown','property_location_required','collection_context_changed','location_changed'];
   return {state:'failed',error:known.includes(error.message)?error.message:'desktop_unavailable'};
  }finally{if(launching===launch)launching=undefined;}
 });
}
async function exclusive(task,file){
 if(active)throw Error('busy');
 active=true;activeFile=file;stopRequested=false;
 try{return await task()}finally{active=false;activeFile=undefined}
}
app.setName(hosted||app.isPackaged?'StayCraft Desktop':standalone?'StayCraft Desktop Test':sample?'StayCraft Desktop Sample':'StayCraft Desktop Dev');
if(process.platform==='win32')app.setAppUserModelId(applicationId);
const userData=!hosted&&process.env.STAYCRAFT_DESKTOP_TEST_DATA
 ?process.env.STAYCRAFT_DESKTOP_TEST_DATA:path.join(app.getPath('appData'),app.name);
mkdirSync(userData,{recursive:true});
app.setPath('userData',userData);
function startupFailure(){
 if(quitting)return;
 dialog.showErrorBox('StayCraft 无法启动','本地工作台未能正常启动。请关闭后重试；若仍然失败，请重新准备测试版运行资源。');
 app.quit();
}
app.whenReady().then(async()=>{
 if(!app.requestSingleInstanceLock()){app.quit();return}
 if(standalone){
  const resources=app.isPackaged?process.resourcesPath:await developmentResources(project);
  const testSignalsOrigin=!app.isPackaged&&process.env.STAYCRAFT_DESKTOP_TEST_DATA
   ?process.env.STAYCRAFT_DESKTOP_SIGNALS_TEST_ORIGIN:undefined;
  runtime=await startRuntime({resources,userData:app.getPath('userData'),fork:utilityProcess.fork,onFailure:startupFailure,testSignalsOrigin});
  if(quitting){runtime.stop();return}
  origin=runtime.origin;endpoint=origin+'/api/workspace/market/sync';
 }
 window=new BrowserWindow({width:1320,height:900,minWidth:390,minHeight:640,autoHideMenuBar:true,title:app.name,icon:applicationIcon,
  webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,partition:sample?'persist:staycraft-sample':'persist:staycraft-desktop'}
 });
 if(process.platform==='win32')window.setAppDetails({appId:applicationId,appIconPath:applicationIcon,appIconIndex:0});
 window.webContents.on('will-navigate',(event)=>{if(!sameOrigin(event.url))event.preventDefault()});
 window.webContents.on('will-redirect',(event)=>{if(!sameOrigin(event.url))event.preventDefault()});
 window.webContents.setWindowOpenHandler(({url})=>{
  if(!sameOrigin(url)&&/^https:\/\//.test(url))void shell.openExternal(url);
  return {action:'deny'};
 });
 handle('status',async(_identity,base,file)=>collectionStatus(base,file));
 handle('retry-sync',(_identity,_base,file)=>exclusive(async()=>{const pending=await readJson(file);if(pending?.state==='saved')return summary(pending);if(pending?.state!=='pending')throw Error('no_quotes');return sync(file,pending)},file));
 handle('cancel',async(_identity,base,file)=>{if(activeFile!==file)return collectionStatus(base,file);const op=await readJson(file+'.operation.json');if(op?.phase==='saving')return {...await collectionStatus(base,file),error:'sync_in_progress'};stopRequested=true;if(uuid.test(op?.runId||''))await writeFile(path.join(base,op.stage==='login'?'login':'runs',op.runId,'cancel.request'),'stop');else child?.kill();await progress(file,{phase:'waiting',stage:'stopping'});return collectionStatus(base,file)});
 handle('targets',(identity,base)=>readTargets(base,identity));
 handle('save-targets',(identity,base,_file,input)=>exclusive(()=>saveTargets(base,identity,input)));
 handle('collect',(identity,base,file,input)=>exclusive(()=>collect(input,identity,base,file),file));
 handle('login',(_identity,base,file)=>exclusive(async()=>{
  if(sample)return {state:'idle',sample:true};
  const runId=randomUUID(),login=path.join(base,'login',runId);
  await mkdir(login,{recursive:true});
  await progress(file,{id:randomUUID(),runId,phase:'waiting',stage:'login',startedAt:new Date().toISOString()});
  const code=await runScript('login-price-monitor.mjs','--open-login',login,path.join(base,'browser-profile'));
  const session=await readJson(path.join(login,'session.json'));
  if(code!==0||!session){
   const state=await readJson(path.join(login,'login-state.json'));
   await progress(file,{phase:stopRequested?'cancelled':'failed',stage:'login',error:stopRequested?'collection_cancelled':state?.error||'login_failed'});
   if(stopRequested)return {...summary(await readJson(file)),operation:{phase:'cancelled',stage:'stopping'}};
   throw Error(state?.error==='browser_unavailable'?'browser_unavailable':'login_failed');
  }
  await saveJson(path.join(base,'session.json'),session);
  await progress(file,{phase:'complete',stage:'login-complete'});
  return summary(await readJson(file));
 },file));
 await window.loadURL(origin+'/login');
}).catch(startupFailure);
app.on('second-instance',()=>{if(window?.isMinimized())window.restore();window?.focus()});
app.on('window-all-closed',()=>app.quit());
ipcMain.handle('staycraft:open-demo',event=>event.sender===window?.webContents&&event.senderFrame===window.webContents.mainFrame&&sameOrigin(event.senderFrame.url)?openDemo():{ok:false,error:'invalid_window'});
app.on('before-quit',()=>{quitting=true;child?.kill();runtime?.stop();demoRuntime?.stop()});
