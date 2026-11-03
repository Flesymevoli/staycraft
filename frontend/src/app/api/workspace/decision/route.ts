import {randomUUID} from 'node:crypto';
import {bookingPeriod} from '@/lib/booking-period';
import {prioritiseInsights} from '@/lib/business-assistant';
import {decisionSummary} from '@/lib/decision-summary';
import {validPromotion,type PromotionDraft} from '@/lib/promotion';
import {operatorSample} from '@/lib/operator-sample';
import {boundedBody,requireSameOrigin,verifiedProperty,WorkspaceError,workspaceFailure} from '@/lib/workspace-access';
export const dynamic='force-dynamic';
export async function POST(request:Request){try{
 requireSameOrigin(request);const {supabase,propertyId}=await verifiedProperty();
 let input;try{input=JSON.parse(new TextDecoder().decode(await boundedBody(request,1000)))}catch{throw new WorkspaceError('invalid_input',400)}
 const period=bookingPeriod({start:input.start,end:input.end});
 if(!period||!['zh','en'].includes(input.language))throw new WorkspaceError('invalid_input',400);
 const zh=input.language==='zh',t=(en:string,cn:string)=>zh?cn:en;
 const [metrics,stored]=await Promise.all([supabase.rpc(period.rpc,{p_property:propertyId,...period.args}),supabase.from('promotion_workspaces').select('state,revision').eq('property_id',propertyId).maybeSingle()]);
 if(metrics.error||!metrics.data||stored.error||stored.data&&!validPromotion(stored.data.state))throw new WorkspaceError('decision_unavailable',503);
 const data=metrics.data,stamp=new Date(),today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai'}).format(stamp),cutoff=new Date(stamp.valueOf()-7*86400000).toISOString().slice(0,10);
 const sources=(stored.data?.state.sources||[]).filter((s:{start:string;end:string;checkedOn:string})=>s.start<=period.end!&&s.end>=period.start!&&s.checkedOn>=cutoff&&s.checkedOn<=today).slice(0,5);
 const {price,items}=decisionSummary(data,zh);
 const ranked=await prioritiseInsights(items,{model:!operatorSample()&&process.env.MODEL_ENABLED==='1'&&process.env.FORMAL_MODEL_ENABLED==='1',signal:request.signal});
 const content=[price,...ranked.items.map(i=>`${i.title}\n${i.action}`)].join('\n\n');
 const draft:PromotionDraft={kind:"action",id:randomUUID(),createdAt:stamp.toISOString(),engine:ranked.engine,brief:{language:input.language,channel:'xiaohongshu',goal:'rooms',start:period.start!,end:period.end!,sourceIds:sources.map((s:{id:string})=>s.id)},content,basis:[{label:t('Booking basis','经营依据'),text:`${period.start} — ${period.end}; ${t('recorded order nights','记录订单间夜')}: ${data.booked_order_room_nights||0}; ${t('current list rate range','当前挂牌价范围')}: ${data.rate_min??'—'}–${data.rate_max??'—'}; ${t('partial channel coverage; not cash receipts','渠道可能不完整，不代表实收')}`},...sources.map((s:{title:string;summary:string;url:string})=>({label:s.title,text:s.summary,url:s.url}))]};
 return Response.json({draft,fallback:ranked.fallback,sourceRevision:stored.data?.revision||null},{headers:{'Cache-Control':'no-store'}});
}catch(error){return workspaceFailure(error)}}
