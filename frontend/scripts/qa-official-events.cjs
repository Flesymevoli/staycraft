// Official calendar parser and refresh behavior, with synthetic pages and no network.
const assert=require('node:assert/strict'),fs=require('node:fs'),Module=require('node:module'),path=require('node:path'),ts=require('typescript');
function load(file){const mod=new Module(file);mod.require=name=>name.startsWith('.')?load(path.resolve(path.dirname(file),name)+'.ts'):require(name);mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);return mod.exports}
const {fetchEvents,parseOfficialCalendar,isOfficialEventCalendarUrl}=load(path.resolve(__dirname,'../src/lib/signals/official-events.ts'));
const {collectEvents}=load(path.resolve(__dirname,'../src/lib/signals/events.ts'));
const now=new Date('2026-11-12T08:00:00Z'),window={start:'2026-11-13',end:'2026-11-20'},beijing={latitude:39.925255,longitude:116.408939},hangzhou={latitude:30.231049,longitude:120.156894};
const href='/namoc/zhanlan/202611/'+ 'a'.repeat(32)+'.shtml';
const row=(start='2026-11-13',end='2026-11-20',url=href,title='隔离测试展')=>`<li><h3><a href="${url}" title="${title}">缩略名称...</a></h3><p>展览时间：${start}至${end}</p><p>展览场地：1号厅</p></li>`;
const html=rows=>`<ul class="zllist" id="zlhglb">${rows}</ul>`;
const zjam=rows=>`<table id="dlExbition">${rows}</table>`;
const zrow=(id='2918',start='2026/11/1',end='2026/11/21')=>`<tr><td><a href="ExbitionDetail.aspx?etid=${id}&amp;type=1" title="隔离测试展"><h3>隔离测试展</h3></a><p>展览时间：${start} 至 ${end}<br>主办单位：浙江美术馆<br>展厅：浙江美术馆1号厅<br>展览联系方式：000</p></td></tr>`;
const response=text=>new Response(text,{headers:{'Content-Type':'text/html; charset=utf-8'}});
const input=(center=beijing,extra={})=>({window,now,scope:{center},...extra});
const cases=[];
(async()=>{
 let events=parseOfficialCalendar(html(row('2026-11-13','2026-11-20',href,'完整 &quot;标题&quot;')), 'namoc',now.toISOString());
 assert.equal(events[0].title,'完整 "标题"');assert.equal(events[0].start,'2026-11-13');assert.match(events[0].venue,/北京市.*1号厅/);assert.equal(events[0].observedAt,now.toISOString());
 events=parseOfficialCalendar(zjam(zrow()),'zjam',now.toISOString());assert.equal(events[0].id,'hz-zjam-2918');assert.equal(events[0].start,'2026-11-01');assert.equal(events[0].source.authority,'public');
 for(const bad of [html(row('2026-11-31')),html(row('2026-11-21','2026-11-20')),html(row('2026-11-13','2026-11-20','https://evil.invalid/a')),html(row('2026-11-13','2026-11-20','javascript:alert(1)')),'<p>官网已改版</p>'])assert.throws(()=>parseOfficialCalendar(bad,'namoc',now.toISOString()));
 assert.deepEqual(parseOfficialCalendar(html(''),'namoc',now.toISOString()),[]);
 cases.push('observed markup, full titles, single-digit dates, verified sources; rejects malformed dates, changed markup and external URLs');
 let calls=[];
 let result=await fetchEvents(input(beijing,{fetcher:async(url,options)=>{calls.push({url,options});return response(html(row()))}}));
 assert.equal(calls.length,1);assert.equal(result.events.length,1);assert.equal(result.events[0].distanceKm,0);assert.equal(result.source.coverage.kind,'partial');assert.equal(result.source.observedAt,now.toISOString());
 assert.equal(calls[0].options.credentials,'omit');assert.equal(calls[0].options.redirect,'manual');assert.deepEqual(Object.keys(calls[0].options.headers),['Accept']);assert(isOfficialEventCalendarUrl(new URL(calls[0].url)));
 assert(!isOfficialEventCalendarUrl(new URL(calls[0].url+'?key=x')));assert(!isOfficialEventCalendarUrl(new URL('https://user@www.namoc.cn/namoc/zhanlan/zl_list.shtml')));
 assert(!isOfficialEventCalendarUrl(new URL('https://www.namoc.cn.evil.invalid/namoc/zhanlan/zl_list.shtml')));
 cases.push('Beijing refresh sends one fixed public GET without credentials and exposes source time and partial coverage');
 result=await fetchEvents(input(beijing,{fetcher:async()=>response(html(row('2026-11-21','2026-11-25')))}));assert.deepEqual(result.events,[]);assert.equal(result.source.coverage.kind,'none');
 result=await fetchEvents(input(beijing,{fetcher:async()=>response(html(row('2026-11-01','2026-11-12')))}));assert.deepEqual(result.events,[]);
 const unavailable=async()=>{throw Error('offline')};
 result=await fetchEvents(input(hangzhou,{fetcher:unavailable}));const original=collectEvents(input(hangzhou));
 assert.deepEqual(result.events,original.events);assert.equal(result.source.observedAt,original.source.observedAt);assert.equal(result.source.confidence,'low');assert.match(result.source.note,/保留原采集时间/);
 // ASCII numeric HTML entities decode identically under GBK, while testing the real streaming decoder.
 const ascii=text=>text.replace(/[^\x00-\x7F]/g,char=>'&#'+char.charCodeAt(0)+';');
 result=await fetchEvents(input(hangzhou,{fetcher:async()=>response(ascii(zjam(zrow('2918','2026/12/1','2026/12/4'))))}));
 assert.deepEqual(result.events,[],'changed dates and removed listings must not keep the bundled Hangzhou entries');
 result=await fetchEvents(input(hangzhou,{fetcher:async()=>response(zjam(''))}));assert.deepEqual(result.events,[],'a genuinely empty official list removes old listings');
 cases.push('date overlap, changed dates/removals, successful empty refresh, and network failure preserving historical timestamps');
 calls=[];
 result=await fetchEvents(input({latitude:23.1,longitude:113.3},{fetcher:async()=>{calls.push(1);throw Error('not expected')}}));assert.deepEqual(calls,[]);assert.deepEqual(result.events,[]);assert.match(result.source.note,/自动更新仅覆盖/);
 await fetchEvents(input(null,{fetcher:async()=>{throw Error('no coordinates must not fetch')}}));
 result=await fetchEvents(input(beijing,{events:[],fetcher:async()=>{throw Error('explicit entries remain offline')}}));assert.deepEqual(result.events,[]);
 const offset=km=>km/6371*180/Math.PI;
 result=await fetchEvents(input({latitude:beijing.latitude-offset(15.001),longitude:beijing.longitude},{fetcher:async()=>{calls.push(1);return response(html(row()))}}));assert.deepEqual(calls,[]);assert.deepEqual(result.events,[]);
 result=await fetchEvents(input({latitude:beijing.latitude-offset(14.999),longitude:beijing.longitude},{fetcher:async()=>response(html(row()))}));assert.equal(result.events[0].distanceKm,15);
 cases.push('unsupported city, absent center, explicit offline inputs and unrounded 15 km radius do not leak other-area events');
 for(const fetcher of [async()=>new Response(null,{status:302,headers:{Location:'https://evil.invalid'}}),async()=>response('x'.repeat(262145)),async()=>new Response('login',{headers:{'Content-Type':'application/json'}}),async()=>response('<ul>changed layout</ul>')]){
  result=await fetchEvents(input(hangzhou,{fetcher}));assert.equal(result.source.observedAt,original.source.observedAt);assert.deepEqual(result.events,original.events);
 }
 const controller=new AbortController();controller.abort();let contacted=0;
 result=await fetchEvents(input(beijing,{signal:controller.signal,fetcher:async()=>{contacted++;return response(html(row()))}}));assert.deepEqual(result.events,[]);assert.equal(contacted,0);
 // Cancellation during a stalled response must finish, even if the test fetcher ignores its signal.
 const pending=new AbortController(),timer=setTimeout(()=>pending.abort(),20);
 result=await fetchEvents(input(beijing,{signal:pending.signal,fetcher:()=>new Promise(()=>{})}));clearTimeout(timer);assert.deepEqual(result.events,[]);
 const stale=collectEvents(input(hangzhou,{now:new Date('2026-11-20T08:00:00Z')}));assert.equal(stale.source.confidence,'low');assert.match(stale.source.note,/7 天未更新/);assert(stale.events.every(event=>event.source.confidence==='low'));
 cases.push('redirect/oversized/incorrect-media/changed-page failures, cancellation and stale records never become freshly verified evidence');
 console.log(JSON.stringify({passed:cases.length,cases,network:'none'},null,2));
})().catch(error=>{console.error(error);process.exitCode=1});
