import {verifiedProperty,workspaceFailure,WorkspaceError} from "@/lib/workspace-access";
import {bookingPeriod} from "@/lib/booking-period";
export const dynamic="force-dynamic";
export async function GET(request:Request){try{
 const params=new URL(request.url).searchParams,period=bookingPeriod({days:params.get("days")??undefined,start:params.get("start")??undefined,end:params.get("end")??undefined});if(!period)throw new WorkspaceError("invalid_period",400);
 const {supabase,propertyId}=await verifiedProperty();const {data,error}=await supabase.rpc(period.rpc,{p_property:propertyId,...period.args});
 if(error||!data||data.period_days!==period.days||!Array.isArray(data.daily)||data.daily.length!==period.days||(period.start&&(data.period_start!==period.start||data.period_end!==period.end)))throw new WorkspaceError("metrics_unavailable",503);
 return Response.json(data,{headers:{"Cache-Control":"no-store"}});
}catch(error){return workspaceFailure(error);}}
