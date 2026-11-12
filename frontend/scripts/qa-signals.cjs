// Signal/evidence layer QA: pure node assertions with stubbed fetchers, no network calls.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript'),assert=require('node:assert/strict');
function load(file){const mod=new Module(file);mod.require=name=>name.startsWith('.')?load(path.resolve(path.dirname(file),name)+'.ts'):require(name);mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);return mod.exports}
const {fetchWeather}=load(path.resolve('src/lib/signals/weather.ts')),
 {validateEvents,eventsInWindow,collectEvents,EVENT_CALENDAR}=load(path.resolve('src/lib/signals/events.ts')),
 {cityEvents}=load(path.resolve('src/lib/signals/event-catalog.ts')),
 {normalizeAnchors,summarizeAnchors}=load(path.resolve('src/lib/signals/competitors.ts')),
 {collectSignals}=load(path.resolve('src/lib/signals/index.ts'));

const NOW=new Date('2026-11-10T12:00:00+08:00'),DAY_MS=86400000,day=offset=>new Date(Date.parse('2026-11-10T00:00:00Z')+offset*DAY_MS).toISOString().slice(0,10),
 dates=[day(0),day(1),day(2)],
 json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json'}}),
 weatherBody=(times,codes,extra={})=>({daily:{time:times,weather_code:codes,...extra}}),
 quote=overrides=>({name:'西湖民宿甲',stayDate:'2026-11-19',amountCny:520,sourceType:'manual',...overrides}),
 eventBase={id:'bad-1',title:'测试活动',start:'2026-11-20',end:'2026-11-21',category:'exhibition',sourceUrl:'https://www.hangzhou.gov.cn',observedAt:'2026-11-10T09:00:00+08:00',verified:false},
 cases=[];

