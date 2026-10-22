import {verifiedProperty,workspaceFailure,WorkspaceError} from "@/lib/workspace-access";
export const dynamic="force-dynamic";
export async function GET(request:Request){try{
 const days=new URL(request.url).searchParams.get("days")||"7";if(!["7","28"].includes(days))throw new WorkspaceError("invalid_period",400);
 const {supabase,propertyId}=await verifiedProperty();const {data,error}=await supabase.rpc("get_booking_metrics",{p_property:propertyId,p_days:Number(days)});
 if(error||!data||data.period_days!==Number(days)||!Array.isArray(data.daily)||data.daily.length!==Number(days))throw new WorkspaceError("metrics_unavailable",503);
 return Response.json(data,{headers:{"Cache-Control":"no-store"}});
}catch(error){return workspaceFailure(error);}}
