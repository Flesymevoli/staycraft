import {validCoordinates} from '../amap-nearby';
import {collectEvents,eventsInWindow,EVENT_RADIUS_KM,straightLineKm,validateEvents,type EventPoint,type EventsInput,type EventsResult} from './events';
import type {LocalEvent} from './types';
import {fetchSearchedEvents,type VenueResolver} from './searched-events';
import {eventSearchKey} from '../local-discovery';

type Calendar={id:'namoc'|'zjam';url:string;name:string;venue:string;point:EventPoint;encoding:string};
// Fixed public calendars only. Never send account data, a search query or the property address.
// Venue points use GCJ-02: ditu.amap.com/place/B000A7BC2S and /place/B023B0BMJ6.
const calendars:readonly Calendar[]=[
 {id:'namoc',url:'https://www.namoc.cn/namoc/zhanlan/zl_list.shtml',name:'中国美术馆',venue:'中国美术馆 · 北京市东城区五四大街1号',point:{latitude:39.925255,longitude:116.408939},encoding:'utf-8'},
 {id:'zjam',url:'https://www.zjam.org.cn/Site/Exbition/ExbitionList.aspx?type=1',name:'浙江美术馆',venue:'浙江美术馆 · 杭州市西湖区南山路138号',point:{latitude:30.231049,longitude:120.156894},encoding:'gbk'},
];
const MAX_BYTES=262144;
type LiveInput=EventsInput&{fetcher?:typeof fetch;signal?:AbortSignal;timeoutMs?:number;location?:string;resolveVenue?:VenueResolver;searchKey?:string;searchFetcher?:typeof fetch};

export function isOfficialEventCalendarUrl(url:URL){return !url.username&&!url.password&&calendars.some(calendar=>url.href===calendar.url)}

