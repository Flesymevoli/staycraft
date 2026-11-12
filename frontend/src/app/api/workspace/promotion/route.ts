import {randomUUID} from "node:crypto";
import {emptyPromotion,sourceMatchesLocation,validPromotion} from "@/lib/promotion";
import {validateProfile} from "@/lib/property-profile";
import {boundedBody,requireSameOrigin,verifiedProperty,writableProperty,WorkspaceError,workspaceFailure} from "@/lib/workspace-access";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"no-store"};
export async function GET(){try{
 const {supabase,propertyId}=await verifiedProperty();
 const [{data,error},profile]=await Promise.all([supabase.from("promotion_workspaces").select("state,revision").eq("property_id",propertyId).maybeSingle(),supabase.from("property_details").select("profile").eq("property_id",propertyId).maybeSingle()]);
 if(error||profile.error||data&&!validPromotion(data.state))throw new WorkspaceError("promotion_unavailable",503);
 return Response.json({state:data?.state||emptyPromotion(),revision:data?.revision||null,location:validateProfile(profile.data?.profile)?.location||''},{headers});
}catch(error){return workspaceFailure(error)}}
export async function PUT(request:Request){try{
 requireSameOrigin(request);const {supabase,propertyId}=await writableProperty();let body;
 try{body=JSON.parse(new TextDecoder().decode(await boundedBody(request,220000)))}catch{throw new WorkspaceError("invalid_promotion",400)}
 if(!body||Object.keys(body).sort().join()!=="revision,state"||!validPromotion(body.state)||!(body.revision===null||/^[a-f0-9-]{36}$/i.test(body.revision||"")))throw new WorkspaceError("invalid_promotion",400);
 const [previous,profile]=await Promise.all([supabase.from("promotion_workspaces").select("state,revision").eq("property_id",propertyId).maybeSingle(),supabase.from("property_details").select("profile").eq("property_id",propertyId).maybeSingle()]);
 if(previous.error||profile.error||previous.data&&!validPromotion(previous.data.state))throw new WorkspaceError("promotion_unavailable",503);
 if((previous.data?.revision??null)!==body.revision)throw new WorkspaceError("promotion_changed",409);
 const location=validateProfile(profile.data?.profile)?.location||'';
 for(const source of body.state.sources){
  const existing=previous.data?.state.sources.find((item:{id:string})=>item.id===source.id);
  if(JSON.stringify(existing)!==JSON.stringify(source)&&!sourceMatchesLocation(source,location))throw new WorkspaceError("promotion_location_changed",409);
 }
 const row={property_id:propertyId,state:body.state,revision:randomUUID(),updated_at:new Date().toISOString()};
 const query=body.revision===null?supabase.from("promotion_workspaces").insert(row):supabase.from("promotion_workspaces").update(row).eq("property_id",propertyId).eq("revision",body.revision);
 const {data,error}=await query.select("state,revision");
 if(error?.code==="23505"||!error&&data?.length===0)throw new WorkspaceError("promotion_changed",409);
 if(error||data?.length!==1)throw new WorkspaceError("save_unavailable",503);
 return Response.json({state:data[0].state,revision:data[0].revision,location},{headers});
}catch(error){return workspaceFailure(error)}}
