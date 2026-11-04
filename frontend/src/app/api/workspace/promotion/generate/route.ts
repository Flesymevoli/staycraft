import {randomUUID} from "node:crypto";
import {composePromotion,matchingSources,validBrief,validPromotion,type PromotionDraft} from "@/lib/promotion";
import {validateProfile} from "@/lib/property-profile";
import {validateInventory} from "@/lib/property-inventory";
import {operatorSample} from "@/lib/operator-sample";
import {boundedBody,requireSameOrigin,verifiedProperty,WorkspaceError,workspaceFailure} from "@/lib/workspace-access";
export const dynamic="force-dynamic";
export async function POST(request:Request){try{
 requireSameOrigin(request);const {supabase,propertyId}=await verifiedProperty();let brief;
 try{brief=JSON.parse(new TextDecoder().decode(await boundedBody(request,3000)))}catch{throw new WorkspaceError("invalid_promotion",400)}
 if(!validBrief(brief))throw new WorkspaceError("invalid_promotion",400);
 brief={...brief,goal:'rooms' as const};
 const [profileResult,inventoryResult,sourceResult]=await Promise.all([
  supabase.from("property_details").select("profile,revision").eq("property_id",propertyId).maybeSingle(),
  supabase.rpc("get_room_inventory",{p_property:propertyId}),
  supabase.from("promotion_workspaces").select("state,revision").eq("property_id",propertyId).maybeSingle()
 ]);
 if(profileResult.error||inventoryResult.error||sourceResult.error)throw new WorkspaceError("promotion_unavailable",503);
 const profile=validateProfile(profileResult.data?.profile),inventory=validateInventory(inventoryResult.data?.inventory,propertyId);
 if(!profile||!profile.location||!inventory?.rooms.some(r=>r.active))throw new WorkspaceError("promotion_setup_required",422);
 if(sourceResult.data&&!validPromotion(sourceResult.data.state))throw new WorkspaceError("promotion_unavailable",503);
 const sources=matchingSources(sourceResult.data?.state.sources||[],brief);
 if(sources.length!==brief.sourceIds.length)throw new WorkspaceError("promotion_source_required",422);
 const zh=brief.language==="zh",facts=[{id:"property",text:zh?`民宿名称：${profile.name}`:`Property name: ${profile.name}`},{id:"location",text:zh?`位置：${profile.location}`:`Location: ${profile.location}`}];
 if(profile.notes)facts.push({id:"notes",text:zh?`民宿说明：${profile.notes}`:`Property notes: ${profile.notes}`});
 if(profile.guestNotes)facts.push({id:"guestNotes",text:zh?`客人须知：${profile.guestNotes}`:`Guest information: ${profile.guestNotes}`});
 if(profile.checkin)facts.push({id:"checkin",text:zh?`入住时间：${profile.checkin}`:`Check-in time: ${profile.checkin}`});
 if(profile.breakfast)facts.push({id:"breakfast",text:zh?`早餐时间：${profile.breakfast}`:`Breakfast hours: ${profile.breakfast}`});
 const types=inventory.types.filter(t=>inventory.rooms.some(r=>r.active&&r.typeId===t.id)).slice(0,3);
 types.forEach((t,i)=>facts.push({id:`room_${i}`,text:zh?`房型：${t.name}，最多入住 ${t.capacity} 人。`:`Room type: ${t.name}, for up to ${t.capacity} guests.`}));
 sources.forEach((s,i)=>facts.push({id:`source_${i}`,text:`${s.title}\n${s.summary}\n${zh?"来源":"Source"}：${s.url}`}));
 const composed=await composePromotion(facts,brief,profile.name,{model:!operatorSample()&&process.env.MODEL_ENABLED==="1"&&process.env.FORMAL_MODEL_ENABLED==="1",signal:request.signal});
 const basis:PromotionDraft["basis"]=[{label:zh?"民宿资料摘要与启用房型":"Property summary and active room types",text:[profile.name,...facts.filter(f=>!f.id.startsWith("source_")&&f.id!=="property").map(f=>f.text)].join("\n").slice(0,1500)} ,...sources.map(s=>({label:s.title,text:`${s.summary}\n${s.start} — ${s.end}\n${zh?"经营者核对":"Owner checked"}: ${s.checkedOn}`,url:s.url}))];
 // Recheck revisions after a model request: do not return copy based on changed facts.
 const [freshProfile,freshInventory,freshSources]=await Promise.all([supabase.from("property_details").select("revision").eq("property_id",propertyId).maybeSingle(),supabase.rpc("get_room_inventory",{p_property:propertyId}),supabase.from("promotion_workspaces").select("revision").eq("property_id",propertyId).maybeSingle()]);
 if(freshProfile.error||freshInventory.error||freshSources.error)throw new WorkspaceError("promotion_unavailable",503);
 if(freshProfile.data?.revision!==profileResult.data?.revision||freshInventory.data?.revision!==inventoryResult.data?.revision||freshSources.data?.revision!==sourceResult.data?.revision)throw new WorkspaceError("promotion_changed",409);
 const draft:PromotionDraft={id:randomUUID(),brief,content:composed.content,engine:composed.engine,createdAt:new Date().toISOString(),basis};
 if(draft.content.length>4000)throw new WorkspaceError("promotion_too_long",422);
 return Response.json({draft,fallback:composed.fallback},{headers:{"Cache-Control":"no-store"}});
}catch(error){return workspaceFailure(error)}}
