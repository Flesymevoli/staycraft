import {searchLocal,type LocalSearchResult} from '../local-discovery';
import {validCoordinates} from '../amap-nearby';
import {eventsInWindow,straightLineKm,EVENT_RADIUS_KM,type EventPoint,type EventWindow} from './events';
import {extractEventsFromPage} from './event-extraction';

export type VenueResolver=(address:string,signal:AbortSignal)=>Promise<EventPoint|null>;
const cache=new Map<string,{expires:number;pages:LocalSearchResult[];observedAt:string}>();
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
 const cacheKey=JSON.stringify([area,input.window.start,input.window.end]);
 const cached=cache.get(cacheKey),now=input.now.getTime();
 let pages=cached&&cached.expires>now?cached.pages:undefined;
 const observedAt=pages?cached!.observedAt:input.now.toISOString();
 if(!pages){
  pages=await searchLocal(area,input.window.start,input.window.end,{key:input.key,fetcher:input.fetcher,signal:input.signal,needContent:true});
  if(cache.size>=64)cache.delete(cache.keys().next().value!);
  input.signal.throwIfAborted();cache.set(cacheKey,{expires:now+30*60000,pages,observedAt});
 }
 // Publication dates and search snippets are never used as event evidence.
 const candidates=pages.flatMap(page=>page.content?extractEventsFromPage({url:page.url,title:page.title,content:page.content,publishedAt:page.publishedAt??undefined,observedAt}):[])
  .filter(row=>eventsInWindow([row.event],input.window).length).slice(0,20);
 const addresses=[...new Set(candidates.map(row=>row.address))].slice(0,5);
 const coordinates=new Map<string,EventPoint>();
 await Promise.all(addresses.map(async address=>{
  try{const point=await input.resolveVenue(venueQuery(address,area),input.signal);input.signal.throwIfAborted();if(validCoordinates(point))coordinates.set(address,point)}catch{/* Incomplete locations are not nearby facts. */}
 }));
 input.signal.throwIfAborted();
 const seen=new Set<string>();
 const events=candidates.flatMap(({event,address})=>{
  const point=coordinates.get(address);if(!point)return [];
  const distance=straightLineKm(input.center,point);if(distance>EVENT_RADIUS_KM)return [];
  const identity=JSON.stringify([event.title.normalize('NFKC').replace(/[\s\p{P}]/gu,''),event.start,event.end,Math.round(point.latitude*1000),Math.round(point.longitude*1000)]);
  if(seen.has(identity))return [];seen.add(identity);
  return [{...event,distanceKm:Math.round(distance*10)/10}];
 });
 return {events,note:`已按${area}及入住日期搜索活动，并按场地距离筛选；仅展示已取得明确活动日期和地点的结果，覆盖可能不完整。${!events.length?'本次未找到可核实的附近活动，不代表当地没有活动。':''}`};
}
