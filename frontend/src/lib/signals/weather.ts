// Public weather forecast (Open-Meteo, keyless). Weather is context evidence, never an instruction.
import type {Coverage,SourceRef,WeatherDay} from './types';

export type WeatherInput={latitude:number;longitude:number;days?:number;fetcher?:typeof fetch;signal?:AbortSignal;now?:Date};
export type WeatherResult={days:WeatherDay[];source:SourceRef};

const BASE='https://api.open-meteo.com/v1/forecast';
const SHANGHAI='Asia/Shanghai';
const DAY_MS=86400000;
const ISO_DATE=/^\d{4}-\d{2}-\d{2}$/;

function shanghaiDate(date:Date):string{
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:SHANGHAI,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date),
  get=(kind:string)=>parts.find(part=>part.type===kind)?.value||'';
 return `${get('year')}-${get('month')}-${get('day')}`;
}
function addDays(day:string,count:number):string{return new Date(Date.parse(`${day}T00:00:00Z`)+count*DAY_MS).toISOString().slice(0,10)}
function isDay(value:unknown):value is string{return typeof value==='string'&&ISO_DATE.test(value)&&new Date(`${value}T00:00:00Z`).toISOString().slice(0,10)===value}
function clampDays(value:number|undefined):number{return typeof value==='number'&&Number.isFinite(value)?Math.min(16,Math.max(1,Math.floor(value))):7}
function isCode(value:unknown):value is number{return typeof value==='number'&&Number.isInteger(value)&&value>=0&&value<=1000}
function numberAt(values:unknown,index:number):number|null{
 if(!Array.isArray(values))return null;
 const value=values[index];
 return typeof value==='number'&&Number.isFinite(value)?value:null;
}
function precipAt(values:unknown,index:number):number|null{
 const value=numberAt(values,index);
 return value===null||value<0||value>100?null:value;
}
function source(observedAt:string,from:string,to:string,kind:Coverage['kind'],confidence:SourceRef['confidence'],note?:string):SourceRef{
 return {id:'weather',authority:'public',observedAt,coverage:{from,to,kind},confidence,note};
}

export async function fetchWeather(input:WeatherInput):Promise<WeatherResult>{
 const now=input.now instanceof Date&&!Number.isNaN(input.now.getTime())?input.now:new Date(),
  observedAt=now.toISOString(),from=shanghaiDate(now),days=clampDays(input.days),to=addDays(from,days-1),
  fail=(code:string):WeatherResult=>({days:[],source:source(observedAt,from,to,'none','low',`天气源暂不可用（${code}），不作天气相关推断`)});
 const latitude=Number(input.latitude),longitude=Number(input.longitude);
 if(!Number.isFinite(latitude)||latitude<-90||latitude>90||!Number.isFinite(longitude)||longitude<-180||longitude>180)return fail('weather_invalid_coordinates');
 if(input.signal?.aborted)return fail('weather_cancelled');
 const query=new URLSearchParams({latitude:String(latitude),longitude:String(longitude),daily:'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',timezone:SHANGHAI,forecast_days:String(days)});
 try{
  const signal=input.signal?AbortSignal.any([input.signal,AbortSignal.timeout(8000)]):AbortSignal.timeout(8000);
  const response=await (input.fetcher||fetch)(`${BASE}?${query}`,{signal,cache:'no-store'});
  if(!response.ok)return fail(`weather_http_${response.status}`);
  let body:unknown;
  try{body=await response.json()}catch{return fail('weather_invalid_structure')}
  const daily=body&&typeof body==='object'?(body as Record<string,unknown>).daily:undefined;
  if(!daily||typeof daily!=='object')return fail('weather_invalid_structure');
  const record=daily as Record<string,unknown>,time=record.time;
  if(!Array.isArray(time)||time.length===0||time.length>64)return fail('weather_invalid_structure');
  // Date shape and ordering are validated before any day is trusted.
  if(!time.every(isDay))return fail('weather_invalid_structure');
  if(time.some((day,index)=>index>0&&(time[index-1] as string)>=day))return fail('weather_invalid_structure');
  const codes=record.weather_code;
  if(!Array.isArray(codes)||codes.length!==time.length||!codes.every(isCode))return fail('weather_invalid_structure');
  for(const key of ['temperature_2m_max','temperature_2m_min','precipitation_probability_max']){
   const values=record[key];
   if(values!==undefined&&(!Array.isArray(values)||values.length!==time.length))return fail('weather_invalid_structure');
  }
  const dates=(time as string[]).slice(0,days),values=codes as number[],complete=dates.length>=days,
   ref=source(observedAt,from,to,complete?'complete':'partial',complete?'high':'medium');
  return {days:dates.map((date,index)=>({date,code:values[index],tempMin:numberAt(record.temperature_2m_min,index),tempMax:numberAt(record.temperature_2m_max,index),precipProb:precipAt(record.precipitation_probability_max,index),source:ref})),source:ref};
 }catch(error){
  const name=error instanceof Error?error.name:'';
  return fail(name==='TimeoutError'||name==='AbortError'?'weather_timeout':'weather_unavailable');
 }
}
