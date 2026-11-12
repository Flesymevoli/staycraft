import {createClient} from '@supabase/supabase-js';
import {handleAiRequest,type AiEnv} from './ai';
import {amapGeocode,amapPoint} from '../src/lib/amap-nearby';
import {normalizeMarketLocation} from '../src/lib/market/snapshot-scope';
import {fetchWeather} from '../src/lib/signals/weather';
import {fetchEvents,isOfficialEventCalendarUrl} from '../src/lib/signals/official-events';
import type {SourceRef} from '../src/lib/signals/types';

type Limiter={limit(input:{key:string}):Promise<{success:boolean}>};
export type SignalsEnv={
 SUPABASE_URL:string;
 SUPABASE_PUBLISHABLE_KEY:string;
 AMAP_MAPS_API_KEY:string;
 AUTH_RATE_LIMITER:Limiter;
 SIGNALS_RATE_LIMITER:Limiter;
};
type Dependencies={fetcher?:typeof fetch;now?:()=>Date;timeoutMs?:number};
type Input={version:1;kind:'weather'|'events';propertyId:string;location:string;start:string;end:string;days:number};
const PATH='/desktop-api/v1/signals';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DAY=86400000;
const headers={'Cache-Control':'private, no-store','Content-Type':'application/json; charset=utf-8','X-Content-Type-Options':'nosniff'};
class Failure extends Error{constructor(readonly code:string,readonly status:number){super(code)}}
function day(value:unknown):value is string{
 return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&value>='2000-01-01'&&value<='2100-12-31'&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
}
function localDay(now:Date){return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai'}).format(now)}
function addDays(value:string,days:number){return new Date(Date.parse(value)+days*DAY).toISOString().slice(0,10)}
function parseInput(value:unknown):Input{
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Failure('invalid_input',400);
 const input=value as Record<string,unknown>,kind=input.kind;
 const fields=kind==='weather'?['version','kind','propertyId','location','start','days']:['version','kind','propertyId','location','start','end'];
 if(input.version!==1||!['weather','events'].includes(String(kind))||Object.keys(input).some(key=>!fields.includes(key)))throw new Failure('invalid_input',400);
 if(typeof input.propertyId!=='string'||!UUID.test(input.propertyId)||typeof input.location!=='string'||input.location.length>300||!normalizeMarketLocation(input.location)||!day(input.start))throw new Failure('invalid_input',400);
 const days=kind==='weather'?input.days:day(input.end)?Math.round((Date.parse(input.end)-Date.parse(input.start))/DAY)+1:0;
 if(typeof days!=='number'||!Number.isInteger(days)||days<1||days>(kind==='weather'?16:28))throw new Failure('invalid_input',400);
 const end=addDays(input.start,days-1);if(!day(end))throw new Failure('invalid_input',400);
 return {version:1,kind:kind as Input['kind'],propertyId:input.propertyId,location:input.location.trim(),start:input.start,end,days};
}
async function aborted<T>(work:Promise<T>,signal:AbortSignal):Promise<T>{
 if(signal.aborted){void work.catch(()=>{});throw new Failure('request_timeout',504)}
 return new Promise<T>((resolve,reject)=>{
  const stop=()=>reject(new Failure('request_timeout',504));signal.addEventListener('abort',stop,{once:true});
  work.then(resolve,reject).finally(()=>signal.removeEventListener('abort',stop));
 });
}
async function bytes(body:ReadableStream<Uint8Array>|null,limit:number,signal:AbortSignal):Promise<Uint8Array>{
 if(!body)return new Uint8Array();
 const reader=body.getReader(),chunks:Uint8Array[]=[];let total=0;
 try{
  while(true){const result=await aborted(reader.read(),signal);if(result.done)break;total+=result.value.length;if(total>limit)throw new Failure('payload_too_large',413);chunks.push(result.value);}
 }catch(error){void reader.cancel().catch(()=>{});throw error}
 const all=new Uint8Array(total);let offset=0;for(const chunk of chunks){all.set(chunk,offset);offset+=chunk.length}return all;
}
function checkedFetch(fetcher:typeof fetch,signal:AbortSignal,allow:(url:URL,method:string,headers:Headers)=>boolean):typeof fetch{
 return async(resource,init)=>{
  if(signal.aborted)throw new Failure('request_timeout',504);
  const request=resource instanceof Request?resource:undefined;
  const url=new URL(request?.url??String(resource)),method=(init?.method??request?.method??'GET').toUpperCase();
  const sentHeaders=new Headers(init?.headers??request?.headers);
  if(url.username||url.password||!allow(url,method,sentHeaders))throw new Failure('upstream_request_blocked',503);
  const combined=init?.signal?AbortSignal.any([signal,init.signal]):signal;
  // workerd supports manual/follow, not redirect:error. Never follow a redirect
  // carrying the user's JWT or the private map key; reject every 3xx below.
  const response=await aborted(fetcher(resource,{...init,redirect:'manual',cache:'no-store',signal:combined}),combined);
  if(response.redirected||response.status>=300&&response.status<400)throw new Failure('upstream_unavailable',503);
  if(Number(response.headers.get('content-length')??0)>262144){void response.body?.cancel();throw new Failure('upstream_unavailable',503)}
  let data:Uint8Array;
  try{data=await bytes(response.body,262144,combined)}catch(error){if(error instanceof Failure&&error.status===413)throw new Failure('upstream_unavailable',503);throw error}
  return new Response(data.byteLength?new Uint8Array(data).buffer:null,{status:response.status,statusText:response.statusText,headers:response.headers});
 };
}
function configuration(env:SignalsEnv){
 if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(env.SUPABASE_URL??'')||!/^sb_publishable_[A-Za-z0-9_-]+$/.test(env.SUPABASE_PUBLISHABLE_KEY??'')||!env.AUTH_RATE_LIMITER?.limit||!env.SIGNALS_RATE_LIMITER?.limit)throw new Failure('service_unavailable',503);
}
async function limit(binding:Limiter,key:string,signal:AbortSignal){
 const result=await aborted(binding.limit({key}),signal);if(!result.success)throw new Failure('rate_limited',429);
}

