import {groundedInsights,prioritiseInsights} from "@/lib/business-assistant";
import {bookingPeriod} from "@/lib/booking-period";
import {operatorSample} from "@/lib/operator-sample";
import {validateInventory} from "@/lib/property-inventory";
import {boundedBody,requireSameOrigin,verifiedProperty,WorkspaceError,workspaceFailure} from "@/lib/workspace-access";
export const dynamic="force-dynamic";
export async function POST(request:Request){try{
 requireSameOrigin(request);const {supabase,propertyId}=await verifiedProperty();let body;
 try{body=JSON.parse(new TextDecoder().decode(await boundedBody(request,2500)))}catch{throw new WorkspaceError("invalid_request",400)}
 const period=bookingPeriod(body||{});
 if(!period||!["en","zh"].includes(body?.language)||typeof body?.question!=="string"||body.question.length>500||Object.keys(body).some(k=>!["language","days","question","start","end"].includes(k)))throw new WorkspaceError("invalid_request",400);
 const question=body.question.trim().toLowerCase(),topic=/attention|pending|处理|待办|注意/.test(question)?"attention":/week|business|booking|analysis|经营|预订|分析|本周|这周/.test(question)?"week":null;
 if(!topic)return Response.json({unsupported:true,language:body.language},{headers:{"Cache-Control":"no-store"}});
 const metrics=await supabase.rpc(period.rpc,{p_property:propertyId,...period.args});const data=metrics.data;
 if(metrics.error||!data||data.period_days!==period.days||!Array.isArray(data.daily)||data.daily.length!==period.days||(period.start&&(data.period_start!==period.start||data.period_end!==period.end)))throw new WorkspaceError("analysis_unavailable",503);
 let attention;
 if(topic==="attention"){
  const [inventory,inbox]=await Promise.all([supabase.rpc("get_room_inventory",{p_property:propertyId}),supabase.rpc("get_conversations",{p_property:propertyId})]);
  const rooms=validateInventory(inventory.data?.inventory,propertyId);
  if(inventory.error||!rooms||inbox.error||!Array.isArray(inbox.data))throw new WorkspaceError("analysis_unavailable",503);
  attention={dirty:rooms.rooms.filter(room=>room.active&&room.housekeeping==="dirty").length,pendingMessages:inbox.data.filter((item:{latest?:{sender:string}})=>item.latest?.sender==="guest").length,conversationsRead:inbox.data.length};
 }
 const items=groundedInsights(data,topic,body.language==="zh",attention);
 const result=await prioritiseInsights(items,{model:!operatorSample()&&process.env.FORMAL_MODEL_ENABLED==="1"&&process.env.MODEL_ENABLED==="1",signal:request.signal});
 return Response.json({...result,language:body.language,topic,period_start:data.period_start,period_end:data.period_end,as_of:new Date().toISOString()},{headers:{"Cache-Control":"no-store"}});
}catch(error){return workspaceFailure(error)}}
