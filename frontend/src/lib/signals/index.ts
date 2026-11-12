// External-signal aggregation. Each source is independent evidence; one failure never blocks the rest.
import type {CompetitorAnchor,LocalEvent,SignalBundle,SourceRef,WeatherDay} from './types';
import {validCoordinates} from '../amap-nearby';
import {fetchWeather} from './weather';
import {collectEvents} from './events';
import {fetchEvents} from './official-events';
import {normalizeAnchors} from './competitors';

export type SignalsInput={latitude:number;longitude:number;anchorEntries:unknown[];window:{start:string;end:string};fetcher?:typeof fetch;now?:Date;liveEvents?:boolean;signal?:AbortSignal};

const ISO_DATE=/^\d{4}-\d{2}-\d{2}$/;
const DAY_MS=86400000;

function validDay(value:unknown):value is string{return typeof value==='string'&&ISO_DATE.test(value)&&new Date(`${value}T00:00:00Z`).toISOString().slice(0,10)===value}
function windowDays(window:{start:string;end:string}):number{
 const span=validDay(window?.start)&&validDay(window?.end)&&window.start<=window.end?Math.round((Date.parse(window.end)-Date.parse(window.start))/DAY_MS)+1:7;
 return Number.isFinite(span)?Math.min(16,Math.max(1,span)):7;
}
function failed(id:'weather'|'events'|'competitor',now:Date,window:{start:string;end:string},note:string):SourceRef{
 const day=now.toISOString().slice(0,10),
  from=validDay(window?.start)?window.start:day,to=validDay(window?.end)?window.end:day;
 return {id,authority:id==='weather'?'public':'manual',observedAt:now.toISOString(),coverage:{from,to,kind:'none'},confidence:'low',note};
}

export async function collectSignals(input:SignalsInput):Promise<SignalBundle>{
 const now=input?.now instanceof Date&&!Number.isNaN(input.now.getTime())?input.now:new Date(),
  window={start:typeof input?.window?.start==='string'?input.window.start:'',end:typeof input?.window?.end==='string'?input.window.end:''},
  sources:SourceRef[]=[];
 let weather:WeatherDay[]=[];
 try{
  const result=await fetchWeather({latitude:input.latitude,longitude:input.longitude,days:windowDays(window),fetcher:input.fetcher,now});
  weather=result.days;sources.push(result.source);
 }catch{weather=[];sources.push(failed('weather',now,window,'天气源不可用，已降级'))}
 let events:LocalEvent[]=[];
 try{
  // The workspace geocoder supplies GCJ-02, which is also the venue datum.
  const point={latitude:input.latitude,longitude:input.longitude};
  const eventInput={window,now,scope:{center:validCoordinates(point)?point:null}};
  const result=input.liveEvents?await fetchEvents({...eventInput,fetcher:input.fetcher,signal:input.signal}):collectEvents(eventInput);
  events=result.events;sources.push(result.source);
 }catch{events=[];sources.push(failed('events',now,window,'活动日历源不可用，已降级'))}
 let anchors:CompetitorAnchor[]=[];
 try{
  const result=normalizeAnchors({entries:input.anchorEntries,observedAt:now.toISOString()});
  anchors=result.anchors;sources.push(result.source);
 }catch{anchors=[];sources.push(failed('competitor',now,window,'竞品锚点源不可用，已降级'))}
 return {weather,events,anchors,sources};
}
