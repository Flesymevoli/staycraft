import {automaticDeliveryAvailable} from "@/lib/reply-automation";
import {boundedBody,requireSameOrigin,verifiedProperty,WorkspaceError,workspaceFailure} from "@/lib/workspace-access";
export const dynamic="force-dynamic";
export async function GET(){try{
 const {supabase,propertyId}=await verifiedProperty();const {data,error}=await supabase.from("reply_automation_settings").select("enabled,revision").eq("property_id",propertyId).maybeSingle();if(error)throw error;
 const history=await supabase.from("reply_automation_events").select("id,conversation_id,state,reason,engine,citation_key,citation_value,created_at").eq("property_id",propertyId).order("created_at",{ascending:false}).order("id").limit(30);if(history.error)throw history.error;
 return Response.json({enabled:data?.enabled||false,revision:data?.revision||null,available:automaticDeliveryAvailable(),events:history.data},{headers:{"Cache-Control":"no-store"}});
}catch(error){return workspaceFailure(error)}}
export async function POST(request:Request){try{
 requireSameOrigin(request);const {supabase,propertyId}=await verifiedProperty();let body;
 try{body=JSON.parse(new TextDecoder().decode(await boundedBody(request,1024)))}catch{throw new WorkspaceError("invalid_request",400)}
 const uuid=(v:unknown)=>typeof v==="string"&&/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(v);
 if(body.thread){if(!uuid(body.thread)||typeof body.manual!=="boolean"||Object.keys(body).some(k=>!["thread","manual"].includes(k)))throw new WorkspaceError("invalid_request",400)}
 else if(typeof body.enabled!=="boolean"||!(body.revision===null||uuid(body.revision))||Object.keys(body).some(k=>!["enabled","revision"].includes(k)))throw new WorkspaceError("invalid_request",400);
 if((body.enabled===true||body.manual===false)&&!automaticDeliveryAvailable())throw new WorkspaceError("automation_unavailable",503);
 const {data,error}=await supabase.rpc("control_reply_automation",{p_property:propertyId,p_enabled:body.enabled??null,p_revision:body.revision??null,p_thread:body.thread??null,p_manual:body.manual??null});
 if(error)throw new WorkspaceError(error.message.includes("settings_changed")?"settings_changed":"automation_unavailable",error.message.includes("settings_changed")?409:503);
 return Response.json(data,{headers:{"Cache-Control":"no-store"}});
}catch(error){return workspaceFailure(error)}}
