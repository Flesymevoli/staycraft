import type {AgentMarket} from './decision-agent-types';
import {COMPARABLE_ONE_NIGHT} from './market-comparable';

type HotelRecord={hotelId?:unknown;name?:unknown;price?:{hasPrice?:unknown;lowestPrice?:unknown;currency?:unknown;message?:unknown}};
function decode(raw:string){
 if(raw.length>1500000)throw new Error('market_response_too_large');
 const candidates=raw.trim().startsWith('{')?[raw]:raw.split('\n').filter(line=>line.startsWith('data:')).map(line=>line.slice(5).trim());
 for(const candidate of candidates){try{const value=JSON.parse(candidate);if(value.result)return value;}catch{}}
 throw new Error('market_response_invalid');
}

export async function queryPropertyMarket(location:string,start:string,end:string,options:{signal?:AbortSignal;fetcher?:typeof fetch;key?:string}={}):Promise<AgentMarket>{
 const key=options.key||process.env.ROLLINGGO_API_KEY;
 if(!key)throw new Error('market_not_configured');
 if(!location.trim())throw new Error('property_location_required');
 if(Date.parse(end)-Date.parse(start)!==86400000)throw new Error('one_night_required');
 const response=await (options.fetcher||fetch)('https://mcp.rollinggo.cn/mcp',{
  method:'POST',redirect:'manual',cache:'no-store',signal:options.signal?AbortSignal.any([options.signal,AbortSignal.timeout(18000)]):AbortSignal.timeout(18000),
  headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json',Accept:'application/json, text/event-stream'},
  body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'searchHotels',arguments:{originQuery:`查询${location}附近酒店公开报价`,place:location,placeType:'详细地址',checkInParam:{checkInDate:start,stayNights:1,adultCount:2},size:5}}})
 });
 if(!response.ok)throw new Error('market_unavailable');
 const envelope=decode(await response.text()),result=envelope.result;
 if(result.isError)throw new Error('market_unavailable');
 const payload=result.structuredContent||JSON.parse(result.content?.find((item:{type:string})=>item.type==='text')?.text||'{}');
 if(!payload.success||!Array.isArray(payload.hotelInformationList))throw new Error('market_unavailable');
 const records=payload.hotelInformationList.slice(0,5) as HotelRecord[];
 const ids=new Set<string>();
 const hotels=records.filter(h=>{const id=String(h.hotelId??h.name??'');if(!id||ids.has(id))return false;ids.add(id);return true}).map(h=>({
  name:typeof h.name==='string'?h.name.slice(0,120):'Hotel',
  price:h.price?.hasPrice===true&&typeof h.price.lowestPrice==='number'&&Number.isFinite(h.price.lowestPrice)&&h.price.lowestPrice>0?h.price.lowestPrice:null,
  currency:typeof h.price?.currency==='string'?h.price.currency.toUpperCase().slice(0,8):'',
  conditions:typeof h.price?.message==='string'?h.price.message.slice(0,300):'Amount basis unavailable'
 }));
 const comparable=hotels.filter(h=>h.price!==null&&h.currency==='CNY'&&COMPARABLE_ONE_NIGHT.test(h.conditions));
 const prices=comparable.map(h=>h.price!);
 return {query:{location,rooms:1,adults:2,nights:1,limit:5},start,end,count:comparable.length,currency:'CNY',low:prices.length>=2?Math.min(...prices):null,high:prices.length>=2?Math.max(...prices):null,hotels};
}
