import {verifiedProperty,workspaceFailure} from "@/lib/workspace-access";
export const dynamic="force-dynamic";
export async function GET(){try{
 const {supabase,propertyId}=await verifiedProperty();
 const [activity,replies]=await Promise.all([supabase.from("operation_activity").select("id,kind,resource_id,room_number,automatic,completed,created_at").eq("property_id",propertyId).order("created_at",{ascending:false}).order("id").limit(30),supabase.from("reply_automation_events").select("id,conversation_id,state,engine,created_at").eq("property_id",propertyId).in("state",["replied","handoff"]).order("created_at",{ascending:false}).order("id").limit(30)]);
 if(activity.error||replies.error||!Array.isArray(activity.data)||!Array.isArray(replies.data))throw new Error();
 const items=[...activity.data.map(row=>({...row,href:row.kind.startsWith("room_")?`/app/rooms/${row.resource_id}`:`/app/bookings/${row.resource_id}`})),...replies.data.map(row=>({id:row.id,kind:row.state==="replied"?"automatic_reply":"reply_handoff",room_number:"",automatic:true,completed:row.state==="replied",created_at:row.created_at,href:`/app/messages/${row.conversation_id}`}))].sort((a,b)=>b.created_at.localeCompare(a.created_at)||b.id.localeCompare(a.id)).slice(0,30);
 return Response.json({items},{headers:{"Cache-Control":"no-store"}});
}catch(error){return workspaceFailure(error)}}
