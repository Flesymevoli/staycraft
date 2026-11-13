"use client";
import {useCallback,useContext,useEffect,useEffectEvent,useRef,useState} from "react";
import Link from "next/link";
import {OperationStatus,useOperation} from "./operation-status";
import {startOperation,updateOperation,readOperation} from "@/lib/operation-state";
import {promotionRequest} from "@/lib/promotion-request";
import {DiagnosisOverview} from "./diagnosis-overview";
import {HeadlineCard} from "./headline-card";
import {OpportunityCard} from "./opportunity-card";
import {AnalysisRecords} from "./analysis-records";
import {EvidencePanel} from "./evidence-panel";
import {ActionPlanPanel} from "./action-plan-panel";
import type {ActionPlan} from "@/lib/decisions/types";
import {DiagnosticArticle} from "./diagnostic-article";
import {WorkspaceAssistant} from "./workspace-assistant";
import {WorkbenchReport} from "./workbench-report";
import {ArrowUpRight,ChevronDown,Clock3,Database,Loader2} from "lucide-react";
import {useCollectionHint} from "./desktop-collection-hint";
import {GuidedDemoContext,useDesktopSurface} from "./desktop-surface";
import {useBookingMetrics} from "./booking-metrics";
import {GeminiWorkbenchHome} from "./gemini-workbench-home";
import {GeminiDiagnosticReport} from "./gemini-diagnostic-report";
import {WorkbenchDrawer} from "./workbench-drawer";
import {DesktopCollection} from "./desktop-collection";
import type {DecisionAgentResponse,DecisionAgentRun} from "@/lib/decision-agent-types";

import {useDiagnosisTranslation} from "./use-diagnosis-translation";

