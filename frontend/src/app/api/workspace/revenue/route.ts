import {verifiedProperty,workspaceFailure,WorkspaceError} from "@/lib/workspace-access";
import {completedRevenueOrder,monthBounds} from "@/lib/revenue-source";
export const dynamic="force-dynamic";
export async function GET(request:Request){try{
 const month=new URL(request.url).searchParams.get("month")||"";let bounds;
 try{bounds=monthBounds(month)}catch{throw new WorkspaceError("invalid_month",400)}
 const {supabase,propertyId}=await verifiedProperty();
 // Exact count avoids silently treating a server row cap as the complete month.
 const rows:Record<string,unknown>[]= [];let expected:number|null=null;
 for(let offset=0;offset<10000;offset+=1000){
  const {data,error,count}=await supabase.from("direct_bookings").select("id,room_number,type_name,arrival,departure,total,status,stay_state",{count:"exact"}).eq("property_id",propertyId).eq("status","confirmed").eq("stay_state","completed").lt("arrival",bounds.end).gt("departure",bounds.start).order("id").range(offset,offset+999);
  if(error||!Array.isArray(data)||count===null||count>10000||(expected!==null&&count!==expected))throw new WorkspaceError("revenue_unavailable",503);
  expected=count;rows.push(...data);if(rows.length===count)break;
  if(data.length!==1000)throw new WorkspaceError("revenue_unavailable",503);
 }
 if(rows.length!==expected||new Set(rows.map(row=>row.id)).size!==rows.length)throw new WorkspaceError("revenue_unavailable",503);
 const orders=rows.map(completedRevenueOrder);
 return Response.json({month,orders},{headers:{"Cache-Control":"no-store"}});
}catch(error){return workspaceFailure(error);}}