export async function handleSignalsRequest(request:Request,env:SignalsEnv,dependencies:Dependencies={}):Promise<Response>{
 try{
  const url=new URL(request.url);
  if(url.pathname!==PATH||url.search)throw new Failure('not_found',404);
  if(request.method!=='POST')throw new Failure('method_not_allowed',405);
  if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type')??''))throw new Failure('invalid_content_type',415);
  const match=request.headers.get('authorization')?.match(/^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/);
  if(!match||match[1].length>8192)throw new Failure('sign_in_required',401);
  const token=match[1],signal=AbortSignal.any([request.signal,AbortSignal.timeout(dependencies.timeoutMs??25000)]);
  if(Number(request.headers.get('content-length')??0)>4096)throw new Failure('payload_too_large',413);
  let value:unknown;try{value=JSON.parse(new TextDecoder().decode(await bytes(request.body,4096,signal)))}catch(error){if(error instanceof Failure)throw error;throw new Failure('invalid_input',400)}
  const input=parseInput(value),now=dependencies.now?.()??new Date();configuration(env);
  const offset=Math.round((Date.parse(input.start)-Date.parse(localDay(now)))/DAY);
  if(input.kind==='weather'&&(offset<0||offset>15))throw new Failure('weather_window_unavailable',422);
  const ip=request.headers.get('CF-Connecting-IP');
  await limit(env.AUTH_RATE_LIMITER,'desktop-signals:ip:'+(ip&&/^[a-f0-9:.]{3,45}$/i.test(ip)?ip:'unknown'),signal);
  const fetcher=dependencies.fetcher??fetch;
  const authFetch=checkedFetch(fetcher,signal,(target,method,forwarded)=>target.origin===env.SUPABASE_URL&&method==='GET'&&['/auth/v1/user','/rest/v1/properties','/rest/v1/property_details'].includes(target.pathname)&&forwarded.get('authorization')==='Bearer '+token);
  const supabase=createClient(env.SUPABASE_URL,env.SUPABASE_PUBLISHABLE_KEY,{global:{fetch:authFetch,headers:{Authorization:'Bearer '+token}},auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,skipAutoInitialize:true}});
  const {data:auth,error:authError}=await supabase.auth.getUser(token);
  if(authError||!auth.user){if(authError&&authError.status!==400&&authError.status!==401&&authError.status!==403)throw new Failure('auth_unavailable',503);throw new Failure('sign_in_required',401)}
  if(!UUID.test(auth.user.id))throw new Failure('sign_in_required',401);
  await limit(env.SIGNALS_RATE_LIMITER,'desktop-signals:user:'+auth.user.id,signal);
  const {data:property,error:propertyError}=await supabase.from('properties').select('id').eq('id',input.propertyId).eq('owner_user_id',auth.user.id).maybeSingle();
  if(propertyError)throw new Failure('property_unavailable',503);
  if(property?.id!==input.propertyId)throw new Failure('property_forbidden',403);
  const readLocation=async()=>{
   const {data,error}=await supabase.from('property_details').select('profile').eq('property_id',input.propertyId).maybeSingle();
   if(error)throw new Failure('profile_unavailable',503);
   const location=data?.profile?.location;
   if(typeof location!=='string'||location.length>300||!normalizeMarketLocation(location))throw new Failure('property_location_required',422);
   if(normalizeMarketLocation(location)!==normalizeMarketLocation(input.location))throw new Failure('property_location_changed',409);
   return location.trim();
  };
  const location=await readLocation();
  if(!env.AMAP_MAPS_API_KEY)throw new Failure('location_service_unavailable',503);
  const externalFetch=checkedFetch(fetcher,signal,(target,method,forwarded)=>!forwarded.has('authorization')&&!forwarded.has('cookie')&&!forwarded.has('apikey')&&(
   target.origin==='https://mcp.amap.com'&&target.pathname==='/mcp'&&method==='POST'||
   method==='GET'&&isOfficialEventCalendarUrl(target)||
   target.origin==='https://api.open-meteo.com'&&target.pathname==='/v1/forecast'&&method==='GET'));
  let point;
  try{point=amapPoint(await amapGeocode(location,signal,{key:env.AMAP_MAPS_API_KEY,fetcher:externalFetch}))}catch{throw new Failure('location_service_unavailable',503)}
  if(!point)throw new Failure('property_location_unknown',422);
  const context={version:1,userId:auth.user.id,propertyId:input.propertyId,location,window:{start:input.start,end:input.end},kind:input.kind};
  let result:Record<string,unknown>;
  if(input.kind==='events'){
   const events=await fetchEvents({window:context.window,scope:{center:point},now,fetcher:externalFetch,signal});
   result={...context,events:events.events,source:events.source};
  }else{
   const weather=await fetchWeather({...point,days:Math.min(16,offset+input.days),fetcher:externalFetch,signal,now});
   const selected=weather.days.filter(row=>row.date>=input.start&&row.date<=input.end);
   const source:SourceRef={...weather.source,coverage:{from:input.start,to:input.end,kind:selected.length===input.days?'complete':selected.length?'partial':'none'}};
   result={...context,days:selected.map(row=>({...row,source})),source};
  }
  // An address edit during provider requests cannot relabel old-location facts.
  await readLocation();
  return new Response(JSON.stringify(result),{headers});
 }catch(error){
  const failure=error instanceof Failure?error:new Failure('service_unavailable',503);
  return new Response(JSON.stringify({version:1,error:failure.code}),{status:failure.status,headers:{...headers,...(failure.status===429?{'Retry-After':'60'}:{})}});
 }
}

const worker={fetch:(request:Request,env:SignalsEnv&AiEnv)=>new URL(request.url).pathname==='/desktop-api/v1/ai'
 ?handleAiRequest(request,env):handleSignalsRequest(request,env)};
export default worker;
