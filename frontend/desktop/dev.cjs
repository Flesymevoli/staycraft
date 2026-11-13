const {spawn}=require('node:child_process');
const {createServer}=require('node:net');
const path=require('node:path');
const electron=require('electron');

const root=path.resolve(__dirname,'..');
const origin='http://127.0.0.1:3190';
const sample=process.argv.includes('--sample');
const trial=process.argv.includes('--try');
const isolated=sample||trial;
let server,desktop,stopping=false;
function stop(code){
 if(stopping)return;
 stopping=true;
 desktop?.kill();
 server?.kill();
 process.exitCode=code??0;
}
async function launch(){
 if(process.env.STAYCRAFT_HOSTED==='1'||process.env.VERCEL==='1')throw Error('Desktop development requires a local process.');
 const check=createServer();
 await new Promise((resolve,reject)=>{check.once('error',reject);check.listen(3190,'127.0.0.1',()=>check.close(resolve))});
 const env={...process.env,STAYCRAFT_DESKTOP_DEV:'1',STAYCRAFT_OPERATOR_SAMPLE:sample?'1':'0',STAYCRAFT_QA_AUTH_FIXTURES:isolated?'1':'0',
  STAYCRAFT_QA_DESKTOP_SYNC:isolated?'1':'0',HOMESTAY_LOCAL_DATA:'0',
  ...(isolated?{MODEL_ENABLED:'0',FORMAL_MODEL_ENABLED:'0'}:{}),
  ...(trial?{
   STAYCRAFT_QA_DESKTOP_JOURNEY:'1',STAYCRAFT_QA_FORMAL_STAYS:'1',STAYCRAFT_QA_IMPORT_DB:'1',
   STAYCRAFT_SAMPLE_RICH:'0',STAYCRAFT_SAMPLE_LIVE_MODEL:'0',STAYCRAFT_SAMPLE_LIVE_AMAP:'0',DEMO_LOGIN_EMAIL:'',
   NEXT_PUBLIC_SUPABASE_URL:'https://staycraft-qa.invalid',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'fixture-key',
  }:{})};
 const nodeArgs=isolated
  ?[path.join(__dirname,'sample-web.cjs'),'127.0.0.1']
  :[require.resolve('next/dist/bin/next'),'dev','--hostname','127.0.0.1','--port','3190'];
 server=spawn(process.execPath,nodeArgs,{cwd:root,env,stdio:'inherit',windowsHide:true});
 server.on('error',()=>stop(1));server.on('exit',code=>stop(code??1));
 for(let attempt=0;attempt<90&&!stopping;attempt++){
  try{const result=await fetch(origin+'/login',{signal:AbortSignal.timeout(5000)});if(result.ok)break;}
  catch{/* Next starts and compiles on the first request. */}
  if(attempt===89)throw Error('Desktop web server did not start.');
  await new Promise(resolve=>setTimeout(resolve,500));
 }
 if(stopping)return;
 if(trial)console.log('StayCraft 本地试用：http://127.0.0.1:3190/login（虚构数据，关闭试用后重置）');
 desktop=spawn(electron,[path.join(__dirname,'main.cjs')],{cwd:root,
  env:{...process.env,STAYCRAFT_DESKTOP_NODE:process.execPath,STAYCRAFT_DESKTOP_SAMPLE:isolated?'1':'0'},stdio:'inherit',windowsHide:false});
 desktop.on('error',()=>stop(1));desktop.on('exit',code=>stop(code??0));
}
process.on('SIGINT',()=>stop(0));
process.on('SIGTERM',()=>stop(0));
launch().catch(error=>{console.error(error.message);stop(1)});
