// No external services or writes: source modules run against in-memory history and storage.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
const root=path.resolve(__dirname,'../src');
const cache=new Map();
let demo=true,collected=null,rows=[],dbError=null,propertyId='owner-a',filters=[],location='苏州地址';
class WorkspaceError extends Error {constructor(message,status){super(message);this.status=status;}}
const stubs={
 '@/lib/workspace-access':{
  requireSameOrigin(request){if(request.headers.get('origin')!=='http://localhost')throw new WorkspaceError('origin',403);},
  boundedBody:request=>request.arrayBuffer(),WorkspaceError,
  workspaceFailure:error=>Response.json({error:error.message},{status:error.status||500}),
  verifiedProperty:async()=>({propertyId,user:{email:'account-1@example.invalid'},supabase:{
   rpc:async()=>({error:null,data:{inventory:{}}}),
   from(table){if(table==='property_details')return {select(){return this;},eq(key,value){filters.push([key,value]);return this;},async maybeSingle(){return {data:{profile:{location}}};}};assert.equal(table,'market_quote_batches');return {
    select(){return this;},eq(key,value){filters.push([key,value]);return this;},order(){return this;},
    limit(){return this;},abortSignal:async()=>({data:rows,error:dbError}),
   };},
  }}),
 },
 '@/lib/property-inventory':{validateInventory:()=>({rooms:[],types:[]})},
 '@/lib/operator-sample':{operatorSample:()=>demo,isDemoWorkspace:()=>demo},
 '@/lib/market/collected':{readCollectedSnapshot:()=>collected},
};
function load(file){
 if(cache.has(file))return cache.get(file);
 const module={exports:{}};cache.set(file,module.exports);
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 const localRequire=name=>{
  if(stubs[name])return stubs[name];
  if(name.startsWith('@/')&&name.endsWith('.json'))return require(path.join(root,name.slice(2)));
  if(name.startsWith('@/'))return load(path.join(root,name.slice(2))+'.ts');
  if(name.startsWith('.')){
   const absolute=path.resolve(path.dirname(file),name);
   return stubs['@/'+path.relative(root,absolute).split(path.sep).join('/')]||load(absolute+'.ts');
  }
  return require(name);
 };
 new Function('require','module','exports',code)(localRequire,module,module.exports);
 cache.set(file,module.exports);return module.exports;
}
const lib=name=>load(path.join(root,'lib/market',name+'.ts'));
const {collectedSnapshot}=lib('collected');
const {marketDates,marketRows,dailyMedian}=lib('presentation');
const {buildMarketSample}=lib('sample');
let checks=0;
function eq(actual,expected,label){assert.deepEqual(actual,expected,label);checks++;}
const obs=(over={})=>({hotelId:'1',hotelName:'同名民宿',sourceUrl:'https://hotels.ctrip.com/hotels/1.html',authScope:'anonymous',capturedAt:'2026-11-11T02:00:00Z',stayDate:'2026-11-12',amount:200,currency:'CNY',kind:'calendar_reference',status:'observed',rooms:1,adults:2,children:0,nights:1,...over});
let snapshot=collectedSnapshot([obs({capturedAt:'2026-11-10T02:00:00Z',amount:180}),obs(),obs(),obs({hotelId:'2',sourceUrl:'https://hotels.ctrip.com/hotels/2.html',amount:300})]);
eq(snapshot.quotes.length,2,'duplicates cannot inflate the snapshot');
eq(snapshot.hotels,2,'same names with separate IDs are separate properties');
eq(snapshot.quotes[0].priceChange,{amount:20,previousPrice:180,previousCapturedAt:'2026-11-10T02:00:00Z'},'same-date prior capture supports change');
eq(JSON.stringify(snapshot).includes('authScope'),false,'identity scope stays server-side');
for(const previous of [obs({stayDate:'2026-11-13'}),obs({authScope:'member:00000000-0000-4000-8000-000000000001'}),obs({status:'missing',amount:null}),obs({adults:1})]){
 const result=collectedSnapshot([{...previous,capturedAt:'2026-11-10T02:00:00Z'},obs()]);
 eq(result.quotes[0].priceChange,undefined,'different dates/conditions or failed previous price do not create change');
}
snapshot=collectedSnapshot([null,{},obs({currency:'USD'}),obs({stayDate:'2026-99-99'}),obs({amount:-1})]);
eq(snapshot.status,'unavailable','invalid observations cannot become prices');
snapshot=collectedSnapshot([obs({capturedAt:'2026-11-11T01:40:00Z',hotelId:'2',sourceUrl:'https://hotels.ctrip.com/hotels/2.html'}),obs()],{startedAt:'2026-11-11T01:30:00Z',finishedAt:'2026-11-11T02:01:00Z'});
eq(snapshot.hotels,2,'explicit collection run retains hotels more than ten minutes apart');
eq(marketDates('2026-11-12','2026-11-18').length,7,'seven inclusive stay dates');
eq(marketDates('2026-11-12','2026-11-12').length,1,'one-date window');
eq(marketDates('2026-99-01','2026-99-02'),[],'invalid dates never throw');
eq(marketDates('2026-11-01','2026-12-01'),[],'bounded query window');
const prices=[100,200,300,800].map((amount,i)=>lib('ctrip').observationToQuote(obs({amount,hotelId:String(i+1),sourceUrl:`https://hotels.ctrip.com/hotels/${i+1}.html`})));
eq(dailyMedian(prices,'2026-11-12'),250,'even-count median interpolates middle prices');
eq(dailyMedian([...prices,{...prices[0],id:'stale',hotelId:'9',priceCny:999,status:'stale'}],'2026-11-12'),250,'stale prices excluded');
eq(dailyMedian(prices.slice(0,2),'2026-11-12'),null,'two properties do not establish a market median');
eq(marketRows(prices).length,4,'same-name properties stay separate in table');
const singleHotel=prices.map((q,i)=>({...q,hotelId:'1',stayDate:`2026-11-${12+i}`}));
eq(buildMarketSample({quotes:singleHotel,window:{start:'2026-11-12',end:'2026-11-15'}}).comparability,'none','four dates of one hotel do not form a competitive range');

