"use client";
import {promotionRequest} from "@/lib/promotion-request";
import {useEffect,useEffectEvent,useRef,useState} from 'react';
import {promotionTarget,validPromotionPlan,validPromotionDiagnosis,type PromotionPlan,type PromotionFact} from '@/lib/promotion-plan';
import type {PromotionBrief} from '@/lib/promotion';
import {DEMO_PERIOD,workspaceDay} from '@/lib/demo-period';
import './promotion-plan.css';

export function PromotionPlanPanel({zh,brief,plan,onPlan,onPeriod,disabled,studio=false,context=null,onGeneral}:{context?:{diagnosis?:PromotionPlan['diagnosis']}|null;onGeneral:()=>void;zh:boolean;brief:PromotionBrief;plan:PromotionPlan|null;onPlan:(plan:PromotionPlan|null)=>void;onPeriod:(start:string,end:string)=>void;disabled:boolean;studio?:boolean}){
 const [diagnosis,setDiagnosis]=useState<PromotionPlan['diagnosis']>(),[reason,setReason]=useState(''),[facts,setFacts]=useState<PromotionFact[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[linkFailed,setLinkFailed]=useState(false);
 const [contextReady,setContextReady]=useState(false);const attempt=useRef('');
 const t=(cn:string,en:string)=>zh?cn:en;
 const readLink=context===null;
 const activeDiagnosis=readLink?diagnosis:context.diagnosis;
 const activeReason=readLink?reason:'';
 const activeLinkFailed=readLink&&linkFailed;
 const applyLinkedTarget=useEffectEvent((ref:NonNullable<PromotionPlan['diagnosis']>,target:ReturnType<typeof promotionTarget>)=>{
  // A saved draft or an explicit date edit takes priority over a late URL read.
  if(context!==null)return;
  setDiagnosis(ref);setReason(target.reason);onPeriod(target.period.start,target.period.end);
 });
 useEffect(()=>{
  if(!readLink)return;
  const params=new URLSearchParams(window.location.search),runId=params.get('runId'),findingId=params.get('findingId'),opportunityId=params.get('opportunityId');
  const ref=findingId?{runId,findingId}:{runId,opportunityId};
  if(!validPromotionDiagnosis(ref)){const timer=setTimeout(()=>setContextReady(true),0);return()=>clearTimeout(timer);}
  const controller=new AbortController();


  promotionRequest('/api/workspace/agent?id='+encodeURIComponent(ref.runId),{cache:'no-store',signal:controller.signal}).then(data=>{const today=data.run?.dataMode==='fictional_demo'?DEMO_PERIOD.start:workspaceDay(false),target=promotionTarget(data.run,ref,today);if(controller.signal.aborted)return;applyLinkedTarget(ref,target);}).catch(()=>{if(!controller.signal.aborted)setLinkFailed(true)}).finally(()=>{if(!controller.signal.aborted)setContextReady(true)});
  return()=>controller.abort();
 // The diagnosis URL is read once; date edits remain the owner's choice.
 },[readLink]);
 async function generate(signal?:AbortSignal){
  setBusy(true);setError('');
  try{const data=await promotionRequest('/api/workspace/promotion/plan',{method:'POST',headers:{'Content-Type':'application/json'},signal,body:JSON.stringify({brief:{...brief,language:zh?'zh':'en'},factualOnly:true,...(activeDiagnosis?{diagnosis:activeDiagnosis}:{})})});if(signal?.aborted)return;if(!validPromotionPlan(data.plan))throw Error('invalid');onPlan(data.plan);setFacts(data.facts||[]);setReason(data.reason||reason)}catch(e){if(signal?.aborted)return;const code=e instanceof Error?e.message:'';setError(code==='promotion_timeout'?t('读取客群方案超时，请点击重新读取。','Reading the audience plan timed out. Retry below.'):code==='promotion_diagnosis_unavailable'?t('这项诊断已过期或可售房量发生变化。请更新工作台诊断，或改为日常推广。','This diagnosis is stale or availability changed. Refresh the workbench or use a general plan.'):code==='promotion_setup_required'?t('请先完善民宿地址与启用房型。','Complete the property location and active room types first.'):t('暂时无法生成方案。当前内容已保留，可以重试。','The plan could not be generated. Your current content is kept; retry.'));}finally{if(!signal?.aborted)setBusy(false)}
 }
 function general(){onGeneral();setDiagnosis(undefined);setReason('');setLinkFailed(false);setError('');onPlan(null);const url=new URL(window.location.href);url.searchParams.delete('runId');url.searchParams.delete('findingId');url.searchParams.delete('opportunityId');window.history.replaceState(null,'',url)}

 const inputKey=JSON.stringify([brief.start,brief.end,brief.sourceIds,zh,activeDiagnosis]);
 useEffect(()=>{if(readLink&&!contextReady||disabled||plan||attempt.current===inputKey)return;const controller=new AbortController();const timer=setTimeout(()=>{attempt.current=inputKey;void generate(controller.signal)},600);return()=>{clearTimeout(timer);controller.abort();setBusy(false);if(attempt.current===inputKey)attempt.current=''};
 // Result updates must not schedule another model request.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[inputKey,contextReady,activeLinkFailed,disabled,context,plan]);
 if(disabled&&!plan&&!activeReason&&!activeLinkFailed&&!error)return null;
 return <section className={studio?'gemini-promo-card gemini-promo-audience':'native-card promotion-plan-panel'} aria-busy={busy}>
  <div className="native-section-head"><h2>{studio?t('2. 推荐客群与切入角度','2. Suggested audience & angle'):t('建议推广人群','Who to reach')}</h2></div>
  {activeReason&&<p className="promotion-plan-origin">{t('来自经营诊断：','From your diagnosis: ')}{activeReason}</p>}
  {activeLinkFailed&&<p role="status">{t('这次诊断没有可直接用于推广的建议日期，已按日常推广继续。仍可从工作台的某条建议重新进入。','This diagnosis has no action date usable for promotion, so a general plan continues. You can still re-enter from a specific recommendation.')}</p>}
  <p className="promotion-muted">{t('入住日期','Target stay dates')}：{brief.start} — {brief.end}</p>
  {plan?<div className="promotion-audience-result">
   <h3>{plan.audience}</h3><p>{plan.angle}</p>
   {facts.length>0&&<details><summary>{t('参考依据','Supporting facts')}</summary><ul>{facts.filter(f=>plan.factIds.includes(f.id)).map(f=><li key={f.id}>{f.text.split('\n')[0]}</li>)}</ul></details>}
  </div>:null}
  {!plan&&!error&&<p role="status" className="promotion-muted">{t('正在分析适合的推广人群…','Identifying a suitable audience…')}</p>}
  {(activeDiagnosis||activeLinkFailed)&&<button type="button" className="inventory-text" onClick={general} disabled={busy||disabled}>{t('改为日常推广','Use property details')}</button>}
  {error&&<p role="alert">{error} <button type="button" className="inventory-text" onClick={()=>void generate()} disabled={busy||disabled}>{t('重新读取','Retry')}</button></p>}
 </section>;
}
