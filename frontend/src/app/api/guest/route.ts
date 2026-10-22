import {randomBytes} from "node:crypto";
import {cookies} from "next/headers";
import {createClient} from "@supabase/supabase-js";
import {supabaseConfig} from "@/lib/supabase/config";
import {boundedBody,requireSameOrigin,WorkspaceError,workspaceFailure} from "@/lib/workspace-access";
export const dynamic="force-dynamic";
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
async function handle(request:Request,write:boolean){try{
 const url=new URL(request.url);let data:Record<string,unknown>={};if(write){requireSameOrigin(request);data=JSON.parse(new TextDecoder().decode(await boundedBody(request,4096)));}
 const property=write?data.property:url.searchParams.get("property");const action=write?data.action:url.searchParams.get("action")||"catalog";
 if(typeof property!=="string"||!uuid.test(property)||!(write?["session","book","cancel"]:["catalog","orders"]).includes(String(action)))throw new WorkspaceError("invalid_request",400);
 const jar=await cookies();let token=jar.get("staycraft-guest")?.value;
 if(action==="session"){if(!token||!/^[a-f0-9]{64}$/.test(token)){token=randomBytes(32).toString("hex");jar.set("staycraft-guest",token,{httpOnly:true,sameSite:"strict",secure:request.url.startsWith("https:"),path:"/",maxAge:60*60*24*30});}return Response.json({ready:true},{headers:{"Cache-Control":"no-store"}});}
 if(action!=="catalog"&&(!token||!/^[a-f0-9]{64}$/.test(token)))throw new WorkspaceError("guest_session_required",401);
 const config=supabaseConfig();const client=createClient(config.url,config.publishableKey,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:result,error}=await client.rpc("direct_booking_api",{p_property:property,p_action:action,p_token:token||null,p_data:write?data:{arrival:url.searchParams.get("arrival"),departure:url.searchParams.get("departure")}});
 if(error){const known=["sold_out","price_changed","request_changed","booking_limit","invalid_dates","invalid_guest","type_unavailable","order_not_found","property_unavailable"];const code=known.find(code=>error.message.includes(code));throw new WorkspaceError(code||"booking_unavailable",code==="sold_out"||code==="price_changed"||code==="request_changed"?409:code?400:503);}
 return Response.json(result,{headers:{"Cache-Control":"no-store"}});
}catch(error){return workspaceFailure(error);}}
export async function GET(request:Request){return handle(request,false);}
export async function POST(request:Request){return handle(request,true);}
