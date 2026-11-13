// Pure page parsing. No network, accounts, model, or database calls.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const filename=path.resolve(__dirname,'../src/lib/signals/event-extraction.ts');
const mod=new Module(filename);mod._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const {extractEventsFromPage}=mod.exports;
const base={url:'https://events.example/details/1',title:'秋日艺术展',observedAt:'2026-11-12T06:00:00Z'};
const item={'@type':'ExhibitionEvent',name:'秋日艺术展',startDate:'2026-11-14',endDate:'2026-12-01',location:{'@type':'Place',name:'艺术馆',address:{'@type':'PostalAddress',addressRegion:'浙江省',addressLocality:'杭州市',streetAddress:'南山路138号'}}};
const metadata=value=>'<script type="application/ld+json">'+JSON.stringify(value)+'</script>';
const extract=(content,extra={})=>extractEventsFromPage({...base,content,...extra});
let checks=0;const equal=(a,b,label)=>{assert.deepEqual(a,b,label);checks++};const check=(a,label)=>{assert(a,label);checks++};
let rows=extract(metadata(item));equal(rows.length,1);equal(rows[0].event.start,'2026-11-14');equal(rows[0].event.end,'2026-12-01');equal(rows[0].address,'浙江省 杭州市 南山路138号');equal(rows[0].event.category,'exhibition');check(rows[0].event.verified&&rows[0].event.source.confidence==='low');check(rows[0].event.source.note.includes('2026-11-14')&&rows[0].event.source.note.includes('南山路138号'));
equal(extract(metadata([item,item])).length,1,'duplicate structured events are merged');
equal(extract(metadata({'@graph':[{'@id':'#place',...item.location},{...item,location:{'@id':'#place'}}]})).length,1,'local graph venue reference');
equal(extract(metadata({...item,'@type':['Thing','https://schema.org/MusicEvent']}))[0].event.category,'concert','schema URI and type array');
equal(extract(metadata({...item,startDate:'2026-11-14T23:00:00+08:00',endDate:'2026-11-15T01:00:00+08:00'}))[0].event.end,'2026-11-15','calendar dates preserve local day');
for(const overrides of [
 {startDate:'11月14日'},{startDate:'2026-02-30'},{endDate:'2026-11-01'},
 {location:{'@type':'VirtualLocation',url:'https://stream.example'}},{eventAttendanceMode:'https://schema.org/OnlineEventAttendanceMode'},
 {eventStatus:'https://schema.org/EventCancelled'},{eventStatus:'https://schema.org/EventPostponed'},
 {location:[item.location,{...item.location,name:'另一个场馆'}]},
 {location:{address:{addressLocality:'杭州市'}}},{location:{address:'详见文内'}},
 ])equal(extract(metadata({...item,...overrides})).length,0,JSON.stringify(overrides));
const oneDay={...item};delete oneDay.endDate;equal(extract(metadata(oneDay))[0].event.end,item.startDate,'no end means a dated single occurrence');
const valid='活动时间：2026年11月14日至2026年12月1日\n活动地点：杭州市南山路138号';
equal(extract(valid).length,1,'explicit Chinese range');
equal(extract('时间：2026年11月14日—11月20日\n地点：成都市青羊区青华路37号')[0].event.end,'2026-11-20','shared year in one explicit range');
equal(extract('时间：2026年12月14日—1月20日\n地点：成都市青羊区青华路37号').length,0,'shared year never invents a cross-year rollover');
equal(extract('**活动时间：**\n2026-11-14\n**活动地点：**\n浙江省杭州市南山路138号')[0].event.end,'2026-11-14','label on separate line and markdown emphasis');
equal(extract('Date: 2026-11-14 to 2026-12-01\nVenue: 123 Main Street, London',{title:'Art Exhibition'}).length,1,'explicit English range');
equal(extract('## 秋日艺术展\n'+valid+'\n\n## 冬日音乐会\n演出时间：2026-12-15\n演出地点：南京市长江路100号').length,2,'separate headings preserve date-location pairing');
for(const text of [
 '发布时间：2026-11-14\n活动地点：杭州市南山路138号',
 '活动时间：11月14日至12月1日\n活动地点：杭州市南山路138号',
 '活动时间：2026-11-14起\n活动地点：杭州市南山路138号',
 '活动时间：2026-11-14至另行通知\n活动地点：杭州市南山路138号',
 '活动时间：2026-11-14、2026-12-01\n活动地点：杭州市南山路138号',
 '活动时间：2026-11-14\n活动时间：2026-11-15\n活动地点：杭州市南山路138号',
 '活动时间：2026-11-14\n活动地点：杭州\n活动地点：南京',
 '活动时间：2026-11-14\n活动地点：详见文内',
 '活动已取消\n'+valid,'线上直播\n'+valid,
 '秋日艺术展将于2026-11-14在杭州市南山路138号举办',
 ])equal(extract(text).length,0,'ambiguous/unsupported prose: '+text);
