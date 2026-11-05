import {writeAgentReport} from '@/lib/agent-report-writer';
import {readAgentRevenue} from '@/lib/agent-revenue';
import {createHash} from 'node:crypto';
import type {BookingMetrics} from '@/components/booking-metrics';
import {cachedAgentRun,runDecisionAgent,metricsSummary,type AgentInventory} from '@/lib/decision-agent';
import {queryPropertyMarket} from '@/lib/market-tool';
import {validateInventory} from '@/lib/property-inventory';
import {validateProfile} from '@/lib/property-profile';
import {operatorSample,operatorModelEnabled} from '@/lib/operator-sample';
import {boundedBody,requireSameOrigin,verifiedProperty,WorkspaceError,workspaceFailure} from '@/lib/workspace-access';
import type {AgentPeriod} from '@/lib/decision-agent-types';
import {agentStore} from '@/lib/decision-agent-store';

export const dynamic='force-dynamic';
export const maxDuration=180;

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
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>!['force','language','runId'].includes(key))||input.force!==undefined&&typeof input.force!=='boolean'||input.language!==undefined&&!['zh','en'].includes(String(input.language)))throw new WorkspaceError('invalid_input',400);
 const language=input.language==='en'?'en':'zh';
 if(input.runId!==undefined){
  if(typeof input.runId!=='string'||! /^[a-f\d-]{36}$/i.test(input.runId))throw new WorkspaceError('invalid_input',400);
  const store=agentStore(supabase,propertyId),saved=await store.detail(input.runId);
  if(saved.error||!saved.run)throw new WorkspaceError(saved.error||'analysis_not_found',404);
  if(saved.run.phase==='complete')return Response.json({run:saved.run,cached:true,historyAvailable:true});
  if(!await store.claim(input.runId))throw new WorkspaceError('analysis_busy',409);
  try{const run=await writeAgentReport(saved.run,{language,signal:request.signal,onCheckpoint:async r=>{if(!await store.checkpoint(r))throw Error('report_checkpoint_failed')}});if(!await store.finish(run))throw new WorkspaceError('history_unavailable',503);return Response.json({run,cached:false,historyAvailable:true},{headers:{'Cache-Control':'private, no-store'}})}catch(e){await store.fail(input.runId);throw e;}
 }

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
 const modelEnabled=operatorModelEnabled();
 const fingerprint=createHash('sha256').update(JSON.stringify({version:2,period,language,metrics:stableMetrics,inventoryRevision:inventory.data?.revision||null,initialInventory,profileRevision:profile.data?.revision||null,location,modelEnabled})).digest('hex');
 const store=agentStore(supabase,propertyId),previous=await store.cached(language,fingerprint,input.force===true);
 if(previous)return Response.json({run:previous,cached:true,historyAvailable:true},{headers:{'Cache-Control':'private, no-store'}});
 let historyAvailable=false;
 const result=await cachedAgentRun(propertyId+':'+language,fingerprint,input.force===true,async()=>{
  const id=crypto.randomUUID(),state=await store.begin(id,language,fingerprint,period);
  if(state==='unavailable')throw new WorkspaceError('history_unavailable',503);
  if(state==='busy')throw new WorkspaceError('analysis_busy',409);
  let updates=Promise.resolve(),steps:import('@/lib/decision-agent-types').AgentStep[]=[];
  try{const run=await runDecisionAgent({
  id,onEvidence:async snapshots=>{if(state==='started'){await updates;const draft:import('@/lib/decision-agent-types').DecisionAgentRun={id,status:'limited',engine:'rules_v1',phase:'investigated',generatedAt:new Date().toISOString(),period,summary:'调查进行中，证据已保存',metrics:metricsSummary(metrics),findings:[],steps,evidence:snapshots.map(s=>s.evidence),snapshots,limitations:['调查尚未完整结束'],dataMode:operatorSample()?'fictional_demo':'recorded_property_data'};if(!await store.checkpoint(draft))throw Error('evidence_checkpoint_failed')}},onStep:step=>{if(state==='started'){steps=[...steps,step];const snapshot=steps;updates=updates.then(async()=>{await store.progress(id,snapshot)}).catch(()=>{});}},
  period,initialMetrics:metrics,initialInventory,language,demo:operatorSample()||/虚构|演示/.test(String(profile.data?.profile?.name||'')),modelEnabled,marketEnabled:Boolean(location&&process.env.ROLLINGGO_API_KEY),signal:request.signal,readMetrics,
  readRevenue:(selected,extra)=>readAgentRevenue(supabase,propertyId,selected,signal(extra)),
  readBookings:async(selected,extra)=>{const {data,error}=await supabase.from('direct_bookings').select('arrival,departure,type_name,status,total,external_channel,stay_state').eq('property_id',propertyId).lte('arrival',selected.end).gt('departure',selected.start).order('arrival').limit(101).abortSignal(signal(extra));if(error||!data)throw new Error('bookings_unavailable');return {count:Math.min(data.length,100),truncated:data.length>100,orders:data.slice(0,100).map(row=>({arrival:row.arrival,departure:row.departure,roomType:row.type_name||'',status:row.status,totalCny:Number(row.total),source:row.external_channel||'direct',stayState:row.stay_state||'pending'}))}},
  readInventory:async extra=>{const result=await inventoryResult(extra);const summary=!result.error?summarizeInventory(result.data?.inventory):null;if(!summary)throw new Error('inventory_unavailable');return summary;},
  queryMarket:(selected,extra)=>queryPropertyMarket(location,selected.start,selected.end,{signal:extra||request.signal})
  });await updates;run.status='limited';run.phase='investigated';if(state==='started')historyAvailable=await store.finish(run);if(!historyAvailable)throw new WorkspaceError('history_unavailable',503);return run;
  }catch(error){await updates;if(state==='started')await store.fail(id);throw error;}
 });
 return Response.json({...result,historyAvailable},{headers:{'Cache-Control':'private, no-store'}});
}catch(error){return workspaceFailure(error)}}
