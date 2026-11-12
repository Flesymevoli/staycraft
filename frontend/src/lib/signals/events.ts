// Published activities from the local official-calendar snapshot.
import {EVENT_CATEGORIES,type Coverage,type EventCategory,type LocalEvent,type SourceRef} from './types';
import {cityEvents} from './event-catalog';
import {validCoordinates} from '../amap-nearby';

export type EventWindow={start:string;end:string};
export type EventPoint={latitude:number;longitude:number};
// The event venue points and any supplied center are in GCJ-02.
export type EventScope={center:EventPoint|null;demoProperty?:boolean};
export type EventsInput={events?:unknown[];window:EventWindow;now?:Date;observedAt?:string;scope?:EventScope};
export type EventsResult={events:LocalEvent[];source:SourceRef};
export const EVENT_RADIUS_KM=15;

const ISO_DATE=/^\d{4}-\d{2}-\d{2}$/;
export type {EventCategory} from './types';
// Collection time of the corresponding official calendar detail pages.
const CALENDAR_OBSERVED_AT='2026-11-10T16:39:37.911Z';

function isDay(value:unknown):value is string{return typeof value==='string'&&ISO_DATE.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value}
function isHttps(value:unknown):value is string{
 if(typeof value!=='string')return false;
 try{const url=new URL(value);return url.protocol==='https:'&&url.hostname.length>0}catch{return false}
}
function text(value:unknown,max:number):string|undefined{return typeof value==='string'&&value.trim()?value.trim().slice(0,max):undefined}
function timestamp(value:unknown):value is string{return typeof value==='string'&&Number.isFinite(Date.parse(value))}

const entries=Object.values(cityEvents).flat();
const venues=new Map(entries.map(entry=>[entry.event.id,entry]));
export const EVENT_CALENDAR=validateEvents(entries.map(({event})=>event));

export function isDemoEventProperty(location:string){
 return /太仓市娄江新城.*西浦北里.*虚构/.test(location);
}

export function straightLineKm(first:EventPoint,second:EventPoint){
 const radians=Math.PI/180;
 const latitude=(first.latitude-second.latitude)*radians;
 const longitude=(first.longitude-second.longitude)*radians;
 const haversine=Math.sin(latitude/2)**2+Math.cos(first.latitude*radians)*Math.cos(second.latitude*radians)*Math.sin(longitude/2)**2;
 return 6371*2*Math.asin(Math.min(1,Math.sqrt(haversine)));
}

function eventFrom(raw:unknown,observedAt:string):LocalEvent|null{
 if(!raw||typeof raw!=='object')return null;
 const record=raw as Record<string,unknown>,
  id=typeof record.id==='string'?record.id.trim():'',title=typeof record.title==='string'?record.title.trim():'',
  start=record.start,end=record.end,category=record.category,sourceUrl=record.sourceUrl;
 if(!id||id.length>80||!title||title.length>120)return null;
 if(!isDay(start)||!isDay(end)||start>end)return null;
 if(typeof category!=='string'||!Object.hasOwn(EVENT_CATEGORIES,category))return null;
 if(!isHttps(sourceUrl))return null;
 const venue=text(record.venue,120);
 const distanceKm=typeof record.distanceKm==='number'&&Number.isFinite(record.distanceKm)&&record.distanceKm>=0?record.distanceKm:undefined;
 const rawSource=record.source&&typeof record.source==='object'?record.source as Record<string,unknown>:undefined;
 const at=timestamp(record.observedAt)?record.observedAt:timestamp(rawSource?.observedAt)?rawSource.observedAt:observedAt;
 const verified=record.verified===true;
 const authority=rawSource?.authority==='public'?'public':'manual';
 const fallback=verified?'活动日期已核实':'活动日期尚未核实';
 const note=text(rawSource?.note,240)??fallback;
 return {id,title,start,end,venue,distanceKm,category:category as EventCategory,sourceUrl,observedAt:at,verified,source:{id:'events',authority,observedAt:at,coverage:{from:start,to:end,kind:'partial'},confidence:verified?'medium':'low',note}};
}

