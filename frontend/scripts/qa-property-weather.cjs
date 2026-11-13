// Isolated property-center and weather-route regression. No environment-file loading or live services.
const assert=require('node:assert/strict'),fs=require('node:fs'),Module=require('node:module'),path=require('node:path'),ts=require('typescript');
const source=path.resolve(__dirname,'../src'),today='2026-11-11',fixedTime=Date.parse(today+'T04:00:00Z');
const RealDate=global.Date,previousFetch=global.fetch;
global.Date=class extends RealDate {
 constructor(...args){super(...(args.length?args:[fixedTime]));}
 static now(){return fixedTime;}
};
const shift=offset=>new RealDate(RealDate.parse(today+'T00:00:00Z')+offset*86400000).toISOString().slice(0,10);
const demoAddress='江苏省苏州市太仓市娄江新城 · 西浦北里（虚构演示地址）';
const envKeys=['AMAP_MAPS_API_KEY','STAYCRAFT_SAMPLE_LIVE_AMAP','DEMO_LOGIN_EMAIL','STAYCRAFT_DESKTOP_DEMO','STAYCRAFT_DESKTOP_GUIDED_DEMO'];
const previousEnv=Object.fromEntries(envKeys.map(key=>[key,process.env[key]]));
const requests=[],scopes=[],unexpectedRequests=[],cases=[];
let address='北京市真实测试地址',email='owner@example.invalid',sample=false,signedIn=true,profileError=false;
let geocode='116.4,39.9',mapFailure=false,weatherMode='normal';
class WorkspaceError extends Error {constructor(code,status){super(code);this.status=status;}}
const workspace={
 async verifiedProperty(){
  if(!signedIn)throw new WorkspaceError('sign_in_required',401);
  return {propertyId:'owned-property',user:{email},supabase:{from(table){
   assert.equal(table,'property_details');
   return {select(columns){
    assert.equal(columns,'profile');
    return {eq(key,value){
     assert.deepEqual([key,value],['property_id','owned-property']);scopes.push(value);
     return {maybeSingle:async()=>({error:profileError?{message:'offline'}:null,data:{profile:{name:'测试民宿',location:address,roomCount:'',breakfast:'',checkin:'',notes:''}}})};
    }};
   }};
  }}};
 },
 WorkspaceError,
 workspaceFailure:error=>Response.json({error:error.message},{status:error.status??503,headers:{'Cache-Control':'private, no-store'}}),
};
const cache=new Map([[path.join(source,'lib/operator-sample.ts'),{operatorSample:()=>sample,isDemoWorkspace:value=>sample||Boolean(process.env.DEMO_LOGIN_EMAIL&&value?.trim().toLowerCase()===process.env.DEMO_LOGIN_EMAIL.trim().toLowerCase())}]]);
function load(file){
 if(cache.has(file))return cache.get(file);
 const mod=new Module(file);
 mod.require=name=>{
  if(name==='@/lib/workspace-access')return workspace;
  if(name==='@/lib/desktop-external-signals')return {desktopSignalsEnabled:()=>false};
  if(name.startsWith('@/'))return load(path.join(source,name.slice(2))+'.ts');
  if(name.startsWith('.'))return load(path.resolve(path.dirname(file),name)+'.ts');
  throw Error('Unexpected dependency '+name);
 };
 mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);
 cache.set(file,mod.exports);return mod.exports;
}
const {propertyPoint,demoPropertyPoint}=load(path.join(source,'lib/property-location.ts'));
const {GET}=load(path.join(source,'app/api/workspace/nearby/route.ts'));
global.fetch=async(url,options)=>{
 const target=new URL(url);requests.push(target);
 assert(options.signal instanceof AbortSignal);
 if(target.origin==='https://mcp.amap.com'){
  assert.equal(target.searchParams.get('key'),'isolated-test-key');
  const {params:{name,arguments:args}}=JSON.parse(options.body);
  assert.equal(name,'maps_geo');assert.equal(args.address,address);
  if(mapFailure)return new Response(null,{status:503});
  return Response.json({result:{content:[{type:'text',text:JSON.stringify({geocodes:[{location:geocode}]})}]}});
 }
 if(target.origin==='https://api.open-meteo.com'){
  assert.equal(target.searchParams.get('timezone'),'Asia/Shanghai');
  assert.equal(options.cache,'no-store');
  if(weatherMode==='failure')return new Response(null,{status:503});
  if(weatherMode==='throw')throw new Error('isolated weather failure');
  if(weatherMode==='invalid')return Response.json({daily:{time:[today],weather_code:[]}});
  const count=Number(target.searchParams.get('forecast_days'));
  const offsets=weatherMode==='gapped'?[0,1,2,3,5,6,8]:Array.from({length:count},(_,i)=>i);
  return Response.json({daily:{time:offsets.map(shift),weather_code:offsets.map(()=>0),temperature_2m_min:offsets.map(i=>10+i),temperature_2m_max:offsets.map(i=>20+i),precipitation_probability_max:offsets.map(i=>i)}});
 }
 unexpectedRequests.push(String(url));throw Error('Unexpected network');
};
async function nearby(query=''){
 const response=await GET(new Request('http://localhost/api/workspace/nearby'+query));
 assert.equal(response.headers.get('cache-control'),'private, no-store');
 return {status:response.status,body:await response.json()};
}
const forecastRequests=()=>requests.filter(url=>url.origin==='https://api.open-meteo.com');
const mapRequests=()=>requests.filter(url=>url.origin==='https://mcp.amap.com');
(async()=>{
 delete process.env.DEMO_LOGIN_EMAIL;delete process.env.AMAP_MAPS_API_KEY;delete process.env.STAYCRAFT_SAMPLE_LIVE_AMAP;
 assert.equal(demoPropertyPoint(demoAddress,'demo@example.invalid'),null);
 process.env.DEMO_LOGIN_EMAIL='  DEMO@example.invalid ';
 assert.equal(demoPropertyPoint(demoAddress,email),null);
 assert.equal(demoPropertyPoint(demoAddress),null);
 assert.equal(demoPropertyPoint(address,'demo@example.invalid'),null);
 assert.deepEqual(demoPropertyPoint(demoAddress,' Demo@example.invalid '),{latitude:31.43,longitude:121.11});
 process.env.DEMO_LOGIN_EMAIL='';
 assert.equal(demoPropertyPoint(demoAddress,'demo@example.invalid'),null);
 cases.push('Only the configured demo identity with the specific fictional address gets its fixed center');
 assert.equal(await propertyPoint(address,email),null);
 assert.equal(await propertyPoint('',email),null);assert.equal(requests.length,0);
 sample=true;
 assert.deepEqual(demoPropertyPoint(demoAddress,email),{latitude:31.43,longitude:121.11});
 process.env.AMAP_MAPS_API_KEY='isolated-test-key';
 assert.equal(await propertyPoint(address,email),null,'Isolated sample must not silently opt in to map calls');
 process.env.STAYCRAFT_SAMPLE_LIVE_AMAP='1';
 assert.deepEqual(await propertyPoint(address,email),{latitude:39.9,longitude:116.4});
 sample=false;
 mapFailure=true;await assert.rejects(propertyPoint(address,email),/amap_unavailable/);mapFailure=false;
 geocode='unknown';await assert.rejects(propertyPoint(address,email),/amap_location_unknown/);geocode='116.4,39.9';
 cases.push('Missing address/key, isolated map opt-in, and invalid/failed geocoding never borrow demo coordinates');
 requests.length=0;
 let response=await nearby('?propertyId=another-property&coordinates=31.43,121.11');
 assert.equal(response.status,200);assert.equal(response.body.center,'property');assert.equal(response.body.centerLabel,address);
 assert.equal(response.body.weather.status,'available');assert.deepEqual(response.body.weather.days.map(day=>day.date),Array.from({length:7},(_,i)=>shift(i)));
 assert.equal(mapRequests().length,1);
 assert.equal(forecastRequests()[0].searchParams.get('latitude'),'39.9');assert.equal(forecastRequests()[0].searchParams.get('longitude'),'116.4');
 cases.push('Authenticated property address supplies weather coordinates and user-controlled query scope is ignored');
 requests.length=0;
 response=await nearby('?start='+shift(3)+'&days=4');
 assert.deepEqual(response.body.weather.days.map(day=>day.date),[3,4,5,6].map(shift));
 assert.equal(forecastRequests()[0].searchParams.get('forecast_days'),'7');
 response=await nearby('?start='+shift(-3)+'&days=2');
 assert.deepEqual(response.body.weather.days.map(day=>day.date),[today,shift(1)]);
 requests.length=0;
 response=await nearby('?start='+shift(15)+'&days=7');
 assert.deepEqual(response.body.weather.days.map(day=>day.date),[shift(15)]);
 assert.equal(forecastRequests()[0].searchParams.get('forecast_days'),'16');
 requests.length=0;
 response=await nearby('?start='+shift(16)+'&days=7');
 assert.equal(response.body.weather.status,'unavailable');assert.deepEqual(response.body.weather.days,[]);assert.equal(requests.length,0);
 cases.push('Requested dates are clipped to today and the 16-day horizon, without fetching beyond that horizon');
 for(const query of ['?start=2026-13-01','?start=2026-11-31','?days=0','?days=8','?days=1.5','?days=abc']){
  const before=requests.length;response=await nearby(query);assert.equal(response.status,400,query);assert.equal(requests.length,before);
 }
 cases.push('Invalid dates and noninteger/out-of-range day counts are rejected before network access');
 delete process.env.AMAP_MAPS_API_KEY;address=demoAddress;email='owner@example.invalid';
 process.env.DEMO_LOGIN_EMAIL='demo@example.invalid';
 response=await nearby();assert.equal(response.body.weather.status,'unavailable');assert.deepEqual(response.body.weather.days,[]);
 email='demo@example.invalid';requests.length=0;
 response=await nearby();assert.equal(response.body.weather.status,'available');assert.equal(mapRequests().length,0);
 assert.equal(forecastRequests().length,0);assert.equal(response.body.weather.source.authority,'internal');
 email='owner@example.invalid';address='';
 response=await nearby();assert.equal(response.body.weather.status,'unavailable');assert.deepEqual(response.body.weather.days,[]);
 address='北京市真实测试地址';process.env.AMAP_MAPS_API_KEY='isolated-test-key';mapFailure=true;
 response=await nearby();assert.equal(response.body.weather.status,'unavailable');assert.deepEqual(response.body.weather.days,[]);mapFailure=false;
 for(const mode of ['failure','throw','invalid']){
  weatherMode=mode;response=await nearby();assert.equal(response.body.weather.status,'unavailable');assert.deepEqual(response.body.weather.days,[]);assert.equal(response.body.weather.source.coverage.kind,'none');
 }
 weatherMode='normal';
 cases.push('Missing/failed centers and weather failures return empty fresh results after previous successful responses');
 profileError=true;const before=requests.length;
 response=await nearby();assert.equal(response.status,503);assert.equal(response.body.error,'profile_unavailable');assert.equal(requests.length,before);profileError=false;
 signedIn=false;const readsBefore=scopes.length;
 response=await nearby();assert.equal(response.status,401);assert.equal(scopes.length,readsBefore);assert.equal(requests.length,before);signedIn=true;
 assert(scopes.every(value=>value==='owned-property'));assert.deepEqual(unexpectedRequests,[]);
 cases.push('Profile failure and failed authentication prevent source access and preserve the owned property scope');
 weatherMode='gapped';
 response=await nearby('?start='+shift(3)+'&days=4');
 assert.deepEqual(response.body.weather.days.map(day=>day.date),[3,5,6].map(shift),'A missing provider date must not pull a later date outside the requested range into the result');
 cases.push('Sparse provider dates stay inside the requested date window');
 process.env.STAYCRAFT_DESKTOP_DEMO='1';process.env.STAYCRAFT_DESKTOP_GUIDED_DEMO='1';const beforeLocal=requests.length;response=await nearby();assert.equal(response.body.weather.days.length,7);assert.equal(response.body.weather.days[0].date,today);assert.equal(requests.length,beforeLocal);cases.push('Isolated desktop weather supplies seven local dates without an external request');
 console.log(JSON.stringify({passed:cases.length,cases},null,2));
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>{
 global.fetch=previousFetch;global.Date=RealDate;
 for(const key of envKeys){if(previousEnv[key]===undefined)delete process.env[key];else process.env[key]=previousEnv[key];}
});
