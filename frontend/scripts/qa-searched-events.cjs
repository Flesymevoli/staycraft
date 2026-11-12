// General search-to-event flow: entirely mocked providers, no live API or model calls.
const assert=require('node:assert/strict'),path=require('node:path'),Module=require('node:module');
const {buildSync}=require('esbuild');
const root=path.resolve(__dirname,'..');
const compiled=buildSync({entryPoints:[path.join(root,'src/lib/signals/searched-events.ts')],bundle:true,platform:'node',format:'cjs',write:false,packages:'external',logLevel:'silent'}).outputFiles[0].text;
function load(){const mod=new Module(path.join(__dirname,'searched-events-memory.cjs'));mod.paths=Module._nodeModulePaths(root);mod._compile(compiled,mod.id);return mod.exports}
let checks=0;const equal=(a,b,label)=>{assert.deepEqual(a,b,label);checks++};const check=(value,label)=>{assert(value,label);checks++};
const now=new Date('2026-11-12T06:00:00Z'),window={start:'2026-11-13',end:'2026-11-25'};
const chengdu={latitude:30.66,longitude:104.03},qingdao={latitude:36.07,longitude:120.38};
const page=(title,address,extra={})=>({title,url:'https://calendar.example/'+encodeURIComponent(title),snippet:'发现候选摘要',rerank_score:2.5,site_name:'活动发布页',date:'2026-11-12',content:`时间：2026年11月14日—11月20日\n地点：${address}`,...extra});
const response=results=>Response.json({results});
function input(extra={}){return {location:'四川省成都市青羊区青华路37号某民宿',center:chengdu,window,now,key:'fixture-search-key',signal:new AbortController().signal,...extra}}
(async()=>{
 const {fetchSearchedEvents,eventSearchArea}=load();let searches=[],maps=[];
 const fetcher=async(url,options)=>{equal(url,'https://api.deepseek.com/v1/tools/search');const body=JSON.parse(options.body);searches.push(body);check(body.need_content===true,'full content requested');check(!body.query.includes('青华路')&&!body.query.includes('民宿'),'private street and name stay out of search');return response([page('成都秋季艺术展','成都市青羊区青华路37号')])};
 const resolveVenue=async address=>{maps.push(address);return chengdu};
 let result=await fetchSearchedEvents(input({fetcher,resolveVenue}));equal(result.events.length,1,'previously unadapted Chengdu works through generic prose');equal(result.events[0].distanceKm,0);equal(result.events[0].start,'2026-11-14');equal(result.events[0].observedAt,now.toISOString());equal(searches.length,1);equal(maps.length,1);
 result=await fetchSearchedEvents(input({fetcher,resolveVenue,now:new Date(now.getTime()+10*60000),center:{latitude:30.67,longitude:104.03}}));equal(searches.length,1,'same district/window reuses page cache');check(result.events[0].distanceKm>0,'distance recalculated for new property center');equal(result.events[0].observedAt,now.toISOString(),'cached page observation is not relabeled as fresh');
 result=await fetchSearchedEvents(input({fetcher,resolveVenue,center:{latitude:31.3,longitude:104.03}}));equal(result.events.length,0,'cached page cannot carry nearby status to a distant center');
 await fetchSearchedEvents(input({fetcher,resolveVenue,now:new Date(now.getTime()+31*60000)}));equal(searches.length,2,'cache expires after thirty minutes');
 const qfetch=async(_url,options)=>{const body=JSON.parse(options.body);check(body.query.includes('青岛市市南区')&&!body.query.includes('成都'),'changed district changes search query');return response([page('青岛海边音乐会','青岛市市南区香港中路8号')])};
 result=await fetchSearchedEvents(input({location:'山东省青岛市市南区香港中路8号',center:qingdao,fetcher:qfetch,resolveVenue:async()=>qingdao}));equal(result.events.length,1);check(result.events[0].title.includes('青岛')&&!result.events.some(event=>event.title.includes('成都')),'old-city results never leak');
 equal(eventSearchArea(' 四川省 成都市青羊区 青华路３７号 '),'四川省成都市青羊区');equal(eventSearchArea('街边民宿'),'');
 equal(eventSearchArea('广西壮族自治区南宁市青秀区民族大道1号'),'广西壮族自治区南宁市青秀区');
 equal(eventSearchArea('新疆维吾尔自治区乌鲁木齐市天山区人民路1号'),'新疆维吾尔自治区乌鲁木齐市天山区');
 equal(eventSearchArea('江苏省苏州市太仓市娄江新城某民宿'),'江苏省苏州市太仓市','county-level city stays within the query area');
 equal(eventSearchArea('杭州市南山路138号阳光小区'),'杭州市','street and building never enter public search');
 equal(eventSearchArea('杭州市南山路阳光小区'),'杭州市','a residential compound is not an administrative district');
 const localVenue=load();let venueQuery='';
 result=await localVenue.fetchSearchedEvents(input({location:'山东省青岛市市南区香港中路8号',center:qingdao,fetcher:async()=>response([page('广场活动','市南区音乐广场')]),resolveVenue:async address=>{venueQuery=address;return qingdao}}));
 equal(venueQuery,'山东省青岛市市南区 市南区音乐广场','bare venue is geocoded within the searched area');equal(result.events.length,1);
 const months=load();let query='';
 await months.fetchSearchedEvents(input({window:{start:'2026-11-25',end:'2026-12-10'},fetcher:async(_url,options)=>{query=JSON.parse(options.body).query;return response([])},resolveVenue}));
 check(query.includes('2026年11月')&&query.includes('2026年12月'),'one cross-month search covers both months');

 const bounded=load();let geoCount=0;
 const blocks=Array.from({length:8},(_,i)=>`## 测试音乐会${i}\n活动时间：2026-11-14\n活动地点：成都市青羊区测试路${i}号`).join('\n\n');
 result=await bounded.fetchSearchedEvents(input({fetcher:async()=>response([page('八个候选','unused',{content:blocks})]),resolveVenue:async()=>{geoCount++;return chengdu}}));equal(geoCount,5,'geocoding has a five-venue upper bound');equal(result.events.length,5,'unlocated candidates are not nearby facts');

 const duplicate=load();geoCount=0;
 result=await duplicate.fetchSearchedEvents(input({fetcher:async()=>response([page('秋日音乐会','成都市青羊区青华路37号',{url:'https://first.example/a'}),page('秋日 音乐会！','成都市青羊区青华路37号',{url:'https://second.example/b'})]),resolveVenue:async()=>{geoCount++;return chengdu}}));equal(result.events.length,1,'cross-source title punctuation duplicates merge by date and geocoded venue');equal(geoCount,1,'shared venue is geocoded once');

 const sparse=load();geoCount=0;
 result=await sparse.fetchSearchedEvents(input({fetcher:async()=>response([page('只有摘要','成都市青羊区青华路37号',{content:'',snippet:'活动时间：2026-11-14\n活动地点：成都市青羊区青华路37号'}),page('只有发布日期','成都市青羊区青华路37号',{content:'活动地点：成都市青羊区青华路37号',date:'2026-11-14'})]),resolveVenue:async()=>{geoCount++;return chengdu}}));equal(result.events.length,0,'snippets and publication dates never become event evidence');equal(geoCount,0,'no geocoding for insufficient evidence');

 const retry=load();let attempts=0;
 const flaky=async()=>{attempts++;return attempts===1?new Response(null,{status:503}):response([page('恢复后活动','成都市青羊区青华路37号')])};
 await assert.rejects(retry.fetchSearchedEvents(input({fetcher:flaky,resolveVenue})),/search_unavailable/);checks++;
 result=await retry.fetchSearchedEvents(input({fetcher:flaky,resolveVenue}));equal(attempts,2,'failed search is not cached');equal(result.events.length,1,'successful retry supplies fresh records');
 const bad=load();attempts=0;
 const malformed=async()=>{attempts++;return attempts===1?Response.json({wrong:true}):response([page('结构恢复活动','成都市青羊区青华路37号')])};
 await assert.rejects(bad.fetchSearchedEvents(input({fetcher:malformed,resolveVenue})),/invalid_search_response/);checks++;
 result=await bad.fetchSearchedEvents(input({fetcher:malformed,resolveVenue}));equal(attempts,2,'invalid search payload cannot poison cache');equal(result.events.length,1);
 const failedMap=load();attempts=0;
 const once=async()=>{attempts++;return response([page('定位恢复活动','成都市青羊区青华路37号')])};
 result=await failedMap.fetchSearchedEvents(input({fetcher:once,resolveVenue:async()=>{throw Error('map offline')}}));equal(result.events.length,0);
 result=await failedMap.fetchSearchedEvents(input({fetcher:once,resolveVenue}));equal(result.events.length,1,'failed geocoding is retried against cached page evidence');equal(attempts,1);
 console.log(`PASS ${checks} generic event search-flow checks. Mock search/geocoding only; no network, model or database writes.`);
})().catch(error=>{console.error(error);process.exitCode=1});
