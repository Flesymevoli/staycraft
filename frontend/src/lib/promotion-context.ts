import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import {validateProfile} from './property-profile';
import {validateInventory} from './property-inventory';
import {matchingSources,validPromotion,type PromotionBrief} from './promotion';
import {agentStore} from './decision-agent-store';
import {promotionTarget,type PromotionPlan} from './promotion-plan';
import {WorkspaceError} from './workspace-access';
import {demoMetrics,workspaceDay} from './demo-period';

export async function promotionContext(db:SupabaseClient,propertyId:string,brief:PromotionBrief,diagnosis?:PromotionPlan['diagnosis'],demo=false){
 const timeout=()=>AbortSignal.timeout(10000);
 const [p,i,s]=await Promise.all([db.from('property_details').select('profile,revision').eq('property_id',propertyId).abortSignal(timeout()).maybeSingle(),db.rpc('get_room_inventory',{p_property:propertyId}).abortSignal(timeout()),db.from('promotion_workspaces').select('state,revision').eq('property_id',propertyId).abortSignal(timeout()).maybeSingle()]);
 if(p.error||i.error||s.error)throw new WorkspaceError('promotion_unavailable',503);
 const profile=validateProfile(p.data?.profile),inventory=validateInventory(i.data?.inventory,propertyId);
 if(!profile?.location||!inventory?.rooms.some(r=>r.active))throw new WorkspaceError('promotion_setup_required',422);
 if(s.data&&!validPromotion(s.data.state))throw new WorkspaceError('promotion_unavailable',503);
 const sources=matchingSources(s.data?.state.sources||[],brief);
 if(sources.length!==brief.sourceIds.length)throw new WorkspaceError('promotion_source_required',422);
 const zh=brief.language==='zh',facts=[{id:'property',text:zh?`民宿名称：${profile.name}`:`Property name: ${profile.name}`},{id:'location',text:zh?`位置：${profile.location}`:`Location: ${profile.location}`}];
 for(const [key,label,en] of [['notes','民宿说明','Property notes'],['guestNotes','客人须知','Guest information'],['checkin','入住时间','Check-in time'],['breakfast','早餐时间','Breakfast hours']] as const)if(profile[key])facts.push({id:key,text:`${zh?label:en}：${profile[key]}`});
 inventory.types.filter(t=>inventory.rooms.some(r=>r.active&&r.typeId===t.id)).slice(0,3).forEach((t,n)=>facts.push({id:`room_${n}`,text:zh?`房型：${t.name}，最多入住 ${t.capacity} 人。`:`Room type: ${t.name}, for up to ${t.capacity} guests.`}));
 sources.forEach((source,n)=>facts.push({id:`source_${n}`,text:`${source.title}\n${source.summary}\n${zh?'来源':'Source'}：${source.url}`}));
 let reason:string|undefined;
 if(diagnosis){
  const saved=await agentStore(db,propertyId).detail(diagnosis.runId);
  try{
   if(saved.error)throw Error('missing');
   const today=workspaceDay(demo),{period,reason:diagnosisReason}=promotionTarget(saved.run,diagnosis,today);
   if(brief.start<period.start||brief.end>period.end)throw Error('period');
   const {data:raw,error}=await db.rpc('get_booking_metrics_range',{p_property:propertyId,p_start:brief.start,p_end:brief.end}).abortSignal(timeout());
   const data=demo&&raw&&Array.isArray(raw.daily)?demoMetrics(raw):raw;
   const count=(Date.parse(brief.end)-Date.parse(brief.start))/86400000+1;
   if(error||!data||data.historical_inventory_unknown||data.period_start!==brief.start||data.period_end!==brief.end||!Array.isArray(data.daily)||data.daily.length!==count||data.daily.some((day:{date:string;available:number},index:number)=>day.date!==new Date(Date.parse(brief.start)+index*86400000).toISOString().slice(0,10)||!(day.available>0)))throw Error('stale');
   reason=diagnosisReason;
  }catch{throw new WorkspaceError('promotion_diagnosis_unavailable',422)}
 }
 const revisions={profile:p.data?.revision,inventory:i.data?.revision,sources:s.data?.revision};
 async function unchanged(){
  const [fp,fi,fs]=await Promise.all([db.from('property_details').select('revision').eq('property_id',propertyId).abortSignal(timeout()).maybeSingle(),db.rpc('get_room_inventory',{p_property:propertyId}).abortSignal(timeout()),db.from('promotion_workspaces').select('revision').eq('property_id',propertyId).abortSignal(timeout()).maybeSingle()]);
  if(fp.error||fi.error||fs.error)throw new WorkspaceError('promotion_unavailable',503);
  if(fp.data?.revision!==revisions.profile||fi.data?.revision!==revisions.inventory||fs.data?.revision!==revisions.sources)throw new WorkspaceError('promotion_changed',409);
 }
 return {profile,facts,sources,reason,unchanged};
}
