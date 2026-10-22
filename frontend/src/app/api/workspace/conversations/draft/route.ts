import {boundedBody,requireSameOrigin,verifiedProperty,WorkspaceError,workspaceFailure} from "@/lib/workspace-access";
import {operatorSample} from "@/lib/operator-sample";
export const dynamic="force-dynamic";
export const maxDuration=40;
export async function POST(request:Request){try{
 requireSameOrigin(request);const {supabase,propertyId}=await verifiedProperty();let body;
 try{body=JSON.parse(new TextDecoder().decode(await boundedBody(request,1024)));}catch(error){if(error instanceof WorkspaceError)throw error;throw new WorkspaceError("invalid_request",400);}
 if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(body?.thread||"")||!["en","zh"].includes(body?.language)||Object.keys(body).some(key=>!["thread","language"].includes(key)))throw new WorkspaceError("invalid_request",400);
 const base=process.env.WORKSPACE_BACKEND_URL||(operatorSample()?"http://127.0.0.1:8014":undefined);if(!base)throw new WorkspaceError("draft_unavailable",503);
 const url=new URL(`/v1/properties/${propertyId}/conversations/${body.thread}/draft`,base);
 if(!(url.protocol==="https:"||(url.protocol==="http:"&&["127.0.0.1","localhost","[::1]"].includes(url.hostname))))throw new WorkspaceError("draft_unavailable",503);
 const {data:{session}}=await supabase.auth.getSession();if(!session)throw new WorkspaceError("sign_in_required",401);
 const response=await fetch(url,{method:"POST",headers:{Authorization:`Bearer ${session.access_token}`,"Content-Type":"application/json"},body:JSON.stringify({language:body.language}),signal:AbortSignal.timeout(35000),cache:"no-store",redirect:"error"});
 if(!response.ok)throw new WorkspaceError(response.status===409?"draft_context_changed":"draft_unavailable",response.status===409?409:503);
 const result=await response.json(),decision=result?.decision;if(!result?.id||decision?.sent!==false||decision?.disposition!=="needs_review"||!["rules_v1","model_v1"].includes(decision?.engine)||!(decision.draft===null||(typeof decision.draft==="string"&&decision.draft.length<=1000))||!Array.isArray(decision.citations)||decision.citations.length>2||decision.citations.some((citation:{key?:unknown;value?:unknown})=>!["breakfast","checkin"].includes(String(citation?.key))||typeof citation?.value!=="string"||citation.value.length>200))throw new WorkspaceError("draft_unavailable",503);
 return Response.json(result,{headers:{"Cache-Control":"no-store"}});
}catch(error){return workspaceFailure(error);}}
