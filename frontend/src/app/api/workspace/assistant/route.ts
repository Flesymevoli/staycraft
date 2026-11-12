import {questionTopic} from "@/lib/assistant-question";
import {decisionQuestionIds,isDecisionQuestionId,type DecisionQuestionId} from "@/lib/assistant-suggestions";
import {evaluateDecision,offsetDay,type DecisionInputs} from "@/lib/assistant-decisions";
import {agentStore} from "@/lib/decision-agent-store";
import {validateProfile} from "@/lib/property-profile";
import {propertyPoint} from "@/lib/property-location";
import {collectEvents} from "@/lib/signals/events";
import {readSavedMarketSnapshot} from "@/lib/market/saved-snapshot";
import {readPlanFollowUp} from "@/lib/decisions/plan-follow-up";
import {groundedInsights,prioritiseInsights} from "@/lib/business-assistant";
import {bookingPeriod} from "@/lib/booking-period";
import {isDemoWorkspace,operatorSample} from "@/lib/operator-sample";
import {DEMO_PERIOD,demoMetrics,workspaceDay} from "@/lib/demo-period";
import {validateInventory} from "@/lib/property-inventory";
import type {BookingMetrics} from "@/components/booking-metrics";
import {boundedBody,requireSameOrigin,verifiedProperty,WorkspaceError,workspaceFailure} from "@/lib/workspace-access";
export const dynamic="force-dynamic";

async function decisionInputs(account:Awaited<ReturnType<typeof verifiedProperty>>,metrics:BookingMetrics,ids:DecisionQuestionId[],signal:AbortSignal):Promise<DecisionInputs>{
 const {supabase,propertyId,user}=account;
 const today=workspaceDay(isDemoWorkspace(user.email));
 const wants=(id:DecisionQuestionId)=>ids.includes(id);
 const dbSignal=AbortSignal.any([signal,AbortSignal.timeout(5000)]);
 const start=metrics.period_start<today?today:metrics.period_start;
 const end=metrics.period_end;
 const store=agentStore(supabase,propertyId);
 const readRuns=async()=>{
  const previous=wants("pace")&&metrics.period_days===7&&metrics.period_start>=today
   ? await store.bookingSnapshot({start:offsetDay(start,-7),end:offsetDay(end,-7)},offsetDay(today,-7),
     isDemoWorkspace(user.email)?"fictional_demo":"recorded_property_data"):null;
  if(!wants("progress"))return {previous};
  const {data}=await supabase.from("decision_agent_runs").select("result").eq("property_id",propertyId)
   .not("result->actionPlan","is",null).order("created_at",{ascending:false}).limit(5).abortSignal(dbSignal);
  const planRun=data?.map(row=>row.result as DecisionInputs["planRun"])
   .filter(run=>run?.actionPlan).sort((a,b)=>b!.actionPlan!.createdAt.localeCompare(a!.actionPlan!.createdAt))[0];
  const planProgress=planRun?.actionPlan?await readPlanFollowUp(supabase,propertyId,planRun.actionPlan,{
   demo:isDemoWorkspace(user.email),today:workspaceDay(false),signal,
  }).catch(()=>null):null;
  return {previous,planRun,planProgress};
 };
 const readEvents=async()=>{
  const {data}=await supabase.from("property_details").select("profile").eq("property_id",propertyId).abortSignal(dbSignal).maybeSingle();
  const location=validateProfile(data?.profile)?.location;
  const center=location?await propertyPoint(location,user.email,signal):null;
  return collectEvents({window:{start,end},scope:{center}}).events;
 };
 const readQuotes=async()=>(await readSavedMarketSnapshot(supabase,propertyId,user.email)).quotes;
 const [bookingResult,eventResult,quoteResult,runResult]=await Promise.allSettled([
  wants("channels")?supabase.from("direct_bookings").select("status,external_channel").eq("property_id",propertyId)
   .eq("status","confirmed").lte("arrival",end).gt("departure",metrics.period_start).limit(101).abortSignal(dbSignal):null,
  wants("events")&&start<=end?readEvents():undefined,
  wants("positioning")&&ids.length===1&&start<=end?readQuotes():undefined,
  wants("pace")||wants("progress")?readRuns():undefined,
 ]);
 const bookings=bookingResult.status==="fulfilled"?bookingResult.value:null;
 return {metrics,today,orders:!bookings?.error&&bookings?.data&&bookings.data.length<=100?bookings.data:undefined,
  events:eventResult.status==="fulfilled"?eventResult.value:undefined,quotes:quoteResult.status==="fulfilled"?quoteResult.value:undefined,
  ...(runResult.status==="fulfilled"?runResult.value:undefined)};
}

