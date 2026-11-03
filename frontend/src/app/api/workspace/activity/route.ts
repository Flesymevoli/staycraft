import {verifiedProperty,workspaceFailure} from "@/lib/workspace-access";
export const dynamic="force-dynamic";
export async function GET(){try{
 const {supabase,propertyId}=await verifiedProperty();
 const [activity,batches,tasks]=await Promise.all([supabase.from("operation_activity").select("id,kind,resource_id,room_number,automatic,completed,created_at").eq("property_id",propertyId).order("created_at",{ascending:false}).order("id").limit(30),supabase.from("booking_import_batches").select("id,imported_at").eq("property_id",propertyId).order("imported_at",{ascending:false}).limit(10),supabase.from("booking_import_tasks").select("id,completed_at").eq("property_id",propertyId).not("completed_at","is",null).order("completed_at",{ascending:false}).limit(20)]);
 if(activity.error||batches.error||tasks.error||!Array.isArray(activity.data)||!Array.isArray(batches.data)||!Array.isArray(tasks.data))throw new Error();
 const items=[...activity.data.map(row=>({...row,href:row.kind.startsWith("room_")?`/app/rooms/${row.resource_id}`:`/app/bookings/${row.resource_id}`})),...batches.data.map(row=>({id:row.id,kind:"booking_imported",room_number:"",automatic:true,completed:true,created_at:row.imported_at,href:"/app/work"})),...tasks.data.map(row=>({id:row.id,kind:"import_task_completed",room_number:"",automatic:false,completed:true,created_at:row.completed_at!,href:"/app/work"}))].sort((a,b)=>b.created_at.localeCompare(a.created_at)||b.id.localeCompare(a.id)).slice(0,30);
 return Response.json({items},{headers:{"Cache-Control":"no-store"}});
}catch(error){return workspaceFailure(error)}}
