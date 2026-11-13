const path=require('node:path');
const {readFile,mkdir,writeFile,rename,unlink}=require('node:fs/promises');
const {randomUUID}=require('node:crypto');

const systemKeys=/^(PATH|PATHEXT|SYSTEMROOT|SYSTEMDRIVE|WINDIR|TEMP|TMP|USERPROFILE|LOCALAPPDATA|APPDATA|PROGRAMFILES.*|LANG|LC_ALL)$/i;
function systemEnvironment(source=process.env){
 return Object.fromEntries(Object.entries(source).filter(([key])=>systemKeys.test(key)));
}
function publicConfiguration(input){
 const allowed=['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','DEMO_LOGIN_EMAIL'];
 if(!input||typeof input!=='object'||Object.keys(input).some(key=>!allowed.includes(key)))throw Error('invalid_public_configuration');
 const url=input.NEXT_PUBLIC_SUPABASE_URL,key=input.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(typeof url!=='string'||!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)||typeof key!=='string'||!/^sb_publishable_[A-Za-z0-9_-]+$/.test(key))throw Error('invalid_public_configuration');
 if(input.DEMO_LOGIN_EMAIL!==undefined&&(typeof input.DEMO_LOGIN_EMAIL!=='string'||!/^\S+@\S+\.\S+$/.test(input.DEMO_LOGIN_EMAIL)))throw Error('invalid_public_configuration');
 return Object.fromEntries(allowed.filter(name=>input[name]!==undefined).map(name=>[name,input[name]]));
}
function containedPath(root,relative){
 if(typeof relative!=='string'||path.isAbsolute(relative))throw Error('invalid_runtime_manifest');
 const result=path.resolve(root,relative),from=path.relative(root,result);
 if(!from||from==='..'||from.startsWith('..'+path.sep))throw Error('invalid_runtime_manifest');
 return result;
}
async function readRuntime(resources){
 const manifest=JSON.parse(await readFile(path.join(resources,'runtime.json'),'utf8'));
 if(manifest.version!==1)throw Error('invalid_runtime_manifest');
 return {web:containedPath(resources,manifest.webAppPath),publicConfig:publicConfiguration(manifest.publicConfig),
  collector:path.join(resources,'collector'),browsers:path.join(resources,'playwright-browsers')};
}
async function developmentResources(project){
 const base=path.join(project,'.desktop-runtime');
 const current=JSON.parse(await readFile(path.join(base,'current.json'),'utf8'));
 return containedPath(base,current.resources);
}

async function preferredPort(userData){
 if(!userData)return 0;
 if(!path.isAbsolute(userData))throw Error('runtime_storage_unavailable');
 try{
  const value=JSON.parse(await readFile(path.join(userData,'runtime-port.json'),'utf8'));
  return value?.version===1&&Number.isInteger(value.port)&&value.port>=1024&&value.port<=65535?value.port:0;
 }catch(error){if(error.code==='ENOENT'||error instanceof SyntaxError)return 0;throw Error('runtime_storage_unavailable')}
}
async function rememberPort(userData,port){
 if(!userData)return;
 await mkdir(userData,{recursive:true});
 const file=path.join(userData,'runtime-port.json'),temporary=file+'.'+randomUUID()+'.tmp';
 try{await writeFile(temporary,JSON.stringify({version:1,port}));await rename(temporary,file);}
 catch{await unlink(temporary).catch(()=>{});throw Error('runtime_storage_unavailable')}
}

// fork is Electron utilityProcess.fork in the app; the same lifecycle is tested with Node IPC.
function testSignalsConfiguration(origin){
 if(origin===undefined)return {};
 if(typeof origin!=='string'||!/^http:\/\/127\.0\.0\.1:[1-9]\d{0,4}$/.test(origin)||Number(new URL(origin).port)>65535)throw Error('invalid_test_signals_origin');
 return {STAYCRAFT_DESKTOP_SIGNALS_TEST:'1',STAYCRAFT_DESKTOP_SIGNALS_TEST_ORIGIN:origin};
}
async function launchRuntime(runtime,{fork,entry,timeoutMs,onFailure,testSignalsOrigin,demo=false},port){
 const child=fork(entry,[runtime.web],{cwd:runtime.web,env:{...systemEnvironment(),...runtime.publicConfig,
  ...testSignalsConfiguration(testSignalsOrigin),
  ...(demo?{STAYCRAFT_DESKTOP_DEMO:'1',STAYCRAFT_DEMO_SUPPORT:path.join(runtime.resources,'demo','frontend','scripts'),MODEL_ENABLED:'0',FORMAL_MODEL_ENABLED:'0',DEMO_LOGIN_EMAIL:''}:{}),
  NODE_ENV:'production',HOSTNAME:'127.0.0.1',PORT:String(port),HOMESTAY_LOCAL_DATA:'0',STAYCRAFT_DESKTOP_RUNTIME:'1',NEXT_TELEMETRY_DISABLED:'1'},
  stdio:'pipe',serviceName:'StayCraft local workspace'});
 let stopping=false,ready=false,settled=false;
 child.stdout?.on('data',()=>{});child.stderr?.on('data',()=>{});
 const stop=()=>{if(stopping)return;stopping=true;child.kill();};
 const origin=await new Promise((resolve,reject)=>{
  const fail=(code)=>{if(!settled){settled=true;clearTimeout(timer);stop();reject(Error(code));}else if(ready&&!stopping){onFailure(code);stop();}};
  const timer=setTimeout(()=>fail('runtime_timeout'),timeoutMs);
  child.once('error',()=>fail('runtime_start_failed'));
  child.once('exit',()=>fail('runtime_stopped'));
  child.on('message',message=>{
   if(settled||message?.kind!=='ready'||!Number.isInteger(message.port)||message.port<1||message.port>65535)return;
   settled=true;ready=true;clearTimeout(timer);resolve('http://127.0.0.1:'+message.port);
  });
 });
 return {origin,stop,...runtime};
}
async function startRuntime({resources,userData,fork,entry=path.join(__dirname,'server.cjs'),timeoutMs=45000,onFailure=()=>{},testSignalsOrigin,demo=false}){
 const runtime=await readRuntime(resources),port=await preferredPort(userData);
 runtime.resources=resources;
 const options={fork,entry,timeoutMs,onFailure,testSignalsOrigin,demo};
 let running;
 try{running=await launchRuntime(runtime,options,port);}
 catch(error){
  // Next exits before readiness when it cannot bind. Retry in a new child with
  // an OS-assigned port; never GET or navigate to the occupied origin.
  if(!port||error.message!=='runtime_stopped')throw error;
  running=await launchRuntime(runtime,options,0);
 }
 try{await rememberPort(userData,Number(new URL(running.origin).port));}
 catch(error){running.stop();throw error;}
 return running;
}
module.exports={systemEnvironment,publicConfiguration,containedPath,readRuntime,developmentResources,startRuntime,testSignalsConfiguration};
