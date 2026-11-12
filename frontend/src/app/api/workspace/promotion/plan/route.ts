import {desktopModelTransport} from '@/lib/desktop-model';
import {validBrief} from '@/lib/promotion';
import {composePromotionPlan,validPromotionDiagnosis} from '@/lib/promotion-plan';
import {promotionContext} from '@/lib/promotion-context';
import {isDemoWorkspace,operatorModelEnabled} from '@/lib/operator-sample';
import {boundedBody,requireSameOrigin,verifiedProperty,WorkspaceError,workspaceFailure} from '@/lib/workspace-access';
export const dynamic='force-dynamic';
export async function POST(request:Request){try{
 requireSameOrigin(request);const account=await verifiedProperty();const {supabase,propertyId,user}=account;let body;
 try{body=JSON.parse(new TextDecoder().decode(await boundedBody(request,4000)))}catch{throw new WorkspaceError('invalid_promotion',400)}
 if(!body||Object.keys(body).some(k=>!['brief','diagnosis','factualOnly'].includes(k))||!validBrief(body.brief)||body.factualOnly!==undefined&&typeof body.factualOnly!=='boolean')throw new WorkspaceError('invalid_promotion',400);
 const diagnosis=body.diagnosis;
 if(diagnosis!==undefined&&!validPromotionDiagnosis(diagnosis))throw new WorkspaceError('invalid_promotion',400);
 const context=await promotionContext(supabase,propertyId,body.brief,diagnosis,isDemoWorkspace(user.email));
 const options={modelTransport:desktopModelTransport(account),diagnosis,reason:context.reason,signal:request.signal};
 let plan;
 try{plan=await composePromotionPlan(context.facts,body.brief,body.brief.language,{...options,model:!body.factualOnly&&operatorModelEnabled()})}
 catch(error){
  if(request.signal.aborted)throw error;
  plan=await composePromotionPlan(context.facts,body.brief,body.brief.language,{...options,model:false});
 }
 await context.unchanged();
 return Response.json({plan,facts:context.facts,reason:context.reason||null},{headers:{'Cache-Control':'private, no-store'}});
}catch(error){return workspaceFailure(error)}}
