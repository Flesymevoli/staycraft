const assert=require('node:assert/strict');
const path=require('node:path');
const os=require('node:os');
const {fork}=require('node:child_process');
const {createServer}=require('node:http');
const {mkdtemp,mkdir,writeFile,readFile,readdir,rm,cp}=require('node:fs/promises');
const {publicConfiguration,systemEnvironment,containedPath,startRuntime,developmentResources,testSignalsConfiguration}=require('../desktop/runtime.cjs');
const {auditResources}=require('../desktop/build-runtime.cjs');
const publicConfig={NEXT_PUBLIC_SUPABASE_URL:'https://desktop-fixture.supabase.co',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture'};
const spawnServer=(file,args,options)=>fork(file,args,{...options,stdio:['ignore','pipe','pipe','ipc']});
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let assertions=0;
function check(value,message){assert.ok(value,message);assertions++;}
function throws(fn){assert.throws(fn);assertions++;}
async function rejects(fn,pattern){await assert.rejects(fn,pattern);assertions++;}

async function fixtureTests(){
 check(Object.keys(testSignalsConfiguration()).length===0,'release has no test signals override');
 check(testSignalsConfiguration('http://127.0.0.1:9876').STAYCRAFT_DESKTOP_SIGNALS_TEST==='1','explicit local worker preview');
 for(const value of ['https://evil.example','http://localhost:9876','http://127.0.0.1:9876/path','http://127.0.0.1:99999','http://127.0.0.1:9876@evil.example'])throws(()=>testSignalsConfiguration(value));
 check(publicConfiguration(publicConfig).NEXT_PUBLIC_SUPABASE_URL===publicConfig.NEXT_PUBLIC_SUPABASE_URL,'public project config');
 throws(()=>publicConfiguration({...publicConfig,MODEL_API_KEY:'secret'}));
 throws(()=>publicConfiguration({...publicConfig,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'sb_secret_no'}));
 throws(()=>publicConfiguration({...publicConfig,NEXT_PUBLIC_SUPABASE_URL:'https://evil.example/supabase.co'}));
 throws(()=>publicConfiguration({...publicConfig,DEMO_LOGIN_EMAIL:'bad\nvalue'}));
 check(publicConfiguration({...publicConfig,DEMO_LOGIN_EMAIL:'demo@example.test'}).DEMO_LOGIN_EMAIL==='demo@example.test','preserve read-only account');
 const env=systemEnvironment({PATH:'path',SystemRoot:'windows',MODEL_API_KEY:'secret',SUPABASE_SERVICE_ROLE_KEY:'secret',NODE_OPTIONS:'--require evil',NEXT_PUBLIC_SUPABASE_URL:'override'});
 check(Object.keys(env).length===2,'runtime cannot inherit secrets, node preload or project overrides');
 const temporary=await mkdtemp(path.join(os.tmpdir(),'staycraft-runtime-'));
 const live=[];
 let occupied;
 try{
  const resources=path.join(temporary,'resources');await mkdir(path.join(resources,'web'),{recursive:true});
  await writeFile(path.join(resources,'runtime.json'),JSON.stringify({version:1,webAppPath:'web',publicConfig}));
  throws(()=>containedPath(resources,'../outside'));
  throws(()=>containedPath(resources,path.resolve(temporary)));
  const entry=path.join(temporary,'fixture.cjs');
  await writeFile(entry,`const http=require('node:http');const server=http.createServer((req,res)=>{res.setHeader('content-type','application/json');res.end(JSON.stringify({privateKey:!!process.env.MODEL_API_KEY,host:server.address().address,sample:process.env.STAYCRAFT_OPERATOR_SAMPLE||null}));if(req.url==='/crash')setTimeout(()=>process.exit(2),30)});server.listen(Number(process.env.PORT)||0,'127.0.0.1',()=>process.send({kind:'ready',port:server.address().port}));process.on('disconnect',()=>process.exit(0));`);
  let failure;
  const runtime=await startRuntime({resources,fork:spawnServer,entry,onFailure:code=>{failure=code}});live.push(runtime);
  check(/^http:\/\/127\.0\.0\.1:\d+$/.test(runtime.origin),'loopback OS assigned port');
  const response=await fetch(runtime.origin);const state=await response.json();
  check(state.host==='127.0.0.1'&&!state.privateKey&&state.sample===null,'child config is isolated');
  const another=await startRuntime({resources,fork:spawnServer,entry});live.push(another);
  check(runtime.origin!==another.origin,'simultaneous runtimes do not collide');
  another.stop();await pause(100);
  await rejects(()=>fetch(another.origin),/fetch failed/);
  await fetch(runtime.origin+'/crash');await pause(150);
  check(failure==='runtime_stopped','unexpected child exit is reported');
  const userData=path.join(temporary,'user-data');
  const first=await startRuntime({resources,userData,fork:spawnServer,entry});live.push(first);
  const persisted=JSON.parse(await readFile(path.join(userData,'runtime-port.json'),'utf8'));
  check(persisted.version===1&&persisted.port===Number(new URL(first.origin).port),'save owned port per user data');
  first.stop();await pause(120);
  const restarted=await startRuntime({resources,userData,fork:spawnServer,entry});live.push(restarted);
  check(restarted.origin===first.origin,'normal restart preserves browser storage origin');
  restarted.stop();await pause(120);
  let occupiedRequests=0;
  occupied=createServer((_request,response)=>{occupiedRequests++;response.end('unrelated service')});
  await new Promise((resolve,reject)=>{occupied.once('error',reject);occupied.listen(persisted.port,'127.0.0.1',resolve)});
  const fallback=await startRuntime({resources,userData,fork:spawnServer,entry});live.push(fallback);
  check(fallback.origin!==first.origin,'occupied saved port uses a newly owned port');
  check(occupiedRequests===0,'never probes the service occupying the saved port');
  const updated=JSON.parse(await readFile(path.join(userData,'runtime-port.json'),'utf8'));
  check(updated.port===Number(new URL(fallback.origin).port),'remember the replacement port');
  fallback.stop();await pause(120);
  await new Promise(resolve=>occupied.close(resolve));occupied=undefined;
  await writeFile(path.join(userData,'runtime-port.json'),'{broken');
  const recovered=await startRuntime({resources,userData,fork:spawnServer,entry});live.push(recovered);
  check(JSON.parse(await readFile(path.join(userData,'runtime-port.json'),'utf8')).port===Number(new URL(recovered.origin).port),'invalid preference recovers safely');
  recovered.stop();
  const crash=path.join(temporary,'crash.cjs');await writeFile(crash,'process.exit(2)');
  await rejects(()=>startRuntime({resources,fork:spawnServer,entry:crash}),/runtime_stopped/);
  const stalled=path.join(temporary,'stalled.cjs');await writeFile(stalled,'setInterval(()=>{},1000)');
  await rejects(()=>startRuntime({resources,fork:spawnServer,entry:stalled,timeoutMs:80}),/runtime_timeout/);
  await rejects(()=>startRuntime({resources:path.join(temporary,'missing'),fork:spawnServer,entry}),/ENOENT/);
  await auditResources(resources);assertions++;
  await writeFile(path.join(resources,'.env.local'),'private=fixture');
  await rejects(()=>auditResources(resources),/private configuration/);
 }finally{
  live.forEach(runtime=>runtime.stop());await pause(100);
  if(occupied)await new Promise(resolve=>occupied.close(resolve));
  const relative=path.relative(os.tmpdir(),temporary);
  if(!relative.startsWith('staycraft-runtime-')||relative.includes(path.sep))throw Error('Unexpected QA cleanup path');
  await rm(temporary,{recursive:true,force:true});
 }
}
async function smoke(){
 const project=path.resolve(__dirname,'..'),original=await developmentResources(project);
 const temporary=await mkdtemp(path.join(os.tmpdir(),'staycraft-runtime-'));
 const resources=path.join(temporary,'resources');
 let runtime;
 try{
  // Outside the repository: missing dependencies cannot fall back to its node_modules.
  await cp(original,resources,{recursive:true,dereference:true});
  await auditResources(resources);assertions++;
  runtime=await startRuntime({resources,fork:spawnServer});
  const login=await fetch(runtime.origin+'/login');const html=await login.text();
  check(login.ok&&html.includes('StayCraft'),'production login renders');
  const assets=[...html.matchAll(/(?:src|href)="([^"\s]+\.(?:js|css)(?:\?[^"\s]*)?)"/g)].map(match=>match[1]).filter(url=>url.startsWith('/_next/'));
  check(assets.length>0,'rendered production assets present');
  for(const url of assets){const response=await fetch(new URL(url,runtime.origin));check(response.ok,'static asset serves locally');await response.body?.cancel();}
  const identity=await fetch(runtime.origin+'/api/workspace/market/sync',{redirect:'manual'});
  check(identity.status===401,'unauthenticated workspace remains protected');
  const core=JSON.parse(await readFile(path.join(runtime.collector,'node_modules/playwright-core/browsers.json'),'utf8'));
  const browserFolders=await readdir(runtime.browsers);
  const chromium=core.browsers.find(browser=>browser.name==='chromium');
  check(browserFolders.includes('chromium-'+chromium.revision),'matching Chromium accompanies collector');
  console.log('Relocated standalone smoke: production login, local static assets, authenticated API boundary and collector resources verified.');
 }finally{
  runtime?.stop();await pause(200);
  const relative=path.relative(os.tmpdir(),temporary);
  if(!relative.startsWith('staycraft-runtime-')||relative.includes(path.sep))throw Error('Unexpected QA cleanup path');
  await rm(temporary,{recursive:true,force:true,maxRetries:5,retryDelay:100});
 }
}
async function portSmoke(){
 const resources=await developmentResources(path.resolve(__dirname,'..'));
 const temporary=await mkdtemp(path.join(os.tmpdir(),'staycraft-runtime-'));
 let runtime,occupied;
 try{
  runtime=await startRuntime({resources,userData:temporary,fork:spawnServer});
  const original=runtime.origin;runtime.stop();await pause(200);
  runtime=await startRuntime({resources,userData:temporary,fork:spawnServer});
  check(runtime.origin===original,'Next production restart keeps the same origin');
  runtime.stop();await pause(200);
  let requests=0;
  occupied=createServer((_request,response)=>{requests++;response.end('unrelated service')});
  await new Promise((resolve,reject)=>{occupied.once('error',reject);occupied.listen(Number(new URL(original).port),'127.0.0.1',resolve)});
  runtime=await startRuntime({resources,userData:temporary,fork:spawnServer});
  check(runtime.origin!==original,'Next bind failure falls back to an owned OS-assigned port');
  check(requests===0,'Next never sends health checks to an occupied port');
  check(JSON.parse(await readFile(path.join(temporary,'runtime-port.json'),'utf8')).port===Number(new URL(runtime.origin).port),'production replacement port is persisted');
  console.log('Production port smoke: stable origin after restart, safe collision recovery, zero requests to the unrelated service.');
 }finally{
  runtime?.stop();if(occupied)await new Promise(resolve=>occupied.close(resolve));await pause(200);
  const relative=path.relative(os.tmpdir(),temporary);
  if(!relative.startsWith('staycraft-runtime-')||relative.includes(path.sep))throw Error('Unexpected QA cleanup path');
  await rm(temporary,{recursive:true,force:true,maxRetries:5,retryDelay:100});
 }
}
(async()=>{await fixtureTests();if(process.argv.includes('--smoke'))await smoke();if(process.argv.includes('--ports'))await portSmoke();console.log('Desktop runtime QA passed: '+assertions+' assertions.');})().catch(error=>{console.error(error.message);process.exitCode=1});
