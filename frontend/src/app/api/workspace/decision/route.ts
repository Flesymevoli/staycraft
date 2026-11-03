import {randomUUID} from 'node:crypto';
import {bookingPeriod} from '@/lib/booking-period';
import {groundedInsights,prioritiseInsights} from '@/lib/business-assistant';
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
 const items=groundedInsights(data,'week',zh);
 items.push({id:'market-check',title:t('Check price comparability before changing rates','调价前先核对报价可比性'),evidence:sources.length?t(`${sources.length} owner-checked references match this period. Room and package comparability is not established.`,`所选期间有 ${sources.length} 条经营者已核对参考，房型和套餐可比性尚未确认。`):t('No recent, date-matched reference is available. Low booking levels alone do not justify a price cut.','暂无近期且日期匹配的参考。仅凭低预订不能判断需要降价。'),action:t('Verify stay dates, room type, guests, membership, breakfast, taxes and cancellation terms. Keep rates unchanged until evidence is sufficient.','核对日期、房型、人数、会员条件、早餐、税费与退改。证据不足时先核实，不给出确定调价结论。'),href:'/app/explore'});
 const ranked=await prioritiseInsights(items,{model:!operatorSample()&&process.env.MODEL_ENABLED==='1'&&process.env.FORMAL_MODEL_ENABLED==='1',signal:request.signal});
 const content=[t('Operating action plan','经营行动方案'),`${period.start} — ${period.end}`,...ranked.items.map(i=>`${i.title}\n${i.evidence}\n${i.action}`),t('Review before acting. Not a forecast or an automatic OTA price change.','执行前请核对；不是需求预测，不会自动修改 OTA 价格。')].join('\n\n');
 const draft:PromotionDraft={kind:"action",id:randomUUID(),createdAt:stamp.toISOString(),engine:ranked.engine,brief:{language:input.language,channel:'xiaohongshu',goal:'rooms',start:period.start!,end:period.end!,sourceIds:sources.map((s:{id:string})=>s.id)},content,basis:[{label:t('Booking basis','经营依据'),text:`${period.start} — ${period.end}; ${t('recorded order nights','记录订单间夜')}: ${data.booked_order_room_nights||0}; ${t('partial channel coverage; not cash receipts','渠道可能不完整，不代表实收')}`},...sources.map((s:{title:string;summary:string;url:string})=>({label:s.title,text:s.summary,url:s.url}))]};
 return Response.json({draft,fallback:ranked.fallback,sourceRevision:stored.data?.revision||null},{headers:{'Cache-Control':'no-store'}});
}catch(error){return workspaceFailure(error)}}