type CachedRun={run?:DecisionAgentRun;time:number;stale?:boolean;pending?:Promise<DecisionAgentResponse>};
const diagnoses=new Map<string,CachedRun>();
const cacheKey=(scope:string)=>scope;
const diagnosisChanges=['staycraft-stays-changed','staycraft-activity-changed','staycraft-inventory-changed','staycraft-profile-changed','staycraft-import-changed','staycraft-market-synced'];
// Cached diagnoses outlive the homepage. Keep their invalidation listeners alive
// too, so changes on the market, property or import pages cannot reuse old data.
if(typeof window!=='undefined'){
 const invalidate=()=>{for(const entry of diagnoses.values()){entry.stale=true;entry.time=0;}};
 diagnosisChanges.forEach(name=>window.addEventListener(name,invalidate));
}
async function checkDiagnosisResult(scope:string):Promise<DecisionAgentResponse>{
 const op=readOperation(scope,'diagnosis');
 let id=op?.reference;
 if(!id){const history=await promotionRequest('/api/workspace/agent?view=history',{cache:'no-store'});if(!history.historyAvailable)throw Error('history_unavailable');id=history.history?.find((item:{createdAt:string})=>Date.parse(item.createdAt)>=(op?.startedAt??Date.now())-2000)?.id;}
 if(!id)throw Error('analysis_unconfirmed');
 const body=await promotionRequest('/api/workspace/agent?id='+encodeURIComponent(id),{cache:'no-store'});
 if(op)updateOperation(scope,'diagnosis',op.id,{reference:id,phase:body.task?.status==='running'?'uncertain':body.run?.phase==='complete'?'complete':'failed',stage:body.task?.status==='running'?'诊断仍在服务端处理':'已核对本次诊断',stageEn:body.task?.status==='running'?'Diagnosis still running':'Diagnosis checked',detail:body.task?.status==='running'?'稍后再次核对即可，不要重新发起。':body.run?.report?'已读取保存的诊断报告，没有重复调用。':'已有证据保留；可继续本报告写作，无需重新采集。',detailEn:body.task?.status==='running'?'Check again later without another request.':'Saved evidence is retained. Continue this report without recollecting.'});
 if(body.task?.status==='running'||!body.run?.metrics)throw Error('analysis_unconfirmed');
 diagnoses.set(scope,{run:body.run,time:Date.now()});return body;
}
function requestDiagnosis(scope:string,zh:boolean,force:boolean,localDemo=false):Promise<DecisionAgentResponse>{
 const key=cacheKey(scope),current=diagnoses.get(key);
 if(localDemo){
  // This runtime is isolated and has paid AI disabled. Refresh its local report
  // after imports/sync, including changes that arrive during an earlier read.
  if(current?.pending)return current.pending.then(body=>diagnoses.get(key)?.stale?requestDiagnosis(scope,zh,true,true):body);
  force=force||!current?.run||Boolean(current.stale);
 }
 if(current?.pending){
  // An import or quote sync can finish while a diagnosis is still reading old data.
  // Keep the stale marker; a new paid diagnosis requires an explicit user action.
  return current.pending;
 }
 if(!localDemo&&!current?.pending&&readOperation(scope,'diagnosis')?.phase==='uncertain')return checkDiagnosisResult(scope);
 if(!force&&!current&&readOperation(scope,'diagnosis'))return checkDiagnosisResult(scope);
 if(!force&&current?.run)return Promise.resolve({run:current.run,cached:true});
 const entry:CachedRun={...current,time:current?.time||0,stale:false};
 const op=startOperation(scope,'diagnosis',{phase:'running',stage:'正在读取经营记录并调查',stageEn:'Reading records and investigating',detail:'已有报告保留。当前没有可计算的百分比；完成后进入报告写作。',detailEn:'Existing report is kept. No measured percentage is available; report writing follows.'});
 const request=(async()=>{
  const post=async(body:Record<string,unknown>)=>fetch('/api/workspace/agent',{method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',signal:AbortSignal.timeout(200000),body:JSON.stringify({language:zh?'zh':'en',...body})});
  let response=await post(force?{force:true}:{}),body=await response.json();
  if(response.status===409){
   const h=await promotionRequest('/api/workspace/agent?view=history',{cache:'no-store'});const task=h.history?.find((x:{status:string})=>x.status==='running');if(!task)throw Error('analysis_busy');
   updateOperation(scope,'diagnosis',op,{reference:task.id});
   const deadline=Date.now()+200000;
   for(let i=0;i<100&&Date.now()<deadline;i++){await new Promise(r=>setTimeout(r,2000));body=await promotionRequest('/api/workspace/agent?id='+task.id,{cache:'no-store'});if(body.task?.status!=='running')break;}
   if(body.task?.status==='running')throw Error('analysis_busy');
  }else if(!response.ok)throw Error(body.error||'agent_unavailable');
  if(body.run?.phase==='investigated'){updateOperation(scope,'diagnosis',op,{phase:'running',stage:'调查证据已保存，正在写报告',stageEn:'Evidence saved; writing report',detail:'复用本次调查证据，已有报告仍保留。',detailEn:'Reusing this investigation. Existing report remains.',reference:body.run.id});response=await post({runId:body.run.id});body=await response.json();if(!response.ok)throw Error(body.error||'agent_unavailable');}
  if(!body.run?.metrics||!Array.isArray(body.run.findings))throw Error('agent_unavailable');updateOperation(scope,'diagnosis',op,{phase:body.run.phase==='writing_failed'?'failed':'complete',stage:body.run.phase==='writing_failed'?'证据已保存，报告写作未完成':'诊断结果已就绪',stageEn:body.run.phase==='writing_failed'?'Evidence saved; writing incomplete':'Diagnosis ready',detail:body.run.errorCode==='model_rate_limited'?'模型服务当前限流，调查证据已保存。请稍后复用证据重试，不必重新诊断。':body.run.phase==='writing_failed'?'可复用已有证据继续写作，无需再次采集。':'结果已保存，可查看完整报告。',detailEn:'Results are saved. Reuse existing evidence when continuing the report.',reference:body.run.id});return body as DecisionAgentResponse;
 })();
 entry.pending=request;diagnoses.set(key,entry);
 void request.then(body=>{entry.run=body.run;entry.time=entry.stale?0:Date.now();entry.pending=undefined;}).catch(()=>{entry.pending=undefined;entry.time=0;updateOperation(scope,'diagnosis',op,{phase:'uncertain',stage:'诊断结果待核对',stageEn:'Check diagnosis result',detail:'请求已中断或超时。已有报告保留，先读取服务端结果，避免重复调用。',detailEn:'Request interrupted or timed out. Existing report remains. Check server results before another call.'});});
 return request;
}

export function WorkbenchDashboard({scope,zh,displayName}:{scope:string;zh:boolean;displayName?:string}){
 const desktop=useDesktopSurface();
 const localDemo=useContext(GuidedDemoContext);
 const {state:diagnosisOperation}=useOperation('diagnosis',scope);
 const [drawer,setDrawer]=useState<'collection'|'report'|null>(null);
 const {data:metrics,status:metricStatus,retry:retryMetrics}=useBookingMetrics(7,scope);
 const [sourceRun,setRun]=useState<DecisionAgentRun|null>(null),[busy,setBusy]=useState(true),[error,setError]=useState(''),[dataChanged,setDataChanged]=useState(false);
 const translation=useDiagnosisTranslation(sourceRun,scope,zh),run=translation.run;
 const currentLanguage=useEffectEvent(()=>zh);
 const languageRef=useRef(zh);
 useEffect(()=>{languageRef.current=zh},[zh]);
 const t=(en:string,cn:string)=>zh?cn:en;
 const refresh=useCallback(async(force=false)=>{setBusy(true);setError('');try{const result=await requestDiagnosis(scope,languageRef.current,force,localDemo);setRun(result.run);setDataChanged(Boolean(diagnoses.get(scope)?.stale));}catch(e){setError(e instanceof Error?e.message:'agent_unavailable')}finally{setBusy(false)}},[scope,localDemo]);
 useEffect(()=>{let active=true;async function open(){setBusy(true);setError('');setRun(null);try{const response=await requestDiagnosis(scope,currentLanguage(),false,localDemo);if(active){setRun(response.run);setDataChanged(Boolean(diagnoses.get(scope)?.stale))}}catch(e){if(active)setError(e instanceof Error?e.message:'agent_unavailable')}finally{if(active)setBusy(false)}}void open();return()=>{active=false}},[scope,localDemo]);
 useEffect(()=>{let timer:ReturnType<typeof setTimeout>;const changed=()=>{setDataChanged(true);retryMetrics();if(localDemo){clearTimeout(timer);timer=setTimeout(()=>void refresh(),100)}};diagnosisChanges.forEach(name=>window.addEventListener(name,changed));return()=>{clearTimeout(timer);diagnosisChanges.forEach(name=>window.removeEventListener(name,changed))};},[retryMetrics,refresh,localDemo]);
 const translationNote=<><OperationStatus state={translation.operation} zh={zh} compact>{translation.status==='error'&&<button type="button" onClick={translation.retry}>{t('Check or retry translation','核对或重试翻译')}</button>}</OperationStatus>{translation.status!=='ready'?<p className="wb-inline-note" role="status">{translation.status==='loading'?t('Translating the saved diagnosis; original text remains visible.','正在翻译已保存的诊断，期间保留原文。'):t('Translation unavailable. The original diagnosis is still shown.','翻译暂不可用，当前仍显示原诊断。')}{translation.status==='error'&&<> <button type="button" className="wb-secondary-link" onClick={translation.retry}>{t('Retry translation','重试翻译')}</button></>}</p>:null}</>;
 const operating=run?.metrics||(metrics?{bookedPct:metrics.booked_pct,bookedRoomNights:metrics.booked_room_nights,capacityRoomNights:metrics.capacity_room_nights,availableRoomNights:metrics.available_room_nights,amountCents:metrics.amount_cents??null,activeRooms:metrics.active_rooms}:null);
 useCollectionHint(desktop&&!busy&&!error&&run?.market&&run.market.count===0&&!run.market.snapshot?`${run.market.start}/${run.market.end}`:null);
 const period=run?.period||(metrics?{start:metrics.period_start,end:metrics.period_end}:null);
 async function retryWriting(current:DecisionAgentRun,factualOnly=false){
  const previous=readOperation(scope,'diagnosis');
  if(previous?.phase==='uncertain'){try{const checked=await checkDiagnosisResult(scope);setRun(checked.run);return}catch{setError('analysis_unconfirmed');return}}
  const op=startOperation(scope,'diagnosis',{phase:'running',stage:'正在继续报告写作',stageEn:'Continuing report writing',detail:'复用已保存的调查证据，不重新采集。',detailEn:'Reusing saved evidence without recollecting.',reference:current.id});
  setBusy(true);setError('');
  try{
   const response=await fetch('/api/workspace/agent',{method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(120000),body:JSON.stringify({runId:current.id,language:zh?'zh':'en',...(factualOnly?{factualOnly:true}:{})})});
   const result=await response.json();
   if(!response.ok||!result.run)throw Error(result.error||'report_failed');
   setRun(result.run);updateOperation(scope,'diagnosis',op,{phase:result.run.report?'complete':'failed',stage:result.run.report?'报告已保存':'报告写作未完成',stageEn:result.run.report?'Report saved':'Report writing incomplete',detail:result.run.report?'报告已保存。':result.run.errorCode==='model_rate_limited'?'模型服务当前限流，调查证据已保存。请稍后重试。':'调查证据保留，报告写作尚未完成。',detailEn:result.run.report?'Report saved.':'Evidence retained; report not complete.'});
   const entry=diagnoses.get(cacheKey(scope));
   if(entry?.run?.id===current.id)entry.run=result.run;
  }catch(e){setError(e instanceof Error?e.message:'report_failed');updateOperation(scope,'diagnosis',op,{phase:'uncertain',stage:'报告结果待核对',stageEn:'Check report result',detail:'已有报告与证据保留，请先核对本次写作结果。',detailEn:'Report and evidence are kept. Check the result first.'});}finally{setBusy(false)}
 }
 const [plan,setPlan]=useState<ActionPlan|null>(null);
 const [planProgress,setPlanProgress]=useState<{state:'improved'|'not_improved'|'insufficient';detail:string}|null>(null);
 const [planError,setPlanError]=useState(false);
 const [planRead,setPlanRead]=useState<{runId:string|null;status:'pending'|'ready'|'failed'}>({runId:null,status:'pending'});
 const planRequest=useRef<{sequence:number;runId?:string;controller?:AbortController}>({sequence:0});
 const planRunId=run?.id??null;
 const planReadStatus=planRead.runId===planRunId?planRead.status:'pending';
 const visiblePlan=planRead.runId===planRunId?plan:null;
 const refreshPlan=useCallback(async()=>{
  if(!planRunId)return;
  planRequest.current.controller?.abort();
  const controller=new AbortController(),sequence=++planRequest.current.sequence;
  if(planRequest.current.runId!==planRunId){setPlan(null);setPlanProgress(null)}
  planRequest.current.runId=planRunId;
  planRequest.current.controller=controller;
  setPlanRead({runId:planRunId,status:'pending'});setPlanError(false);
  try{
   const response=await fetch(`/api/workspace/agent/plan?runId=${planRunId}`,{cache:'no-store',signal:controller.signal});
   const body=await response.json();
   if(sequence!==planRequest.current.sequence||controller.signal.aborted)return;
   if(!response.ok)throw Error('plan_unavailable');
   setPlan(body.plan??null);setPlanProgress(body.progress??null);setPlanRead({runId:planRunId,status:'ready'});
  }catch{if(sequence===planRequest.current.sequence&&!controller.signal.aborted)setPlanRead({runId:planRunId,status:'failed'})}
 },[planRunId]);
 // A new diagnosis invalidates both the previous request and its displayed result.
 // eslint-disable-next-line react-hooks/set-state-in-effect
 useEffect(()=>{const request=planRequest.current;void refreshPlan();return()=>{request.controller?.abort();request.sequence++}},[refreshPlan]);
 const savePlan=useCallback(async(opportunityId:string)=>{if(!run)return;planRequest.current.controller?.abort();const sequence=++planRequest.current.sequence;setPlanError(false);try{const response=await fetch('/api/workspace/agent/plan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({runId:run.id,opportunityId})});const body=await response.json();if(sequence!==planRequest.current.sequence)return;if(response.ok&&body?.plan){setPlan(body.plan);setPlanProgress(null);setPlanRead({runId:run.id,status:'ready'})}else{setPlanError(true);if(response.status===409)void refreshPlan()}}catch{if(sequence===planRequest.current.sequence)setPlanError(true)}},[run,refreshPlan]);
 const togglePlanItem=useCallback(async(itemId:string)=>{
  if(!run||!plan)return;
  const current=plan.items.find(entry=>entry.id===itemId);
  if(!current)return;
  const status=current.status==='done'?'planned':'done';
  planRequest.current.controller?.abort();const sequence=++planRequest.current.sequence;
  setPlanError(false);
  try{const response=await fetch('/api/workspace/agent/plan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({runId:plan.runId,opportunityId:plan.opportunityId,toggle:{itemId,status}})});const body=await response.json();if(sequence!==planRequest.current.sequence)return;if(response.ok&&body?.plan){setPlan(body.plan);setPlanRead({runId:run.id,status:'ready'})}else{setPlanError(true);if(response.status===409)void refreshPlan()}}catch{if(sequence===planRequest.current.sequence)setPlanError(true)}
 },[run,plan,refreshPlan]);
 const planPanel=<div className="wb-plan-slot">{planError&&<p role="alert">{t("Could not update the action plan. Try again.","行动计划未能更新，请重试。")}</p>}{visiblePlan||planReadStatus==='ready'?<ActionPlanPanel plan={visiblePlan} zh={zh} compact={desktop} readOnly={planReadStatus==='pending'} onToggleItem={togglePlanItem}/>:<section className="ap-panel"><h3 className="ap-title">{t('Action plan','行动计划')}</h3>{planReadStatus==='pending'&&<p role="status">{t('Reading your action plan…','正在读取行动计划…')}</p>}</section>}{planReadStatus==='failed'&&<p role="alert">{t('Could not read the action plan.','暂时无法读取行动计划。')} <button type="button" className="wb-secondary-link" onClick={()=>void refreshPlan()}>{t('Retry','重新读取')}</button></p>}{!!visiblePlan&&<div className="wb-plan-progress"><button type="button" className="wb-secondary-link" disabled={planReadStatus==='pending'} onClick={()=>void refreshPlan()}>{planReadStatus==='pending'?t('Reading your action plan…','正在读取行动计划…'):t('Check progress','回看进展')}</button>{planReadStatus==='ready'&&planProgress&&<p className="wb-inline-note">{planProgress.state==='insufficient'?t('Follow-up pending','待跟进'):t('Current records','当前记录对比')}：{planProgress.detail}</p>}</div>}</div>;
 // Existing server order is severity, then earliest window. Keep the first of each
 // detector family on the desktop overview; never merge IDs or plan context.
 const opportunities=run?.opportunities??[];
 const overviewOpportunities=desktop?opportunities.filter(item=>!item.basis.length||item.basis.some(signal=>signal.metric.value!==null)):opportunities;
 const featuredOpportunities=(desktop?overviewOpportunities.filter((item,index)=>{
  const family=item.basis[0]?.kind;
  return !family||overviewOpportunities.findIndex(other=>other.basis[0]?.kind===family)===index;
 }):overviewOpportunities).slice(0,2);
 const empty=operating?.activeRooms===0;
 const actionHref=(finding:DecisionAgentRun["findings"][number])=>{const action=finding.nextAction;if(!action||!run)return null;const dates=new URLSearchParams({start:action.period.start,end:action.period.end});if(action.target==='promotion')return `/app/promotion?${new URLSearchParams({runId:run.id,findingId:finding.id})}`;if(action.target==='market')return `/app/explore?${dates}`;if(action.target==='data')return `/app/analysis?${dates}`;return null;};
 const actionLabel=(target:string)=>target==='promotion'?t('Create promotion plan','制定推广方案'):target==='market'?t('Research the market','查看市场报价'):t('Review business data','查看经营数据');
 const diagnosisStatus=<OperationStatus state={diagnosisOperation} zh={zh} compact>
  {busy&&diagnosisOperation&&<button type="button" onClick={()=>{setBusy(false);updateOperation(scope,'diagnosis',diagnosisOperation.id,{phase:'uncertain',detail:'已停止前台等待，服务端可能仍在处理。稍后核对结果即可。',detailEn:'Stopped waiting here. The server may still be working; check its result later.'})}}>{t('Stop waiting; check later','停止等待，稍后核对')}</button>}
  {diagnosisOperation&&<button type="button" disabled={busy} onClick={()=>{setBusy(true);void checkDiagnosisResult(scope).then(body=>{setRun(body.run);setError('')}).catch(()=>setError('analysis_unconfirmed')).finally(()=>setBusy(false))}}>{t('Check saved result','核对已保存结果')}</button>}
  {(dataChanged||['failed','uncertain'].includes(diagnosisOperation?.phase||''))&&<button type="button" disabled={busy} onClick={()=>{if(diagnosisOperation?.phase==='uncertain'&&!window.confirm(t('The previous result is unconfirmed. Start a new diagnosis that may incur AI costs?','上次结果尚未确认，确定重新发起可能收费的诊断吗？')))return;if(diagnosisOperation)updateOperation(scope,'diagnosis',diagnosisOperation.id,{phase:'failed'});void refresh(true)}}>{t('Diagnose updated data','按更新数据重新诊断')}</button>}
  {sourceRun&&['investigated','writing_failed'].includes(sourceRun.phase||'')&&<button type="button" disabled={busy} onClick={()=>void retryWriting(sourceRun)}>{t('Continue report using saved evidence','复用证据继续写报告')}</button>}
  {sourceRun&&['investigated','writing_failed'].includes(sourceRun.phase||'')&&<button type="button" disabled={busy} onClick={()=>void retryWriting(sourceRun,true)}>{t('Build data report without AI','按已有数据整理报告（不调用 AI）')}</button>}
 </OperationStatus>;
 if(desktop)return <>
  <GeminiWorkbenchHome scope={scope} run={run} metrics={metrics} zh={zh} busy={busy}
   reportStatus={<>{diagnosisStatus}{translationNote}</>}
   error={error|| (metricStatus==='error'?'metrics_unavailable':'')}
   onRetry={()=>{retryMetrics();void refresh(false)}} planPanel={planPanel}
   onSavePlan={id=>void savePlan(id)} onCollect={()=>setDrawer('collection')} onReport={()=>setDrawer('report')}/>
  {drawer&&<WorkbenchDrawer title={drawer==='collection'?t('Collect nearby prices','采集周边住宿报价'):t('Full diagnostic report','完整诊断报告')} onClose={()=>setDrawer(null)}>
   {drawer==='collection'?<DesktopCollection zh={zh} expanded onSync={()=>{}}/>:
    <>{diagnosisStatus}{translationNote}{run?<GeminiDiagnosticReport scope={scope} run={run} metrics={metrics} zh={zh} onNavigate={()=>setDrawer(null)}>
    {run.report?<DiagnosticArticle key={run.id+run.report.updatedAt} initial={run} inline zh={zh}/>:<><DiagnosisOverview run={run} zh={zh}/>{run.findings.map(finding=><article className="wb-finding" key={finding.id}>
     <h3>{finding.title}</h3><p>{finding.conclusion}</p><p>{finding.reason}</p><p>{finding.action}</p>
     {finding.uncertainty&&<small>{finding.uncertainty}</small>}
     {actionHref(finding)&&<Link href={actionHref(finding)!}>{actionLabel(finding.nextAction!.target)} →</Link>}
    </article>)}<EvidencePanel sources={run.signalSources||[]} signals={run.signals} zh={zh}/><AnalysisRecords run={run} zh={zh}/></>}
    </GeminiDiagnosticReport>:
    <p role="status">{busy?t('Reading your operating records…','正在读取经营记录…'):t('A diagnosis is not available yet.','尚未生成诊断，请返回工作台重试。')}</p>}</>}
  </WorkbenchDrawer>}
 </>;
 return <div className="workbench-dashboard">{diagnosisStatus}
  {translationNote}
  {desktop&&<header className="desktop-dashboard-heading"><h1>{t(`Hello, ${displayName||"host"}`,`你好，${displayName||"店主"}`)}</h1><p>{t("Revenue overview, diagnosis and priority actions.","收入概况、经营诊断与优先行动。")}</p></header>}
  <div className="wb-overview-label"><span><Clock3 aria-hidden="true" size={14}/>{period?`${period.start} — ${period.end}`:t('Reading the period…','正在读取经营周期…')}</span>{desktop&&<div className="desktop-page-actions"><Link href="/app/explore#desktop-collection">{t("Collect prices","实时采集报价")}</Link><button type="button" onClick={()=>{const report=document.querySelector<HTMLDetailsElement>(".wb-inline-report");if(report){report.open=true;report.scrollIntoView({block:"start",behavior:"smooth"})}else document.querySelector(".desktop-dashboard-review")?.scrollIntoView({block:"start",behavior:"smooth"})}}>{t("Full diagnosis","完整诊断报告")}</button></div>}</div>
  {metricStatus==='error'&&!operating&&<div className="wb-inline-error" role="alert">{t('Figures unavailable.','暂时无法读取指标。')}<button onClick={retryMetrics}>{t('Retry','重试')}</button></div>}
  <aside className="desktop-dashboard-tools">
   {metrics?.booked_pct!=null&&<section className="desktop-occupancy-card native-card">
    <h2>{t("Booked occupancy","预订占用率")}</h2>
    <div className="desktop-occupancy-gauge">
     <svg viewBox="0 0 220 124" aria-hidden="true">
      {Array.from({length:18},(_,i)=>{
       // Original 18-segment geometry; the last two filled ticks highlight the live value.
       const count=Math.ceil(Math.max(0,Math.min(100,metrics.booked_pct!))*18/100);
       const angle=Math.PI*(1-i/17),filled=i<count,accent=filled&&i>=Math.max(0,count-2);
       return <line key={i} data-filled={filled||undefined} data-accent={accent||undefined} x1={110+68*Math.cos(angle)} y1={108-68*Math.sin(angle)} x2={110+96*Math.cos(angle)} y2={108-96*Math.sin(angle)} strokeWidth="7.5" strokeLinecap="round"/>;
      })}
     </svg>
     <strong>{metrics.booked_pct}%</strong>
    </div>
    <p>{t("Booked / available room nights","已订 / 总可售间夜")} · {metrics.booked_room_nights} / {metrics.capacity_room_nights}</p>
    <Link className="inventory-text" href="/app/analysis">{t("View daily figures","查看每日数据")} →</Link>
   </section>}
  {desktop&&planPanel}
  <WorkspaceAssistant key={scope} zh={zh} embedded={desktop} range={metrics?{start:metrics.period_start,end:metrics.period_end}:undefined}/>
  </aside>
  <WorkbenchReport run={run} metrics={metrics??null} zh={zh}/>
  <div className="desktop-dashboard-review">{empty?<section className="wb-onboarding"><Database aria-hidden="true" size={24}/><h2>{t('Prepare your first diagnosis','准备第一份经营诊断')}</h2><p>{t('Add your property, room inventory and booking records.','完善民宿资料、房型房量并导入订单。')}</p><div className="wb-finding-actions"><Link href="/app/mine">{t('Property details','民宿资料')}</Link><Link href="/app/rooms/new">{t('Add rooms','添加客房')}</Link><Link href="/app/work#booking-import">{t('Import bookings','导入订单')}</Link></div></section>:<>
   <div className="wb-diagnosis-head"><h2>{t('Operating review','经营诊断报告')}</h2>{busy&&<small role="status">{t('Analysing…','分析中…')}</small>}</div>
   {dataChanged&&<p className="wb-updated-note" role="status">{t('Records changed. Refresh the diagnosis to use the new data.','经营记录已更新，可按新数据重新诊断。')}</p>}
   {error&&<div className="wb-inline-error" role="alert"><p>{/cooldown|rate|busy/.test(error)?t('Please try again shortly.','请稍后再试。'):t('Analysis unavailable. Your data is still accessible.','本次分析未完成，经营数据仍可查看。')}</p><button disabled={busy} onClick={()=>void refresh(false)}>{t('Retry','重试')}</button></div>}
   {busy&&!run&&<div className="wb-analysis-loading" role="status"><Loader2 aria-hidden="true" className="is-spinning" size={24}/><h3>{t('Investigating your business','正在分析经营情况')}</h3><p>{t('Reading records and choosing what to investigate.','读取经营记录，按需调查市场信息…')}</p></div>}
   {run&&<><div className="wb-agent-summary" aria-live="polite"><span>{run.findingsSource==='rules'?(run.report&&run.engine==='model_v1'?t('Rules summary + AI report','规则摘要 + AI 报告'):t('Data summary','经营数据摘要')):t('AI diagnosis','AI 诊断')}</span><time>{new Date(run.generatedAt).toLocaleString(zh?'zh-CN':'en-GB')}</time>{run.errorCode==='model_unavailable'?<span>{t('AI report writing is unavailable','AI 报告写作暂不可用')}</span>:run.phase==='writing_failed'?<span>{t('Writing incomplete','报告写作未完成')}</span>:run.status!=='completed'&&<span>{t('Partial evidence','部分证据不可用')}</span>}</div>
   <div className="diagnosis-layout"><div className="diagnosis-layout-main"><HeadlineCard run={run} zh={zh} metrics={metrics}/>{(!desktop||run.report)&&<DiagnosisOverview run={run} zh={zh}/>}{!!run.opportunities?.length&&<div className="wb-opportunity-row">{featuredOpportunities.map(opportunity=><OpportunityCard key={opportunity.id} opportunity={opportunity} zh={zh} onSavePlan={plan?.runId!==run.id?()=>void savePlan(opportunity.id):undefined} onPrimaryAction={target=>{const href=target==='promotion'?`/app/promotion?${new URLSearchParams({runId:run.id,opportunityId:opportunity.id})}`:target==='market'?'/app/explore':target==='data'?'/app/analysis':null;if(href)window.location.assign(href)}}/>)}</div>}</div><div className="diagnosis-layout-side">{!desktop&&(!!run.signalSources?.length||!!run.signals?.length)&&<EvidencePanel sources={run.signalSources||[]} signals={run.signals} zh={zh}/>}{!desktop&&planPanel}</div></div>{run.report&&<details key={run.id} className="wb-inline-report"><summary><span className="when-closed">{t("Read full report","展开完整报告")}</span><span className="when-open">{t("Collapse report","收起报告")}</span><ChevronDown size={16} aria-hidden="true"/></summary><DiagnosticArticle key={run.id+run.report.updatedAt} initial={run} inline zh={zh}/></details>}{run.phase==='writing_failed'&&run.errorCode!=='model_unavailable'&&<button className="wb-secondary-link" disabled={busy} onClick={()=>void retryWriting(run)}>{t("Retry report writing","重试报告写作")}</button>}
   {!run.report&&<details className="wb-inline-report" data-rule-report open><summary>{t("Diagnosis","经营诊断")}</summary><div className="wb-decision-layout wb-inline-layout"><section className="wb-diagnosis"><div className="wb-findings">{run.findings.slice(0,2).map((finding,index)=><article className={`wb-finding ${index===0?'is-focused':'is-secondary'} ${finding.severity}`} key={finding.id}>
    <h3>{finding.title}</h3><p>{finding.conclusion}</p>
    <div className="wb-finding-actions">{actionHref(finding)&&<Link className="wb-primary-action" href={actionHref(finding)!}>{actionLabel(finding.nextAction!.target)}<ArrowUpRight aria-hidden="true" size={16}/></Link>}</div>
   {!run.report&&<div className="wb-inline-explanation" id={`advice-${finding.id}`}>
    <p>{finding.reason}</p><p className="wb-report-decision"><strong>{t("Recommendation","建议决策")}：</strong>{finding.action}</p>{finding.uncertainty&&<p className="wb-inline-note">{finding.uncertainty}</p>}
    {!desktop&&<details className="wb-source-details"><summary>{t('Sources and analysis record','查看数据与分析记录')}</summary>
     {run.evidence.filter(item=>finding.evidenceIds.includes(item.id)).map(item=><div className="wb-inline-source" key={item.id}><p>{item.title}</p><ul>{item.facts.map((fact,i)=><li key={i}>{fact}</li>)}</ul><small>{item.source}{item.period?` · ${item.period.start} — ${item.period.end}`:''}</small></div>)}
     {!!run.dailyMetrics?.length&&<details><summary>{t('Daily figures','每日数据')}</summary><div className="wb-snapshot-table"><table><caption>{run.period.start} — {run.period.end}</caption><thead><tr><th>{t('Date','日期')}</th><th>{t('Booked','已订')}</th><th>{t('Open','空余')}</th></tr></thead><tbody>{run.dailyMetrics.map(day=><tr key={day.date}><td>{day.date}</td><td>{day.booked}</td><td>{day.available??'—'}</td></tr>)}</tbody></table></div></details>}
     {!!run.steps.length&&<details><summary>{t('Analysis record','分析记录')}</summary><ol>{run.steps.map(step=><li key={step.id}><p>{step.label}</p><p>{step.detail}</p></li>)}</ol></details>}
     {!!run.limitations.length&&<details><summary>{t('Data limits','数据说明')}</summary><ul>{run.limitations.map((item,i)=><li key={i}>{item}</li>)}</ul></details>}
    </details>}
   </div>}
   </article>)}</div>{!run.findings.length&&<p className="wb-quiet-state">{t('No actionable findings in this run.','本次未形成具体建议，可先查看经营数据。')}</p>}
  </section>
   </div></details>}
   {desktop&&<div className="desktop-diagnosis-sources">{(!!run.signalSources?.length||!!run.signals?.length)&&<EvidencePanel sources={run.signalSources||[]} signals={run.signals} zh={zh}/>}<AnalysisRecords run={run} zh={zh}/></div>}
   </>}
  </>}</div>

 </div>;
}
