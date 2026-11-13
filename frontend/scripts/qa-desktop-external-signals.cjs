// The real desktop transport under an isolated fetch/auth harness. No network,
// cloud writes, model calls or real credentials are used by this script.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
const root=path.resolve(__dirname,'../src');
const USER_A='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',USER_B='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const PROPERTY_A='11111111-1111-4111-8111-111111111111',PROPERTY_B='22222222-2222-4222-8222-222222222222';
const location='江苏省苏州市太仓市上海东路 100 号';
const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai'}).format(new Date());
const addDays=(date,n)=>new Date(Date.parse(date)+n*86400000).toISOString().slice(0,10);
const envKeys=['STAYCRAFT_DESKTOP_RUNTIME','STAYCRAFT_HOSTED','STAYCRAFT_OPERATOR_SAMPLE','STAYCRAFT_QA_AUTH_FIXTURES','STAYCRAFT_DESKTOP_SIGNALS_TEST','STAYCRAFT_DESKTOP_SIGNALS_TEST_ORIGIN','DEMO_LOGIN_EMAIL','VERCEL'];
const oldEnv=Object.fromEntries(envKeys.map(key=>[key,process.env[key]]));
const oldFetch=global.fetch;
const validProfile=()=>({name:'隔离测试民宿',location,roomCount:'2',breakfast:'',checkin:'',notes:''});
class WorkspaceError extends Error{constructor(code,status){super(code);this.code=code;this.status=status;}}
const moduleCache=new Map();
function load(file){
 file=path.resolve(root,file);
 if(moduleCache.has(file))return moduleCache.get(file);
 const module={exports:{}};
 const compiled=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const localRequire=name=>{
  if(name==='server-only')return {};
  if(name.endsWith('workspace-access'))return {WorkspaceError};
  if(name.startsWith('@/'))return load(name.slice(2)+'.ts');
  if(name.startsWith('.'))return load(path.resolve(path.dirname(file),name)+'.ts');
  return require(name);
 };
 new Function('require','module','exports',compiled)(localRequire,module,module.exports);
 moduleCache.set(file,module.exports);return module.exports;
}
let state;
function reset(){
 for(const key of envKeys)delete process.env[key];
 process.env.STAYCRAFT_DESKTOP_RUNTIME='1';
 state={session:{access_token:'isolated-access-a',refresh_token:'isolated-refresh-a',expires_at:Math.floor(Date.now()/1000)+3600,user:{id:USER_A}},
  userId:USER_A,profile:validProfile(),profileError:null,sessionError:null,refreshError:null,
  sessionReads:0,userReads:[],refreshes:0,profileReads:[],requests:[],reply:null};
 global.fetch=isolatedFetch;
}
const supabase={auth:{
 async getSession(){state.sessionReads++;return {data:{session:state.session},error:state.sessionError}},
 async refreshSession(){state.refreshes++;if(state.refreshError)return {data:{session:null},error:state.refreshError};state.session={access_token:'isolated-access-refreshed',refresh_token:'isolated-refresh-next',expires_at:Math.floor(Date.now()/1000)+3600,user:{id:state.userId}};return {data:{session:state.session},error:null}},
 async getUser(token){state.userReads.push(token);return {data:{user:state.userId?{id:state.userId,email:'isolated@example.invalid'}:null},error:state.userId?null:{message:'session expired'}}},
},from(table){
 assert.equal(table,'property_details','Only reread the authenticated property profile');
 const query={select(){return query},eq(field,value){assert.equal(field,'property_id');state.profileReads.push(value);return query},abortSignal(){return query},maybeSingle(){return query},then(resolve){return Promise.resolve({data:state.profile?{profile:state.profile}:null,error:state.profileError}).then(resolve)}};
 return query;
}};
const account=()=>({supabase,user:{id:USER_A,email:'isolated@example.invalid'},propertyId:PROPERTY_A});
const weatherOptions=extra=>({account:account(),location,start:today,days:7,...extra});
const eventOptions=extra=>({account:account(),location,start:today,end:addDays(today,6),...extra});
const calls=[];
async function check(name,fn){reset();await fn();calls.push(name)}
function restore(){global.fetch=oldFetch;for(const key of envKeys){if(oldEnv[key]===undefined)delete process.env[key];else process.env[key]=oldEnv[key]}}

