// Action plans are deterministic: the owner saves what the detectors already established.
// The model never produces or edits these numbers.
import type {ActionPlan,DetectorSignal,Opportunity} from './types';
import {metricLabel,metricUnit} from './labels';

const DAY=86400000;
const day=(value:string,offset:number)=>new Date(Date.parse(value)+offset*DAY).toISOString().slice(0,10);

export type PlanProgress={state:'improved'|'not_improved'|'insufficient';detail:string;value?:number};

function formatPlanValue(plan:ActionPlan,value:number){
 return `${value}${metricUnit(plan.metricBaseline.name,plan.metricBaseline.unit,true)}`;
}

export function buildActionPlan(input:{runId:string;opportunity:Opportunity;now?:Date}):ActionPlan{
 const createdAt=(input.now??new Date()).toISOString(),anchor=input.opportunity.basis[0];
 const items=input.opportunity.actions.slice(0,3).map((action,index)=>({id:`item-${index+1}`,title:action.title,status:'planned' as const}));
 return {
  id:`plan-${input.runId.replace(/-/g,'').slice(0,12)}`,
  runId:input.runId,
  opportunityId:input.opportunity.id,
  createdAt,
  items,
  followUpAt:day(createdAt,1),
  metricBaseline:{name:anchor?.metric.name??'booking_pace',value:anchor?.metric.value??null,direction:/open|available|gap|vacan|cancel|channel_share/i.test(anchor?.metric.name??'')?'lower_better':'higher_better',
   ...(anchor?{window:anchor.window,unit:anchor.metric.unit,kind:anchor.kind,comparison:anchor.baseline.kind}:{})},
 };
}

export function comparePlanValue(plan:ActionPlan,value:number|null):PlanProgress{
 const baseline=plan.metricBaseline.value;
 if(baseline===null||value===null||!Number.isFinite(value))return {state:'insufficient',detail:'原计划日期内缺少可比较的指标数据。'};
 const delta=Math.round((value-baseline)*100)/100;
 if(delta===0)return {state:'not_improved',detail:`当前记录中，${metricLabel(plan.metricBaseline.name,true)}仍为 ${formatPlanValue(plan,baseline)}，与保存计划时相同。后续订单更新后可再回看。`,value};
 const lowerBetter=/open|available|gap|vacan|cancel|channel_share/i.test(plan.metricBaseline.name)||plan.metricBaseline.direction==='lower_better';
 return {state:(lowerBetter?delta<0:delta>0)?'improved':'not_improved',value,
  detail:`同一入住日期内，${metricLabel(plan.metricBaseline.name,true)}由 ${formatPlanValue(plan,baseline)} 变为 ${formatPlanValue(plan,value)}。可结合新增订单和行动记录回看这次变化。`};
}

// Compares the saved baseline with the newest deterministic signals for this property.
export function comparePlanProgress(input:{plan:ActionPlan;latestSignals?:DetectorSignal[];latestAt?:string}):PlanProgress{
 const baseline=input.plan.metricBaseline.value;
 if(baseline===null)return {state:'insufficient',detail:'保存计划时没有可比较的基线值，无法判断是否改善。'};
 if(!input.latestAt||!(input.latestSignals||[]).length)return {state:'insufficient',detail:'还没有更新的诊断结果，暂不能判断是否改善。'};
 if(Date.parse(input.latestAt)<=Date.parse(input.plan.createdAt))return {state:'insufficient',detail:'更新后的诊断尚未产生，暂不能判断是否改善。'};
 const basis=input.plan.metricBaseline;
 const same=(input.latestSignals||[]).find(signal=>signal.metric.name===basis.name&&signal.metric.value!==null&&
  signal.window.start===basis.window?.start&&signal.window.end===basis.window?.end&&signal.metric.unit===basis.unit&&
  signal.kind===basis.kind&&signal.baseline.kind===basis.comparison);
 if(!same||same.metric.value===null)return {state:'insufficient',detail:'新的诊断没有产生同一指标的可用数值，暂不能判断是否改善。'};
 const delta=Math.round((same.metric.value-baseline)*100)/100;
 if(!Number.isFinite(delta))return {state:'insufficient',detail:'指标口径不一致，暂不能判断是否改善。'};
 if(delta===0)return comparePlanValue(input.plan,same.metric.value);
 if(Math.abs(delta)<1)return {state:'not_improved',detail:`${metricLabel(basis.name,true)}由 ${formatPlanValue(input.plan,baseline)} 变为 ${formatPlanValue(input.plan,same.metric.value)}，变化较小。后续订单更新后可再回看。`};
 // Direction matters: fewer open room nights is an improvement, higher occupancy is.
 const better=input.plan.metricBaseline.direction==='lower_better'?delta<0:delta>0;
 return {state:better?'improved':'not_improved',detail:`同一入住日期内，${metricLabel(basis.name,true)}由 ${formatPlanValue(input.plan,baseline)} 变为 ${formatPlanValue(input.plan,same.metric.value)}。可结合新增订单和行动记录回看这次变化。`};
}
