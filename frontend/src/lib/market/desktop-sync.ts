import {createHash} from 'node:crypto';
import {observationToQuote,validObservation} from './ctrip';
import {marketDay} from './quote-identity';
import type {Quote} from './types';

export function prepareCtripBatch(start:unknown,end:unknown,observations:unknown){
 if(!marketDay(start)||!marketDay(end)||start>end||Date.parse(end)-Date.parse(start)>27*86400000)return null;
 if(!Array.isArray(observations)||observations.length<1||observations.length>20000)return null;

 const seen=new Set<string>();
 const quotes:Quote[]=[];
 let capturedAt='';
 for(const raw of observations){
  if(raw?.kind==='display_starting_price'){
   if(typeof raw.hotelName!=='string'||!raw.hotelName.trim()||raw.hotelName.length>160||
      !marketDay(raw.stayDate)||raw.stayDate<start||raw.stayDate>end||
      typeof raw.capturedAt!=='string'||!Number.isFinite(Date.parse(raw.capturedAt))||
      !Number.isInteger(raw.adults)||raw.adults<1||raw.adults>10||
      !Number.isFinite(raw.amount)||raw.amount<=0||raw.amount>1000000||raw.currency!=='CNY'||
      raw.rooms!==1||raw.children!==0||raw.nights!==1)return null;
   const name=raw.hotelName.trim();
   const hotelId='list-'+createHash('sha256').update(name.normalize('NFKC')).digest('hex').slice(0,24);
   const identity=hotelId+':'+raw.stayDate;
   if(seen.has(identity))return null;
   seen.add(identity);
   const timestamp=new Date(raw.capturedAt).toISOString();
   if(timestamp.length!==24)return null;
   if(timestamp>capturedAt)capturedAt=timestamp;
   quotes.push({id:identity,hotelId,source:'platform',sourceName:name,capturedAt:timestamp,
    stayDate:raw.stayDate,nights:1,adults:raw.adults,priceCny:raw.amount,priceType:'display',status:'available',
    sourceUrl:'https://hotels.ctrip.com/hotels/list',
    note:'携程搜索列表起价'});
   continue;
  }
  if(!validObservation(raw)||typeof raw.hotelId!=='string'||raw.hotelName.length>160||raw.stayDate<start||raw.stayDate>end)return null;
  const identity=raw.hotelId+':'+raw.stayDate;
  if(seen.has(identity))return null;
  seen.add(identity);
  const timestamp=new Date(raw.capturedAt).toISOString();
  if(timestamp.length!==24)return null;
  if(timestamp>capturedAt)capturedAt=timestamp;
  // The conversion copies only public quote fields. Browser session metadata stays local.
  const quote=observationToQuote({...raw,capturedAt:timestamp,hotelName:raw.hotelName.trim()});
  // These fields are optional in TypeScript and absent after serialization to JSONB.
  delete quote.roomType;
  delete quote.roomClass;
  quotes.push(quote);
 }
 if(quotes.some(quote=>quote.priceType==='display')&&quotes.some(quote=>quote.priceType!=='display'))return null;
 quotes.sort((a,b)=>a.id.localeCompare(b.id));
 return {source:'ctrip',captured_at:capturedAt,window_start:start,window_end:end,quotes,quote_count:quotes.length};
}
