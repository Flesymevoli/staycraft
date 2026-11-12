// Business-route integration with isolated facts. No network, keys, model or database writes.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.resolve(__dirname,'../src'),day='2026-11-12',end='2026-11-18';
let desktop=true,demo=false,signedIn=true,weatherFails=false,eventsFail=false,profileFails=false;
let accountId='account-a',fingerprints=[],bundles=[],localReads=0,remoteCalls=[];
const source=id=>({id,authority:'public',observedAt:day+'T01:00:00Z',coverage:{from:day,to:end,kind:'partial'},confidence:'medium'});
const event={id:'verified-event',title:'已核实的本地展览',start:day,end,venue:'文化馆',distanceKm:2,category:'exhibition',sourceUrl:'https://official.invalid/event',observedAt:day+'T01:00:00Z',verified:true,source:source('events')};
const weather={date:day,code:3,tempMin:12,tempMax:21,precipProb:20,source:source('weather')};
const anchor={id:'existing-market-anchor',name:'已保存同行',stayDate:day,amountCny:580,status:'observed',source:source('competitor')};
const profile=()=>({name:'本地测试民宿',location:accountId+' · 测试原始地址周边',roomCount:'1',breakfast:'',checkin:'',notes:''});
const metrics={period_start:day,period_end:end,period_days:7,active_rooms:1,daily:Array.from({length:7},(_,i)=>({date:new Date(Date.parse(day)+i*86400000).toISOString().slice(0,10),capacity:1,booked:0,available:1,booked_pct:0}))};
const inventory={types:[{id:'10000000-0000-4000-8000-000000000001',name:'大床房',beds:'大床',capacity:2,price:380,photo:''}],rooms:[{id:'20000000-0000-4000-8000-000000000001',number:'101',floor:'一楼',typeId:'10000000-0000-4000-8000-000000000001',housekeeping:'clean',active:true}]};
class WorkspaceError extends Error {constructor(code,status){super(code);this.code=code;this.status=status;}}
const supabase={
 from(table){assert.equal(table,'property_details');return {select(){return this},eq(key,value){assert.equal(key,'property_id');assert.equal(value,accountId);return this},abortSignal(){return this},async maybeSingle(){return {data:{profile:profile(),revision:'profile-revision'},error:profileFails?{}:null}}};},
 rpc(name,args){assert.equal(args.p_property,accountId);assert(['get_booking_metrics_range','get_room_inventory'].includes(name));return {abortSignal(){return this},then(resolve){resolve({data:name==='get_room_inventory'?{inventory,revision:'inventory-revision'}:metrics,error:null})}}},
};
const account=()=>({supabase,propertyId:accountId,user:{id:accountId,email:accountId+'@example.invalid'}});
const workspace={WorkspaceError,
 requireSameOrigin(request){if(request.headers.get('origin')!=='http://localhost')throw new WorkspaceError('invalid_origin',403)},
 async verifiedProperty(){if(!signedIn)throw new WorkspaceError('sign_in_required',401);return account()},
 boundedBody:request=>request.arrayBuffer(),
 workspaceFailure:error=>Response.json({error:error.code||'service_unavailable'},{status:error.status||503}),
};
function checkRemote(options){assert(!demo,'Configured demo account must retain its existing local facts');assert.equal(options.account.supabase,supabase);assert.equal(options.account.propertyId,accountId);assert.equal(options.account.user.id,accountId);assert.equal(options.location,profile().location);assert(options.signal instanceof AbortSignal);remoteCalls.push(options);}
const mocks={
 '@/lib/desktop-model':{desktopModelTransport:()=>undefined},
 '@/lib/workspace-access':workspace,
 '@/lib/desktop-external-signals':{desktopSignalsEnabled:()=>desktop,
  async readDesktopWeather(options){checkRemote(options);if(weatherFails)throw new WorkspaceError('remote_signals_unavailable',503);return {days:[weather],source:source('weather')}},
  async readDesktopEvents(options){checkRemote(options);if(eventsFail)throw new WorkspaceError('remote_scope_changed',409);return {events:[event],source:source('events')}},
 },
 '@/lib/operator-sample':{operatorSample:()=>false,isDemoWorkspace:()=>demo,operatorModelEnabled:()=>false},
 '@/lib/demo-period':{workspaceDay:()=>day,demoMetrics:value=>value,DEMO_PERIOD:{start:day,end}},
 '@/lib/property-location':{demoPropertyPoint:()=>demo?{latitude:31,longitude:121}:null,propertyPoint:async()=>{localReads++;assert(!desktop||demo,'Real desktop property requests must not use local geocoder');return {latitude:31,longitude:121}}},
 '@/lib/signals/weather':{fetchWeather:async()=>{localReads++;return {days:[{...weather,code:0}],source:source('weather')}}},
 '@/lib/signals/events':{EVENT_RADIUS_KM:15,collectEvents:()=>{localReads++;return {events:[{...event,id:'local-event'}],source:source('events')}}},
 '@/lib/signals/official-events':{fetchEvents:async input=>{assert(!demo,'demo must not read live calendars');assert(input.signal instanceof AbortSignal);localReads++;return {events:[{...event,id:'official-event'}],source:source('events')}}},
 '@/lib/signals/index':{collectSignals:async input=>{assert.equal(input.liveEvents,!demo);assert(input.signal instanceof AbortSignal);localReads++;return {weather:[weather],events:[{...event,id:demo?'local-event':'official-event'}],anchors:[],sources:[source('weather'),source('events')]}}},
 '@/lib/amap-nearby':{validCoordinates:v=>!!v&&typeof v.latitude==='number'&&typeof v.longitude==='number',amapCoordinates:(lat,lon)=>`${lon},${lat}`,amapPoint:value=>value?{latitude:31,longitude:121}:null,amapGeocode:async()=>{localReads++;return '121,31'}},
 '@/lib/market/saved-snapshot':{readSavedMarketSnapshot:async()=>({quotes:[],capturedAt:day+'T01:00:00Z',capturedLocation:profile().location,status:'collected'})},
 '@/lib/signals/market-anchors':{marketAnchors:()=>({quotes:[],anchors:[anchor],source:source('competitor')})},
 '@/lib/decision-agent-store':{agentStore:()=>({bookingSnapshot:async()=>null,cached:async(_,fingerprint)=>{fingerprints.push(fingerprint);return null},begin:async()=> 'started',finish:async()=>true,checkpoint:async()=>true,progress:async()=>{},fail:async()=>{throw Error('Unexpected failure')}})},
 '@/lib/decision-agent':{cachedAgentRun:async(_scope,_fingerprint,_force,runner)=>({run:await runner(),cached:false}),metricsSummary:()=>({}),runDecisionAgent:async deps=>{assert.equal(deps.modelEnabled,false);assert.equal(deps.initialMetrics,metrics);const bundle=await deps.readSignals(deps.period,new AbortController().signal);bundles.push(bundle);return {id:deps.id,status:'limited',engine:'rules_v1',phase:'investigated',evidence:[],steps:[]}}},
 '@/lib/agent-report-writer':{writeAgentReport:()=>{throw Error('Model writer must not run')}},
};
const modules=new Map();
function load(file){
 file=path.resolve(root,file);if(modules.has(file))return modules.get(file);
 const module={exports:{}},compiled=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const requireLocal=name=>{if(mocks[name])return mocks[name];if(name==='server-only')return {};if(name.startsWith('@/'))return load(name.slice(2)+'.ts');if(name.startsWith('.'))return load(path.resolve(path.dirname(file),name)+'.ts');return require(name)};
 const expose=file.endsWith(path.normalize('api/workspace/assistant/route.ts'))?'\nexports.decisionInputs=decisionInputs;':'';
 new Function('require','module','exports',compiled+expose)(requireLocal,module,module.exports);modules.set(file,module.exports);return module.exports;
}
const nearby=load('app/api/workspace/nearby/route.ts'),discovery=load('app/api/workspace/discovery/route.ts'),agent=load('app/api/workspace/agent/route.ts'),assistant=load('app/api/workspace/assistant/route.ts');
const request=(pathname,body)=>new Request('http://localhost/api/workspace/'+pathname,body?{method:'POST',headers:{Origin:'http://localhost'},body:JSON.stringify(body)}:{});
(async()=>{
 let response=await nearby.GET(request('nearby?start='+day+'&days=7')),body=await response.json();assert.equal(response.status,200);assert.equal(body.weather.days[0].code,3);assert.equal(body.weather.source.observedAt,source('weather').observedAt);
 response=await discovery.POST(request('discovery',{start:day,end}));body=await response.json();assert.equal(response.status,200);assert.equal(body.events[0].id,event.id);assert.equal(body.eventRadiusKm,15);
 assert.equal(localReads,0,'Desktop must not require local map keys');
 let before=remoteCalls.length;response=await discovery.POST(request('discovery',{start:day,end,coordinates:{latitude:31,longitude:121}}));body=await response.json();assert.equal(body.center,'current');assert.equal(body.events[0].id,'official-event');assert.equal(remoteCalls.length,before,'Explicit coordinates use public calendar reads without the remote property bridge');
 const pointReads=localReads;
 response=await agent.POST(request('agent',{language:'zh'}));assert.equal(response.status,200);assert.equal(bundles.at(-1).weather[0],weather);assert.equal(bundles.at(-1).events[0],event);assert.equal(bundles.at(-1).anchors[0],anchor);assert.equal(localReads,pointReads);assert(remoteCalls.some(call=>call.days===16),'Diagnosis retains the 16-day weather window');
 let inputs=await assistant.decisionInputs(account(),metrics,['events'],new AbortController().signal);assert.equal(inputs.events[0],event);
 weatherFails=true;await agent.POST(request('agent',{}));assert.equal(bundles.at(-1).weather.length,0);assert.equal(bundles.at(-1).events[0],event);assert.equal(bundles.at(-1).anchors[0],anchor);assert.equal(bundles.at(-1).sources.find(s=>s.id==='weather').coverage.kind,'none');
 body=await (await nearby.GET(request('nearby?start='+day))).json();assert.equal(body.weather.status,'unavailable');assert.deepEqual(body.weather.days,[]);
 weatherFails=false;eventsFail=true;await agent.POST(request('agent',{}));assert.equal(bundles.at(-1).weather[0],weather);assert.equal(bundles.at(-1).events.length,0);assert.equal(bundles.at(-1).anchors[0],anchor);
 response=await discovery.POST(request('discovery',{start:day,end}));assert.equal(response.status,409);inputs=await assistant.decisionInputs(account(),metrics,['events'],new AbortController().signal);assert.equal(inputs.events,undefined);
 eventsFail=false;accountId='account-b';await discovery.POST(request('discovery',{start:day,end}));assert.equal(remoteCalls.at(-1).account.propertyId,'account-b');
 signedIn=false;before=remoteCalls.length;assert.equal((await nearby.GET(request('nearby?start='+day))).status,401);assert.equal((await discovery.POST(request('discovery',{start:day,end}))).status,401);assert.equal(remoteCalls.length,before);signedIn=true;
 profileFails=true;assert.equal((await nearby.GET(request('nearby?start='+day))).status,503);assert.equal((await discovery.POST(request('discovery',{start:day,end}))).status,503);profileFails=false;
 accountId='account-a';await agent.POST(request('agent',{}));const desktopFingerprint=fingerprints.at(-1);desktop=false;before=remoteCalls.length;
 body=await (await nearby.GET(request('nearby?start='+day))).json();assert.equal(body.weather.days[0].code,0);body=await (await discovery.POST(request('discovery',{start:day,end}))).json();assert.equal(body.events[0].id,'official-event');
 inputs=await assistant.decisionInputs(account(),metrics,['events'],new AbortController().signal);assert.equal(inputs.events[0].id,'official-event');
 await agent.POST(request('agent',{}));assert.notEqual(fingerprints.at(-1),desktopFingerprint);assert.equal(remoteCalls.length,before,'Web path never uses remote helper');
 desktop=true;demo=true;body=await (await nearby.GET(request('nearby?start='+day))).json();assert.equal(body.weather.source.authority,'internal');assert.equal(remoteCalls.length,before,'Demo weather remains explicitly simulated');
 body=await (await discovery.POST(request('discovery',{start:day,end}))).json();assert.equal(body.events[0].id,'local-event');
 inputs=await assistant.decisionInputs(account(),metrics,['events'],new AbortController().signal);assert.equal(inputs.events[0].id,'local-event');
 await agent.POST(request('agent',{}));assert.equal(bundles.at(-1).events[0].id,'local-event');assert.equal(remoteCalls.length,before,'Demo activities, assistant and diagnosis stay on their existing local path');assert.notEqual(fingerprints.at(-1),desktopFingerprint);
 console.log('PASS desktop signal integration: weather/events UI routes, 16-day diagnosis, original account/address, independent source failure, preserved market anchors, assistant evidence, coordinate branch, auth/profile failures, web/demo isolation and desktop cache fingerprint. No external network, models or production writes.');
})().catch(error=>{console.error(error);process.exitCode=1});