function focusedInsights(data:BookingMetrics,topic:"booked_value"|"busiest",zh:boolean){
 const t=(cn:string,en:string)=>zh?cn:en;
 const href="/app/analysis?"+new URLSearchParams({start:data.period_start,end:data.period_end});
 if(topic==="booked_value"){
  const money=(cents:number)=>new Intl.NumberFormat(zh?"zh-CN":"en-GB",{style:"currency",currency:"CNY"}).format(cents/100);
  const facts=[
   typeof data.amount_cents==="number"&&Number.isFinite(data.amount_cents)?t("记录中的已订金额 "+money(data.amount_cents),"Recorded booking value "+money(data.amount_cents)):null,
   typeof data.average_booked_rate_cents==="number"&&Number.isFinite(data.average_booked_rate_cents)?t("预订均价 "+money(data.average_booked_rate_cents)+"/间夜","Average booked rate "+money(data.average_booked_rate_cents)+"/night"):null,
  ].filter(Boolean);
  return [{id:"booked_value",title:t("本期预订金额","Booking value for this period"),evidence:facts.join(" · ")||t("这段日期暂无金额数据。","Booking values are unavailable for these dates."),action:t("这是订单金额，可能随改期或取消变化。已完成房费与实际收款应分别核对。","Booking values may change after cancellations or date changes. Check completed stays and payments separately."),href}];
 }
 const days=data.daily.filter(day=>Number.isFinite(day.booked)&&day.booked>0)
  .sort((a,b)=>b.booked-a.booked||a.date.localeCompare(b.date)).slice(0,3);
 return [{id:"busiest",title:t("已订客房最多的日期","Dates with the most booked rooms"),
  evidence:days.length?days.map(day=>day.date+t(" 已订 "+day.booked+" 间"," · "+day.booked+" rooms booked")).join(t("；","; ")):t("当前记录中暂无已订客房。","Current records show no booked rooms."),
  action:days.length?t("按这些日期检查到店安排和清洁排班。","Review arrivals and housekeeping for these dates."):t("检查订单是否已导入。","Check whether booking records have been imported."),href}];
}

