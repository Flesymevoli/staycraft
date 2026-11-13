"use client";
import {useEffect,useRef,useState} from 'react';
import {OperationStatus,useOperation} from "./operation-status";
import {startOperation,updateOperation,operationActive} from "@/lib/operation-state";
import {useRouter} from 'next/navigation';
import {WorkbenchDrawer} from './workbench-drawer';
import './clear-imported-data.css';

type Preview={revision:string;orders:number;tasks:number;batches:number;cleared:boolean;lastClear?:{sourceRevision:string;orders:number;tasks:number;completedAt:string}};
const valid=(v:Preview)=>!!v&&typeof v.revision==='string'&&[v.orders,v.tasks,v.batches].every(n=>Number.isSafeInteger(n)&&n>=0);
export function ClearImportedData({zh,readOnly=false}:{zh:boolean;readOnly?:boolean}){
 const {scope,state:operation}=useOperation('clear');
 const [open,setOpen]=useState(false),[preview,setPreview]=useState<Preview|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[confirmed,setConfirmed]=useState(false);
 const active=useRef(true),router=useRouter();
 useEffect(()=>{active.current=true;return()=>{active.current=false}},[]);
 const t=(cn:string,en:string)=>zh?cn:en;
 async function read(){
  const op=startOperation(scope,'clear',{phase:'running',stage:'正在核对清除范围',stageEn:'Checking deletion scope',detail:'此步骤只读取数据，尚未执行清除。',detailEn:'Read-only check. Nothing is deleted yet.'});
  setOpen(true);setBusy(true);setError('');setNotice('');setPreview(null);setConfirmed(false);
  try{const response=await fetch('/api/workspace/booking-import/clear',{cache:'no-store',signal:AbortSignal.timeout(25000)}),data=await response.json();if(!response.ok||!valid(data))throw Error();if(active.current)setPreview(data);updateOperation(scope,'clear',op,{phase:'waiting',stage:'删除范围已就绪，等待确认',stageEn:'Scope ready; awaiting confirmation',detail:`将清除 ${data.orders} 条导入订单及 ${data.tasks} 条任务，房型与房间保留。`,detailEn:`Will clear ${data.orders} imported bookings and ${data.tasks} tasks; rooms remain.`,reference:data.revision});}
  catch{updateOperation(scope,'clear',op,{phase:'failed',stage:'清除范围读取失败',stageEn:'Could not read deletion scope',detail:'尚未执行清除，可重新读取。',detailEn:'Nothing deleted. Reload the scope.'});if(active.current)setError(t('暂时无法读取删除范围，请重试。','Could not read the deletion scope. Please retry.'))}
  finally{if(active.current)setBusy(false)}
 }
 async function remove(){
  if(!preview||!confirmed||busy||readOnly)return;
  const op=startOperation(scope,'clear',{phase:'saving',stage:'正在清空导入数据',stageEn:'Clearing imported data',detail:'确认请求已提交。关闭抽屉后仍可查看结果，请勿重复提交。',detailEn:'Confirmation submitted. Reopen to check its result; do not repeat.',reference:preview.revision});
  setBusy(true);setError('');
  try{
   const response=await fetch('/api/workspace/booking-import/clear',{method:'DELETE',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(25000),body:JSON.stringify({revision:preview.revision,confirmation:'CLEAR_IMPORTED_BOOKINGS'})}),data=await response.json();
   if(!response.ok||!valid(data)||!data.cleared)throw Error(data.error||'unavailable');
   updateOperation(scope,'clear',op,{phase:'complete',stage:'导入数据已清除',stageEn:'Imported data cleared',detail:`已清除 ${data.orders} 条导入订单及 ${data.tasks} 条关联任务，房型、房间和资料保留。`,detailEn:`Cleared ${data.orders} imported bookings and ${data.tasks} tasks; inventory and profile remain.`,count:data.orders});
   if(!active.current)return;
   setOpen(false);setPreview(null);setConfirmed(false);setNotice(t(`已清除 ${data.orders} 条导入订单及 ${data.tasks} 条关联任务。房型、房间和民宿资料已保留。`,`Cleared ${data.orders} imported bookings and ${data.tasks} related tasks. Room types, rooms and property details are preserved.`));
   for(const name of ['staycraft-stays-changed','staycraft-activity-changed','staycraft-import-completed'])window.dispatchEvent(new Event(name));
   router.refresh();
  }catch(e){updateOperation(scope,'clear',op,{phase:'uncertain',stage:'清除结果待核对',stageEn:'Check deletion result',detail:'没有确认成功，请先核对清除记录，不重复删除。',detailEn:'Success is unconfirmed. Check the receipt before any deletion.'});if(active.current){setPreview(null);setConfirmed(false);setError(e instanceof Error&&e.message==='import_changed'?t('导入数据已变化，请重新读取范围并确认。','Imported data changed. Review the latest scope before confirming.'):t('尚未确认清除结果。请重新读取范围后核对，勿重复点击。','The result could not be confirmed. Reload the scope to check before retrying.'))}}
  finally{if(active.current)setBusy(false)}
 }
 async function checkResult(){
  if(!operation)return;setBusy(true);
  try{const r=await fetch('/api/workspace/booking-import/clear',{cache:'no-store',signal:AbortSignal.timeout(25000)}),data=await r.json();if(!r.ok)throw Error();
   if(data.lastClear?.sourceRevision===operation.reference){setOpen(false);setError('');updateOperation(scope,'clear',operation.id,{phase:'complete',stage:'已核实清除完成',stageEn:'Deletion confirmed',detail:`清除记录确认已删除 ${data.lastClear.orders} 条导入订单，无需再次提交。`,detailEn:`Receipt confirms ${data.lastClear.orders} imported bookings cleared; no resubmission.`,count:data.lastClear.orders});}
   else updateOperation(scope,'clear',operation.id,{phase:'failed',stage:'未找到本次清除记录',stageEn:'No matching deletion receipt',detail:'可以重新读取当前范围。若仍需清空，需再次核对并确认。',detailEn:'Reload the current scope and confirm it again if still needed.'});
  }catch{setError(t('暂时无法核对，请稍后重试核对。','Could not check the result. Retry this check later.'))}finally{setBusy(false)}
 }
 return <section className="clear-imported-data">
  <h3>{t('清空数据','Clear data')}</h3><p>{t('清除当前民宿的导入订单、导入记录及关联任务；保留房型、房间、民宿资料和手动订单。','Clear imported bookings, import history and related tasks for this property. Keep room types, rooms, property details and manual bookings.')}</p>
  <button type="button" className="clear-import-button" disabled={readOnly||busy||operationActive(operation)&&operation?.phase!=='waiting'} onClick={()=>void (operation?.phase==='uncertain'?checkResult():read())}>{t('清空导入数据','Clear imported data')}</button>
  <OperationStatus state={operation} zh={zh}>{operation?.phase==='uncertain'&&<button type="button" disabled={busy} onClick={()=>void checkResult()}>{t('核对清除结果','Check deletion result')}</button>}{operation?.phase==='complete'&&<button type="button" onClick={()=>router.refresh()}>{t('只重新加载页面','Reload page only')}</button>}</OperationStatus>
  {notice&&!operation&&<p role="status">{notice}</p>}
  {open&&<WorkbenchDrawer title={t('确认清空导入数据','Confirm clearing imported data')} onClose={()=>setOpen(false)}>
   <div className="clear-imported-data"><OperationStatus state={operation} zh={zh}/><p>{t('此操作仅影响当前账号的民宿，清除后无法撤销。电脑上的原始文件不会删除，可重新导入。','This affects only your property and cannot be undone. Original files on your computer remain available for reimport.')}</p>
    {busy&&!preview&&<p role="status">{t('正在读取删除范围…','Reading the deletion scope…')}</p>}
    {preview&&<><dl><div><dt>{t('导入订单','Imported bookings')}</dt><dd>{preview.orders}</dd></div><div><dt>{t('关联任务（含已完成）','Related tasks (including completed)')}</dt><dd>{preview.tasks}</dd></div><div><dt>{t('导入记录','Import history')}</dt><dd>{preview.batches}</dd></div></dl><p>{t('房型、房间、民宿资料和手动订单将保留。历史诊断报告仍保留，清除后请重新诊断。','Room types, rooms, property details and manual bookings will remain. Historical reports remain; run a new diagnosis after clearing.')}</p>
    {preview.orders+preview.batches>0?<><label className="clear-import-confirm"><input type="checkbox" checked={confirmed} disabled={busy} onChange={e=>setConfirmed(e.target.checked)}/>{t('我已核对范围，确认清空这些导入数据','I have reviewed the scope and confirm clearing these imported records')}</label><button className="clear-import-button" type="button" disabled={!confirmed||busy} onClick={()=>void remove()}>{busy?t('正在清除…','Clearing…'):t('确认清空','Confirm clear')}</button></>:<p role="status">{t('没有需要清除的导入数据。','There is no imported data to clear.')}</p>}</>}
    {error&&<div role="alert"><p>{error}</p><button type="button" disabled={busy} onClick={()=>void (operation?.phase==='uncertain'?checkResult():read())}>{operation?.phase==='uncertain'?t('核对清除结果','Check deletion result'):t('重新读取范围','Reload scope')}</button></div>}
   </div>
  </WorkbenchDrawer>}
 </section>;
}
