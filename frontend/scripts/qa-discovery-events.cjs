// Activity-only route regression. No live account, database or network.
const assert=require('node:assert/strict'),fs=require('node:fs'),Module=require('node:module'),path=require('node:path'),ts=require('typescript');
const source=path.resolve(__dirname,'../src'),window={start:'2026-11-18',end:'2026-11-20'};
const demoAddress='江苏省苏州市太仓市娄江新城 · 西浦北里（虚构演示地址）',mapPoint='121.130745,31.453539';
const mapCalls=[],calendarCalls=[],reverseCalls=[],searchCalls=[],unexpectedRequests=[],scopes=[];
let address='真实测试地址',addressAfterGeocode,sample=false,geocode=mapPoint,mapFailure=false,calendarFailure=false,email='owner@example.invalid',signedIn=true,profileError=false,reverseAddress='',reverseFailure=false;
const envKeys=['AMAP_MAPS_API_KEY','STAYCRAFT_SAMPLE_LIVE_AMAP','DEMO_LOGIN_EMAIL','SEARCH_API_KEY','EVENT_SEARCH_ENABLED'];
const previousEnv=Object.fromEntries(envKeys.map(key=>[key,process.env[key]])),previousFetch=global.fetch;
class WorkspaceError extends Error {constructor(code,status){super(code);this.status=status;}}
const workspace={
 requireSameOrigin(request){if(request.headers.get('origin')!=='http://localhost')throw new WorkspaceError('invalid_origin',403);},
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
 boundedBody:request=>request.arrayBuffer(),WorkspaceError,
 workspaceFailure:error=>Response.json({error:error.message},{status:error.status??503,headers:{'Cache-Control':'no-store'}}),
};
const cache=new Map([[path.join(source,'lib/operator-sample.ts'),{operatorSample:()=>sample,isDemoWorkspace:mail=>sample||!!process.env.DEMO_LOGIN_EMAIL&&mail===process.env.DEMO_LOGIN_EMAIL}]]);
function load(file){
 if(cache.has(file))return cache.get(file);
 const mod=new Module(file);
 mod.require=name=>{
  if(name==='@/lib/workspace-access')return workspace;
  if(name==='@/lib/desktop-external-signals')return {desktopSignalsEnabled:()=>false};
  if(name.startsWith('@/'))return load(path.join(source,name.slice(2))+'.ts');
  if(name.startsWith('.'))return load(path.resolve(path.dirname(file),name)+'.ts');
  throw new Error('Unexpected dependency '+name);
 };
 mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);
 cache.set(file,mod.exports);return mod.exports;
}
const {POST}=load(path.join(source,'app/api/workspace/discovery/route.ts'));
global.fetch=async(url,options)=>{
 const target=new URL(String(url));
 if(target.origin==='https://restapi.amap.com'&&target.pathname==='/v3/geocode/regeo'){
  assert.equal(target.searchParams.get('key'),'isolated-test-key');assert.equal(options.redirect,'manual');
  reverseCalls.push(target.searchParams.get('location'));
  return reverseFailure?new Response(null,{status:503}):Response.json({status:'1',regeocode:{formatted_address:reverseAddress}});
 }
 if(String(url)==='https://api.deepseek.com/v1/tools/search'){
  assert.equal(options.headers.Authorization,'Bearer isolated-search-key');
  searchCalls.push(JSON.parse(options.body));return Response.json({results:[]});
 }
 if(['https://www.namoc.cn/namoc/zhanlan/zl_list.shtml','https://www.zjam.org.cn/Site/Exbition/ExbitionList.aspx?type=1'].includes(String(url))){
  calendarCalls.push(String(url));assert.equal(options.method,'GET');assert.equal(options.credentials,'omit');assert.equal(options.redirect,'manual');assert.deepEqual(Object.keys(options.headers),['Accept']);
  if(calendarFailure)return new Response(null,{status:503});
  const html=String(url).includes('namoc.cn')?`<ul id="zlhglb"><li><h3><a href="/namoc/zhanlan/202611/${'a'.repeat(32)}.shtml" title="隔离北京测试展">测试</a></h3><p>展览时间：2026-11-18至2026-11-20</p><p>展览场地：1号厅</p></li></ul>`
   :'<table id="dlExbition">'+[['2918','2026/11/1','2026/11/21'],['2917','2026/11/3','2026/11/15']].map(([id,start,end])=>`<tr><td><a href="ExbitionDetail.aspx?etid=${id}&amp;type=1" title="隔离杭州测试展${id}"><h3>测试</h3></a><p>展览时间：${start} 至 ${end}<br>展厅：1号厅<br>展览联系方式：000</p></td></tr>`).join('')+'</table>';
  return new Response(html.replace(/[^\x00-\x7F]/g,char=>'&#'+char.charCodeAt(0)+';'),{headers:{'Content-Type':'text/html'}});
 }
 if(String(url)!=='https://mcp.amap.com/mcp?key=isolated-test-key'){unexpectedRequests.push(String(url));throw Error('Unexpected network');}
 const {params:{name,arguments:args}}=JSON.parse(options.body);mapCalls.push({name,args});
 assert.equal(name,'maps_geo','Activity discovery must not request POIs');
 if(mapFailure)return new Response(null,{status:503});
 if(addressAfterGeocode){address=addressAfterGeocode;addressAfterGeocode=undefined;}
 return Response.json({result:{content:[{type:'text',text:JSON.stringify({geocodes:[{location:geocode}]})}]}});
};
async function discover(overrides={},origin='http://localhost'){
 const response=await POST(new Request('http://localhost/api/workspace/discovery',{method:'POST',headers:{Origin:origin},body:JSON.stringify({...window,...overrides})}));
 assert.equal(response.headers.get('cache-control'),'no-store');
 const body=await response.json();assert(!Object.hasOwn(body,'places'));assert(!Object.hasOwn(body,'results'));
 return {status:response.status,body};
}
(async()=>{
 process.env.AMAP_MAPS_API_KEY='isolated-test-key';delete process.env.SEARCH_API_KEY;delete process.env.EVENT_SEARCH_ENABLED;
 delete process.env.STAYCRAFT_SAMPLE_LIVE_AMAP;delete process.env.DEMO_LOGIN_EMAIL;
 let response=await discover();
 assert.equal(response.status,200);assert.equal(response.body.provider,'official_calendar');
 assert.equal(response.body.location,address);assert.equal(response.body.center,'property');assert.equal(response.body.eventRadiusKm,15);
 assert.equal(response.body.events.length,4);assert.equal(response.body.eventSource.authority,'public');assert.equal(response.body.eventSource.coverage.kind,'partial');
 assert(response.body.events.every(event=>event.verified&&event.source.observedAt===response.body.eventSource.observedAt));
 assert.equal(mapCalls.length,1);assert.equal(response.body.events.find(event=>event.id==='tc-2026-11-artist-solo').distanceKm,0);
 addressAfterGeocode='已修改的新地址';response=await discover();assert.equal(response.status,409);assert.equal(response.body.error,'property_location_changed');assert.equal(response.body.events,undefined,'old address activities never returned under changed profile');address='真实测试地址';
 mapCalls.length=0;
 response=await discover({coordinates:{latitude:31.456,longitude:121.125}});
 assert.equal(response.body.center,'current');assert.equal(response.body.events.length,4);assert.equal(mapCalls.length,0);
 response=await discover({start:'2026-11-11',end:'2026-11-14',coordinates:{latitude:30.233414,longitude:120.152256}});
 assert.equal(response.status,200);
 assert.deepEqual(response.body.events.map(event=>event.id).sort(),['hz-zjam-2917','hz-zjam-2918']);
 assert(response.body.events.every(event=>event.verified&&event.distanceKm<2));
 response=await discover({start:'2026-11-22',end:'2026-11-22',coordinates:{latitude:30.233414,longitude:120.152256}});
 assert.deepEqual(response.body.events,[]);
 response=await discover({coordinates:{latitude:23.1,longitude:113.3}});
 assert.deepEqual(response.body.events,[]);assert.equal(response.body.eventSource.coverage.kind,'none');
 response=await discover({coordinates:{latitude:39.925255,longitude:116.408939}});assert.equal(response.status,200);assert.equal(response.body.events.length,1);assert(response.body.events[0].distanceKm<2);assert.match(response.body.eventSource.note,/本次已读取中国美术馆/);
 calendarFailure=true;response=await discover({start:'2026-11-11',end:'2026-11-14',coordinates:{latitude:30.233414,longitude:120.152256}});assert.equal(response.status,200);assert.equal(response.body.events.length,2);assert.match(response.body.eventSource.note,/保留原采集时间/);assert.equal(response.body.eventSource.observedAt,'2026-11-11T02:19:23.053Z');calendarFailure=false;
 assert.equal(reverseCalls.length,0,'No current-area lookup when generic search is not configured');
 process.env.SEARCH_API_KEY='isolated-search-key';address='四川省成都市武侯区人民南路18号';
 reverseAddress='广东省深圳市福田区福华路1号';response=await discover({coordinates:{latitude:22.54,longitude:114.06}});
 assert.equal(response.status,200);assert.equal(response.body.location,reverseAddress);assert.equal(response.body.center,'current');
 assert.equal(searchCalls.length,1);assert.match(searchCalls[0].query,/深圳市福田区/);assert(!searchCalls[0].query.includes('成都'),'GPS query cannot borrow the property city');
 reverseAddress='山东省青岛市市南区香港中路8号';response=await discover({coordinates:{latitude:36.07,longitude:120.38}});
 assert.equal(response.body.location,reverseAddress);assert.equal(searchCalls.length,2);assert.match(searchCalls[1].query,/青岛市市南区/);assert(!searchCalls[1].query.includes('成都')&&!searchCalls[1].query.includes('深圳'),'Moving GPS changes the search city');
 reverseFailure=true;response=await discover({start:'2026-11-11',end:'2026-11-14',coordinates:{latitude:30.233414,longitude:120.152256}});
 assert.equal(response.status,200);assert.equal(response.body.location,'当前位置');assert.equal(response.body.events.length,2,'Coordinate calendars survive reverse-geocoding failure');assert.equal(searchCalls.length,2,'Failed current-area lookup must not search the property city');
 reverseFailure=false;reverseAddress='';response=await discover({coordinates:{latitude:23.1,longitude:113.3}});
 assert.equal(response.body.location,'当前位置');assert.equal(searchCalls.length,2,'Unknown current area must not search the property city');
 sample=true;const beforeDemoReverse=reverseCalls.length;response=await discover({coordinates:{latitude:23.1,longitude:113.3}});
 assert.equal(reverseCalls.length,beforeDemoReverse);assert.equal(searchCalls.length,2,'Demo GPS never invokes generic providers');
 sample=false;delete process.env.SEARCH_API_KEY;address='真实测试地址';
 response=await discover({start:'2026-11-21',end:'2026-11-21'});
 assert.equal(response.body.events.length,3);assert(!response.body.events.some(event=>event.end<response.body.start));
 mapFailure=true;response=await discover();
 assert.equal(response.status,503);assert.equal(response.body.error,'amap_unavailable');assert.deepEqual(response.body.events,[]);
 mapFailure=false;geocode='unknown';response=await discover();
 assert.equal(response.body.error,'amap_location_unknown');assert.deepEqual(response.body.events,[]);assert.match(response.body.eventSource.note,/无法判断活动距离/);
 delete process.env.AMAP_MAPS_API_KEY;address=demoAddress;response=await discover();
 assert.equal(response.status,503,'An ordinary account cannot borrow the demo center');assert.deepEqual(response.body.events,[]);
 process.env.DEMO_LOGIN_EMAIL='demo@example.invalid';email='demo@example.invalid';response=await discover();
 assert.equal(response.status,200);assert.equal(response.body.events.length,4);assert(response.body.events.every(event=>Number.isFinite(event.distanceKm)));
 address='江苏省苏州市太仓市其他民宿';response=await discover();
 assert.equal(response.status,503);assert.deepEqual(response.body.events,[]);
 sample=true;address=demoAddress;const beforeSampleCalendars=calendarCalls.length;response=await discover();assert.equal(response.status,200);response=await discover({coordinates:{latitude:39.925255,longitude:116.408939}});assert.deepEqual(response.body.events,[]);assert.equal(calendarCalls.length,beforeSampleCalendars,'sample mode never refreshes live official calendars');
 sample=false;address='';response=await discover();assert.equal(response.status,422);
 response=await discover({coordinates:{latitude:23.1,longitude:113.3}});assert.equal(response.status,200);assert.deepEqual(response.body.events,[]);
 response=await discover({start:'2026-13-01'});assert.equal(response.status,400);
 response=await discover({coordinates:{latitude:91,longitude:0}});assert.equal(response.status,400);
 response=await discover({propertyId:'another-property'});assert.equal(response.status,400);
 response=await discover({},'https://another.invalid');assert.equal(response.status,403);
 address=demoAddress;profileError=true;response=await discover();assert.equal(response.status,503);assert.equal(response.body.error,'profile_unavailable');profileError=false;
 signedIn=false;const previousScopes=scopes.length,previousCalls=mapCalls.length;
 response=await discover();assert.equal(response.status,401);assert.equal(scopes.length,previousScopes);assert.equal(mapCalls.length,previousCalls);
 assert(scopes.every(value=>value==='owned-property'));assert.deepEqual(unexpectedRequests,[]);
 console.log('PASS activity-only discovery, radius/date/GPS, cross-city GPS search and lookup failure, demo identity/address isolation, empty failures and authentication scope; no live network');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>{
 global.fetch=previousFetch;
 for(const key of envKeys){if(previousEnv[key]===undefined)delete process.env[key];else process.env[key]=previousEnv[key];}
});
