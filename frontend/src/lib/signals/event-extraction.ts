import type {EventCategory,LocalEvent} from './types';

export type EventPage={url:string;title:string;content:string;observedAt:string;publishedAt?:string};
export type ExtractedEvent={event:LocalEvent;address:string};
type ObjectValue=Record<string,unknown>;
const object=(value:unknown):value is ObjectValue=>!!value&&typeof value==='object'&&!Array.isArray(value);
const clean=(value:unknown)=>typeof value==='string'?value.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim():'';
const scalar=(value:unknown)=>typeof value==='string'?value:object(value)?clean(value.name):'';
const schemaType=(value:unknown)=>clean(value).replace(/^https?:\/\/schema\.org\//,'');
const types=(value:unknown)=>(Array.isArray(value)?value:[value]).map(schemaType);
const eventTypes=new Set(['Event','BusinessEvent','ChildrensEvent','ComedyEvent','CourseInstance','DanceEvent','EducationEvent','EventSeries','ExhibitionEvent','Festival','FoodEvent','Hackathon','LiteraryEvent','MusicEvent','SaleEvent','ScreeningEvent','SocialEvent','SportsEvent','TheaterEvent','VisualArtsEvent']);
const cancelled=/EventCancelled|EventPostponed|活动取消|展览取消|演出取消|取消举办|延期举办|活动延期|展览延期|演出延期|已取消|暂缓举办|取消通知|延期通知/i;
const online=/OnlineEventAttendanceMode|VirtualLocation|线上活动|线上直播|在线活动|网络直播|online only/i;

function day(value:string){
 const match=value.match(/^(\d{4})(?:[-/.年])(\d{1,2})(?:[-/.月])(\d{1,2})(?:日)?(?:$|[T\s])/);
 if(!match)return null;
 const result=`${match[1]}-${match[2].padStart(2,'0')}-${match[3].padStart(2,'0')}`;
 return Number.isFinite(Date.parse(result))&&new Date(result).toISOString().slice(0,10)===result?result:null;
}
function identity(value:string){
 let first=2166136261,second=5381;
 for(const char of value){first=Math.imul(first^char.charCodeAt(0),16777619);second=Math.imul(second,33)^char.charCodeAt(0)}
 return (first>>>0).toString(16).padStart(8,'0')+(second>>>0).toString(16).padStart(8,'0');
}
function category(value:string):EventCategory{
 if(/ExhibitionEvent|VisualArtsEvent/.test(value))return 'exhibition';
 if(/MusicEvent|TheaterEvent|DanceEvent|ComedyEvent/.test(value))return 'concert';
 if(/SportsEvent/.test(value))return 'sports';
 if(/Festival/.test(value))return 'festival';
 if(/展览|艺术展/.test(value))return 'exhibition';
 if(/演出|音乐会|戏剧|话剧/.test(value))return 'concert';
 if(/赛事|马拉松/.test(value))return 'sports';
 if(/节庆/.test(value))return 'festival';
 return 'other';
}
function make(page:EventPage,title:string,start:string|null,end:string|null,address:string,venue:string,evidence:string,kind:string):ExtractedEvent|null{
 title=clean(title);address=clean(address);venue=clean(venue);
 if(!title||title.length>120||!start||!end||start>end||!address||address.length>300||/详见|待定|另行通知|未公布|线上|在线|https?:\/\//i.test(address))return null;
 const note=`网页${kind}记载：${evidence}；地点：${address}。日期与地点据该页面提取，出行前核对主办方。`.slice(0,240);
 const event:LocalEvent={id:'web-event-'+identity([title,start,end,address].join('|')),title,start,end,venue:(venue&&venue!==address?`${venue} · ${address}`:address).slice(0,120),category:category(title+' '+kind),sourceUrl:page.url,observedAt:page.observedAt,verified:true,
  source:{id:'events',authority:'public',observedAt:page.observedAt,coverage:{from:start,to:end,kind:'partial'},confidence:'low',note}};
 return {event,address};
}
function postal(value:unknown):string{
 if(typeof value==='string')return clean(value);
 if(!object(value))return '';
 // A country/city alone is insufficient to locate an activity venue.
 if(!clean(value.streetAddress))return '';
 return [value.addressRegion,value.addressLocality,value.streetAddress].map(clean).filter(Boolean).join(' ');
}
function structured(page:EventPage){
 const objects:ObjectValue[]=[],refs=new Map<string,ObjectValue>();
 function walk(value:unknown,depth=0){
  if(depth>20||objects.length>2000)return;
  if(Array.isArray(value)){for(const item of value)walk(item,depth+1);return}
  if(!object(value))return;objects.push(value);
  if(typeof value['@id']==='string'&&Object.keys(value).length>1)refs.set(value['@id'],value);
  for(const item of Object.values(value))if(typeof item==='object')walk(item,depth+1);
 }
 for(const match of page.content.matchAll(/<script\b[^>]*\btype\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script\s*>/gi)){
  try{walk(JSON.parse(match[1]))}catch{/* Malformed metadata cannot authorize inferred facts. */}
 }
 const resolve=(value:unknown):unknown=>object(value)&&typeof value['@id']==='string'?{...refs.get(value['@id']),...value}:value;
 const events:ExtractedEvent[]=[];let found=false;
 for(const value of objects){
  const kinds=types(value['@type']);if(!kinds.some(type=>eventTypes.has(type)))continue;found=true;
  if(cancelled.test(scalar(value.eventStatus))||online.test(scalar(value.eventAttendanceMode)))continue;
  const locations=Array.isArray(value.location)?value.location:[value.location];
  const physical=locations.map(resolve).filter((place):place is ObjectValue=>object(place)&&!types(place['@type']).includes('VirtualLocation'));
  if(physical.length!==1)continue;
  const place=physical[0],address=postal(resolve(place.address));
  const start=day(clean(value.startDate)),end=value.endDate===undefined?start:day(clean(value.endDate));
  const result=make(page,clean(value.name),start,end,address,clean(place.name),`时间 ${clean(value.startDate)}${value.endDate===undefined?'':' — '+clean(value.endDate)}`,kinds.join('/'));
  if(result&&!cancelled.test(result.event.title))events.push(result);
 }
 return {events,found};
}
function proseDates(value:string,chunk:string,publishedAt?:string){
 // Clock ranges and weekdays describe the occurrence, not another calendar date.
 const time=value.replace(/[（(]?(?:星期|周)[一二三四五六日天][）)]?/g,'')
  .replace(/(?:[T \t]*)(?:[01]?\d|2[0-3])[:：][0-5]\d(?::[0-5]\d)?(?:\s*[至到~～—–-]\s*(?:[01]?\d|2[0-3])[:：][0-5]\d(?::[0-5]\d)?)?(?:Z|[+-]\d{2}:\d{2})?/g,'').trim();
 const tokens=[...time.matchAll(/\d{4}[-/.年]\d{1,2}[-/.月]\d{1,2}日?|\d{1,2}月\d{1,2}日/g)].map(match=>match[0]);
 if(tokens.length<1||tokens.length>2)return null;
 const rest=tokens.reduce((text,token)=>text.replace(token,''),time);
 if(/\d|待定|另行|长期|常设|起|至今|onward/i.test(rest)||tokens.length===1&&/[~～至—–-]|\bto\b|\buntil\b/i.test(rest))return null;
 if(tokens.length===2&&!/^\s*(?:至|到|~|～|—|–|-|to|until)\s*$/i.test(rest))return null;
 const partial=tokens.filter(token=>!/^\d{4}/.test(token));
 let year='',basis='';
 if(partial.length){
  const explicit=[...new Set(tokens.filter(token=>/^\d{4}/.test(token)).map(token=>token.slice(0,4)))];
  if(explicit.length===1)year=explicit[0];
  else{
   const contextDates=[...chunk.matchAll(/\d{4}[-/.年]\d{1,2}[-/.月]\d{1,2}日?/g)].map(match=>day(match[0])).filter((date):date is string=>!!date);
   const contextYears=[...new Set(contextDates.map(date=>date.slice(0,4)))];
   if(contextYears.length>1)return null;
   // A matching full date in this section (for example poster text) can supply
   // its year. A publication date alone is never treated as an activity date.
   const matching=contextDates.some(date=>partial.some(token=>day(date.slice(0,4)+'年'+token)===date));
   if(matching){year=contextYears[0];basis=`；年份据同段完整日期补全（${year}）`}
   else{
    const published=publishedAt&&Number.isFinite(Date.parse(publishedAt))?day(publishedAt):null;
    if(!published||contextYears.length&&contextYears[0]!==published.slice(0,4))return null;
    year=published.slice(0,4);
    const inferred=partial.map(token=>day(year+'年'+token));
    if(inferred.some(date=>!date||Math.abs(Date.parse(date)-Date.parse(published))>90*86400000))return null;
    basis=`；年份据文章发布时间补全（${year}，同年90天内）`;
   }
  }
 }
 const dates=tokens.map(token=>day(/^\d{4}/.test(token)?token:year+'年'+token));
 if(dates.some(date=>!date)||dates[0]! > dates.at(-1)!)return null;
 return {start:dates[0]!,end:dates.at(-1)!,basis};
}
function prose(page:EventPage){
 if(cancelled.test(page.title)||online.test(page.title))return [];
 const text=page.content.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi,'')
  .replace(/<(?:br\b[^>]*|\/p|\/div|\/li)>/gi,'\n').replace(/<[^>]*>/g,'').replace(/\r/g,'');
 // Markdown and standalone numbered sections keep each activity's dates and
 // venue together. Other unstructured multi-event prose stays unpaired.
 const chunks=text.split(/(?=^(?:#{1,6}[ \t]+|[（(][一二三四五六七八九十百\d]{1,3}[）)][ \t]*))/m);
 const events:ExtractedEvent[]=[];
 for(const chunk of chunks){
  const heading=chunk.match(/^(?:#{1,6}[ \t]+|[（(][一二三四五六七八九十百\d]{1,3}[）)][ \t]*)(.+)$/m)?.[1];
  const title=clean(heading??(chunks.length===1?page.title:''));
  if(!title||cancelled.test(chunk)||online.test(chunk))continue;
  const lines=chunk.split('\n').map(line=>line.replace(/\*\*|__|^\s*[-*]\s+/g,'').trim()).filter(Boolean);
  const labelled=(pattern:RegExp)=>lines.flatMap((line,index)=>{const match=line.match(pattern);return match?[match[1]?.trim()||lines[index+1]||'']:[]});
  const times=labelled(/^(?:活动时间|展览时间|展期|演出时间|比赛时间|举办时间|时间|Event dates?|Date)\s*[:：]\s*(.*)$/i);
  const places=labelled(/^(?:活动地点|展览地点|展览地址|演出地点|比赛地点|举办地点|地点|地址|Venue|Location|Address)\s*[:：]\s*(.*)$/i);
  if(times.length!==1||places.length!==1)continue;
  const dates=proseDates(times[0],chunk,page.publishedAt);if(!dates)continue;
  const result=make(page,title,dates.start,dates.end,places[0],'',`时间 ${times[0]}${dates.basis}`,'活动正文');
  if(result)events.push(result);
 }
 return events;
}

export function extractEventsFromPage(page:EventPage):ExtractedEvent[]{
 if(typeof page.content!=='string'||page.content.length>2000000||typeof page.title!=='string'||!Number.isFinite(Date.parse(page.observedAt)))return [];
 try{const url=new URL(page.url);if(url.protocol!=='https:'||url.username||url.password)return []}catch{return []}
 const structuredResult=structured(page),seen=new Set<string>();
 // Structured data wins; contradictory article prose must not silently override it.
 return (structuredResult.found?structuredResult.events:prose(page)).filter(({event})=>{if(seen.has(event.id))return false;seen.add(event.id);return true}).slice(0,100);
}
