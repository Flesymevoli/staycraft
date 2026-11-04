import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import type {AgentPeriod,AgentStep,DecisionAgentRun} from './decision-agent-types';

type TaskRow={id:string;status:string;engine:string|null;steps:AgentStep[];result:DecisionAgentRun|null;error:string|null;created_at:string;completed_at:string|null;period_start:string;period_end:string};
const fields='id,status,engine,steps,result,error,created_at,completed_at,period_start,period_end';
const signal=()=>AbortSignal.timeout(5000);
const stale=(row:Pick<TaskRow,'status'|'created_at'>)=>row.status==='running'&&Date.now()-Date.parse(row.created_at)>90000;
export function agentStore(db:SupabaseClient,propertyId:string){
 const table=()=>db.from('decision_agent_runs');
 return {
  async history(){
   const {data,error}=await table().select('id,status,engine,created_at,completed_at,period_start,period_end,result->>summary').eq('property_id',propertyId).order('created_at',{ascending:false}).limit(20).abortSignal(signal());
   if(error)return {history:[],historyAvailable:false};
   return {history:(data||[]).map(row=>({id:row.id,status:stale(row)?'failed':row.status,engine:row.engine,createdAt:row.created_at,completedAt:row.completed_at,period:{start:row.period_start,end:row.period_end},summary:row.summary||''})),historyAvailable:true};
  },
  async detail(id:string){
   const {data,error}=await table().select(fields).eq('property_id',propertyId).eq('id',id).abortSignal(signal()).maybeSingle();
   if(error)return {error:'history_unavailable'};
   if(!data)return {error:'analysis_not_found'};
   const row=data as TaskRow;
   return {task:{id:row.id,status:stale(row)?'failed':row.status,steps:row.steps,createdAt:row.created_at,completedAt:row.completed_at,error:stale(row)?'analysis_timeout':row.error},run:row.result,historyAvailable:true};
  },
  async cached(language:string,fingerprint:string,force:boolean){
   const after=new Date(Date.now()-(force?60000:15*60000)).toISOString();
   const {data,error}=await table().select('result').eq('property_id',propertyId).eq('language',language).eq('fingerprint',fingerprint).in('status',['completed','limited']).gte('created_at',after).order('created_at',{ascending:false}).limit(1).abortSignal(signal()).maybeSingle();
   if(error)return null;
   const run=data?.result as DecisionAgentRun|undefined;
   if(run?.engine==='rules_v1'&&Date.now()-Date.parse(run.generatedAt)>45000)return null;
   return run||null;
  },
  async begin(id:string,language:string,fingerprint:string,period:AgentPeriod){
   await table().update({status:'failed',error:'analysis_timeout',completed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('property_id',propertyId).eq('status','running').lt('created_at',new Date(Date.now()-90000).toISOString()).abortSignal(signal());
   const {error}=await table().insert({id,property_id:propertyId,language,fingerprint,period_start:period.start,period_end:period.end}).abortSignal(signal());
   if(error?.code==='23505')return 'busy' as const;
   return error?'unavailable' as const:'started' as const;
  },
  async progress(id:string,steps:AgentStep[]){
   const {error}=await table().update({steps,updated_at:new Date().toISOString()}).eq('property_id',propertyId).eq('id',id).eq('status','running').abortSignal(signal());
   return !error;
  },
  async finish(run:DecisionAgentRun){
   const {error}=await table().update({status:run.status==='unavailable'?'failed':run.status,engine:run.engine,result:run,steps:run.steps,completed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('property_id',propertyId).eq('id',run.id).abortSignal(signal());
   return !error;
  },
  async fail(id:string){
   await table().update({status:'failed',error:'analysis_failed',completed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('property_id',propertyId).eq('id',id).abortSignal(signal());
  }
 };
}
