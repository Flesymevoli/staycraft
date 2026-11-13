import 'server-only';
import {readEventSearchReview,type EventSearchReview} from './signals/event-review';
import type {SupabaseClient} from '@supabase/supabase-js';
import {WorkspaceError} from './workspace-access';
import {operatorSample,isDemoWorkspace} from './operator-sample';
import {normalizeMarketLocation} from './market/snapshot-scope';
import {marketDay} from './market/quote-identity';
import {EVENT_CATEGORIES,type WeatherDay,type LocalEvent,type SourceRef} from './signals/types';

type Account={supabase:SupabaseClient;user:{id:string;email?:string};propertyId:string};
type Input={account:Account;location:string;start:string;signal?:AbortSignal};
type Window={start:string;end:string};
const ENDPOINT='https://staycraft.online/desktop-api/v1/signals';
const DAY=86400000;
const fail=()=>new WorkspaceError('remote_signals_invalid',502);
const changed=()=>new WorkspaceError('remote_scope_changed',409);
const unavailable=()=>new WorkspaceError('remote_signals_unavailable',503);
const record=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const timestamp=(value:unknown):value is string=>typeof value==='string'&&value.length<=40&&Number.isFinite(Date.parse(value));
const text=(value:unknown,max:number):value is string=>typeof value==='string'&&value.trim().length>0&&value.length<=max;