equal(extract(metadata({...item,eventStatus:'EventCancelled'})+valid).length,0,'prose cannot revive cancelled metadata');
equal(extract(metadata({...item,eventAttendanceMode:'OnlineEventAttendanceMode'})+valid).length,0,'prose cannot revive online-only metadata');
equal(extract('<script type="application/ld+json">{broken}</script>'+valid).length,1,'malformed metadata does not execute or prevent independent explicit prose');
equal(extract(valid,{url:'javascript:alert(1)'}).length,0);equal(extract(valid,{url:'https://user:pass@events.example/a'}).length,0);equal(extract(valid,{observedAt:'yesterday'}).length,0);
const stable=extract(metadata(item))[0].event.id;equal(extract(metadata(item),{url:'https://events.example/details/other',observedAt:'2026-11-13T01:00:00Z'})[0].event.id,stable,'identity excludes refresh time and duplicate source URLs');
check(extract(metadata({...item,location:{...item.location,address:'南京市长江路100号'}}))[0].event.id!==stable,'different venue remains a distinct event');
// Short factual date/location patterns from saved pages; no remote article bodies.
const shortened='时间：11月12日 星期四 14:00-16:00\n地点：成都市武侯区科华中路9号';
rows=extract(shortened,{title:'阅读交流活动',publishedAt:'2026-11-09T14:56:00Z'});
equal(rows.length,1,'weekday and intraday range do not invalidate an abbreviated event date');
equal(rows[0].event.start,'2026-11-12');equal(rows[0].event.end,'2026-11-12');
check(rows[0].event.source.note.includes('年份据文章发布时间补全（2026'),'publication-year inference is disclosed');
equal(extract(shortened).length,0,'observedAt does not supply a missing year');
equal(extract(shortened,{publishedAt:'invalid'}).length,0,'invalid publication dates cannot supply a year');
equal(extract(shortened,{publishedAt:'2026-05-09'}).length,0,'publication-year inference is limited to ninety days');
equal(extract('时间：1月2日\n地点：成都市武侯区科华中路9号',{publishedAt:'2026-12-28'}).length,0,'no inferred turn-of-year rollover');
equal(extract('时间：12月28日至1月2日\n地点：成都市武侯区科华中路9号',{publishedAt:'2026-12-20'}).length,0,'abbreviated range cannot infer another year');
equal(extract('发布时间：2026-11-12\n地点：成都市武侯区科华中路9号',{publishedAt:'2026-11-12'}).length,0,'publication date alone never becomes an activity occurrence');
const sections='（一）广场运动体验\n活动地点：青岛市市南区音乐广场\n活动时间：11月12日13:30—15:30\n\n（三）社区健身体验\n2026/11/12\n活动地点：青岛市碧桂园云著\n活动时间：11月12日13:00—14:00';
rows=extract(sections,{title:'社区活动预告',publishedAt:'2026-11-11T07:09:10Z'});
equal(rows.map(row=>[row.event.title,row.event.start,row.address]),[['广场运动体验','2026-11-12','青岛市市南区音乐广场'],['社区健身体验','2026-11-12','青岛市碧桂园云著']],'numbered sections preserve their own titles, dates and venues');
check(rows[0].event.source.note.includes('文章发布时间'),'section without full date uses bounded publication year');
check(rows[1].event.source.note.includes('同段完整日期'),'poster date is preferred to publication year');
rows=extract(sections,{title:'社区活动预告'});
equal(rows.length,1,'year in another section is never borrowed');equal(rows[0].event.title,'社区健身体验');
equal(extract('2026/11/12\n2027/11/12\n活动时间：11月12日13:00—14:00\n活动地点：青岛市音乐广场',{publishedAt:'2026-11-11'}).length,0,'conflicting section years remain ambiguous');
equal(extract('（一）活动甲\n时间：2026-11-12\n（二）活动乙\n地点：青岛市音乐广场').length,0,'separate incomplete sections cannot cross-pair dates and venues');
equal(extract(sections,{title:'活动取消通知',publishedAt:'2026-11-11'}).length,0,'section splitting cannot revive a cancelled article');
equal(extract('（一）活动甲\n活动已取消\n时间：11月12日13:00—14:00\n地点：青岛市音乐广场',{publishedAt:'2026-11-11'}).length,0,'cancelled numbered sections stay excluded');
equal(extract('时间：11月12日、11月15日\n地点：青岛市音乐广场',{publishedAt:'2026-11-11'}).length,0,'separate occurrences do not become a continuous range');
const announcement='11月14日至18日，秋假科普演艺“机器人派对”将在古镇308礼堂上演。';
rows=extract(announcement,{publishedAt:'2026-11-13'});
equal(rows.map(row=>[row.event.title,row.event.start,row.event.end,row.address]),[['机器人派对','2026-11-14','2026-11-18','古镇308礼堂']],'one announcement sentence pairs a quoted title, abbreviated range and venue');
check(rows[0].event.source.note.includes('年份据文章发布时间补全'),'announcement discloses inferred year');
equal(extract(announcement).length,0,'announcement needs an explicit or bounded publication year');
equal(extract(announcement,{publishedAt:'2026-02-01'}).length,0,'distant publication cannot supply announcement year');
equal(extract(announcement+'活动取消。',{publishedAt:'2026-11-13'}).length,0,'cancelled announcement is excluded');
equal(extract(announcement.replace('古镇308礼堂','礼堂和广场'),{publishedAt:'2026-11-13'}).length,0,'multiple venues remain ambiguous');
equal(extract(announcement.replace('“机器人派对”','“机器人派对”和“科学展”'),{publishedAt:'2026-11-13'}).length,0,'multiple quoted events remain ambiguous');
equal(extract(announcement.replace('日，','日。'),{publishedAt:'2026-11-13'}).length,0,'dates and venue in separate sentences are not joined');
equal(extract(announcement.replace('14日至18日','28日至2日'),{publishedAt:'2026-11-13'}).length,0,'short range cannot invent a month rollover');
rows=extract('11月16日至18日，城市博物院开启“文博体验营”。11月14日至18日，古城书院内将开设“秋日市集”，提供旧书交换。',{publishedAt:'2026-11-13'});
equal(rows.map(row=>[row.event.title,row.event.start,row.event.end,row.address]),[['文博体验营','2026-11-16','2026-11-18','城市博物院'],['秋日市集','2026-11-14','2026-11-18','古城书院']],'venue-led sentences keep each named activity with its own dates');
equal(extract('11月16日至18日，城市博物院和图书馆开启“文博体验营”。',{publishedAt:'2026-11-13'}).length,0,'venue-led announcements reject multiple places');
equal(extract('11月16日至18日，某市将举办“文博体验营”。',{publishedAt:'2026-11-13'}).length,0,'a city alone is not a venue');
console.log(`PASS ${checks} generic event extraction checks. No network/model/database calls.`);
