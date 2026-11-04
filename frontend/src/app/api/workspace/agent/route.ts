import {createHash} from 'node:crypto';
import type {BookingMetrics} from '@/components/booking-metrics';
import {cachedAgentRun,runDecisionAgent,type AgentInventory} from '@/lib/decision-agent';
import {queryPropertyMarket} from '@/lib/market-tool';
import {validateInventory} from '@/lib/property-inventory';
import {validateProfile} from '@/lib/property-profile';
import {operatorSample} from '@/lib/operator-sample';
import {boundedBody,requireSameOrigin,verifiedProperty,WorkspaceError,workspaceFailure} from '@/lib/workspace-access';
import type {AgentPeriod} from '@/lib/decision-agent-types';
import {agentStore} from '@/lib/decision-agent-store';

export const dynamic='force-dynamic';
export const maxDuration=90;

export async function GET(request:Request){try{
 const {supabase,propertyId}=await verifiedProperty(),params=new URL(request.url).searchParams,store=agentStore(supabase,propertyId);
 if(params.get('view')==='history')return Response.json(await store.history(),{headers:{'Cache-Control':'private, no-store'}});
 const id=params.get('id');if(!id||!/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(id))throw new WorkspaceError('invalid_input',400);
 const detail=await store.detail(id);if(detail.error)throw new WorkspaceError(detail.error,detail.error==='analysis_not_found'?404:503);
 return Response.json(detail,{headers:{'Cache-Control':'private, no-store'}});
}catch(error){return workspaceFailure(error)}}

export async function POST(request:Request){try{
 requireSameOrigin(request);const {supabase,propertyId}=await verifiedProperty();
 let input:Record<string,unknown>;
 try{input=JSON.parse(new TextDecoder().decode(await boundedBody(request,500)));}catch{throw new WorkspaceError('invalid_input',400);}
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>!['force','language'].includes(key))||input.force!==undefined&&typeof input.force!=='boolean'||input.language!==undefined&&!['zh','en'].includes(String(input.language)))throw new WorkspaceError('invalid_input',400);
 const language=input.language==='en'?'en':'zh';
 const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai'}).format(new Date());
 const period={start:today,end:new Date(Date.parse(today)+6*86400000).toISOString().slice(0,10)};
 const signal=(extra?:AbortSignal)=>AbortSignal.any([request.signal,AbortSignal.timeout(10000),...(extra?[extra]:[])]);
 async function readMetrics(selected:AgentPeriod,extra?:AbortSignal):Promise<BookingMetrics>{
  const {data,error}=await supabase.rpc('get_booking_metrics_range',{p_property:propertyId,p_start:selected.start,p_end:selected.end}).abortSignal(signal(extra));
  const count=(Date.parse(selected.end)-Date.parse(selected.start))/86400000+1;
  if(error||!data||data.period_start!==selected.start||data.period_end!==selected.end||!Array.isArray(data.daily)||data.daily.length!==count)throw new Error('metrics_unavailable');
  return data as BookingMetrics;
 }
 async function inventoryResult(extra?:AbortSignal){return supabase.rpc('get_room_inventory',{p_property:propertyId}).abortSignal(signal(extra));}
 function summarizeInventory(raw:unknown):AgentInventory|null{
  const inventory=validateInventory(raw,propertyId);if(!inventory)return null;
  const active=inventory.rooms.filter(room=>room.active);
  return {activeRooms:active.length,dirtyRooms:active.filter(room=>room.housekeeping==='dirty').length,types:inventory.types.filter(type=>active.some(room=>room.typeId===type.id)).map(type=>({name:type.name,price:type.price,capacity:type.capacity,activeRooms:active.filter(room=>room.typeId===type.id).length}))};
 }
 const [metrics,inventory,profile]=await Promise.all([
  readMetrics(period),inventoryResult(),supabase.from('property_details').select('profile,revision').eq('property_id',propertyId).abortSignal(signal()).maybeSingle()
 ]);
 const initialInventory=!inventory.error?summarizeInventory(inventory.data?.inventory):null;
 const location=!profile.error?validateProfile(profile.data?.profile)?.location.replace(/（[^）]*虚构[^）]*）/g,'').replace(/周边$/,'').trim()||'':'';
 const stableMetrics={...metrics};delete (stableMetrics as Partial<BookingMetrics>).as_of;
 const modelEnabled=!operatorSample()&&process.env.MODEL_ENABLED==='1'&&process.env.FORMAL_MODEL_ENABLED==='1';
 const fingerprint=createHash('sha256').update(JSON.stringify({period,language,metrics:stableMetrics,inventoryRevision:inventory.data?.revision||null,initialInventory,profileRevision:profile.data?.revision||null,location,modelEnabled})).digest('hex');
 const store=agentStore(supabase,propertyId),previous=operatorSample()?null:await store.cached(language,fingerprint,input.force===true);
 if(previous)return Response.json({run:previous,cached:true,historyAvailable:true},{headers:{'Cache-Control':'private, no-store'}});
 let historyAvailable=false;
 const result=await cachedAgentRun(propertyId+':'+language,fingerprint,input.force===true,async()=>{
  const id=crypto.randomUUID(),state=operatorSample()?'unavailable':await store.begin(id,language,fingerprint,period);
  if(state==='busy')throw new WorkspaceError('analysis_busy',409);
  let updates=Promise.resolve(),steps:import('@/lib/decision-agent-types').AgentStep[]=[];
  try{const run=await runDecisionAgent({
  id,onStep:step=>{if(state==='started'){steps=[...steps,step];const snapshot=steps;updates=updates.then(async()=>{await store.progress(id,snapshot)}).catch(()=>{});}},
  period,initialMetrics:metrics,initialInventory,language,demo:operatorSample()||/虚构|演示/.test(String(profile.data?.profile?.name||'')),modelEnabled,marketEnabled:Boolean(location&&process.env.ROLLINGGO_API_KEY),signal:request.signal,readMetrics,
  readBookings:async(selected,extra)=>{const {data,error}=await supabase.from('direct_bookings').select('arrival,departure,type_name,status,total,external_channel,stay_state').eq('property_id',propertyId).lte('arrival',selected.end).gt('departure',selected.start).order('arrival').limit(101).abortSignal(signal(extra));if(error||!data)throw new Error('bookings_unavailable');return {count:Math.min(data.length,100),truncated:data.length>100,orders:data.slice(0,100).map(row=>({arrival:row.arrival,departure:row.departure,roomType:row.type_name||'',status:row.status,totalCny:Number(row.total),source:row.external_channel||'direct',stayState:row.stay_state||'pending'}))}},
  readInventory:async extra=>{const result=await inventoryResult(extra);const summary=!result.error?summarizeInventory(result.data?.inventory):null;if(!summary)throw new Error('inventory_unavailable');return summary;},
  queryMarket:(selected,extra)=>queryPropertyMarket(location,selected.start,selected.end,{signal:extra||request.signal})
  });await updates;if(state==='started')historyAvailable=await store.finish(run);return run;
  }catch(error){await updates;if(state==='started')await store.fail(id);throw error;}
 });
 return Response.json({...result,historyAvailable},{headers:{'Cache-Control':'private, no-store'}});
}catch(error){return workspaceFailure(error)}}
