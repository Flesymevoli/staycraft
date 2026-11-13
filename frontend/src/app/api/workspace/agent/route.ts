import {desktopModelTransport} from '@/lib/desktop-model';
import {writeAgentReport} from '@/lib/agent-report-writer';
import {evidenceReport} from '@/lib/evidence-report';
import {readAgentRevenue} from '@/lib/agent-revenue';
import {createHash} from 'node:crypto';
import type {BookingMetrics} from '@/components/booking-metrics';
import {cachedAgentRun,runDecisionAgent,metricsSummary,type AgentInventory} from '@/lib/decision-agent';
import {readSavedMarketSnapshot} from '@/lib/market/saved-snapshot';
import {countableQuote,hotelKey} from '@/lib/market/quote-identity';
import {validateInventory} from '@/lib/property-inventory';
import {validateProfile} from '@/lib/property-profile';
import {operatorModelEnabled,isDemoWorkspace} from '@/lib/operator-sample';
import {demoMetrics,workspaceDay} from '@/lib/demo-period';
import {boundedBody,requireSameOrigin,verifiedProperty,WorkspaceError,workspaceFailure} from '@/lib/workspace-access';
import type {AgentPeriod} from '@/lib/decision-agent-types';
import {agentStore} from '@/lib/decision-agent-store';
import {collectSignals} from '@/lib/signals/index';
import {marketAnchors} from '@/lib/signals/market-anchors';
import {demoPropertyPoint} from '@/lib/property-location';
import {amapGeocode,amapPoint} from '@/lib/amap-nearby';
import {desktopSignalsEnabled,readDesktopEvents,readDesktopWeather} from '@/lib/desktop-external-signals';
import type {SourceRef} from '@/lib/signals/types';

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
 requireSameOrigin(request);const account=await verifiedProperty();const {supabase,propertyId,user}=account;
 const demo=isDemoWorkspace(user.email);
 const remoteSignals=desktopSignalsEnabled()&&!demo;
 let input:Record<string,unknown>;
 try{input=JSON.parse(new TextDecoder().decode(await boundedBody(request,500)));}catch{throw new WorkspaceError('invalid_input',400);}
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>!['force','language','runId','factualOnly'].includes(key))||input.factualOnly!==undefined&&typeof input.factualOnly!=='boolean'||input.force!==undefined&&typeof input.force!=='boolean'||input.language!==undefined&&!['zh','en'].includes(String(input.language)))throw new WorkspaceError('invalid_input',400);
 const language=input.language==='en'?'en':'zh';
 const modelTransport=desktopModelTransport(account);
 const modelEnabled=operatorModelEnabled()&&Boolean(modelTransport||process.env.DEEPSEEK_API_KEY||process.env.MODEL_BASE_URL&&process.env.MODEL_API_KEY&&process.env.MODEL_NAME);
 if(input.runId!==undefined){
  if(typeof input.runId!=='string'||! /^[a-f\d-]{36}$/i.test(input.runId))throw new WorkspaceError('invalid_input',400);
  const store=agentStore(supabase,propertyId),saved=await store.detail(input.runId);
  if(saved.error||!saved.run)throw new WorkspaceError(saved.error||'analysis_not_found',404);
  if(saved.run.phase==='complete')return Response.json({run:saved.run,cached:true,historyAvailable:true});
  if(!modelEnabled&&!input.factualOnly&&process.env.STAYCRAFT_DESKTOP_DEMO!=='1')return Response.json({
   run:{...saved.run,errorCode:'model_unavailable'},cached:true,historyAvailable:true,writingAvailable:false
  },{headers:{'Cache-Control':'private, no-store'}});
  if(!await store.claim(input.runId))throw new WorkspaceError('analysis_busy',409);
  try{const claimed=await store.detail(input.runId);if(!claimed.run)throw new WorkspaceError('history_unavailable',503);const run=input.factualOnly||process.env.STAYCRAFT_DESKTOP_DEMO==='1'?evidenceReport(claimed.run,language):await writeAgentReport(claimed.run,{attempts:1,modelTransport,language,signal:request.signal,onCheckpoint:async r=>{if(!await store.checkpoint(r))throw Error('report_checkpoint_failed')}});if(!await store.finish(run))throw new WorkspaceError('history_unavailable',503);return Response.json({run,cached:false,historyAvailable:true},{headers:{'Cache-Control':'private, no-store'}})}catch(e){await store.fail(input.runId);throw e;}
 }

 const today=workspaceDay(demo);
 const period={start:today,end:new Date(Date.parse(today)+6*86400000).toISOString().slice(0,10)};
 const signal=(extra?:AbortSignal)=>AbortSignal.any([request.signal,AbortSignal.timeout(10000),...(extra?[extra]:[])]);
 async function readMetrics(selected:AgentPeriod,extra?:AbortSignal):Promise<BookingMetrics>{
  const {data,error}=await supabase.rpc('get_booking_metrics_range',{p_property:propertyId,p_start:selected.start,p_end:selected.end}).abortSignal(signal(extra));
  const count=(Date.parse(selected.end)-Date.parse(selected.start))/86400000+1;
  if(error||!data||data.period_start!==selected.start||data.period_end!==selected.end||!Array.isArray(data.daily)||data.daily.length!==count)throw new Error('metrics_unavailable');
  return demo?demoMetrics(data):data as BookingMetrics;
 }
 async function inventoryResult(extra?:AbortSignal){return supabase.rpc('get_room_inventory',{p_property:propertyId}).abortSignal(signal(extra));}
 // The property address is server-owned; a failed geocode only disables weather, never the run.
 async function resolveCoordinates(extra?:AbortSignal):Promise<{latitude:number;longitude:number}|null>{
  if(!location||!process.env.AMAP_MAPS_API_KEY)return null;
  try{
   return amapPoint(await amapGeocode(location,signal(extra)));
  }catch{return null}
 }
 function summarizeInventory(raw:unknown):AgentInventory|null{
  const inventory=validateInventory(raw,propertyId);if(!inventory)return null;
  const active=inventory.rooms.filter(room=>room.active);
  return {activeRooms:active.length,types:inventory.types.filter(type=>active.some(room=>room.typeId===type.id)).map(type=>({name:type.name,price:type.price,capacity:type.capacity,activeRooms:active.filter(room=>room.typeId===type.id).length}))};
 }
 const [metrics,inventory,profile,snapshot]=await Promise.all([
  readMetrics(period),inventoryResult(),supabase.from('property_details').select('profile,revision').eq('property_id',propertyId).abortSignal(signal()).maybeSingle(),
  readSavedMarketSnapshot(supabase,propertyId,user.email)
 ]);
 const initialInventory=!inventory.error?summarizeInventory(inventory.data?.inventory):null;
 const location=!profile.error?validateProfile(profile.data?.profile)?.location.replace(/（[^）]*虚构[^）]*）/g,'').replace(/周边$/,'').trim()||'':'';
 const stableMetrics={...metrics};delete (stableMetrics as Partial<BookingMetrics>).as_of;
 const marketContext=marketAnchors({quotes:snapshot.quotes,capturedAt:snapshot.capturedAt,capturedLocation:snapshot.capturedLocation,
  location:profile.data?.profile?.location||'',window:{start:today,end:new Date(Date.parse(today)+15*86400000).toISOString().slice(0,10)},fictional:snapshot.status==='fictional'});
 const marketDates=new Set(marketContext.quotes.map(q=>q.stayDate));
 const store=agentStore(supabase,propertyId);
 const priorDay=(date:string)=>new Date(Date.parse(date)-7*86400000).toISOString().slice(0,10);
 const paceBaseline=await store.bookingSnapshot({start:priorDay(period.start),end:priorDay(period.end)},priorDay(today),
  demo?'fictional_demo':'recorded_property_data');
 const fingerprint=createHash('sha256').update(JSON.stringify({version:5,...(remoteSignals?{externalSignals:'desktop_remote_v1'}:{}),period,language,metrics:stableMetrics,inventoryRevision:inventory.data?.revision||null,initialInventory,profileRevision:profile.data?.revision||null,location,modelEnabled,snapshot,paceBaselineId:paceBaseline?.id})).digest('hex');
 const previous=await store.cached(language,fingerprint,input.force===true);
 if(previous)return Response.json({run:previous,cached:true,historyAvailable:true},{headers:{'Cache-Control':'private, no-store'}});
 let historyAvailable=false;
 const result=await cachedAgentRun(propertyId+':'+language,fingerprint,input.force===true,async()=>{
  const id=crypto.randomUUID(),state=await store.begin(id,language,fingerprint,period);
  if(state==='unavailable')throw new WorkspaceError('history_unavailable',503);
  if(state==='busy')throw new WorkspaceError('analysis_busy',409);
  let updates=Promise.resolve(),steps:import('@/lib/decision-agent-types').AgentStep[]=[];
  try{const run=await runDecisionAgent({
  id,onEvidence:async snapshots=>{if(state==='started'){await updates;const draft:import('@/lib/decision-agent-types').DecisionAgentRun={id,status:'limited',engine:'rules_v1',phase:'investigated',generatedAt:new Date().toISOString(),period,summary:'调查进行中，证据已保存',metrics:metricsSummary(metrics),findings:[],steps,evidence:snapshots.map(s=>s.evidence),snapshots,limitations:['调查尚未完整结束'],dataMode:demo?'fictional_demo':'recorded_property_data'};if(!await store.checkpoint(draft))throw Error('evidence_checkpoint_failed')}},onStep:step=>{if(state==='started'){steps=[...steps,step];const snapshot=steps;updates=updates.then(async()=>{await store.progress(id,snapshot)}).catch(()=>{});}},
  period,initialMetrics:metrics,initialInventory,language,demo,referenceDay:today,paceBaseline,modelEnabled,modelTransport,marketEnabled:Boolean(snapshot.capturedAt&&marketDates.size),marketDates,signal:request.signal,readMetrics,
  readRevenue:(selected,extra)=>readAgentRevenue(supabase,propertyId,selected,signal(extra),today),
  readBookings:async(selected,extra)=>{const {data,error}=await supabase.from('direct_bookings').select('arrival,departure,type_name,status,total,external_channel,stay_state').eq('property_id',propertyId).lte('arrival',selected.end).gt('departure',selected.start).order('arrival').limit(101).abortSignal(signal(extra));if(error||!data)throw new Error('bookings_unavailable');return {count:Math.min(data.length,100),truncated:data.length>100,orders:data.slice(0,100).map(row=>({arrival:row.arrival,departure:row.departure,roomType:row.type_name||'',status:row.status,totalCny:Number(row.total),source:row.external_channel||'direct',stayState:row.stay_state||'pending'}))}},
  readDetectorBookings:async(selected,extra)=>{
   const orders:import('@/lib/decision-agent').AgentBookings['orders']=[];
   const ids=new Set<string>();
   let expected:number|null=null;
   for(let offset=0;offset<10000;offset+=500){
    const {data,error,count}=await supabase.from('direct_bookings')
     .select('id,arrival,departure,type_name,status,total,external_channel,stay_state',{count:'exact'})
     .eq('property_id',propertyId).gte('arrival',selected.start).lte('arrival',selected.end)
     .order('id').range(offset,offset+499).abortSignal(signal(extra));
    if(error||!data||count===null||count>10000||expected!==null&&count!==expected)throw Error('bookings_incomplete');
    expected=count;
    for(const row of data){
     if(ids.has(row.id))throw Error('bookings_incomplete');
     ids.add(row.id);
     orders.push({arrival:row.arrival,departure:row.departure,roomType:row.type_name||'',status:row.status,
      totalCny:Number(row.total),source:row.external_channel||'direct',stayState:row.stay_state||'pending'});
    }
    if(orders.length===expected)return orders;
    if(data.length!==500)break;
   }
   throw Error('bookings_incomplete');
  },
  readInventory:async extra=>{const result=await inventoryResult(extra);const summary=!result.error?summarizeInventory(result.data?.inventory):null;if(!summary)throw new Error('inventory_unavailable');return summary;},
  queryMarket:async selected=>{
   if(!snapshot.capturedAt)throw Error('market_snapshot_unavailable');
   const quotes=marketContext.quotes.filter(q=>q.stayDate===selected.start&&q.nights===1&&countableQuote(q));
   if(!quotes.length)throw Error('market_snapshot_date_unavailable');
   const hotels=new Map<string,typeof quotes[number]>();
   for(const quote of quotes){
    const key=hotelKey(quote),previous=hotels.get(key);
    if(!previous||quote.priceCny!<previous.priceCny!)hotels.set(key,quote);
   }
   const rows=[...hotels.values()],prices=rows.map(q=>q.priceCny!);
   return {...selected,snapshot:{capturedAt:snapshot.capturedAt,fictional:snapshot.status==='fictional'},currency:'CNY',
    count:rows.length,low:rows.length>=3?Math.min(...prices):null,high:rows.length>=3?Math.max(...prices):null,
    hotels:rows.map(q=>({name:q.sourceName,price:q.priceCny,currency:'CNY',conditions:q.priceType}))};
  },
  readSignals:async(selected,extra)=>{
   const horizon=new Date(Date.parse(selected.end)+9*86400000).toISOString().slice(0,10);
   const window={start:selected.start,end:horizon};
   if(remoteSignals){
    const rawLocation=!profile.error?validateProfile(profile.data?.profile)?.location||'':'';
    const externalSignal=extra?AbortSignal.any([request.signal,extra]):request.signal;
    const days=Math.min(16,Math.round((Date.parse(horizon)-Date.parse(selected.start))/86400000)+1);
    const [weather,events]=await Promise.allSettled([
     readDesktopWeather({account,location:rawLocation,start:selected.start,days,signal:externalSignal}),
     readDesktopEvents({account,location:rawLocation,start:selected.start,end:horizon,signal:externalSignal}),
    ]);
    const unavailable=(id:'weather'|'events'):SourceRef=>({id,authority:'public',observedAt:new Date().toISOString(),coverage:{from:window.start,to:window.end,kind:'none'},confidence:'low',note:id==='weather'?'天气源暂不可用，不作天气相关推断':'活动源暂不可用，无返回记录不代表没有活动'});
    return {weather:weather.status==='fulfilled'?weather.value.days:[],events:events.status==='fulfilled'?events.value.events:[],anchors:marketContext.anchors,sources:[weather.status==='fulfilled'?weather.value.source:unavailable('weather'),events.status==='fulfilled'?events.value.source:unavailable('events'),marketContext.source]};
   }
   const point=demoPropertyPoint(profile.data?.profile?.location||'',user.email)??await resolveCoordinates(extra);
   if(!point)return {weather:[],events:[],anchors:marketContext.anchors,sources:[marketContext.source,
    {id:'weather',authority:'internal',observedAt:new Date().toISOString(),coverage:{from:window.start,to:window.end,kind:'none'},confidence:'low',note:'缺少可用坐标，本轮不取天气信号'},
    {id:'events',authority:'internal',observedAt:new Date().toISOString(),coverage:{from:window.start,to:window.end,kind:'none'},confidence:'low',note:'缺少可用坐标，本轮不取周边活动'}]};
   const bundle=await collectSignals({latitude:point.latitude,longitude:point.longitude,location:profile.data?.profile?.location,anchorEntries:[],window,liveEvents:!demo,signal:extra?AbortSignal.any([request.signal,extra]):request.signal});
   return {...bundle,anchors:marketContext.anchors,sources:[...bundle.sources.filter(source=>source.id!=='competitor'),marketContext.source]};
  }
  });await updates;run.language=language;run.status='limited';run.phase='investigated';
  if(run.steps.some(step=>step.status==='failed'&&step.detail.includes('model_rate_limited'))){run.phase='writing_failed';run.errorCode='model_rate_limited';}
  if(state==='started')historyAvailable=await store.finish(run);if(!historyAvailable)throw new WorkspaceError('history_unavailable',503);return run;
  }catch(error){await updates;if(state==='started')await store.fail(id);throw error;}
 });
 return Response.json({...result,historyAvailable},{headers:{'Cache-Control':'private, no-store'}});
}catch(error){return workspaceFailure(error)}}
