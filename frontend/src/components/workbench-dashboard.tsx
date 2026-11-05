"use client";
import {useCallback,useEffect,useState} from "react";
import Link from "next/link";
import {WorkbenchReport} from "./workbench-report";
import {ArrowRight,ArrowUpRight,ChevronDown,Clock3,Database,Loader2} from "lucide-react";
import {useBookingMetrics} from "./booking-metrics";
import type {AgentHistoryItem,DecisionAgentResponse,DecisionAgentRun} from "@/lib/decision-agent-types";

type CachedRun={run?:DecisionAgentRun;time:number;stale?:boolean;pending?:Promise<DecisionAgentResponse>};
const diagnoses=new Map<string,CachedRun>();
const cacheKey=(scope:string,zh:boolean)=>`${scope}:${zh?'zh':'en'}`;
function requestDiagnosis(scope:string,zh:boolean,force:boolean){
 const key=cacheKey(scope,zh),current=diagnoses.get(key);
 if(current?.pending)return current.pending;
 if(!force&&current?.run&&!current.stale&&Date.now()-current.time<5*60000)return Promise.resolve({run:current.run,cached:true});
 const entry:CachedRun={...current,time:current?.time||0,stale:false};
 const request=(async()=>{
  const post=async(body:Record<string,unknown>)=>fetch('/api/workspace/agent',{method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',body:JSON.stringify({language:zh?'zh':'en',...body})});
  let response=await post(force?{force:true}:{}),body=await response.json();
  if(response.status===409){
   const h=await fetch('/api/workspace/agent?view=history',{cache:'no-store'}).then(r=>r.json());const task=h.history?.find((x:{status:string})=>x.status==='running');if(!task)throw Error('analysis_busy');
   for(let i=0;i<100;i++){await new Promise(r=>setTimeout(r,2000));body=await fetch('/api/workspace/agent?id='+task.id,{cache:'no-store'}).then(r=>r.json());if(body.task?.status!=='running')break;}
   if(body.task?.status==='running')throw Error('analysis_busy');
  }else if(!response.ok)throw Error(body.error||'agent_unavailable');
  if(body.run?.phase==='investigated'){response=await post({runId:body.run.id});body=await response.json();if(!response.ok)throw Error(body.error||'agent_unavailable');}
  if(!body.run?.metrics||!Array.isArray(body.run.findings))throw Error('agent_unavailable');return body as DecisionAgentResponse;
 })();
 entry.pending=request;diagnoses.set(key,entry);
 void request.then(body=>{entry.run=body.run;entry.time=entry.stale?0:Date.now();entry.pending=undefined;}).catch(()=>{entry.pending=undefined;entry.time=0;});
 return request;
}

export function WorkbenchDashboard({scope,zh}:{scope:string;zh:boolean}){
 const {data:metrics,status:metricStatus,retry:retryMetrics}=useBookingMetrics(7,scope);
 const [run,setRun]=useState<DecisionAgentRun|null>(null),[busy,setBusy]=useState(true),[error,setError]=useState(''),[dataChanged,setDataChanged]=useState(false);
 const [history,setHistory]=useState<AgentHistoryItem[]>([]);
 useEffect(()=>{const controller=new AbortController();fetch('/api/workspace/agent?view=history',{cache:'no-store',signal:controller.signal}).then(async r=>{if(r.ok){const data=await r.json();if(Array.isArray(data.history))setHistory(data.history)}}).catch(()=>{});return()=>controller.abort()},[scope,run?.id]);
 async function openHistory(id:string){setBusy(true);setError('');try{const response=await fetch('/api/workspace/agent?id='+encodeURIComponent(id),{cache:'no-store'});const result=await response.json();if(!response.ok||!result.run)throw Error('history_unavailable');setRun(result.run)}catch{setError('history_unavailable')}finally{setBusy(false)}}
 const t=(en:string,cn:string)=>zh?cn:en;
 const refresh=useCallback(async(force=false)=>{setBusy(true);setError('');try{const result=await requestDiagnosis(scope,zh,force);setRun(result.run);setDataChanged(false);}catch(e){setError(e instanceof Error?e.message:'agent_unavailable')}finally{setBusy(false)}},[scope,zh]);
 useEffect(()=>{let active=true;async function open(){setBusy(true);setError('');setRun(null);try{const response=await requestDiagnosis(scope,zh,false);if(active){setRun(response.run);setDataChanged(false)}}catch(e){if(active)setError(e instanceof Error?e.message:'agent_unavailable')}finally{if(active)setBusy(false)}}void open();return()=>{active=false}},[scope,zh]);
 useEffect(()=>{const changed=()=>{const entry=diagnoses.get(cacheKey(scope,zh));if(entry){entry.stale=true;entry.time=0;}setDataChanged(true);retryMetrics();void refresh(false)};const events=['staycraft-stays-changed','staycraft-activity-changed','staycraft-inventory-changed','staycraft-profile-changed','staycraft-import-changed'];events.forEach(name=>window.addEventListener(name,changed));return()=>events.forEach(name=>window.removeEventListener(name,changed));},[scope,zh,retryMetrics,refresh]);
 const operating=run?.metrics||(metrics?{bookedPct:metrics.booked_pct,bookedRoomNights:metrics.booked_room_nights,capacityRoomNights:metrics.capacity_room_nights,availableRoomNights:metrics.available_room_nights,amountCents:metrics.amount_cents??null,activeRooms:metrics.active_rooms}:null);
 const period=run?.period||(metrics?{start:metrics.period_start,end:metrics.period_end}:null);
 const empty=operating?.activeRooms===0;
 const revealHistory=()=>{const panel=document.getElementById('diagnosis-history');if(panel instanceof HTMLDetailsElement)panel.open=true;};
 const actionHref=(finding:DecisionAgentRun["findings"][number])=>{const action=finding.nextAction;if(!action||!run)return null;const dates=new URLSearchParams({start:action.period.start,end:action.period.end});if(action.target==='promotion')return `/app/promotion?${new URLSearchParams({runId:run.id,findingId:finding.id})}`;if(action.target==='market')return `/app/explore?${dates}`;if(action.target==='data')return `/app/analysis?${dates}`;return null;};
 const actionLabel=(target:string)=>target==='promotion'?t('Create promotion plan','制定推广方案'):target==='market'?t('Research the market','查看市场报价'):t('Review business data','查看经营数据');
 return <div className="workbench-dashboard">
  <div className="wb-overview-label"><span><Clock3 aria-hidden="true" size={14}/>{period?`${period.start} — ${period.end}`:t('Reading the period…','正在读取经营周期…')}</span><a href="#diagnosis-history" onClick={revealHistory}>{t('View history','查看历史')}</a></div>
  {metricStatus==='error'&&!operating&&<div className="wb-inline-error" role="alert">{t('Figures unavailable.','暂时无法读取指标。')}<button onClick={retryMetrics}>{t('Retry','重试')}</button></div>}
  <WorkbenchReport run={run} metrics={metrics??null} zh={zh}/>
  {empty?<section className="wb-onboarding"><Database aria-hidden="true" size={24}/><h2>{t('Prepare your first diagnosis','准备第一份经营诊断')}</h2><p>{t('Add your property, room inventory and booking records.','完善民宿资料、房型房量并导入订单。')}</p><div className="wb-finding-actions"><Link href="/app/mine">{t('Property details','民宿资料')}</Link><Link href="/app/rooms/new">{t('Add rooms','添加客房')}</Link><Link href="/app/work#booking-import">{t('Import bookings','导入订单')}</Link></div></section>:<>
   <div className="wb-diagnosis-head"><h2>{t('Operating review','经营诊断报告')}</h2>{busy&&<small role="status">{t('Analysing…','分析中…')}</small>}</div>
   {dataChanged&&<p className="wb-updated-note" role="status">{t('Records changed. Refresh the diagnosis to use the new data.','经营记录已更新，正在同步分析。')}</p>}
   {error&&<div className="wb-inline-error" role="alert"><p>{/cooldown|rate|busy/.test(error)?t('Please try again shortly.','请稍后再试。'):t('Analysis unavailable. Your data is still accessible.','本次分析未完成，经营数据仍可查看。')}</p><button disabled={busy} onClick={()=>void refresh(false)}>{t('Retry','重试')}</button></div>}
   {busy&&!run&&<div className="wb-analysis-loading" role="status"><Loader2 aria-hidden="true" className="is-spinning" size={24}/><h3>{t('Investigating your business','正在分析经营情况')}</h3><p>{t('Reading records and choosing what to investigate.','读取经营记录，按需调查市场信息…')}</p></div>}
   {run&&<><div className="wb-agent-summary" aria-live="polite"><span>{run.engine==='model_v1'?t('AI diagnosis','AI 诊断'):t('Data summary','经营数据摘要')}</span><time>{new Date(run.generatedAt).toLocaleString(zh?'zh-CN':'en-GB')}</time>{run.phase==='writing_failed'?<span>{t('Writing incomplete','报告写作未完成')}</span>:run.status!=='completed'&&<span>{t('Partial evidence','部分证据不可用')}</span>}</div>
   <p className="wb-report-summary">{run.summary}</p>{run.report&&<Link className="wb-secondary-link" href={`/app/reports/${run.id}`}>{t("Read full report","阅读完整报告")} →</Link>}{run.phase==='writing_failed'&&<Link href={`/app/reports/${run.id}`}>{t("Resume report writing","重试报告写作（复用现有证据）")}</Link>}
   <div className="wb-decision-layout wb-inline-layout"><section className="wb-diagnosis"><div className="wb-findings">{(run.report?run.report.sections.slice(0,3).map((section,i)=>({id:`report-${i}`,title:section.title,conclusion:section.paragraphs[0].match(/^.*?[。！？]/)?.[0]||section.paragraphs[0],severity:"medium" as const,action:"",reason:"",evidenceIds:section.evidenceIds,uncertainty:"",nextAction:undefined})):run.findings.slice(0,2)).map((finding,index)=><article className={`wb-finding ${index===0?'is-focused':'is-secondary'} ${finding.severity}`} key={finding.id}>
    <h3>{finding.title}</h3><p>{finding.conclusion}</p>
    <div className="wb-finding-actions">{actionHref(finding)&&<Link className="wb-primary-action" href={actionHref(finding)!}>{actionLabel(finding.nextAction!.target)}<ArrowUpRight aria-hidden="true" size={16}/></Link>}</div>
   {!run.report&&<div className="wb-inline-explanation" id={`advice-${finding.id}`}>
    <p>{finding.reason}</p><p className="wb-report-decision"><strong>{t("Recommendation","建议决策")}：</strong>{finding.action}</p>{finding.uncertainty&&<p className="wb-inline-note">{finding.uncertainty}</p>}
    <details className="wb-source-details"><summary>{t('Sources and analysis record','查看数据与分析记录')}</summary>
     {run.evidence.filter(item=>finding.evidenceIds.includes(item.id)).map(item=><div className="wb-inline-source" key={item.id}><p>{item.title}</p><ul>{item.facts.map((fact,i)=><li key={i}>{fact}</li>)}</ul><small>{item.source}{item.period?` · ${item.period.start} — ${item.period.end}`:''}</small></div>)}
     {!!run.dailyMetrics?.length&&<details><summary>{t('Daily figures','每日数据')}</summary><div className="wb-snapshot-table"><table><caption>{run.period.start} — {run.period.end}</caption><thead><tr><th>{t('Date','日期')}</th><th>{t('Booked','已订')}</th><th>{t('Open','空余')}</th></tr></thead><tbody>{run.dailyMetrics.map(day=><tr key={day.date}><td>{day.date}</td><td>{day.booked}</td><td>{day.available??'—'}</td></tr>)}</tbody></table></div></details>}
     {!!run.steps.length&&<details><summary>{t('Analysis record','分析记录')}</summary><ol>{run.steps.map(step=><li key={step.id}><p>{step.label}</p><p>{step.detail}</p></li>)}</ol></details>}
     {!!run.limitations.length&&<details><summary>{t('Data limits','数据说明')}</summary><ul>{run.limitations.map((item,i)=><li key={i}>{item}</li>)}</ul></details>}
    </details>
   </div>}
   </article>)}</div>{!run.findings.length&&<p className="wb-quiet-state">{t('No actionable findings in this run.','本次未形成具体建议，可先查看经营数据。')}</p>}
   <a className="wb-secondary-link" href="#diagnosis-history" onClick={revealHistory}>{t('All diagnoses','查看全部诊断')}<ArrowRight aria-hidden="true" size={14}/></a></section>
   </div></>}
  </>}
  <details className="wb-history" id="diagnosis-history"><summary>{t('Diagnosis history','诊断历史')}<ChevronDown aria-hidden="true" size={16}/></summary>{history.length?<ul>{history.map(item=><li key={item.id}><div><time>{new Date(item.createdAt).toLocaleString(zh?'zh-CN':'en-GB')}</time><p>{item.summary||t('Analysis incomplete','分析未完成')}</p></div><button disabled={busy||!['completed','limited'].includes(item.status)||item.id===run?.id} onClick={()=>void openHistory(item.id)}>{item.id===run?.id?t('Viewing','正在查看'):t('Review','查看')}</button></li>)}</ul>:<p>{t('No saved history available.','暂无可读取的历史诊断。')}</p>}</details>

 </div>;
}
