import {verifiedProperty,workspaceFailure,WorkspaceError} from "@/lib/workspace-access";
import {bookingPeriod} from "@/lib/booking-period";
import {isDemoWorkspace} from "@/lib/operator-sample";
import {DEMO_PERIOD,demoMetrics} from "@/lib/demo-period";
export const dynamic="force-dynamic";
export async function GET(request:Request){try{
 const params=new URL(request.url).searchParams,period=bookingPeriod({days:params.get("days")??undefined,start:params.get("start")??undefined,end:params.get("end")??undefined});if(!period)throw new WorkspaceError("invalid_period",400);
 const {supabase,propertyId,user}=await verifiedProperty();
 const demo=isDemoWorkspace(user.email);
 const selected=demo&&!period.start?bookingPeriod(DEMO_PERIOD)!:period;
 const {data,error}=await supabase.rpc(selected.rpc,{p_property:propertyId,...selected.args});
 if(error||!data||data.period_days!==selected.days||!Array.isArray(data.daily)||data.daily.length!==selected.days||(selected.start&&(data.period_start!==selected.start||data.period_end!==selected.end)))throw new WorkspaceError("metrics_unavailable",503);
 return Response.json(demo?demoMetrics(data):data,{headers:{"Cache-Control":"no-store"}});
}catch(error){return workspaceFailure(error);}}
