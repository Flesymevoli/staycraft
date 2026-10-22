import {validateInventory} from "@/lib/property-inventory";
import {boundedBody,requireSameOrigin,verifiedProperty,WorkspaceError,workspaceFailure} from "@/lib/workspace-access";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"no-store"};
export async function GET(){try{
 const {supabase,propertyId}=await verifiedProperty();
 const {data,error}=await supabase.rpc("get_room_inventory",{p_property:propertyId});
 if(error||!data||!validateInventory(data.inventory,propertyId))throw new WorkspaceError("inventory_unavailable",503);
 return Response.json(data,{headers});
}catch(error){return workspaceFailure(error);}}
export async function PUT(request:Request){try{
 requireSameOrigin(request);const {supabase,propertyId}=await verifiedProperty();let body;
 try{body=JSON.parse(new TextDecoder().decode(await boundedBody(request,160000)));}catch(error){if(error instanceof WorkspaceError)throw error;throw new WorkspaceError("invalid_inventory",400);}
 const inventory=validateInventory(body?.inventory,propertyId);
 if(!inventory||!(body.revision===null||/^[a-f0-9-]{36}$/i.test(body.revision??"")))throw new WorkspaceError("invalid_inventory",400);
 const {data,error}=await supabase.rpc("save_room_inventory",{p_property:propertyId,p_inventory:inventory,p_revision:body.revision});
 if(error){const known=["inventory_changed","invalid_inventory","archive_room_instead","preserve_room_type","property_not_owned"].find(code=>error.message.includes(code));throw new WorkspaceError(known||"save_unavailable",known==="inventory_changed"?409:known==="property_not_owned"?403:known?400:503);}
 if(!data||!validateInventory(data.inventory,propertyId))throw new WorkspaceError("save_unavailable",503);
 return Response.json(data,{headers});
}catch(error){return workspaceFailure(error);}}
