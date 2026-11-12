import type {ActionPlan} from './types';

export type PlanItemLink={itemId:string;href:string;target:'market'|'promotion'|'data'|'diagnosis'};
const validDay=(value:unknown):value is string=>typeof value==='string'&&/^20\d{2}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;

// Resolve actions from the saved source opportunity, never from a title or the newest diagnosis.
export function actionPlanLinks(plan:ActionPlan,source:unknown,today:string):PlanItemLink[]{
 if(!source||typeof source!=='object'||!validDay(today))return [];
 const run=source as {id?:unknown;opportunities?:unknown};
 if(run.id!==plan.runId||!Array.isArray(run.opportunities)||!/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(plan.runId))return [];
 const opportunity=run.opportunities.find(item=>item?.id===plan.opportunityId);
 if(!opportunity||!Array.isArray(opportunity.actions)||!validDay(opportunity.window?.start)||!validDay(opportunity.window?.end)||opportunity.window.start>opportunity.window.end)return [];
 const dates=new URLSearchParams({start:opportunity.window.start,end:opportunity.window.end});
 return plan.items.flatMap(item=>{
  const index=/^item-([1-3])$/.exec(item.id);
  const action=index&&opportunity.actions[Number(index[1])-1];
  if(!action||action.title!==item.title||item.status==='dismissed')return [];
  const target=action.target;
  if(!['market','promotion','data','diagnosis'].includes(target))return [];
  if((target==='market'||target==='promotion')&&opportunity.window.start<today)return [];
  const href=target==='promotion'?`/app/promotion?${new URLSearchParams({runId:plan.runId,opportunityId:plan.opportunityId})}`
   :target==='market'?`/app/explore?${dates}`:target==='data'?`/app/analysis?${dates}`:`/app/reports/${plan.runId}`;
  return [{itemId:item.id,href,target}];
 });
}