(async()=>{
 let seenUrl='',seenOptions=null;
 let result=await fetchWeather({latitude:30.25,longitude:120.16,days:3,now:NOW,fetcher:async(url,options)=>{seenUrl=String(url);seenOptions=options;return json(weatherBody(dates,[0,3,61],{temperature_2m_max:[22,21,19],temperature_2m_min:[14,13,12],precipitation_probability_max:[0,20,80]}))}});
 assert.deepEqual(result.days.map(item=>item.date),dates);
 assert.deepEqual(result.days.map(item=>item.code),[0,3,61]);
 assert.equal(result.days[0].tempMin,14);assert.equal(result.days[2].tempMax,19);assert.equal(result.days[1].precipProb,20);
 assert.equal(result.source.id,'weather');assert.equal(result.source.authority,'public');assert.equal(result.source.confidence,'high');
 assert.deepEqual(result.source.coverage,{from:day(0),to:day(2),kind:'complete'});
 assert.equal(result.source.observedAt,NOW.toISOString());
 assert(result.days.every(item=>item.source===result.source));
 assert(seenUrl.includes('forecast_days=3')&&seenUrl.includes('timezone=Asia%2FShanghai')&&seenUrl.includes('weather_code')&&seenUrl.includes('temperature_2m_min'));
 assert(seenOptions.signal instanceof AbortSignal);
 cases.push('weather: normal Open-Meteo parse keeps WMO code, numbers, Asia/Shanghai window and reuses one SourceRef');

 result=await fetchWeather({latitude:30.25,longitude:120.16,days:3,now:NOW,fetcher:async()=>json({reason:'down'},500)});
 assert.deepEqual(result.days,[]);assert.equal(result.source.coverage.kind,'none');assert.equal(result.source.confidence,'low');assert(result.source.note.includes('天气源暂不可用')&&result.source.note.includes('weather_http_500'));assert.equal(result.source.coverage.from,day(0));
 cases.push('weather: HTTP 500 degrades to empty days with kind=none instead of throwing');

 result=await fetchWeather({latitude:30.25,longitude:120.16,days:3,now:NOW,fetcher:async()=>{const error=new Error('timeout');error.name='TimeoutError';throw error}});
 assert.deepEqual(result.days,[]);assert.equal(result.source.coverage.kind,'none');assert(result.source.note.includes('weather_timeout'));
 let called=0;const controller=new AbortController();controller.abort();
 result=await fetchWeather({latitude:30.25,longitude:120.16,days:3,now:NOW,signal:controller.signal,fetcher:async()=>{called++;return json({})}});
 assert.deepEqual(result.days,[]);assert(result.source.note.includes('weather_cancelled'));assert.equal(called,0);
 cases.push('weather: timeout and pre-aborted signal are reported as no coverage, fetcher untouched');

 result=await fetchWeather({latitude:30.25,longitude:120.16,days:3,now:NOW,fetcher:async()=>json({daily:{time:dates,weather_code:[1,2,3]}})});
 assert.equal(result.days.length,3);assert.equal(result.days[0].tempMin,null);assert.equal(result.days[0].tempMax,null);assert.equal(result.days[0].precipProb,null);assert.notEqual(result.days[0].precipProb,0);assert.equal(result.source.coverage.kind,'complete');
 cases.push('weather: absent numeric arrays stay null, never zero');

 for(const [label,payload] of [
  ['dates not increasing',weatherBody([day(1),day(0),day(2)],[0,1,2])],
  ['impossible date',weatherBody(['2026-11-31',day(1),day(2)],[0,1,2])],
  ['code array length mismatch',weatherBody(dates,[0,1])],
  ['temperature length mismatch',weatherBody(dates,[0,1,2],{temperature_2m_min:[1,2,3,4]})],
  ['missing daily',{daily:null}],
  ['code missing',{daily:{time:dates}}]]){
  result=await fetchWeather({latitude:30.25,longitude:120.16,days:3,now:NOW,fetcher:async()=>json(payload)});
  assert.deepEqual(result.days,[],label);assert.equal(result.source.coverage.kind,'none',label);assert(result.source.note.includes('weather_invalid_structure'),label);
 }
 cases.push('weather: non-increasing/impossible dates, mismatched arrays and missing structures are rejected whole');

 seenUrl='';
 result=await fetchWeather({latitude:30.25,longitude:120.16,days:99,now:NOW,fetcher:async url=>{seenUrl=String(url);return json(weatherBody([day(0)],[0]))}});
 assert(seenUrl.includes('forecast_days=16'));assert.equal(result.source.coverage.kind,'partial');assert.equal(result.source.confidence,'medium');assert.equal(result.source.coverage.to,day(15));
 seenUrl='';
 await fetchWeather({latitude:30.25,longitude:120.16,days:0,now:NOW,fetcher:async url=>{seenUrl=String(url);return json(weatherBody([day(0)],[0]))}});
 assert(seenUrl.includes('forecast_days=1'));
 result=await fetchWeather({latitude:200,longitude:120.16,days:3,now:NOW,fetcher:async()=>{throw Error('should not fetch')}});
 assert(result.source.note.includes('weather_invalid_coordinates'));
 cases.push('weather: days clamped 1..16, partial coverage downgrades confidence, invalid coordinates skip the network');

 const catalogEntries=Object.values(cityEvents).flat().map(entry=>entry.event);
 assert(catalogEntries.length>0,'published event catalog must not be empty');
 assert.equal(new Set(catalogEntries.map(event=>event.id)).size,catalogEntries.length,'catalog event IDs must be unique');
 assert.equal(new Set(catalogEntries.map(event=>JSON.stringify([event.sourceUrl,event.title,event.start,event.end,event.venue]))).size,catalogEntries.length,'catalog must not repeat the same event under different IDs');
 assert.equal(EVENT_CALENDAR.length,catalogEntries.length,'every published catalog entry must survive event validation');
 for(const [id,region] of [['tc-2026-11-library-art','太仓'],['tc-2026-11-poetry-concert','太仓'],['hz-zjam-2918','杭州']]){
  const event=EVENT_CALENDAR.find(item=>item.id===id);
  assert(event,`missing regional regression event ${id}`);
  assert(event.venue.includes(region),`incorrect venue region for ${id}`);
 }
 assert(EVENT_CALENDAR.every(item=>item.source.id==='events'&&item.source.coverage.kind==='partial'&&Number.isFinite(Date.parse(item.observedAt))));
 assert(EVENT_CALENDAR.every(item=>item.sourceUrl.startsWith('https://')&&new URL(item.sourceUrl).hostname.length>0));
 assert.deepEqual(validateEvents(EVENT_CALENDAR),[...EVENT_CALENDAR].sort((a,b)=>a.start.localeCompare(b.start)||a.id.localeCompare(b.id)));
 const invalidEvents=[{},{...eventBase,id:''},{...eventBase,title:' '},{...eventBase,start:'2026-11-22',end:'2026-11-21'},{...eventBase,start:'2026-11-31'},{...eventBase,sourceUrl:'http://www.hangzhou.gov.cn'},{...eventBase,sourceUrl:'javascript:alert(1)'},{...eventBase,category:'unknown-category'}];
 assert.equal(validateEvents(invalidEvents).length,0);assert.equal(validateEvents([eventBase]).length,1);
 assert.equal(validateEvents([{...eventBase,category:'market'}])[0].category,'market');
 assert.deepEqual(validateEvents([{...eventBase,category:'constructor'}]),[]);
 cases.push('events: validation preserves official authority, dates, collection time, and demo distance; rejects invalid records');

 const windowEvents=eventsInWindow(validateEvents([
  {...eventBase,id:'e1',start:'2026-11-14',end:'2026-11-16'},
  {...eventBase,id:'e2',start:'2026-11-10',end:'2026-11-11'},
  {...eventBase,id:'e3',start:'2026-11-15',end:'2026-11-20'},
  {...eventBase,id:'e4',start:'2026-11-12',end:'2026-11-14'}]),{start:'2026-11-15',end:'2026-11-18'});
 assert.deepEqual(windowEvents.map(item=>item.id),['e1','e3']);
 assert.throws(()=>eventsInWindow([],{start:'2026-11-20',end:'2026-11-01'}),/event_window_invalid/);
 cases.push('events: window query keeps overlapping ranges only (boundary inclusive) and rejects inverted windows');

 let eventsResult=collectEvents({events:[],window:{start:'2026-11-18',end:'2026-11-20'},now:NOW});
 assert.deepEqual(eventsResult.events,[]);assert.equal(eventsResult.source.coverage.kind,'none');assert(eventsResult.source.note.includes('不代表'));
 eventsResult=collectEvents({window:{start:'2026-11-18',end:'2026-11-20'},now:NOW,scope:{center:{latitude:31.43,longitude:121.11}}});
 const taicangIds=new Set(eventsResult.events.map(item=>item.id));
 for(const id of ['tc-2026-11-library-art','tc-2026-11-artist-solo','tc-2026-11-youth-art','tc-2026-11-bird-flower'])assert(taicangIds.has(id),`missing Taicang overlap ${id}`);
 assert(eventsResult.events.every(event=>event.start<='2026-11-20'&&event.end>='2026-11-18'&&event.distanceKm<=15));
 assert(!eventsResult.events.some(event=>event.id.startsWith('hz-')),'Hangzhou events must not appear near Taicang');
 assert.equal(eventsResult.source.coverage.kind,'partial');assert.deepEqual(eventsResult.source.coverage,{from:'2026-11-18',to:'2026-11-20',kind:'partial'});
 assert.equal(Date.parse(eventsResult.source.observedAt),Math.max(...eventsResult.events.map(event=>Date.parse(event.observedAt))),'source timestamp reflects the latest matching event');
 assert.equal(eventsResult.source.authority,'public');assert.equal(eventsResult.source.confidence,'medium');
 assert(eventsResult.source.note.includes('日期已核实'));
 eventsResult=collectEvents({window:{start:'2026-11-27',end:'2026-11-29'},now:NOW});
 for(const id of ['tc-2026-11-bird-flower','tc-2026-11-library-art','tc-2026-11-youth-art'])assert(eventsResult.events.some(event=>event.id===id));
 assert(eventsResult.events.every(event=>event.start<='2026-11-29'&&event.end>='2026-11-27'));
 assert(!eventsResult.events.some(event=>event.id==='tc-2026-11-artist-solo'),'ended exhibition must be excluded');
 const hangzhouEvents=collectEvents({window:{start:'2026-11-11',end:'2026-11-15'},now:NOW,scope:{center:{latitude:30.231049,longitude:120.156894}}}).events;
 for(const id of ['hz-zjam-2917','hz-zjam-2918'])assert(hangzhouEvents.some(event=>event.id===id),`missing Hangzhou regression event ${id}`);
 assert(!hangzhouEvents.some(event=>event.id.startsWith('tc-')),'Taicang events must not appear near Hangzhou');
 assert.throws(()=>collectEvents({window:{start:'2026-11-20',end:'2026-11-01'}}),/event_window_invalid/);
 cases.push('events: catalog records stay valid and unique; Taicang/Hangzhou windows respect dates and geography and retain latest source metadata');

 const eventWindow={start:'2026-11-18',end:'2026-11-20'};
 const museumLatitude=31.453539,longitude=121.130745;
 const offset=distance=>distance/6371*180/Math.PI;
 const centerAt=distance=>({center:{latitude:museumLatitude-offset(distance),longitude}});
 const museumId='tc-2026-11-artist-solo';
 assert(collectEvents({window:eventWindow,scope:centerAt(14.999)}).events.some(item=>item.id===museumId&&item.distanceKm===15));
 assert(!collectEvents({window:eventWindow,scope:centerAt(15.001)}).events.some(item=>item.id===museumId));
 assert.deepEqual(collectEvents({window:eventWindow,scope:{center:null}}).events,[]);
 assert(collectEvents({window:eventWindow,scope:{center:null,demoProperty:true}}).events.every(event=>[5,6].includes(event.distanceKm)));
 assert.equal(validateEvents([eventBase,{...eventBase,id:'same-event'}]).length,1);
 cases.push('events: 15 km cutoff uses unrounded distance; missing centers omit activities, and explicit demo fallback preserves estimates');

 const observedAt='2026-11-10T12:00:00+08:00';
 let anchorResult=normalizeAnchors({observedAt,entries:[quote(),quote({amountCny:680})]});
 assert.equal(anchorResult.anchors.length,1);assert.equal(anchorResult.anchors[0].status,'conflicting');assert.equal(anchorResult.anchors[0].amountCny,null);
 assert.equal(anchorResult.source.id,'competitor');assert.equal(anchorResult.source.authority,'manual');assert.equal(anchorResult.source.confidence,'low');
 anchorResult=normalizeAnchors({observedAt,entries:[quote()]});
 assert.equal(anchorResult.anchors[0].status,'observed');assert.equal(anchorResult.anchors[0].amountCny,520);assert.equal(anchorResult.anchors[0].sourceType,'manual');assert.equal(anchorResult.anchors[0].source.coverage.kind,'partial');
 anchorResult=normalizeAnchors({observedAt,entries:[quote({amountCny:null})]});
 assert.equal(anchorResult.anchors[0].status,'missing');assert.equal(anchorResult.anchors[0].amountCny,null);
 for(const bad of [0,-5,12.5,'520',true]){anchorResult=normalizeAnchors({observedAt,entries:[quote({amountCny:bad})]});assert.equal(anchorResult.anchors[0].status,'unverified',String(bad));assert.equal(anchorResult.anchors[0].amountCny,null,String(bad))}
 anchorResult=normalizeAnchors({observedAt,entries:[quote(),quote({amountCny:520})]});
 assert.equal(anchorResult.anchors[0].status,'observed');assert.equal(anchorResult.anchors[0].amountCny,520);
 cases.push('anchors: same store/date different prices -> conflicting null; missing -> missing; invalid amounts -> unverified; duplicate equal price collapses');

 anchorResult=normalizeAnchors({observedAt,entries:[quote(),quote({stayDate:'2026-11-20'})]});
 assert.equal(anchorResult.anchors.length,2);assert.deepEqual(anchorResult.source.coverage,{from:'2026-11-19',to:'2026-11-20',kind:'partial'});assert.equal(anchorResult.source.confidence,'medium');
 anchorResult=normalizeAnchors({observedAt,entries:[{name:'',stayDate:'2026-11-19',amountCny:500},{name:'B',stayDate:'2026-11-31',amountCny:500},null,'x']});
 assert.deepEqual(anchorResult.anchors,[]);assert.equal(anchorResult.source.coverage.kind,'none');
 assert.throws(()=>normalizeAnchors({observedAt,entries:null}),/anchor_entries_required/);
 cases.push('anchors: entries without name/stayDate skipped, empty set keeps kind=none, non-array input throws for the aggregator to catch');

 const twoAnchors=normalizeAnchors({observedAt,entries:[quote(),quote({stayDate:'2026-11-20'})]}).anchors,
 summary=summarizeAnchors(twoAnchors);
 assert.deepEqual(Object.keys(summary).sort(),['conflicting','missing','note','observed']);
 assert.equal(summary.observed,2);assert.equal(summary.conflicting,0);assert.equal(summary.missing,0);assert(summary.note.includes('不做均价'));
 const single=summarizeAnchors(normalizeAnchors({observedAt,entries:[quote()]}).anchors);
 assert.equal(single.observed,1);assert(single.note.includes('样本不足，不能形成区间'));
 const mixed=summarizeAnchors(normalizeAnchors({observedAt,entries:[quote(),quote({amountCny:680}),quote({stayDate:'2026-11-20',amountCny:null}),quote({stayDate:'2026-11-21',amountCny:-1})]}).anchors);
 assert.equal(mixed.observed,0);assert.equal(mixed.conflicting,1);assert.equal(mixed.missing,1);assert(mixed.note.includes('样本不足')&&mixed.note.includes('无法判定'));
 const emptySummary=summarizeAnchors([]);
 assert.equal(emptySummary.observed,0);assert(emptySummary.note.includes('样本不足，不能形成区间'));
 cases.push('summarize: counts only, no average/range keys; <2 observed states 样本不足,空输入同义');

 let bundle=await collectSignals({latitude:31.453539,longitude:121.130745,anchorEntries:[quote()],window:{start:'2026-11-18',end:'2026-11-20'},now:NOW,fetcher:async url=>{seenUrl=String(url);return json(weatherBody(dates,[0,1,2]))}});
 assert.deepEqual(bundle.sources.map(item=>item.id),['weather','events','competitor']);
 assert.equal(bundle.weather.length,3);assert.equal(bundle.events.length,4);assert.equal(bundle.anchors.length,1);
 assert(seenUrl.includes('forecast_days=3'));assert.equal(bundle.sources[0].observedAt,NOW.toISOString());assert(bundle.weather.every(item=>item.source===bundle.sources[0]));
 cases.push('collectSignals: aggregates weather/events/anchors into one bundle with three per-source SourceRefs');

 bundle=await collectSignals({latitude:31.453539,longitude:121.130745,anchorEntries:[quote()],window:{start:'2026-11-18',end:'2026-11-20'},now:NOW,fetcher:async()=>json({},503)});
 assert.deepEqual(bundle.weather,[]);assert.equal(bundle.sources[0].coverage.kind,'none');assert(bundle.sources[0].note.includes('weather_http_503'));
 assert.equal(bundle.events.length,4);assert.equal(bundle.anchors.length,1);assert.equal(bundle.sources.length,3);
 cases.push('collectSignals: weather failure yields kind=none but events/anchors still returned');

 bundle=await collectSignals({latitude:31.453539,longitude:121.130745,anchorEntries:[],window:eventWindow,now:NOW,fetcher:async()=>json(weatherBody(dates,[0,1,2]))});
 assert.equal(bundle.events.length,4);assert.deepEqual(bundle.anchors,[]);assert.equal(bundle.sources[2].coverage.kind,'none');
 cases.push('collectSignals: an account with no anchor source still receives nearby public events and no demo quotes');

 bundle=await collectSignals({latitude:30.25,longitude:120.16,anchorEntries:null,window:{start:'2026-11-18',end:'2026-11-20'},now:NOW,fetcher:async()=>json(weatherBody(dates,[0,1,2]))});
 assert.deepEqual(bundle.anchors,[]);assert.equal(bundle.sources[2].coverage.kind,'none');assert(bundle.sources[2].note.includes('降级'));
 assert.equal(bundle.weather.length,3);assert.deepEqual(bundle.events.map(event=>event.id),['hz-zjam-2918']);assert.equal(bundle.sources[1].coverage.kind,'partial');
 bundle=await collectSignals({latitude:30.25,longitude:120.16,anchorEntries:[quote()],window:{start:'2026-11-20',end:'2026-11-01'},now:NOW,fetcher:async()=>json(weatherBody(dates,[0,1,2]))});
 assert.deepEqual(bundle.events,[]);assert.equal(bundle.sources[1].coverage.kind,'none');assert(bundle.sources[1].note.includes('降级'));assert(/^\d{4}-\d{2}-\d{2}$/.test(bundle.sources[1].coverage.from));
 assert.equal(bundle.weather.length,3);assert.equal(bundle.anchors.length,1);
 cases.push('collectSignals: competitor and event failures are isolated per source, degraded refs keep shape');

 bundle=await collectSignals({latitude:30.25,longitude:120.16,anchorEntries:null,window:{start:'bad',end:'bad'},now:NOW,fetcher:()=>{throw Error('network down')}});
 assert.equal(bundle.sources.length,3);assert(bundle.sources.every(item=>item.coverage.kind==='none'&&item.confidence==='low'));assert(bundle.sources[0].note.includes('weather_unavailable'));assert(bundle.sources[1].note.includes('降级')&&bundle.sources[2].note.includes('降级'));
 assert.deepEqual(bundle.weather,[]);assert.deepEqual(bundle.events,[]);assert.deepEqual(bundle.anchors,[]);
 cases.push('collectSignals: all three sources failing still returns a shaped bundle, never throws');

 console.log(JSON.stringify({passed:cases.length,cases},null,2));
})().catch(error=>{console.error(error);process.exitCode=1});