export function validateEvents(events:unknown[],observedAt=new Date().toISOString()):LocalEvent[]{
 if(!Array.isArray(events))return [];
 const seenIds=new Set<string>(),seenEntries=new Set<string>(),valid:LocalEvent[]=[];
 for(const raw of events){
  const event=eventFrom(raw,observedAt);
  if(!event)continue;
  const identity=JSON.stringify([event.sourceUrl,event.title,event.start,event.end,event.venue]);
  if(seenIds.has(event.id)||seenEntries.has(identity))continue;
  seenIds.add(event.id);seenEntries.add(identity);valid.push(event);
 }
 return valid.sort((a,b)=>a.start.localeCompare(b.start)||a.id.localeCompare(b.id));
}

export function eventsInWindow(events:LocalEvent[],window:EventWindow):LocalEvent[]{
 if(!isDay(window?.start)||!isDay(window?.end)||window.start>window.end)throw new Error('event_window_invalid');
 return events.filter(event=>event.start<=window.end&&event.end>=window.start).sort((a,b)=>a.start.localeCompare(b.start)||a.id.localeCompare(b.id));
}

export function collectEvents(input:EventsInput):EventsResult{
 const window=input?.window;
 if(!isDay(window?.start)||!isDay(window?.end)||window.start>window.end)throw new Error('event_window_invalid');
 const now=input.now instanceof Date&&!Number.isNaN(input.now.getTime())?input.now:new Date();
 const usingCalendar=!Array.isArray(input.events);
 const observedAt=usingCalendar?CALENDAR_OBSERVED_AT:timestamp(input.observedAt)?input.observedAt:now.toISOString();
 const matching=eventsInWindow(validateEvents(usingCalendar?EVENT_CALENDAR:input.events!,observedAt),window);
 const center=input.scope?.center;
 const demoEstimate=usingCalendar&&input.scope?.demoProperty===true;
 const scoped=!input.scope?matching:matching.flatMap(event=>{
  const venue=usingCalendar?venues.get(event.id):undefined;
  const distance=validCoordinates(center)&&venue?straightLineKm(center,venue.point):demoEstimate?venue?.demoDistanceKm:undefined;
  return distance===undefined||distance>EVENT_RADIUS_KM?[]:[{...event,distanceKm:Math.round(distance*10)/10}];
 });
 // A bundled calendar keeps its actual collection date; opening it again is not a refresh.
 const events=scoped.map(event=>now.getTime()-Date.parse(event.observedAt)>7*86400000
  ? {...event,source:{...event.source,confidence:'low' as const,note:`${event.source.note??''}此记录已超过 7 天未更新，出行前请核对官网是否改期。`}}
  : event);
 const coverage:Coverage={from:window.start,to:window.end,kind:events.length?'partial':'none'};
 const allVerified=events.length>0&&events.every(event=>event.verified);
 const authority=usingCalendar||events.length>0&&events.every(event=>event.source.authority==='public')?'public':'manual';
 const latestEvent=events.reduce<string|undefined>((latest,event)=>!latest||Date.parse(event.observedAt)>Date.parse(latest)?event.observedAt:latest,undefined);
 const note=events.length
  ? `${allVerified?'所列活动日期已核实':'部分活动日期可能未经核实'}。${demoEstimate&&!center?'距离为虚构演示民宿的直线估算。':''}活动记录不代表客流会增加。`
  : input.scope&&!center&&!demoEstimate
   ? '未取得筛选中心的坐标，无法判断活动距离；无返回记录不代表没有活动。'
   : '现有日历中没有匹配当前日期和范围的记录；无返回记录不代表没有活动。';
 const stale=events.some(event=>now.getTime()-Date.parse(event.observedAt)>7*86400000);
 return {events,source:{id:'events',authority,observedAt:latestEvent??observedAt,coverage,confidence:allVerified&&!stale?'medium':'low',note:note+(stale?'部分记录已超过 7 天未更新，请核对官网。':'')}};
}