// Response fixtures and assertions follow the versioned gateway contract below.
function reference(id,start,end,kind){return {id,authority:'public',observedAt:new Date().toISOString(),coverage:{from:start,to:end,kind},confidence:'high'}}
function envelope(request){
 const end=request.kind==='weather'?addDays(request.start,request.days-1):request.end;
 const source=reference(request.kind,request.start,end,request.kind==='weather'?'complete':'partial');
 const common={version:1,kind:request.kind,userId:USER_A,propertyId:request.propertyId,location:request.location,window:{start:request.start,end},source};
 if(request.kind==='weather')return {...common,days:Array.from({length:request.days},(_,i)=>({date:addDays(request.start,i),code:3,tempMin:12,tempMax:21,precipProb:20,source:structuredClone(source)}))};
 const eventSource={...source,coverage:{from:request.start,to:request.end,kind:'partial'}};
 return {...common,events:[{id:'local-exhibition',title:'官方展览',start:request.start,end:request.end,observedAt:eventSource.observedAt,verified:true,category:'exhibition',venue:'文化馆',distanceKm:2,sourceUrl:'https://official.example.invalid/event',source:eventSource}]};
}
async function isolatedFetch(input,options){
 const url=String(input);
 assert(url==='https://staycraft.online/desktop-api/v1/signals'||/^http:\/\/127\.0\.0\.1:\d+\/desktop-api\/v1\/signals$/.test(url),'Never contact another upstream');
 assert.equal(options.method,'POST');assert.equal(options.redirect,'error');assert.equal(options.cache,'no-store');assert(options.signal instanceof AbortSignal);
 const headers=new Headers(options.headers);assert.equal(headers.get('authorization'),'Bearer '+state.session.access_token);assert.equal(headers.get('content-type'),'application/json');assert.equal(headers.has('cookie'),false,'Never send browser cookies to the gateway');
 const data=JSON.parse(options.body);
 assert.equal(data.version,1);assert(['weather','events'].includes(data.kind));assert.equal(data.propertyId,PROPERTY_A);assert.equal(data.location,location);
 assert.deepEqual(Object.keys(data).sort(),['version','kind','propertyId','location','start',data.kind==='weather'?'days':'end'].sort(),'Only bounded signal parameters cross the gateway');
 state.requests.push({url,data,headers});
 if(state.reply)return state.reply(data,options);
 return Response.json(envelope(data));
}
const rejected=async(fn,code)=>assert.rejects(fn,error=>error instanceof WorkspaceError&&error.code===code);
const assertNoRequest=()=>assert.equal(state.requests.length,0);
function badResponse(mutator){state.reply=request=>{const data=envelope(request);mutator(data);return Response.json(data)}}

