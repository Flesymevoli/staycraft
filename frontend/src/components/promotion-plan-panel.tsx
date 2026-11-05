"use client";
import {useEffect,useRef,useState} from 'react';
import {promotionFinding,validPromotionPlan,type PromotionPlan,type PromotionFact} from '@/lib/promotion-plan';
import type {PromotionBrief} from '@/lib/promotion';
import './promotion-plan.css';

export function PromotionPlanPanel({zh,brief,plan,onPlan,onPeriod,disabled}:{zh:boolean;brief:PromotionBrief;plan:PromotionPlan|null;onPlan:(plan:PromotionPlan|null)=>void;onPeriod:(start:string,end:string)=>void;disabled:boolean}){
 const [diagnosis,setDiagnosis]=useState<PromotionPlan['diagnosis']>(),[reason,setReason]=useState(''),[facts,setFacts]=useState<PromotionFact[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[linkFailed,setLinkFailed]=useState(false);
 const [contextReady,setContextReady]=useState(false);const attempt=useRef('');
 const t=(cn:string,en:string)=>zh?cn:en;
 useEffect(()=>{
  const params=new URLSearchParams(window.location.search),runId=params.get('runId'),findingId=params.get('findingId');
  if(!runId&&!findingId){const timer=setTimeout(()=>setContextReady(true),0);return()=>clearTimeout(timer);}
  const controller=new AbortController();
  fetch('/api/workspace/agent?id='+encodeURIComponent(runId||''),{cache:'no-store',signal:controller.signal}).then(async response=>{if(!response.ok)throw Error();const data=await response.json(),today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai'}).format(new Date()),finding=promotionFinding(data.run,findingId||'',today);if(controller.signal.aborted)return;setDiagnosis({runId:runId!,findingId:findingId!});setReason(finding.conclusion);onPeriod(finding.nextAction!.period.start,finding.nextAction!.period.end);}).catch(()=>{if(!controller.signal.aborted)setLinkFailed(true)}).finally(()=>{if(!controller.signal.aborted)setContextReady(true)});
  return()=>controller.abort();
 // The diagnosis URL is read once; date edits remain the owner's choice.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);
 async function generate(signal?:AbortSignal){
  setBusy(true);setError('');
  try{const response=await fetch('/api/workspace/promotion/plan',{method:'POST',headers:{'Content-Type':'application/json'},signal,body:JSON.stringify({brief:{...brief,language:zh?'zh':'en'},...(diagnosis?{diagnosis}:{})})}),data=await response.json();if(signal?.aborted)return;if(!response.ok)throw Error(data.error);if(!validPromotionPlan(data.plan))throw Error('invalid');onPlan(data.plan);if(data.plan.engine!=='model_v1')setError(t('当前未启用 AI 分析，暂时无法给出人群建议。仍可生成资料文案。','AI analysis is unavailable. You can still create copy from your property facts.'));setFacts(data.facts||[]);setReason(data.reason||reason)}catch(e){if(signal?.aborted)return;const code=e instanceof Error?e.message:'';setError(code==='promotion_diagnosis_unavailable'?t('这项诊断已过期或可售房量发生变化。请更新工作台诊断，或改为日常推广。','This diagnosis is stale or availability changed. Refresh the workbench or use a general plan.'):code==='promotion_setup_required'?t('请先完善民宿地址与启用房型。','Complete the property location and active room types first.'):t('暂时无法生成方案。当前内容已保留，可以重试。','The plan could not be generated. Your current content is kept; retry.'));}finally{if(!signal?.aborted)setBusy(false)}
 }
 function general(){setDiagnosis(undefined);setReason('');setLinkFailed(false);setError('');onPlan(null);const url=new URL(window.location.href);url.searchParams.delete('runId');url.searchParams.delete('findingId');window.history.replaceState(null,'',url)}

 const inputKey=JSON.stringify([brief.start,brief.end,brief.sourceIds,zh,diagnosis]);
 useEffect(()=>{if(!contextReady||linkFailed||disabled||plan||attempt.current===inputKey)return;const controller=new AbortController();const timer=setTimeout(()=>{attempt.current=inputKey;void generate(controller.signal)},600);return()=>{clearTimeout(timer);controller.abort();if(attempt.current===inputKey)attempt.current=''};
 // Result updates must not schedule another model request.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[inputKey,contextReady,linkFailed,disabled]);
 return <section className="native-card promotion-plan-panel" aria-busy={busy}>
  <div className="native-section-head"><h2>{t('建议推广人群','Who to reach')}</h2>{plan&&<small>{plan.engine==='model_v1'?t('AI 建议','AI suggestion'):t('资料摘要','Data summary')}</small>}</div>
  {reason&&<p className="promotion-plan-origin">{t('来自经营诊断：','From your diagnosis: ')}{reason}</p>}
  {linkFailed&&<p role="status">{t('此诊断暂不可用。可以返回工作台更新诊断，也可以从民宿资料开始。','This diagnosis is unavailable. Refresh the workbench or start from property facts.')}</p>}
  <p className="promotion-muted">{t('入住日期','Target stay dates')}：{brief.start} — {brief.end}</p>
  {plan?.engine==='model_v1'?<div className="promotion-audience-result">
   <h3>{plan.audience}</h3><p>{plan.angle}</p>
   {facts.length>0&&<details><summary>{t('参考依据','Supporting facts')}</summary><ul>{facts.filter(f=>plan.factIds.includes(f.id)).map(f=><li key={f.id}>{f.text.split('\n')[0]}</li>)}</ul></details>}
  </div>:<p className="promotion-muted">{t('结合经营分析和民宿特色，建议优先面向哪类客人。也可以直接生成下方文案。','Use business analysis and property details to suggest who to reach. You can also create copy below.')}</p>}
  {busy&&<p role="status" className="promotion-muted">{t('正在分析适合的推广人群…','Identifying a suitable audience…')}</p>}
  {(diagnosis||linkFailed)&&<button type="button" className="inventory-text" onClick={general} disabled={busy||disabled}>{t('改为日常推广','Use property details')}</button>}
  {error&&<p role="alert">{error}</p>}
 </section>;
}
