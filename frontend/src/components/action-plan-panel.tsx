"use client";
import {useEffect,useState} from 'react';
import Link from 'next/link';
import type {ActionPlan} from '@/lib/decisions/types';
import {metricLabel,metricUnit} from '@/lib/decisions/labels';
import {actionPlanLinks} from '@/lib/decisions/action-plan-links';
import {DEMO_PERIOD,workspaceDay} from '@/lib/demo-period';
import './action-plan-panel.css';

const statusLabel={planned:['计划中','Planned'],done:['已完成','Done'],dismissed:['已忽略','Dismissed']} as const;
// Stable formatting across server and client: fixed zone, no locale drift.
const shortTime=(value:string)=>{const time=Date.parse(value);if(!Number.isFinite(time))return value;try{return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(time)}catch{return value}};

export function ActionPlanPanel({plan,zh,onToggleItem,readOnly=false,compact=false}:{plan:ActionPlan|null;zh:boolean;onToggleItem?:(itemId:string)=>void;readOnly?:boolean;compact?:boolean}){
 const t=(cn:string,en:string)=>zh?cn:en;
 const runId=plan?.runId;
 const [source,setSource]=useState<{runId:string;run?:{id?:string;dataMode?:string};failed?:boolean}|null>(null);
 useEffect(()=>{
  if(!runId)return;
  const controller=new AbortController();
  fetch('/api/workspace/agent?id='+encodeURIComponent(runId),{cache:'no-store',signal:controller.signal})
   .then(async response=>{if(!response.ok)throw Error();const data=await response.json();if(data.run?.id!==runId)throw Error();if(!controller.signal.aborted)setSource({runId,run:data.run});})
   .catch(()=>{if(!controller.signal.aborted)setSource({runId,failed:true});});
  return()=>controller.abort();
 },[runId]);
 if(!plan){
  return <section className="ap-panel ap-empty">
   <h3 className="ap-title">{t('行动计划','Action plan')}</h3>
   <p>{t('尚未保存行动计划','No action plan saved yet')}</p>
  </section>;
 }
 const baseline=plan.metricBaseline;
 const currentSource=source?.runId===plan.runId?source:null;
 const links=actionPlanLinks(plan,currentSource?.run,currentSource?.run?.dataMode==='fictional_demo'?DEMO_PERIOD.start:workspaceDay(false));
 const actionLabel=(target:string)=>target==='market'?t('查看报价','View quotes'):target==='promotion'?t('制定推广','Create promotion'):target==='data'?t('查看数据','Review data'):t('查看诊断','View diagnosis');
 const baselineValue=baseline?.value??null;
 const followUp=(plan.followUpAt||'').trim();
 return <section className="ap-panel" aria-label={t('行动计划','Action plan')}>
  <div className="ap-head">
   <h3 className="ap-title">{t('行动计划','Action plan')}</h3>
   {compact?<span className="ap-count">{plan.items.filter(item=>item.status==="done").length} / {plan.items.length}</span>:plan.createdAt&&<span className="ap-created">{t('创建于','Created')} <b className="ap-num">{shortTime(plan.createdAt)}</b></span>}
  </div>
  {plan.items.length===0?<p className="ap-no-items">{t('暂无待办事项','No items yet')}</p>:<ul className="ap-list">
   {plan.items.map(item=><li className={`ap-item ap-item-${item.status}`} key={item.id}>
    {compact&&<input className="desktop-plan-check" type="checkbox" checked={item.status==="done"} disabled={readOnly||item.status==="dismissed"||!onToggleItem} aria-label={item.title||t("未命名事项","Untitled item")} onChange={()=>onToggleItem?.(item.id)}/>}
    <div className="ap-item-main">
     <span className="ap-item-title">{item.title||t('未命名事项','Untitled item')}</span>
     <span className="ap-item-meta">
      <span className={`ap-status ap-status-${item.status}`}>{statusLabel[item.status][zh?0:1]}</span>
      {item.dueDate&&<span className="ap-due">{t('截止','Due')} <b className="ap-num">{item.dueDate}</b></span>}
     </span>
     {!readOnly&&links.filter(link=>link.itemId===item.id).map(link=><Link key={link.itemId} className="ap-action-link" href={link.href} prefetch={false}>{actionLabel(link.target)} <span aria-hidden="true">→</span></Link>)}
    </div>
    {!compact&&!readOnly&&item.status!=='dismissed'&&onToggleItem&&<button type="button" className="ap-toggle" onClick={()=>onToggleItem(item.id)}>{item.status==='done'?t('恢复','Restore'):t('完成','Complete')}</button>}
   </li>)}
  </ul>}
  {!readOnly&&plan.items.length>0&&!currentSource&&<p className="ap-source-note" role="status">{t('正在读取行动入口…','Loading action links…')}</p>}
  {!readOnly&&currentSource&&links.length===0&&<p className="ap-source-note">{currentSource.failed?t('暂时无法读取计划来源，已保存事项仍可查看和勾选。','The source could not be read. Saved items are still available to review and check off.'):t('原计划暂无可继续执行的入口，可回到工作台查看当前机会。','No action links are available for this plan. Review current opportunities on the workbench.')}</p>}
  <div className="ap-foot">
   <span>{t('跟进时间','Follow up')}：<b className="ap-num">{followUp||t('未设置','Not set')}</b></span>
   <span className="ap-baseline">{t('保存时的记录','When saved')}：{baseline?.name?`${metricLabel(baseline.name,zh)} `:''}<b className="ap-num">{baselineValue===null?t('未获取','Not available'):`${baselineValue}${metricUnit(baseline.name,baseline.unit,zh)}`}</b></span>
  </div>
 </section>;
}