(async()=>{
 const api=load('lib/desktop-external-signals.ts');
 await check('valid 16-day forecast retains source, authenticates and checks the property twice',async()=>{
  const result=await api.readDesktopWeather(weatherOptions({days:16}));
  assert.equal(result.days.length,16);assert.equal(result.days[15].date,addDays(today,15));assert.equal(result.days[0].source,result.source);
  assert.deepEqual(state.userReads,['isolated-access-a']);assert.equal(state.refreshes,0);assert.deepEqual(state.profileReads,[PROPERTY_A,PROPERTY_A]);assert.equal(state.requests.length,1);
 });
 await check('valid events retain verified dates, distance, source link and per-event provenance',async()=>{
  const result=await api.readDesktopEvents(eventOptions());assert.equal(result.events.length,1);assert.equal(result.events[0].distanceKm,2);assert.equal(result.events[0].source.coverage.from,today);assert.equal(result.source.coverage.kind,'partial');assert.deepEqual(state.profileReads,[PROPERTY_A,PROPERTY_A]);
 });
 await check('weather null measurements remain unknown, not zero',async()=>{
  badResponse(value=>{for(const day of value.days){day.tempMin=null;day.tempMax=null;day.precipProb=null}});
  const result=await api.readDesktopWeather(weatherOptions());for(const row of result.days){assert.equal(row.tempMin,null);assert.equal(row.tempMax,null);assert.equal(row.precipProb,null)}
 });
 const review=()=>({raw:1,pages:1,parsed:0,final:0,query:'隔离城市 活动预告',observedAt:new Date().toISOString(),cached:false,rows:[{title:'来源展览报道',url:'https://source.example/article',reason:'date_pending',candidate:true,events:[]}]});
 await check('unconfirmed leads remain separate from verified events across transport',async()=>{
  badResponse(value=>{value.review=review()});const value=await api.readDesktopEvents(eventOptions());assert.equal(value.events.length,1);assert.equal(value.review.rows[0].candidate,true);
 });
 for(const [name,mutate] of [
  ['wrong funnel count',r=>{r.final=1}],
  ['forged confirmed candidate',r=>{r.rows[0].reason='accepted'}],
  ['unsafe candidate link',r=>{r.rows[0].url='javascript:alert(1)'}],
  ['missing raw row',r=>{r.raw=2}],
  ['unbounded nested event list',r=>{r.rows[0].events=Array(101).fill({title:'x',reason:'accepted'})}],
 ])await check(name,async()=>{badResponse(value=>{value.review=review();mutate(value.review)});await rejected(()=>api.readDesktopEvents(eventOptions()),'remote_signals_invalid')});
 await check('partial and empty forecasts carry truthful coverage',async()=>{
  state.reply=request=>{const data=envelope(request);data.days=data.days.slice(0,2);data.source.coverage.kind='partial';for(const row of data.days)row.source=structuredClone(data.source);return Response.json(data)};
  const partial=await api.readDesktopWeather(weatherOptions());assert.equal(partial.days.length,2);assert.equal(partial.source.coverage.kind,'partial');
  state.reply=request=>{const data=envelope(request);data.days=[];data.source.coverage.kind='none';return Response.json(data)};
  const empty=await api.readDesktopWeather(weatherOptions());assert.deepEqual(empty.days,[]);assert.equal(empty.source.coverage.kind,'none');
 });
 await check('empty event list keeps no-coverage evidence',async()=>{
  badResponse(data=>{data.events=[];data.source.coverage.kind='none'});const value=await api.readDesktopEvents(eventOptions());assert.deepEqual(value.events,[]);assert.equal(value.source.coverage.kind,'none');
 });
 for(const [name,mutate] of [
  ['session belongs to another account',()=>{state.session.user.id=USER_B}],
  ['server verifies another user',()=>{state.userId=USER_B}],
  ['missing session',()=>{state.session=null}],
  ['missing verified user',()=>{state.userId=null}],
 ])await check(name,async()=>{mutate();await rejected(()=>api.readDesktopWeather(weatherOptions()),'remote_scope_changed');assertNoRequest()});
 await check('expired access session refreshes then verifies the new token',async()=>{
  state.session.expires_at=Math.floor(Date.now()/1000)-1;
  await api.readDesktopWeather(weatherOptions());assert.equal(state.refreshes,1);assert.deepEqual(state.userReads,['isolated-access-refreshed']);assert.equal(state.requests[0].headers.get('authorization'),'Bearer isolated-access-refreshed');
 });
 await check('session with less than five minutes left refreshes',async()=>{
  state.session.expires_at=Math.floor(Date.now()/1000)+180;await api.readDesktopEvents(eventOptions());assert.equal(state.refreshes,1);assert.deepEqual(state.userReads,['isolated-access-refreshed']);
 });
 await check('refresh failure cannot make an anonymous or stale request',async()=>{
  state.session.expires_at=1;state.refreshError={message:'offline'};await rejected(()=>api.readDesktopWeather(weatherOptions()),'remote_signals_unavailable');assertNoRequest();
 });
 await check('an account switch during refresh is rejected',async()=>{
  state.session.expires_at=1;state.userId=USER_B;await rejected(()=>api.readDesktopEvents(eventOptions()),'remote_scope_changed');assertNoRequest();
 });
 await check('profile address changed before request',async()=>{
  state.profile.location='另一家民宿地址';await rejected(()=>api.readDesktopWeather(weatherOptions()),'remote_scope_changed');assertNoRequest();
 });
 await check('profile address changed while response is in flight',async()=>{
  state.reply=request=>{state.profile.location='刚修改的新地址';return Response.json(envelope(request))};await rejected(()=>api.readDesktopWeather(weatherOptions()),'remote_scope_changed');assert.equal(state.profileReads.length,2);
 });
 await check('profile query fails before data is sent',async()=>{state.profileError={message:'offline'};await rejected(()=>api.readDesktopEvents(eventOptions()),'remote_signals_unavailable');assertNoRequest()});
 for(const [name,mutate] of [
  ['response from another account',value=>{value.userId=USER_B}],
  ['response from another property',value=>{value.propertyId=PROPERTY_B}],
  ['response from another address',value=>{value.location='另一地址'}],
 ])await check(name,async()=>{badResponse(mutate);await rejected(()=>api.readDesktopWeather(weatherOptions()),'remote_scope_changed')});
 for(const [name,mutate] of [
  ['wrong protocol version',value=>{value.version=2}],
  ['wrong signal kind',value=>{value.kind='events'}],
  ['wrong response date window',value=>{value.window.end=addDays(today,10)}],
  ['wrong source date window',value=>{value.source.coverage.to=addDays(today,10)}],
  ['untrusted source authority',value=>{value.source.authority='internal'}],
  ['bad source timestamp',value=>{value.source.observedAt='not-a-time'}],
  ['bad source confidence',value=>{value.source.confidence='guaranteed'}],
  ['non-array forecast',value=>{value.days={}}],
  ['extra forecast rows',value=>{value.days.push(value.days[0])}],
  ['duplicate forecast date',value=>{value.days[1].date=value.days[0].date}],
  ['forecast outside requested dates',value=>{value.days[0].date=addDays(today,-1)}],
  ['invalid forecast day',value=>{value.days[0].date='2026-02-30'}],
  ['invalid weather code',value=>{value.days[0].code=1001}],
  ['fractional weather code',value=>{value.days[0].code=3.1}],
  ['missing measurement',value=>{delete value.days[0].tempMin}],
  ['measurement string',value=>{value.days[0].tempMax='21'}],
  ['impossible temperature',value=>{value.days[0].tempMax=100}],
  ['reversed temperature range',value=>{value.days[0].tempMin=30}],
  ['probability over 100',value=>{value.days[0].precipProb=101}],
  ['day source from another read',value=>{value.days[0].source.observedAt='2000-01-01T00:00:00Z'}],
  ['complete coverage claimed for missing days',value=>{value.days.pop()}],
 ])await check(name,async()=>{badResponse(mutate);await rejected(()=>api.readDesktopWeather(weatherOptions()),'remote_signals_invalid')});
 for(const [name,mutate] of [
  ['non-array events',value=>{value.events={}}],
  ['too many events',value=>{value.events=Array.from({length:201},()=>value.events[0])}],
  ['duplicate event identifiers',value=>{value.events.push(structuredClone(value.events[0]))}],
  ['event outside requested window',value=>{value.events[0].start=addDays(today,20);value.events[0].end=addDays(today,21)}],
  ['event reversed dates',value=>{value.events[0].start=addDays(today,8)}],
  ['unknown event category',value=>{value.events[0].category='unknown'}],
  ['missing event distance',value=>{delete value.events[0].distanceKm}],
  ['event distance beyond 15 km',value=>{value.events[0].distanceKm=15.01}],
  ['null event distance',value=>{value.events[0].distanceKm=null}],
  ['unsafe event URL',value=>{value.events[0].sourceUrl='javascript:alert(1)'}],
  ['URL credentials',value=>{value.events[0].sourceUrl='https://user:password@official.example.invalid/event'}],
  ['event source mismatches event dates',value=>{value.events[0].source.coverage.to=addDays(today,20)}],
  ['event source mismatches event retrieval time',value=>{value.events[0].observedAt='2000-01-01T00:00:00Z'}],
  ['empty events with partial coverage',value=>{value.events=[]}],
 ])await check(name,async()=>{badResponse(mutate);await rejected(()=>api.readDesktopEvents(eventOptions()),'remote_signals_invalid')});
 for(const status of [401,403,409,429,500])await check('HTTP '+status+' never returns invented observations',async()=>{
  state.reply=()=>Response.json({error:'upstream_failed'},{status});await rejected(()=>api.readDesktopWeather(weatherOptions()),[401,403,409].includes(status)?'remote_scope_changed':'remote_signals_unavailable');
 });
 await check('redirects are disabled and never followed',async()=>{
  state.reply=()=>new Response(null,{status:302,headers:{Location:'https://untrusted.invalid/'}});await rejected(()=>api.readDesktopEvents(eventOptions()),'remote_signals_unavailable');assert.equal(state.requests.length,1);
 });
 await check('JSON body beyond the declared size cap is rejected',async()=>{
  state.reply=()=>new Response('{}',{headers:{'content-type':'application/json','content-length':'262145'}});await rejected(()=>api.readDesktopWeather(weatherOptions()),'remote_signals_invalid');
 });
 await check('streaming payload beyond the cap is cancelled',async()=>{
  let cancelled=false;state.reply=()=>new Response(new ReadableStream({start(controller){controller.enqueue(new Uint8Array(262145))},cancel(){cancelled=true}}),{headers:{'content-type':'application/json'}});
  await rejected(()=>api.readDesktopEvents(eventOptions()),'remote_signals_invalid');assert.equal(cancelled,true);
 });
 for(const [name,response] of [
  ['HTML instead of JSON',()=>new Response('<html>login</html>',{headers:{'content-type':'text/html'}})],
  ['malformed JSON',()=>new Response('{',{headers:{'content-type':'application/json'}})],
  ['invalid UTF-8',()=>new Response(new Uint8Array([0xff]),{headers:{'content-type':'application/json'}})],
 ])await check(name,async()=>{state.reply=response;await rejected(()=>api.readDesktopWeather(weatherOptions()),'remote_signals_invalid')});
 await check('network timeout rejects without fabricated zero values',async()=>{
  state.reply=()=>{throw new DOMException('Test timeout','TimeoutError')};await rejected(()=>api.readDesktopWeather(weatherOptions()),'remote_signals_unavailable');
 });
 await check('pre-aborted read sends nothing',async()=>{
  const controller=new AbortController();controller.abort();await rejected(()=>api.readDesktopWeather(weatherOptions({signal:controller.signal})),'remote_signals_unavailable');assertNoRequest();assert.equal(state.sessionReads,0);
 });
 await check('aborted stalled body cancels the stream and does not hang',async()=>{
  const controller=new AbortController();let cancelled=false;
  state.reply=()=>new Response(new ReadableStream({cancel(){cancelled=true}}),{headers:{'content-type':'application/json'}});
  const pending=api.readDesktopWeather(weatherOptions({signal:controller.signal}));const timer=setTimeout(()=>controller.abort(),20);
  try{await rejected(()=>pending,'remote_signals_unavailable');assert.equal(cancelled,true)}finally{clearTimeout(timer)}
 });
 for(const [name,setup] of [
  ['web runtime',()=>delete process.env.STAYCRAFT_DESKTOP_RUNTIME],
  ['hosted runtime',()=>process.env.STAYCRAFT_HOSTED='1'],
  ['isolated sample runtime',()=>{process.env.STAYCRAFT_OPERATOR_SAMPLE='1';process.env.STAYCRAFT_QA_AUTH_FIXTURES='1'}],
 ])await check(name+' cannot call the remote gateway',async()=>{setup();assert.equal(api.desktopSignalsEnabled(),false);await rejected(()=>api.readDesktopWeather(weatherOptions()),'remote_signals_unavailable');assertNoRequest()});
 await check('configured demo account cannot call the gateway',async()=>{process.env.DEMO_LOGIN_EMAIL='isolated@example.invalid';await rejected(()=>api.readDesktopEvents(eventOptions()),'remote_signals_unavailable');assertNoRequest()});
 await check('test origin is ignored unless the explicit test switch is enabled',async()=>{
  process.env.STAYCRAFT_DESKTOP_SIGNALS_TEST_ORIGIN='https://untrusted.invalid';await api.readDesktopWeather(weatherOptions());assert.equal(state.requests[0].url,'https://staycraft.online/desktop-api/v1/signals');
 });
 await check('explicit test mode permits only a loopback origin',async()=>{
  process.env.STAYCRAFT_DESKTOP_SIGNALS_TEST='1';process.env.STAYCRAFT_DESKTOP_SIGNALS_TEST_ORIGIN='http://127.0.0.1:43177';await api.readDesktopEvents(eventOptions());assert.equal(state.requests[0].url,'http://127.0.0.1:43177/desktop-api/v1/signals');
 });
 for(const origin of ['https://untrusted.invalid','http://localhost:43177','http://127.0.0.1:65536','http://127.0.0.1:43177/path','http://127.0.0.1:43177@untrusted.invalid'])await check('invalid test override '+origin,async()=>{
  process.env.STAYCRAFT_DESKTOP_SIGNALS_TEST='1';process.env.STAYCRAFT_DESKTOP_SIGNALS_TEST_ORIGIN=origin;await rejected(()=>api.readDesktopEvents(eventOptions()),'remote_signals_unavailable');assertNoRequest();
 });
 for(const options of [{days:0},{days:17},{days:1.5},{start:'2026-02-30'}])await check('invalid weather input '+JSON.stringify(options),async()=>{await rejected(()=>api.readDesktopWeather(weatherOptions(options)),'remote_signals_invalid');assertNoRequest()});
 for(const options of [{end:addDays(today,-1)},{end:addDays(today,28)},{end:'2026-02-30'}])await check('invalid event input '+JSON.stringify(options),async()=>{await rejected(()=>api.readDesktopEvents(eventOptions(options)),'remote_signals_invalid');assertNoRequest()});
 console.log(JSON.stringify({passed:calls.length,cases:calls,scope:'Isolated fetch + Supabase fixtures only; no network, model calls or production writes'},null,2));
})().catch(error=>{console.error(error);process.exitCode=1}).finally(restore);
