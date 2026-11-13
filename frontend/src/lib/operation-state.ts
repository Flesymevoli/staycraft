export type OperationPhase='starting'|'waiting'|'running'|'saving'|'refreshing'|'complete'|'failed'|'uncertain'|'cancelled';
export type OperationKind='collection'|'import'|'diagnosis'|'translation'|'promotion'|'clear';
export type OperationState={id:string;phase:OperationPhase;stage:string;stageEn:string;detail:string;detailEn:string;startedAt:number;updatedAt:number;finishedAt?:number;reference?:string;count?:number};
type Change=Partial<Omit<OperationState,'id'|'startedAt'>>;
const states=new Map<string,OperationState|null>(),listeners=new Set<()=>void>();
const key=(scope:string,kind:OperationKind)=>`staycraft-operation:${scope}:${kind}`;
export const operationActive=(state:OperationState|null)=>!!state&&['starting','waiting','running','saving','refreshing'].includes(state.phase);
export function readOperation(scope:string,kind:OperationKind):OperationState|null{
 if(typeof window==='undefined')return null;
 const id=key(scope,kind);if(states.has(id))return states.get(id)!;
 let value:OperationState|null=null;
 try{const saved=JSON.parse(sessionStorage.getItem(id)||'null');if(saved&&typeof saved.id==='string'&&Number.isFinite(saved.startedAt)&&typeof saved.stage==='string')value=['starting','running','saving','refreshing'].includes(saved.phase)?{...saved,phase:'uncertain',detail:'页面已重新打开，请先核对上次操作结果。',detailEn:'This page was reopened. Check the previous result first.'}:saved}catch{}
 states.set(id,value);return value;
}
function publish(scope:string,kind:OperationKind,value:OperationState){
 const id=key(scope,kind);states.set(id,value);
 // Only operation metadata, never uploaded rows, prompts, credentials or drafts.
 try{sessionStorage.setItem(id,JSON.stringify(value))}catch{}
 for(const listener of listeners)listener();
}
export function startOperation(scope:string,kind:OperationKind,input:Pick<OperationState,'stage'|'stageEn'|'detail'|'detailEn'>&Change){
 const value:OperationState={...input,id:crypto.randomUUID(),startedAt:Date.now(),updatedAt:Date.now(),phase:input.phase||'starting'};
 publish(scope,kind,value);return value.id;
}
export function updateOperation(scope:string,kind:OperationKind,id:string,change:Change){
 const previous=readOperation(scope,kind);if(!previous||previous.id!==id)return;
 const value={...previous,...change,updatedAt:Date.now()};
 if(['complete','failed','uncertain','cancelled'].includes(value.phase))value.finishedAt=Date.now();else delete value.finishedAt;
 publish(scope,kind,value);
}
export const subscribeOperations=(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener)}};
// Drafts and selected files live only in this account-scoped tab memory. Closing
// a drawer does not destroy them; a full app restart requires reselecting a file.
const retained=new Map<string,unknown>();
export function retainOperationInput<T>(scope:string,kind:OperationKind,value:T){retained.set(key(scope,kind),value)}
export function retainedOperationInput<T>(scope:string,kind:OperationKind):T|undefined{return retained.get(key(scope,kind)) as T|undefined}
