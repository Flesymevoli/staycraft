"use client";
import {createContext,useContext,useEffect,useState,useSyncExternalStore,type ReactNode} from 'react';
import {readOperation,subscribeOperations,operationActive,type OperationKind,type OperationState} from '@/lib/operation-state';
import './operation-status.css';
export const OperationScope=createContext('isolated');
export function useOperation(kind:OperationKind,explicitScope?:string){
 const context=useContext(OperationScope),scope=explicitScope||context;
 const state=useSyncExternalStore(subscribeOperations,()=>readOperation(scope,kind),()=>null);
 return {scope,state};
}
export function OperationStatus({state,zh,children,compact=false}:{state:OperationState|null;zh:boolean;children?:ReactNode;compact?:boolean}){
 const [now,setNow]=useState(()=>Date.now());
 useEffect(()=>{if(!state||!operationActive(state))return;const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer)},[state]);
 if(!state)return null;
 const active=operationActive(state),seconds=Math.max(0,Math.floor(((active?Math.max(now,state.updatedAt):state.finishedAt||state.updatedAt)-state.startedAt)/1000));
 const phase=({starting:['正在启动','Starting'],waiting:['等待操作','Action needed'],running:['正在处理','In progress'],saving:['正在保存','Saving'],refreshing:['正在更新','Refreshing'],complete:['全部完成','Complete'],failed:['失败','Failed'],uncertain:['结果待确认','Result unconfirmed'],cancelled:['已停止','Stopped']} as const)[state.phase];
 if(compact)return <details key={state.id} className={`operation-status operation-compact operation-${state.phase}`}>
  <summary aria-label={zh?'操作状态与处理选项':'Operation status and actions'}><span className="operation-compact-title" role="status"><strong>{zh?state.stage:state.stageEn}</strong><span className="operation-phase">{phase[zh?0:1]}</span></span><span className="operation-compact-hint">{active?(zh?`已等待 ${seconds} 秒 · `:`Waiting ${seconds}s · `):''}{zh?'详情与处理':'Details & actions'}</span></summary>
  <div className="operation-compact-body"><p>{zh?state.detail:state.detailEn}</p><small>{(zh?'更新于 ':'Updated ')+new Date(state.finishedAt||state.updatedAt).toLocaleTimeString(zh?'zh-CN':'en-GB')}{state.count!==undefined&&(zh?` · ${state.count} 条`:` · ${state.count} records`)}</small>{children&&<div className="operation-actions">{children}</div>}</div>
 </details>;
 return <section className={`operation-status operation-${state.phase}`} aria-label={zh?'操作状态':'Operation status'}>
  <div role={state.phase==='failed'?'alert':'status'}><strong>{zh?state.stage:state.stageEn}</strong><span className="operation-phase">{phase[zh?0:1]}</span><p>{zh?state.detail:state.detailEn}</p></div>
  <small>{active?(zh?`已等待 ${seconds} 秒`:`Waiting ${seconds}s`):(zh?'更新于 ':'Updated ')+new Date(state.finishedAt||state.updatedAt).toLocaleTimeString(zh?'zh-CN':'en-GB')} {state.count!==undefined&&<span> · {zh?`${state.count} 条`:`${state.count} records`}</span>}</small>
  {children&&<div className="operation-actions">{children}</div>}
 </section>;
}
