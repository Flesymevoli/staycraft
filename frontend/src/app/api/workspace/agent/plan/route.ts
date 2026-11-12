import {agentStore} from '@/lib/decision-agent-store';
import {buildActionPlan,comparePlanValue} from '@/lib/decisions/action-plan';
import {readPlanFollowUp} from '@/lib/decisions/plan-follow-up';
import {workspaceDay} from '@/lib/demo-period';
import {isDemoWorkspace} from '@/lib/operator-sample';
import {boundedBody,requireSameOrigin,verifiedProperty,writableProperty,WorkspaceError,workspaceFailure} from '@/lib/workspace-access';
import type {DecisionAgentRun} from '@/lib/decision-agent-types';

export const dynamic='force-dynamic';

const RUN_ID=/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i;
type Store=ReturnType<typeof agentStore>;

async function loadRun(store:Store,id:string):Promise<DecisionAgentRun>{
 const detail=await store.detail(id);
 if(detail.error||!detail.run)throw new WorkspaceError(detail.error||'analysis_not_found',detail.error==='history_unavailable'?503:404);
 return detail.run;
}

export async function GET(request:Request){try{
 const {supabase,propertyId,user}=await verifiedProperty();
 const runId=new URL(request.url).searchParams.get('runId');
 if(!runId||!RUN_ID.test(runId))throw new WorkspaceError('invalid_input',400);
 const store=agentStore(supabase,propertyId),run=await loadRun(store,runId);
 const plan=run.actionPlan??await store.latestPlan();
 const progress=plan?await readPlanFollowUp(supabase,propertyId,plan,{
  demo:isDemoWorkspace(user.email),today:workspaceDay(false),signal:request.signal,
 }).catch(()=>comparePlanValue(plan,null)):null;
 return Response.json({plan,progress},{headers:{'Cache-Control':'private, no-store'}});
}catch(error){return workspaceFailure(error)}}

export async function POST(request:Request){try{
 requireSameOrigin(request);const {supabase,propertyId}=await writableProperty();
 let input:Record<string,unknown>;
 try{input=JSON.parse(new TextDecoder().decode(await boundedBody(request,1200)));}catch{throw new WorkspaceError('invalid_input',400);}
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>!['runId','toggle','opportunityId'].includes(key)))throw new WorkspaceError('invalid_input',400);
 const runId=typeof input.runId==='string'?input.runId:'';
 if(!RUN_ID.test(runId))throw new WorkspaceError('invalid_input',400);
 const store=agentStore(supabase,propertyId),run=await loadRun(store,runId);
 let plan=run.actionPlan??null;
 if(!plan){
  const opportunity=run.opportunities?.find(item=>item.id===input.opportunityId);
  if(!opportunity)throw new WorkspaceError('plan_unavailable',422);
  plan=buildActionPlan({runId:run.id,opportunity});
 }
 if(input.opportunityId!==undefined&&plan.opportunityId!==input.opportunityId)throw new WorkspaceError('plan_already_exists',409);
 if(input.toggle!==undefined){
  const toggle=input.toggle as {itemId?:unknown;status?:unknown};
  if(!toggle||typeof toggle!=='object'||typeof toggle.itemId!=='string'||!['planned','done','dismissed'].includes(String(toggle.status)))throw new WorkspaceError('invalid_input',400);
  if(!plan.items.some(item=>item.id===toggle.itemId))throw new WorkspaceError('invalid_input',400);
  plan={...plan,items:plan.items.map(item=>item.id===toggle.itemId?{...item,status:toggle.status as 'planned'|'done'|'dismissed'}:item)};
 }
 const saved=await store.savePlan(run.id,plan,run.actionPlan??null);
 if(saved==='conflict')throw new WorkspaceError('plan_conflict',409);
 if(!saved)throw new WorkspaceError('history_unavailable',503);
 return Response.json({plan:saved},{headers:{'Cache-Control':'private, no-store'}});
}catch(error){return workspaceFailure(error)}}