export async function POST(request:Request){try{
 requireSameOrigin(request);const account=await verifiedProperty();const {supabase,propertyId}=account;let body;
 try{body=JSON.parse(new TextDecoder().decode(await boundedBody(request,2500)))}catch{throw new WorkspaceError("invalid_request",400)}
 const demo=isDemoWorkspace(account.user.email);
 const requested=bookingPeriod(body||{});
 const period=demo&&requested&&!requested.start?bookingPeriod(DEMO_PERIOD):requested;
 if(!period||!["en","zh"].includes(body?.language)||typeof body?.question!=="string"||body.question.length>500
  ||(body.questionId!==undefined&&!isDecisionQuestionId(body.questionId))
  ||(body.catalog!==undefined&&(body.catalog!==true||body.questionId!==undefined))
  ||Object.keys(body).some(k=>!["language","days","question","questionId","catalog","start","end"].includes(k)))throw new WorkspaceError("invalid_request",400);
 const topic=questionTopic(body.question);
 if(!topic&&!body.questionId&&!body.catalog)return Response.json({unsupported:true,language:body.language},{headers:{"Cache-Control":"no-store"}});
 const metrics=await supabase.rpc(period.rpc,{p_property:propertyId,...period.args});
 const raw=metrics.data;
 if(metrics.error||!raw||raw.period_days!==period.days||!Array.isArray(raw.daily)||raw.daily.length!==period.days||(period.start&&(raw.period_start!==period.start||raw.period_end!==period.end)))throw new WorkspaceError("analysis_unavailable",503);
 const data=demo?demoMetrics(raw):raw;
 if(body.catalog||isDecisionQuestionId(body.questionId)){
  const id:DecisionQuestionId|undefined=isDecisionQuestionId(body.questionId)?body.questionId:undefined;
  const ids=id?[id]:decisionQuestionIds;
  const inputs=await decisionInputs(account,data,ids,request.signal);
  const zh=body.language==="zh";
  const headers={"Cache-Control":"private, no-store"};
  if(!id)return Response.json({eligible:ids.filter(questionId=>evaluateDecision(questionId,inputs,zh).ready)},{headers});
  const decision=evaluateDecision(id,inputs,zh);
  return Response.json({engine:"decision_evidence",fallback:false,items:[decision],language:body.language,topic:id,
   period_start:data.period_start,period_end:data.period_end,as_of:data.as_of},{headers});
 }
 if(!topic)throw new WorkspaceError("invalid_request",400);
 let attention;
 if(topic==="attention"){
  const [inventory,tasks]=await Promise.all([supabase.rpc("get_room_inventory",{p_property:propertyId}),supabase.from("booking_import_tasks").select("id").eq("property_id",propertyId).eq("withdrawn",false).is("completed_at",null).limit(200)]);
  const rooms=validateInventory(inventory.data?.inventory,propertyId);
  if(inventory.error||!rooms||tasks.error||!Array.isArray(tasks.data))throw new WorkspaceError("analysis_unavailable",503);
  attention={dirty:rooms.rooms.filter(room=>room.active&&room.housekeeping==="dirty").length,pendingMessages:0,conversationsRead:0,pendingTasks:tasks.data.length};
 }
 const zh=body.language==="zh";
 const openDates=topic==="vacancy"&&!data.historical_inventory_unknown
  ?data.daily.filter((day:{available:number})=>day.available>0).sort((a:{available:number},b:{available:number})=>b.available-a.available).slice(0,3)
  :[];
 const items=topic==="vacancy"?[{
  id:"vacancy",
  title:zh?"空房较多的日期":"Dates with the most rooms open",
  evidence:openDates.length?openDates.map((day:{date:string;available:number})=>day.date+(zh?"：":" · ")+day.available+(zh?" 间空房":" rooms open")).join(zh?"；":"; ")
   :data.historical_inventory_unknown?(zh?"这个周期的历史房量不完整。":"Historical inventory is incomplete for these dates."):(zh?"当前记录没有显示可售空房。":"Current records show no rooms open."),
  action:openDates.length?(zh?"先核对这些日期的可售房量，再决定是否推广。":"Check availability on these dates before planning a promotion."):(zh?"查看经营数据，核对当前房量和订单。":"Review your inventory and bookings in business data."),
  href:"/app/analysis#booking-analysis-detail"
 }]:topic==="booked_value"||topic==="busiest"?focusedInsights(data,topic,zh):groundedInsights(data,topic,zh,attention);
 const result=await prioritiseInsights(items,{model:!operatorSample()&&process.env.FORMAL_MODEL_ENABLED==="1"&&process.env.MODEL_ENABLED==="1",signal:request.signal});
 return Response.json({...result,language:body.language,topic,period_start:data.period_start,period_end:data.period_end,as_of:new Date().toISOString()},{headers:{"Cache-Control":"no-store"}});
}catch(error){return workspaceFailure(error)}}
