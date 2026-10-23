import {automaticDeliveryAvailable,planReply} from "@/lib/reply-automation";
import {randomBytes} from "node:crypto";
import {isHosted} from "@/lib/deployment";
import {cookies} from "next/headers";
import {createClient} from "@supabase/supabase-js";
import {supabaseConfig} from "@/lib/supabase/config";
import {boundedBody,requireSameOrigin,WorkspaceError,workspaceFailure} from "@/lib/workspace-access";
export const dynamic="force-dynamic";
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
async function handle(request:Request,write:boolean){try{
 const url=new URL(request.url);let data:Record<string,unknown>={};if(write){requireSameOrigin(request);data=JSON.parse(new TextDecoder().decode(await boundedBody(request,10000)));}
 const property=write?data.property:url.searchParams.get("property");const action=write?data.action:url.searchParams.get("action")||"catalog";
 if(typeof property!=="string"||!uuid.test(property)||!(write?["session","book","cancel","message"]:["catalog","orders","messages"]).includes(String(action)))throw new WorkspaceError("invalid_request",400);
 if(action==="message"&&(typeof data.body!=="string"||!data.body.trim()||data.body.length>2000||typeof data.requestId!=="string"||!uuid.test(data.requestId)))throw new WorkspaceError("invalid_message",400);
 const jar=await cookies();let token=jar.get("staycraft-guest")?.value;
 if(action==="session"){if(!token||!/^[a-f0-9]{64}$/.test(token)){token=randomBytes(32).toString("hex");jar.set("staycraft-guest",token,{httpOnly:true,sameSite:"strict",secure:isHosted()||request.url.startsWith("https:"),path:"/",maxAge:60*60*24*30});}return Response.json({ready:true},{headers:{"Cache-Control":"no-store"}});}
 if(action!=="catalog"&&(!token||!/^[a-f0-9]{64}$/.test(token)))throw new WorkspaceError("guest_session_required",401);
 const config=supabaseConfig();const client=createClient(config.url,config.publishableKey,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:result,error}=await client.rpc(action==="messages"||action==="message"?"guest_message_api":"direct_booking_api",{p_property:property,p_action:action,p_token:token||null,p_data:write?data:{arrival:url.searchParams.get("arrival"),departure:url.searchParams.get("departure")}});
 if(error){const known=["stay_changed","sold_out","price_changed","request_changed","booking_limit","invalid_dates","invalid_guest","type_unavailable","order_not_found","property_unavailable","invalid_message","message_rate_limit","conversation_limit"];const code=known.find(code=>error.message.includes(code));throw new WorkspaceError(code||"booking_unavailable",code==="message_rate_limit"?429:code==="stay_changed"||code==="sold_out"||code==="price_changed"||code==="request_changed"?409:code?400:503);}
 if(action==="message"&&automaticDeliveryAvailable()){
  // A reply failure never rolls back or duplicates the already saved guest message.
  try{
   const begun=await client.rpc("guest_reply_automation",{p_property:property,p_token:token,p_action:"begin",p_data:{}});
   if(!begun.error&&begun.data?.state==="processing"&&begun.data.claim&&typeof begun.data.message==="string"){
    const plan=await planReply(begun.data.message,begun.data.profile||{},{model:process.env.FORMAL_MODEL_ENABLED==="1"&&process.env.MODEL_ENABLED==="1"});
    await client.rpc("guest_reply_automation",{p_property:property,p_token:token,p_action:"finish",p_data:{claim:begun.data.claim,...plan}});
   }
   const fresh=await client.rpc("guest_message_api",{p_property:property,p_action:"messages",p_token:token,p_data:{}});if(!fresh.error&&fresh.data)return Response.json(fresh.data,{headers:{"Cache-Control":"no-store"}});
  }catch{/* The saved guest message remains available for manual handling. */}
 }
 if(action==="catalog"){
  const details=await client.rpc("guest_property_profile",{p_property:property});
  if(details.error||!details.data)throw new WorkspaceError("property_unavailable",503);
  return Response.json({...result,profile:details.data},{headers:{"Cache-Control":"no-store"}});
 }
 return Response.json(result,{headers:{"Cache-Control":"no-store"}});
}catch(error){return workspaceFailure(error);}}
export async function GET(request:Request){return handle(request,false);}
export async function POST(request:Request){return handle(request,true);}
