import {randomUUID} from 'node:crypto';
import {composePromotion,validBrief,type PromotionDraft} from '@/lib/promotion';
import {validPromotionPlan} from '@/lib/promotion-plan';
import {promotionContext} from '@/lib/promotion-context';
import {operatorModelEnabled} from '@/lib/operator-sample';
import {boundedBody,requireSameOrigin,verifiedProperty,WorkspaceError,workspaceFailure} from '@/lib/workspace-access';
export const dynamic='force-dynamic';
export async function POST(request:Request){try{
 requireSameOrigin(request);const {supabase,propertyId}=await verifiedProperty();let body;
 try{body=JSON.parse(new TextDecoder().decode(await boundedBody(request,6000)))}catch{throw new WorkspaceError('invalid_promotion',400)}
 if(!body||typeof body!=='object'||Array.isArray(body))throw new WorkspaceError('invalid_promotion',400);
 const {plan,...rawBrief}=body;
 if(!validBrief(rawBrief)||plan!==undefined&&!validPromotionPlan(plan))throw new WorkspaceError('invalid_promotion',400);
 const brief={...rawBrief,goal:'rooms' as const};
 if(plan&&(plan.start!==brief.start||plan.end!==brief.end))throw new WorkspaceError('invalid_promotion',400);
 const context=await promotionContext(supabase,propertyId,brief,plan?.diagnosis),zh=brief.language==='zh';
 if(plan?.factIds.some((id:string)=>!context.facts.some(f=>f.id===id)))throw new WorkspaceError('promotion_changed',409);
 const composed=await composePromotion(context.facts,brief,context.profile.name,{model:operatorModelEnabled(),signal:request.signal,plan});
 const basis:PromotionDraft['basis']=[{label:zh?'民宿资料摘要与启用房型':'Property summary and active room types',text:context.facts.filter(f=>!f.id.startsWith('source_')).map(f=>f.text).join('\n').slice(0,1500)},...context.sources.map(s=>({label:s.title,text:`${s.summary}\n${s.start} — ${s.end}\n${zh?'经营者核对':'Owner checked'}: ${s.checkedOn}`,url:s.url}))];
 await context.unchanged();
 const draft:PromotionDraft={id:randomUUID(),brief,content:composed.content,engine:composed.engine,createdAt:new Date().toISOString(),basis,...(plan?{plan}:{})};
 if(draft.content.length>4000)throw new WorkspaceError('promotion_too_long',422);
 return Response.json({draft,fallback:composed.fallback},{headers:{'Cache-Control':'no-store'}});
}catch(error){return workspaceFailure(error)}}
