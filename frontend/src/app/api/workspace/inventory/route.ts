import { randomUUID } from "node:crypto";
import { emptyInventory, validateInventory } from "@/lib/property-inventory";
import { boundedBody, requireSameOrigin, verifiedProperty, WorkspaceError, workspaceFailure } from "@/lib/workspace-access";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"no-store"};
export async function GET(){
  try{
    const {supabase,propertyId}=await verifiedProperty();
    const {data,error}=await supabase.from("property_inventory").select("inventory,revision").eq("property_id",propertyId).maybeSingle();
    if(error || (data && !validateInventory(data.inventory,propertyId)))throw new WorkspaceError("inventory_unavailable",503);
    return Response.json({inventory:data?.inventory ?? emptyInventory,revision:data?.revision ?? null},{headers});
  }catch(error){return workspaceFailure(error);}
}
export async function PUT(request:Request){
  try{
    requireSameOrigin(request);
    const {supabase,propertyId}=await verifiedProperty();
    let body;try{body=JSON.parse(new TextDecoder().decode(await boundedBody(request,160000)));}catch(error){if(error instanceof WorkspaceError)throw error;throw new WorkspaceError("invalid_inventory",400);}
    const inventory=validateInventory(body?.inventory,propertyId);
    if(!inventory || !(body.revision===null || /^[a-f0-9-]{36}$/i.test(body.revision ?? "")))throw new WorkspaceError("invalid_inventory",400);
    const {data:previous,error:readError}=await supabase.from("property_inventory").select("inventory,revision").eq("property_id",propertyId).maybeSingle();
    if(readError)throw new WorkspaceError("inventory_unavailable",503);
    if((previous?.revision ?? null)!==body.revision)throw new WorkspaceError("inventory_changed",409);
    // Room IDs will be referenced by reservations. Archive instead of deleting them.
    if(previous && previous.inventory.rooms.some((r:{id:string})=>!inventory.rooms.some(n=>n.id===r.id)))throw new WorkspaceError("archive_room_instead",400);
    const row={property_id:propertyId,inventory,revision:randomUUID(),updated_at:new Date().toISOString()};
    const query=body.revision===null?supabase.from("property_inventory").insert(row):supabase.from("property_inventory").update(row).eq("property_id",propertyId).eq("revision",body.revision);
    const {data,error}=await query.select("inventory,revision");
    if(error?.code==="23505" || (!error && !data?.length))throw new WorkspaceError("inventory_changed",409);
    if(error || data?.length!==1)throw new WorkspaceError("save_unavailable",503);
    return Response.json(data[0],{headers});
  }catch(error){return workspaceFailure(error);}
}
