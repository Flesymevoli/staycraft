const {app,BrowserWindow,ipcMain,shell}=require('electron');
const {spawn}=require('node:child_process');
const {randomUUID}=require('node:crypto');
const {mkdirSync}=require('node:fs');
const {mkdir,readFile,writeFile,rename}=require('node:fs/promises');
const path=require('node:path');

const hosted=app.isPackaged||process.argv.includes('--hosted');
const testPort=!hosted&&process.env.STAYCRAFT_DESKTOP_TEST_DATA
 ?process.env.STAYCRAFT_DESKTOP_TEST_PORT:undefined;
const origin=hosted?'https://staycraft.online':'http://127.0.0.1:'+(testPort||3190);
const endpoint=origin+'/api/workspace/market/sync';
const project=path.resolve(__dirname,'..');
const sample=!hosted&&process.env.STAYCRAFT_DESKTOP_SAMPLE==='1';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
let window,active,child;

function sameOrigin(value){try{return new URL(value).origin===origin}catch{return false}}
async function scope(){
 const response=await window.webContents.session.fetch(endpoint,{credentials:'include',redirect:'error'});
 if(!response.ok)throw Error(response.status===403?'demo_only':'sign_in');
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
 return new Promise((resolve,reject)=>{
  // Keep only the system variables needed by Node and the browser process.
  const env=Object.fromEntries(Object.entries(process.env).filter(([key])=>/^(PATH|PATHEXT|SYSTEMROOT|SYSTEMDRIVE|WINDIR|TEMP|TMP|USERPROFILE|LOCALAPPDATA|APPDATA|PROGRAMFILES.*|PLAYWRIGHT_BROWSERS_PATH)$/i.test(key)));
  const node=hosted?process.execPath:process.env.STAYCRAFT_DESKTOP_NODE;
  const browserEnv=app.isPackaged?{PLAYWRIGHT_BROWSERS_PATH:path.join(process.resourcesPath,'playwright-browsers')}:{};
  child=spawn(node,[path.join(project,'scripts',script),...(Array.isArray(args)?args:[args])],{
   cwd:root,env:{...env,...browserEnv,...(hosted?{ELECTRON_RUN_AS_NODE:'1'}:{}),STAYCRAFT_PRICE_ROOT:root,STAYCRAFT_PRICE_PROFILE:profile},windowsHide:true,stdio:'ignore'
  });
  child.once('error',reject);
  child.once('exit',code=>{child=undefined;resolve(code)});
 });
}
function hotelList(input){
 if(typeof input!=='string'||input.length>4000)throw Error('invalid_hotels');
 const hotels=input.trim().split(/\r?\n/).map(line=>{
  const match=line.trim().match(/^https:\/\/hotels\.ctrip\.com\/hotels\/(\d{1,12})\.html\s+(.{1,160})$/);
  if(!match)throw Error('invalid_hotels');
  return {id:match[1],name:match[2].trim()};
 });
 if(hotels.length>5||new Set(hotels.map(hotel=>hotel.id)).size!==hotels.length)throw Error('invalid_hotels');
 return hotels;
}

