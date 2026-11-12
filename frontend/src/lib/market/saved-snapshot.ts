import type {SupabaseClient} from '@supabase/supabase-js';
import {operatorSample} from '../operator-sample';
import {DEMO_PERIOD} from '../demo-period';
import {readCollectedSnapshot} from './collected';
import {demoQuotes} from './demo-quotes';
import {marketDay} from './quote-identity';
import type {Quote} from './types';
import {marketScopeLocation} from './snapshot-scope';

function validQuote(value: unknown): value is Quote {
 const quote=value as Quote;
 return !!quote&&typeof quote.id==='string'&&typeof quote.sourceName==='string'&&!!quote.sourceName.trim()
  && ['manual','rollinggo','platform'].includes(quote.source)&&marketDay(quote.stayDate)
  && typeof quote.capturedAt==='string'&&Number.isFinite(Date.parse(quote.capturedAt))
  && Number.isInteger(quote.nights)&&quote.nights>=1&&quote.nights<=28&&Number.isInteger(quote.adults)&&quote.adults>=1&&quote.adults<=10
  && ['available','stale','no_saleable','source_error','missing','unknown'].includes(quote.status)
  && ['starting','plan','calendar','display'].includes(quote.priceType)
  && (quote.sourceUrl===undefined||typeof quote.sourceUrl==='string'&&/^https:\/\//i.test(quote.sourceUrl))
  && (['available','stale'].includes(quote.status)?typeof quote.priceCny==='number'&&Number.isFinite(quote.priceCny)&&quote.priceCny>0&&quote.priceCny<=1000000:quote.priceCny===null);
}

export async function readSavedMarketSnapshot(db:SupabaseClient,propertyId:string,email?:string){
 const local=operatorSample();
 const localSnapshot=(allowFictional:boolean)=>{
  const collected=readCollectedSnapshot();
  if(collected?.status==='collected')return {status:'collected' as const,quotes:collected.quotes,capturedAt:collected.capturedAt,capturedLocation:null};
  if(collected&&allowFictional)return {status:'unavailable' as const,quotes:[],capturedAt:null,capturedLocation:null,localCollection:true};
  const quotes=allowFictional?demoQuotes(DEMO_PERIOD.start):[];
  return {status:allowFictional?'fictional' as const:'none' as const,quotes,capturedAt:quotes[0]?.capturedAt??null,capturedLocation:allowFictional?'江苏省苏州市太仓市娄江新城 · 西浦北里（虚构演示地址）':null};
 };
 if(local&&process.env.STAYCRAFT_QA_DESKTOP_SYNC!=='1')return localSnapshot(true);
 const {data,error}=await db.from('market_quote_batches').select('captured_at,window_start,window_end,quotes,note')
  .eq('property_id',propertyId).order('captured_at',{ascending:false}).limit(1).abortSignal(AbortSignal.timeout(5000));
 const row=data?.[0];
 if(error)return {status:'unavailable' as const,quotes:[],capturedAt:null,capturedLocation:null};
 if(!row)return local&&email==='account-1@example.invalid'?localSnapshot(false):{status:'none' as const,quotes:[],capturedAt:null,capturedLocation:null};
 return {status:'imported' as const,quotes:(Array.isArray(row.quotes)?row.quotes:[]).filter(validQuote),
  capturedAt:row.captured_at as string,capturedLocation:marketScopeLocation(row.note),batchWindow:{start:row.window_start as string,end:row.window_end as string}};
}