export function desktopSignalsEnabled(){
 return process.env.STAYCRAFT_DESKTOP_RUNTIME==='1'&&process.env.STAYCRAFT_HOSTED!=='1'&&!operatorSample();
}
function endpoint(){
 const test=process.env.STAYCRAFT_DESKTOP_SIGNALS_TEST_ORIGIN;
 if(process.env.STAYCRAFT_DESKTOP_SIGNALS_TEST!=='1'||!test)return ENDPOINT;
 if(!/^http:\/\/127\.0\.0\.1:[1-9]\d{0,4}$/.test(test)||Number(new URL(test).port)>65535)throw unavailable();
 return test+'/desktop-api/v1/signals';
}
function source(value:unknown,id:'weather'|'events'):SourceRef{
 if(!record(value)||value.id!==id||value.authority!=='public'||!timestamp(value.observedAt)
  ||!['high','medium','low'].includes(String(value.confidence))||!record(value.coverage)
  ||!marketDay(value.coverage.from)||!marketDay(value.coverage.to)||value.coverage.from>value.coverage.to
  ||!['complete','partial','none'].includes(String(value.coverage.kind))
  ||(value.note!==undefined&&(typeof value.note!=='string'||value.note.length>1000)))throw fail();
 return {id,authority:'public',observedAt:value.observedAt,confidence:value.confidence as SourceRef['confidence'],
  coverage:{from:value.coverage.from,to:value.coverage.to,kind:value.coverage.kind as SourceRef['coverage']['kind']},
  ...(value.note!==undefined?{note:value.note as string}:{})};
}
function sameSource(first:SourceRef,second:SourceRef){
 return first.id===second.id&&first.authority===second.authority&&first.observedAt===second.observedAt
  &&first.confidence===second.confidence&&first.coverage.from===second.coverage.from
  &&first.coverage.to===second.coverage.to&&first.coverage.kind===second.coverage.kind;
}
async function abortable<T>(work:PromiseLike<T>,signal:AbortSignal):Promise<T>{
 signal.throwIfAborted();
 return new Promise<T>((resolve,reject)=>{
  const cancel=()=>reject(unavailable());
  signal.addEventListener('abort',cancel,{once:true});
  Promise.resolve(work).then(resolve,reject).finally(()=>signal.removeEventListener('abort',cancel));
 });
}
async function body(response:Response,signal:AbortSignal):Promise<unknown>{
 if(Number(response.headers.get('content-length'))>262144||!response.headers.get('content-type')?.toLowerCase().includes('application/json')){
  void response.body?.cancel().catch(()=>{});throw fail();
 }
 const reader=response.body?.getReader();if(!reader)throw fail();
 const chunks:Uint8Array[]=[];let size=0;
 const cancel=()=>{void reader.cancel().catch(()=>{});};
 signal.addEventListener('abort',cancel,{once:true});
 try{
  while(true){signal.throwIfAborted();const {done,value}=await reader.read();if(done)break;
   size+=value.length;if(size>262144)throw fail();chunks.push(value);
  }
  signal.throwIfAborted();const result=new Uint8Array(size);let offset=0;
  for(const chunk of chunks){result.set(chunk,offset);offset+=chunk.length;}
  try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(result));}catch{throw fail();}
 }finally{signal.removeEventListener('abort',cancel);await reader.cancel().catch(()=>{});}
}
async function currentLocation(input:Input,signal:AbortSignal){
 const {data,error}=await abortable(input.account.supabase.from('property_details').select('profile')
  .eq('property_id',input.account.propertyId).abortSignal(signal).maybeSingle(),signal);
 if(error)throw unavailable();
 if(!record(data?.profile)||typeof data.profile.location!=='string'
  ||normalizeMarketLocation(data.profile.location)!==normalizeMarketLocation(input.location))throw changed();
}
async function request(input:Input,kind:'weather'|'events',window:Window,extra:{days:number}|{end:string}){
 if(!desktopSignalsEnabled()||isDemoWorkspace(input.account.user.email))throw unavailable();
 if(!text(input.location,300)||!normalizeMarketLocation(input.location)||!marketDay(window.start)||!marketDay(window.end))throw fail();
 const signal=input.signal?AbortSignal.any([input.signal,AbortSignal.timeout(25000)]):AbortSignal.timeout(25000);
 try{
  signal.throwIfAborted();
  const {data,error}=await abortable(input.account.supabase.auth.getSession(),signal);
  let session=data.session;
  if(error||!session||session.user.id!==input.account.user.id)throw changed();
  if(!session.expires_at||session.expires_at*1000-Date.now()<300000){
   const refreshed=await abortable(input.account.supabase.auth.refreshSession(),signal);
   if(refreshed.error)throw unavailable();session=refreshed.data.session;
  }
  if(!session||session.user.id!==input.account.user.id||!session.access_token
   ||!session.expires_at||session.expires_at*1000-Date.now()<90000)throw changed();
  const verified=await abortable(input.account.supabase.auth.getUser(session.access_token),signal);
  if(verified.error||verified.data.user?.id!==input.account.user.id)throw changed();
  await currentLocation(input,signal);
  const response=await fetch(endpoint(),{method:'POST',redirect:'error',cache:'no-store',signal,
   headers:{Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},
   body:JSON.stringify({version:1,kind,propertyId:input.account.propertyId,location:input.location,start:window.start,...extra})});
  if(!response.ok){void response.body?.cancel().catch(()=>{});if(response.status===401||response.status===403||response.status===409)throw changed();throw unavailable();}
  const value=await body(response,signal);
  if(!record(value)||value.version!==1||value.kind!==kind||!record(value.window)
   ||value.window.start!==window.start||value.window.end!==window.end)throw fail();
  if(value.userId!==input.account.user.id||value.propertyId!==input.account.propertyId
   ||typeof value.location!=='string'||normalizeMarketLocation(value.location)!==normalizeMarketLocation(input.location))throw changed();
  const ref=source(value.source,kind);
  if(ref.coverage.from!==window.start||ref.coverage.to!==window.end)throw fail();
  // A profile edit while the remote read was in flight invalidates the result.
  await currentLocation(input,signal);
  signal.throwIfAborted();return {value,ref};
 }catch(error){if(error instanceof WorkspaceError)throw error;throw unavailable();}
}
const nullableNumber=(value:unknown,min:number,max:number):value is number|null=>value===null||typeof value==='number'&&Number.isFinite(value)&&value>=min&&value<=max;