async function sync(file,pending){
 const current=await scope().catch(()=>null);
 if(!current)return {...summary(pending),error:'sync_failed'};
 if(current.userId!==pending.body.userId||current.propertyId!==pending.body.propertyId)throw Error('account_changed');
 const response=await window.webContents.session.fetch(endpoint,{
  method:'POST',credentials:'include',redirect:'error',headers:{Origin:origin,'Content-Type':'application/json'},
  body:JSON.stringify(pending.body)
 }).catch(()=>null);
 if(!response?.ok)return {...summary(pending),error:response?.status===409?'sync_conflict':'sync_failed'};
 const result=await response.json();
 if(!['saved','already_saved'].includes(result.status)||typeof result.batch?.id!=='string')throw Error('sync_failed');
 const complete={...pending,state:'saved',batchId:result.batch.id};
 await saveJson(file,complete);
 return summary(complete);
}
function summary(run){
 if(!run)return {state:'idle',sample};
 return {state:run.state,observed:run.observed,missing:run.missing,failedHotels:run.failedHotels,error:run.error,batchId:run.batchId,sample};
}
async function collect(input,identity,base,file){
 const old=await readJson(file);
 if(old?.state==='pending')return sync(file,old);
 if(!sample&&old?.startedAt&&Date.now()-Date.parse(old.startedAt)<300000)throw Error('cooldown');
 let hotels=[];
 let listUrl;
 if(!sample&&typeof input==='string'&&/^https:\/\/hotels\.ctrip\.com\/hotels\/list(?:\?|$)/.test(input.trim())){
  try{
   if(typeof input!=='string'||input.length>4000)throw Error();
   listUrl=new URL(input.trim());
   if(listUrl.origin!=='https://hotels.ctrip.com'||listUrl.pathname!=='/hotels/list'||listUrl.username||listUrl.password)throw Error();
  }catch{throw Error('invalid_hotels');}
 }else hotels=hotelList(input);
 const run=path.join(base,'runs',randomUUID());
 await mkdir(run,{recursive:true});
 const profile=path.join(base,'browser-profile');
 const startedAt=new Date().toISOString();
 await saveJson(file,{state:'idle',startedAt});
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
  await runScript('collect-public-prices.mjs',['--collect-public-prices',hotels.map(hotel=>hotel.id).join(',')],run,profile);
  job=await readJson(path.join(run,'job.json'))||{error:'no_quotes'};
  observations=await readJson(path.join(run,'history.json'))||[];
 }else{
  const reportFile=path.join(run,'list-prices.json');
  await runScript('collect-ctrip-list-prices.mjs',[listUrl.href,reportFile],run,profile);
  const report=await readJson(reportFile);
  job={dates:report?.dates,error:report?.status==='complete'?undefined:report?.error||'no_quotes'};
  observations=job.error?[]:report.days.flatMap(day=>{
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
  const failed={state:'failed',startedAt,observed,missing,failedHotels,error:barrier||job?.error||'no_quotes'};
  await saveJson(file,failed);
  return summary(failed);
 }
 const keys=['hotelId','hotelName','sourceUrl','capturedAt','stayDate','amount','currency','kind','status','rooms','adults','children','nights'];
 const pending={state:'pending',startedAt,observed,missing,failedHotels,body:{
  ...identity,start:job.dates[0],end:job.dates.at(-1),
  observations:observations.map(row=>Object.fromEntries(keys.map(key=>[key,row[key]])))
 }};
 await saveJson(file,pending);
 return sync(file,pending);
}

function handle(name,handler){
 ipcMain.handle('staycraft:'+name,async(event,arg)=>{
  if(event.sender!==window?.webContents||event.senderFrame!==window.webContents.mainFrame||!sameOrigin(event.senderFrame.url))return {state:'failed',error:'invalid_window'};
  try{
   const identity=await scope();
   const base=folder(identity);
   await mkdir(base,{recursive:true});
   return await handler(identity,base,path.join(base,'latest.json'),arg);
  }catch(error){
   const known=['sign_in','demo_only','invalid_hotels','account_changed','sync_conflict','sync_failed','busy','login_failed','cooldown'];
   return {state:'failed',error:known.includes(error.message)?error.message:'desktop_unavailable'};
  }
 });
}
async function exclusive(task){
 if(active)throw Error('busy');
 active=true;
 try{return await task()}finally{active=false}
}
app.setName(hosted?'StayCraft Desktop':sample?'StayCraft Desktop Sample':'StayCraft Desktop Dev');
const userData=!hosted&&process.env.STAYCRAFT_DESKTOP_TEST_DATA
 ?process.env.STAYCRAFT_DESKTOP_TEST_DATA:path.join(app.getPath('appData'),app.name);
mkdirSync(userData,{recursive:true});
app.setPath('userData',userData);
app.whenReady().then(()=>{
 if(!app.requestSingleInstanceLock()){app.quit();return}
 window=new BrowserWindow({width:1320,height:900,minWidth:390,minHeight:640,autoHideMenuBar:true,
  webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,partition:sample?'persist:staycraft-sample':'persist:staycraft-desktop'}
 });
 window.webContents.on('will-navigate',(event)=>{if(!sameOrigin(event.url))event.preventDefault()});
 window.webContents.on('will-redirect',(event)=>{if(!sameOrigin(event.url))event.preventDefault()});
 window.webContents.setWindowOpenHandler(({url})=>{
  if(!sameOrigin(url)&&/^https:\/\//.test(url))void shell.openExternal(url);
  return {action:'deny'};
 });
 handle('status',async(_identity,_base,file)=>summary(await readJson(file)));
 handle('collect',(identity,base,file,input)=>exclusive(()=>collect(input,identity,base,file)));
 handle('login',(_identity,base,file)=>exclusive(async()=>{
  if(sample)return {state:'idle',sample:true};
  const login=path.join(base,'login',randomUUID());
  await mkdir(login,{recursive:true});
  const code=await runScript('login-price-monitor.mjs','--open-login',login,path.join(base,'browser-profile'));
  const session=await readJson(path.join(login,'session.json'));
  if(code!==0||!session)throw Error('login_failed');
  await saveJson(path.join(base,'session.json'),session);
  return summary(await readJson(file));
 }));
 void window.loadURL(origin+'/login');
});
app.on('second-instance',()=>{if(window?.isMinimized())window.restore();window?.focus()});
app.on('window-all-closed',()=>app.quit());
app.on('before-quit',()=>child?.kill());
