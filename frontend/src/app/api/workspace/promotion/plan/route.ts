import {validBrief} from '@/lib/promotion';
import {composePromotionPlan} from '@/lib/promotion-plan';
import {promotionContext} from '@/lib/promotion-context';
import {operatorModelEnabled} from '@/lib/operator-sample';
import {boundedBody,requireSameOrigin,verifiedProperty,WorkspaceError,workspaceFailure} from '@/lib/workspace-access';
export const dynamic='force-dynamic';
export async function POST(request:Request){try{
 requireSameOrigin(request);const {supabase,propertyId}=await verifiedProperty();let body;
 try{body=JSON.parse(new TextDecoder().decode(await boundedBody(request,4000)))}catch{throw new WorkspaceError('invalid_promotion',400)}
 if(!body||Object.keys(body).some(k=>!['brief','diagnosis'].includes(k))||!validBrief(body.brief))throw new WorkspaceError('invalid_promotion',400);
 const diagnosis=body.diagnosis;
 if(diagnosis!==undefined&&(!diagnosis||Object.keys(diagnosis).sort().join()!=='findingId,runId'||!/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(diagnosis.runId)||!/^finding-\d+$/.test(diagnosis.findingId)))throw new WorkspaceError('invalid_promotion',400);
 const context=await promotionContext(supabase,propertyId,body.brief,diagnosis);
 let plan;try{plan=await composePromotionPlan(context.facts,body.brief,body.brief.language,{model:operatorModelEnabled(),diagnosis,reason:context.reason,signal:request.signal})}catch{throw new WorkspaceError('promotion_plan_unavailable',503)}
 await context.unchanged();
 return Response.json({plan,facts:context.facts,reason:context.reason||null},{headers:{'Cache-Control':'private, no-store'}});
}catch(error){return workspaceFailure(error)}}