export async function readDesktopWeather(input:Input&{days:number}):Promise<{days:WeatherDay[];source:SourceRef}>{
 if(!marketDay(input.start)||!Number.isInteger(input.days)||input.days<1||input.days>16)throw fail();
 const window={start:input.start,end:new Date(Date.parse(input.start)+(input.days-1)*DAY).toISOString().slice(0,10)};
 const {value,ref}=await request(input,'weather',window,{days:input.days});
 if(!Array.isArray(value.days)||value.days.length>input.days)throw fail();
 let previous='';
 const days=value.days.map((raw):WeatherDay=>{
  if(!record(raw)||!marketDay(raw.date)||raw.date<window.start||raw.date>window.end||raw.date<=previous
   ||typeof raw.code!=='number'||!Number.isInteger(raw.code)||raw.code<0||raw.code>1000
   ||!nullableNumber(raw.tempMin,-100,70)||!nullableNumber(raw.tempMax,-100,70)||!nullableNumber(raw.precipProb,0,100)
   ||raw.tempMin!==null&&raw.tempMax!==null&&raw.tempMin>raw.tempMax||!sameSource(source(raw.source,'weather'),ref))throw fail();
  previous=raw.date;return {date:raw.date,code:raw.code,tempMin:raw.tempMin,tempMax:raw.tempMax,precipProb:raw.precipProb,source:ref};
 });
 if(ref.coverage.kind!==(days.length===input.days?'complete':days.length?'partial':'none'))throw fail();
 return {days,source:ref};
}
export async function readDesktopEvents(input:Input&{end:string}):Promise<{events:LocalEvent[];source:SourceRef;review?:EventSearchReview}>{
 if(!marketDay(input.start)||!marketDay(input.end)||input.start>input.end||Date.parse(input.end)-Date.parse(input.start)>=28*DAY)throw fail();
 const window={start:input.start,end:input.end};
 const {value,ref}=await request(input,'events',window,{end:input.end});
 if(!Array.isArray(value.events)||value.events.length>200)throw fail();
 const seen=new Set<string>();
 const events=value.events.map((raw):LocalEvent=>{
  if(!record(raw)||!text(raw.id,80)||seen.has(raw.id)||!text(raw.title,120)||!marketDay(raw.start)||!marketDay(raw.end)
   ||raw.start>raw.end||raw.start>window.end||raw.end<window.start||!timestamp(raw.observedAt)||typeof raw.verified!=='boolean'
   ||typeof raw.category!=='string'||!Object.hasOwn(EVENT_CATEGORIES,raw.category)
   ||(raw.venue!==undefined&&!text(raw.venue,120))||!nullableNumber(raw.distanceKm,0,15)||raw.distanceKm===null
   ||!text(raw.sourceUrl,2000))throw fail();
  let url;try{url=new URL(raw.sourceUrl);}catch{throw fail();}
  if(url.protocol!=='https:'||url.username||url.password)throw fail();
  const eventSource=source(raw.source,'events');
  if(eventSource.observedAt!==raw.observedAt||eventSource.coverage.from!==raw.start||eventSource.coverage.to!==raw.end)throw fail();
  seen.add(raw.id);
  return {id:raw.id,title:raw.title,start:raw.start,end:raw.end,observedAt:raw.observedAt,verified:raw.verified,
   category:raw.category as LocalEvent['category'],distanceKm:raw.distanceKm,sourceUrl:url.href,
   ...(raw.venue!==undefined?{venue:raw.venue as string}:{}),source:eventSource};
 });
 if(ref.coverage.kind!==(events.length?'partial':'none'))throw fail();
 let review:EventSearchReview|undefined;
 try{if(value.review!==undefined)review=readEventSearchReview(value.review)}catch{throw fail()}
 return {events,source:ref,review};
}
