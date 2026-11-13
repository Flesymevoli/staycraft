import {searchLocal,type LocalSearchResult} from '../local-discovery';
import {validCoordinates} from '../amap-nearby';
import {eventsInWindow,straightLineKm,EVENT_RADIUS_KM,type EventPoint,type EventWindow} from './events';
import {inspectEventPage} from './event-extraction';
import type {EventSearchReview,SearchReviewRow,ReviewReason} from './event-review';

export type VenueResolver=(address:string,signal:AbortSignal)=>Promise<EventPoint|null>;
const cache=new Map<string,{expires:number;pages:LocalSearchResult[];observedAt:string;rows:SearchReviewRow[];query:string}>();
// Queries contain an administrative area, never the property's name, street number or account.
export function eventSearchArea(location:string){
 const text=location.normalize('NFKC').replace(/\s+/g,'').replace(/（[^）]*）/g,'');
 const city=text.match(/^[\p{Script=Han}]{1,50}?(?:市|自治州|地区)/u)?.[0]??'';
 const district=text.slice(city.length).match(/^[\p{Script=Han}]{1,30}?(?:(?<!自治)区|县|旗|市)/u)?.[0]??'';
 // Stop before streets, numbers and residential compounds such as 阳光小区.
 return city+(district&&!/小区|社区|园区|校区|景区|厂区|路|街|巷|弄/.test(district)?district:'');
}
function venueQuery(address:string,area:string){
 // Many listings name only a district or venue. Keep a supplied city, otherwise
 // qualify the lookup with the searched area to disambiguate common venue names.
 return /^(?:.{2,20}?(?:省|自治区|特别行政区)|.{2,16}?(?:市|自治州|地区))/.test(address)?address:`${area} ${address}`;
}
export async function fetchSearchedEvents(input:{location:string;center:EventPoint;window:EventWindow;now:Date;key:string;fetcher:typeof fetch;signal:AbortSignal;resolveVenue:VenueResolver}){
 const area=eventSearchArea(input.location);if(!area)throw Error('event_search_area_unknown');
 // District-only queries over-rank neighbourhood news. Discover city-wide,
 // then keep the existing venue geocoding and 15 km distance requirement.
 // Keep county-level destinations such as 腾冲市 rather than replacing them with 保山市.
 const searchArea=/(?:市|自治州|地区).+(?:市|县|旗)$/.test(area)?area:area.match(/^.*?(?:市|自治州|地区)/u)?.[0]??area;
 const cacheKey=JSON.stringify([area,input.window.start,input.window.end]);
 const cached=cache.get(cacheKey),now=input.now.getTime();
 let pages=cached&&cached.expires>now?cached.pages:undefined;
 const observedAt=pages?cached!.observedAt:input.now.toISOString();
 let rows:SearchReviewRow[]=pages?structuredClone(cached!.rows):[],query=pages?cached!.query:'';
 const fromCache=!!pages;
 if(!pages){
  pages=await searchLocal(searchArea,input.window.start,input.window.end,{key:input.key,fetcher:input.fetcher,signal:input.signal,needContent:true,onReview:(review,usedQuery)=>{rows=review;query=usedQuery}});
  if(cache.size>=64)cache.delete(cache.keys().next().value!);
  input.signal.throwIfAborted();cache.set(cacheKey,{expires:now+30*60000,pages,observedAt,rows:structuredClone(rows),query});
 }
 // Publication dates and search snippets are never used as event evidence.
 let eligible=0;
 const candidates=pages.flatMap(page=>{
  const row=rows.find(row=>row.url===page.url&&row.reason==='accepted')!;
  const inspected=inspectEventPage({url:page.url,title:page.title,content:page.content??'',publishedAt:page.publishedAt??undefined,observedAt});
  row.reason=inspected.reason;row.candidate=inspected.candidate;
  return inspected.events.flatMap(result=>{
   const outcome:{title:string;reason:ReviewReason}={title:result.event.title,reason:'accepted'};row.events.push(outcome);
   if(!eventsInWindow([result.event],input.window).length){outcome.reason='outside_window';return []}
   if(eligible++>=20){outcome.reason='event_limit';return []}
   return [{...result,outcome}];
  });
 });
 const addresses=[...new Set(candidates.map(row=>row.address))].slice(0,5);
 const coordinates=new Map<string,EventPoint>();
 await Promise.all(addresses.map(async address=>{
  try{const point=await input.resolveVenue(venueQuery(address,area),input.signal);input.signal.throwIfAborted();if(validCoordinates(point))coordinates.set(address,point)}catch{/* Incomplete locations are not nearby facts. */}
 }));
 input.signal.throwIfAborted();
 const seen=new Set<string>();
 const events=candidates.flatMap(({event,address,outcome})=>{
  const point=coordinates.get(address);if(!point){outcome.reason=addresses.includes(address)?'venue_unresolved':'venue_limit';return []}
  const distance=straightLineKm(input.center,point);if(distance>EVENT_RADIUS_KM){outcome.reason='outside_radius';return []}
  const identity=JSON.stringify([event.title.normalize('NFKC').replace(/[\s\p{P}]/gu,''),event.start,event.end,Math.round(point.latitude*1000),Math.round(point.longitude*1000)]);
  if(seen.has(identity)){outcome.reason='duplicate_event';return []}seen.add(identity);
  return [{...event,distanceKm:Math.round(distance*10)/10}];
 });
 const review:EventSearchReview={raw:rows.length,pages:pages.filter(page=>page.content?.trim()).length,parsed:rows.reduce((sum,row)=>sum+row.events.length,0),final:events.length,query,observedAt,cached:fromCache,rows};
 return {events,review,note:`已按${searchArea}及周边检索演出、市集、节庆、展览等活动，并按场地距离筛选；仅展示已取得明确活动日期和地点的结果，覆盖可能不完整。${!events.length?'本次未找到可核实的附近活动，不代表当地没有活动。':''}`};
}
