"use client";
import type {ActionPlan} from '@/lib/decisions/types';
import {metricLabel,metricUnit} from '@/lib/decisions/labels';
import './action-plan-panel.css';

const statusLabel={planned:['计划中','Planned'],done:['已完成','Done'],dismissed:['已忽略','Dismissed']} as const;
// Stable formatting across server and client: fixed zone, no locale drift.
const shortTime=(value:string)=>{const time=Date.parse(value);if(!Number.isFinite(time))return value;try{return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(time)}catch{return value}};

export function ActionPlanPanel({plan,zh,onToggleItem,readOnly=false,compact=false}:{plan:ActionPlan|null;zh:boolean;onToggleItem?:(itemId:string)=>void;readOnly?:boolean;compact?:boolean}){
 const t=(cn:string,en:string)=>zh?cn:en;
 if(!plan){
  return <section className="ap-panel ap-empty">
   <h3 className="ap-title">{t('行动计划','Action plan')}</h3>
   <p>{t('尚未保存行动计划','No action plan saved yet')}</p>
  </section>;
 }
 const baseline=plan.metricBaseline;
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
    </div>
    {!compact&&!readOnly&&item.status!=='dismissed'&&onToggleItem&&<button type="button" className="ap-toggle" onClick={()=>onToggleItem(item.id)}>{item.status==='done'?t('恢复','Restore'):t('完成','Complete')}</button>}
   </li>)}
  </ul>}
  <div className="ap-foot">
   <span>{t('跟进时间','Follow up')}：<b className="ap-num">{followUp||t('未设置','Not set')}</b></span>
   <span className="ap-baseline">{t('保存时的记录','When saved')}：{baseline?.name?`${metricLabel(baseline.name,zh)} `:''}<b className="ap-num">{baselineValue===null?t('未获取','Not available'):`${baselineValue}${metricUnit(baseline.name,baseline.unit,zh)}`}</b></span>
  </div>
 </section>;
}