const {POST}=load(path.join(root,'app/api/workspace/market/sample/route.ts'));
const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai'}).format(new Date());
const request=async(start=today,end=start,origin='http://localhost')=>{
 const response=await POST(new Request('http://localhost/api/workspace/market/sample',{method:'POST',headers:{origin},body:JSON.stringify({start,end,propertyId:'attacker-chosen'})}));
 return {status:response.status,body:await response.json()};
};
(async()=>{
 collected=collectedSnapshot([obs()]);
 let result=await request('2099-01-01');
 eq(result.body.dataMode,'collected_ctrip_snapshot','empty selected window retains real-source identity');
 eq(result.body.sample.quotes.length,0,'empty selected window never substitutes fictional data');
 collected=collectedSnapshot([]);
 result=await request();eq(result.body.snapshot.status,'unavailable','corrupt/empty collection stays unavailable');
 eq(result.body.dataMode,'collected_ctrip_snapshot','broken real data is not a fictional success');
 collected=null;result=await request();eq(result.body.dataMode,'fictional_demo','only absent local collection permits labelled demo');
 result=await request('2026-99-01');eq(result.status,400,'impossible date is bad input, not server error');
 result=await request(today,today,'http://foreign');eq(result.status,403,'origin guard retained');
 demo=false;rows=[{captured_at:obs().capturedAt,window_start:today,window_end:today,quotes:[{...prices[0],stayDate:today}]}];
 result=await request();eq(result.body.sample.quotes.length,1,'today is consistently allowed for imported and local snapshots');
 eq(filters.at(-1),['property_id','owner-a'],'client cannot choose property scope');
 eq(result.body.snapshot.locationStatus,'unknown','legacy rows remain visible with unverified location');
 rows[0].note=lib('snapshot-scope').marketScopeNote(location);
 result=await request();eq(result.body.snapshot.locationStatus,'matched','captured property address matches');
 location='杭州地址';result=await request();eq(result.body.snapshot.locationStatus,'changed','changed address marks existing quote context stale');
 eq(result.body.sample.quotes.length,1,'changed address does not delete or hide old quotes');
 propertyId='owner-b';await request();eq(filters.at(-1),['property_id','owner-b'],'next user has separate query scope');
 dbError={code:'missing_table'};rows=[];result=await request();eq(result.body.snapshot.status,'unavailable','storage error is visible and does not invoke live sampling');
 eq(result.body.sample.quotes.length,0,'storage failure has no invented prices');
 console.log(JSON.stringify({passed:checks,network:'none',writes:'none'}));
})().catch(error=>{console.error(error);process.exitCode=1;});
