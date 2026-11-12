import {desktopModelTransport} from '@/lib/desktop-model';
import {randomUUID} from 'node:crypto';
import {bookingPeriod} from '@/lib/booking-period';
import {adviceFacts,modelSuggestions,marketContext,suggestionText,type OperatingSuggestion} from '@/lib/business-assistant';
import {ruleSuggestions} from '@/lib/decision-summary';
import {validPromotion,type PromotionDraft} from '@/lib/promotion';
import {operatorSample,operatorModelEnabled} from '@/lib/operator-sample';
import {boundedBody,requireSameOrigin,verifiedProperty,WorkspaceError,workspaceFailure} from '@/lib/workspace-access';
export const dynamic='force-dynamic';

// The model writes the operating suggestions, but only from the fetched metrics
// and the verified same-date market summary. On any failure the rules-based
// suggestions are returned and marked as rules, never as an AI result.
export async function POST(request:Request){try{
 requireSameOrigin(request);const account=await verifiedProperty();const {supabase,propertyId}=account;
 let input;try{input=JSON.parse(new TextDecoder().decode(await boundedBody(request,2500)))}catch{throw new WorkspaceError('invalid_input',400)}
 const period=bookingPeriod({start:input.start,end:input.end});
 if(!period||!['zh','en'].includes(input.language))throw new WorkspaceError('invalid_input',400);
 const zh=input.language==='zh',start=period.start!,end=period.end!,t=(en:string,cn:string)=>zh?cn:en;
 const submittedMarket=marketContext(input.market,{start,end});
 const [metrics,stored]=await Promise.all([supabase.rpc(period.rpc,{p_property:propertyId,...period.args}),supabase.from('promotion_workspaces').select('state,revision').eq('property_id',propertyId).maybeSingle()]);
 if(metrics.error||!metrics.data||stored.error||stored.data&&!validPromotion(stored.data.state))throw new WorkspaceError('decision_unavailable',503);
 const data=metrics.data,stamp=new Date(),today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai'}).format(stamp),cutoff=new Date(stamp.valueOf()-7*86400000).toISOString().slice(0,10);
 const market=submittedMarket&&typeof data.rate_min==='number'&&typeof data.rate_max==='number'&&data.rate_min>0&&data.rate_max>=data.rate_min?{...submittedMarket,ownLow:data.rate_min,ownHigh:data.rate_max}:null;
 const sources=(stored.data?.state.sources||[]).filter((s:{start:string;end:string;checkedOn:string})=>s.start<=end&&s.end>=start&&s.checkedOn>=cutoff&&s.checkedOn<=today).slice(0,5);
 const facts=adviceFacts(data,{start,end},market);
 const model=!operatorSample()&&operatorModelEnabled();
 let suggestions:OperatingSuggestion[]=ruleSuggestions(facts,zh),engine:'model_v1'|'rules_v1'='rules_v1',fallback=false;
 if(model){
  try{suggestions=await modelSuggestions(facts,zh,{modelTransport:desktopModelTransport(account),signal:request.signal});engine='model_v1'}
  catch(error){fallback=true;console.warn("Operating advice model unavailable",error instanceof Error?error.message.slice(0,140):"unknown")}
 }
 let content=suggestions.map(s=>suggestionText(s,zh)).join('\n\n');
 while(content.length>4000&&suggestions.length>1){suggestions=suggestions.slice(0,-1);content=suggestions.map(s=>suggestionText(s,zh)).join('\n\n')}
 if(!content.trim()||content.length>4000)throw new WorkspaceError('decision_unavailable',503);
 const basis:PromotionDraft["basis"]=[{label:t('Operating data','经营数据'),text:`${start} — ${end}; ${t('recorded order nights','记录订单间夜')}: ${data.booked_room_nights||0}; ${t('active-room nights','启用客房间夜')}: ${data.capacity_room_nights||0}; ${t('open room nights','空余间夜')}: ${data.available_room_nights||0}; ${t('current list rate range','当前挂牌价范围')}: ${data.rate_min??'—'}–${data.rate_max??'—'}`},...(market?[{label:'RollingGo',text:`${market.start} → ${market.end} · ${market.location} · CNY ${market.low}–${market.high} · ${market.count} hotels · ${market.checkedAt}`}]:[]),...sources.map((s:{title:string;summary:string;url:string})=>({label:s.title,text:s.summary,url:s.url}))];
 const draft:PromotionDraft={kind:"action",id:randomUUID(),createdAt:stamp.toISOString(),engine,brief:{language:input.language,channel:'xiaohongshu',goal:'rooms',start,end,sourceIds:sources.map((s:{id:string})=>s.id)},content,basis};
 return Response.json({draft,engine,fallback,sourceRevision:stored.data?.revision||null},{headers:{'Cache-Control':'no-store'}});
}catch(error){return workspaceFailure(error)}}
