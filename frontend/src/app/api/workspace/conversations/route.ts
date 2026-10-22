import {boundedBody,requireSameOrigin,verifiedProperty,WorkspaceError,workspaceFailure} from "@/lib/workspace-access";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"no-store"};
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export async function GET(request:Request){try{
 const {supabase,propertyId}=await verifiedProperty();const thread=new URL(request.url).searchParams.get("thread");
 if(!thread){const {data,error}=await supabase.rpc("get_conversations",{p_property:propertyId});if(error)throw error;return Response.json({items:data},{headers});}
 if(!uuid.test(thread))throw new WorkspaceError("invalid_thread",400);
 const {data:conversation,error}=await supabase.from("conversations").select("id,guest_name").eq("property_id",propertyId).eq("id",thread).maybeSingle();
 if(error)throw error;if(!conversation)throw new WorkspaceError("conversation_not_found",404);
 const {data:messages,error:readError}=await supabase.from("messages").select("id,sender,body,created_at").eq("property_id",propertyId).eq("conversation_id",thread).order("created_at").order("id").limit(200);
 if(readError)throw readError;return Response.json({...conversation,messages},{headers});
}catch(error){return workspaceFailure(error);}}
export async function POST(request:Request){try{
 requireSameOrigin(request);const {supabase,propertyId}=await verifiedProperty();let body;
 try{body=JSON.parse(new TextDecoder().decode(await boundedBody(request,10000)));}catch(error){if(error instanceof WorkspaceError)throw error;throw new WorkspaceError("invalid_message",400);}
 if(!uuid.test(body?.thread||"")||!uuid.test(body?.requestId||"")||!uuid.test(body?.replyTo||"")||typeof body?.body!=="string"||!body.body.trim()||body.body.length>2000)throw new WorkspaceError("invalid_message",400);
 const {data,error}=await supabase.rpc("reply_conversation",{p_property:propertyId,p_thread:body.thread,p_request:body.requestId,p_reply_to:body.replyTo,p_body:body.body.trim()});
 if(error){const code=["conversation_changed","request_changed","conversation_not_found","property_not_owned","invalid_message"].find(code=>error.message.includes(code));throw new WorkspaceError(code||"reply_unavailable",code==="conversation_changed"||code==="request_changed"?409:code==="conversation_not_found"?404:code==="property_not_owned"?403:code?400:503);}
 return Response.json(data,{headers});
}catch(error){return workspaceFailure(error);}}