function plain(html:string):string{
 return html.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi,'').replace(/<[^>]*>/g,' ')
  .replace(/&(?:amp|quot|apos|lt|gt|nbsp);|&#(?:x[\da-f]+|\d+);/gi,entity=>{
   const named:Record<string,string>={'&amp;':'&','&quot;':'"','&apos;':"'",'&lt;':'<','&gt;':'>','&nbsp;':' '};
   if(named[entity.toLowerCase()])return named[entity.toLowerCase()];
   const code=entity.toLowerCase().startsWith('&#x')?parseInt(entity.slice(3,-1),16):Number(entity.slice(2,-1));
   return code>0&&code<=0x10ffff&&!(code>=0xd800&&code<=0xdfff)?String.fromCodePoint(code):'';
  }).replace(/\s+/g,' ').trim();
}
function attribute(tag:string,name:string){return plain(tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])([\\s\\S]*?)\\1`,'i'))?.[2]??'')}
function iso(value:string){const [year,month,day]=value.split(/[-/]/);return `${year}-${month.padStart(2,'0')}-${day.padStart(2,'0')}`}
function sourceIdentity(sourceUrl:string,calendar:Calendar){
 const url=new URL(sourceUrl);
 if(url.origin!==new URL(calendar.url).origin||url.username||url.password||url.hash)return null;
 if(calendar.id==='namoc')return url.pathname.match(/^\/namoc\/zhanlan\/\d{6}\/([a-f\d]{32})\.shtml$/i)?.[1]??null;
 return url.pathname==='/Site/Exbition/ExbitionDetail.aspx'&&/^\d{1,8}$/.test(url.searchParams.get('etid')??'')?url.searchParams.get('etid'):null;
}
function belongsTo(event:LocalEvent,calendar:Calendar){try{return sourceIdentity(event.sourceUrl,calendar)!==null}catch{return false}}

// Parse the observed listing markup only; do not execute page scripts or infer dates from prose.
export function parseOfficialCalendar(html:string,id:Calendar['id'],observedAt:string):LocalEvent[]{
 const calendar=calendars.find(item=>item.id===id)!;
 const section=id==='namoc'
  ? html.match(/<ul\b[^>]*\bid=["']zlhglb["'][^>]*>([\s\S]*?)<\/ul>/i)?.[1]
  : html.match(/<table\b[^>]*\bid=["']dlExbition["'][^>]*>([\s\S]*?)<\/table>/i)?.[1];
 if(section===undefined)throw Error('event_calendar_structure_changed');
 const rows=[...section.matchAll(id==='namoc'?/<li\b[^>]*>([\s\S]*?)<\/li>/gi:/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(row=>row[1]);
 const records:unknown[]=[];
 for(const row of rows){
  const heading=id==='namoc'?row.match(/<h3\b[^>]*>\s*(<a\b[^>]*>)([\s\S]*?)<\/a>/i):row.match(/(<a\b[^>]*>)\s*<h3\b[^>]*>([\s\S]*?)<\/h3>/i);
  if(!heading)continue;
  let sourceUrl:string;
  try{sourceUrl=new URL(attribute(heading[1],'href'),calendar.url).href}catch{continue}
  const identity=sourceIdentity(sourceUrl,calendar),title=attribute(heading[1],'title')||plain(heading[2]);
  const date=plain(row).match(/展览时间\s*[：:]\s*(\d{4}[-/]\d{1,2}[-/]\d{1,2})\s*至\s*(\d{4}[-/]\d{1,2}[-/]\d{1,2})/);
  if(!identity||!date||/\uFFFD/.test(title))continue;
  const hall=plain(row).match(id==='namoc'?/展览场地\s*[：:]\s*([^<>]*?)(?=$)/:/展厅\s*[：:]\s*(.*?)\s*(?:展览联系方式|展览介绍|$)/)?.[1];
  records.push({id:id==='namoc'?`bj-namoc-${identity}`:`hz-zjam-${identity}`,title,start:iso(date[1]),end:iso(date[2]),category:'exhibition',venue:calendar.venue+(hall&&hall.length<45?` · ${hall}`:''),sourceUrl,observedAt,verified:true,
   source:{authority:'public',observedAt,note:`展期来自${calendar.name}官网当前展览列表；仅覆盖该馆，开放日与临时调整以官网为准。`}});
 }
 const valid=validateEvents(records,observedAt);
 // A layout change or invalid dates must not look like a successful empty refresh.
 if(rows.length&&(!valid.length||records.length!==valid.length))throw Error('event_calendar_structure_changed');
 return valid;
}

async function untilAbort<T>(work:Promise<T>,signal:AbortSignal):Promise<T>{
 if(signal.aborted){void work.catch(()=>{});throw Error('event_calendar_timeout')}
 return new Promise<T>((resolve,reject)=>{
  const stop=()=>reject(Error('event_calendar_timeout'));signal.addEventListener('abort',stop,{once:true});
  work.then(resolve,reject).finally(()=>signal.removeEventListener('abort',stop));
 });
}
async function readCalendar(calendar:Calendar,fetcher:typeof fetch,signal:AbortSignal,observedAt:string){
 if(signal.aborted)throw Error('event_calendar_cancelled');
 const response=await untilAbort(fetcher(calendar.url,{method:'GET',headers:{Accept:'text/html'},credentials:'omit',redirect:'manual',cache:'no-store',signal}),signal);
 if(!response.ok||response.redirected||!/^text\/html\b/i.test(response.headers.get('content-type')??'')||Number(response.headers.get('content-length')??0)>MAX_BYTES){void response.body?.cancel().catch(()=>{});throw Error('event_calendar_unavailable')}
 if(!response.body)throw Error('event_calendar_empty');
 const reader=response.body.getReader(),decoder=new TextDecoder(calendar.encoding,{fatal:true});let total=0,html='';
 try{
  while(true){const part=await untilAbort(reader.read(),signal);if(part.done)break;total+=part.value.length;if(total>MAX_BYTES)throw Error('event_calendar_too_large');html+=decoder.decode(part.value,{stream:true});}
  html+=decoder.decode();
 }catch(error){void reader.cancel().catch(()=>{});throw error}
 return parseOfficialCalendar(html,calendar.id,observedAt);
}

async function fetchCalendarEvents(input:LiveInput):Promise<EventsResult>{
 const now=input.now instanceof Date&&!Number.isNaN(input.now.getTime())?input.now:new Date();
 const fallback=collectEvents({...input,now}),center=input.scope?.center;
 // Explicit test/manual inputs are offline, and missing coordinates never fetch another city's calendar.
 if(Array.isArray(input.events)||!validCoordinates(center))return fallback;
 const selected=calendars.filter(calendar=>straightLineKm(center,calendar.point)<=EVENT_RADIUS_KM);
 if(!selected.length)return {...fallback,source:{...fallback.source,note:`${fallback.source.note}当前自动更新仅覆盖北京中国美术馆与杭州浙江美术馆周边，其他地区使用已核实的日历快照。`}};
 const signal=input.signal?AbortSignal.any([input.signal,AbortSignal.timeout(input.timeoutMs??8000)]):AbortSignal.timeout(input.timeoutMs??8000);
 const results=await Promise.all(selected.map(async calendar=>{
  try{return {calendar,events:await readCalendar(calendar,input.fetcher??fetch,signal,now.toISOString())}}
  catch{return {calendar,events:null}}
 }));
 let combined=fallback.events;
 const failed:string[]=[],refreshed:string[]=[];
 for(const result of results){
  if(result.events===null){failed.push(result.calendar.name);continue}
  refreshed.push(result.calendar.name);
  // Successful authoritative updates replace old entries at that venue, including removed/cancelled listings.
  combined=combined.filter(event=>!belongsTo(event,result.calendar));
  const distanceKm=Math.round(straightLineKm(center,result.calendar.point)*10)/10;
  combined.push(...eventsInWindow(result.events,input.window).map(event=>({...event,distanceKm})));
 }
 if(!refreshed.length)return {...fallback,source:{...fallback.source,confidence:'low',note:`${fallback.source.note}${failed.join('、')}官网暂未读取成功，保留原采集时间与已有记录。`}};
 const result=collectEvents({events:combined,window:input.window,now,observedAt:now.toISOString()});
 return {...result,source:{...result.source,authority:'public',note:`${result.source.note}本次已读取${refreshed.join('、')}官网列表，仅覆盖所列场馆。${failed.length?`${failed.join('、')}未刷新，已有记录保留原采集时间。`:''}`}};
}

export async function fetchEvents(input:LiveInput):Promise<EventsResult>{
 const fallbackPromise=fetchCalendarEvents(input);
 const key=input.searchKey??eventSearchKey();
 const center=input.scope?.center;
 if(Array.isArray(input.events)||!validCoordinates(center))return fallbackPromise;
 if(!key||!input.location||!input.resolveVenue){
  const fallback=await fallbackPromise;
  return {...fallback,source:{...fallback.source,note:`${fallback.source.note}通用活动搜索尚未就绪，当前仅显示已有日历来源；无记录不代表当地没有活动。`}};
 }
 const signal=input.signal?AbortSignal.any([input.signal,AbortSignal.timeout(input.timeoutMs??20000)]):AbortSignal.timeout(input.timeoutMs??20000);
 const now=input.now??new Date();
 const discovered=await untilAbort(fetchSearchedEvents({location:input.location,center,window:input.window,now,key,fetcher:input.searchFetcher??input.fetcher??fetch,signal,resolveVenue:input.resolveVenue}),signal).catch(()=>null);
 const fallback=await fallbackPromise;
 if(!discovered)return {...fallback,source:{...fallback.source,confidence:'low',note:`${fallback.source.note}本次通用活动搜索暂未成功，保留已有记录；可稍后重新读取。`}};
 const urls=new Set(discovered.events.map(event=>event.sourceUrl));
 const combined=[...discovered.events,...fallback.events.filter(event=>!urls.has(event.sourceUrl))];
 const result=collectEvents({events:combined,window:input.window,now,observedAt:now.toISOString()});
 return {...result,review:discovered.review,source:{...result.source,authority:'public',note:`${result.source.note}${discovered.note}`}};
}
