'use client';
import {useEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {demoStep} from './demo-journey';
import {OperationStatus,useOperation} from './operation-status';
import {retainOperationInput,retainedOperationInput,startOperation,updateOperation} from '@/lib/operation-state';

export function DemoBookingImport({zh}:{zh:boolean}){
 const {scope,state:operation}=useOperation('import');
 const [name,setName]=useState(()=>retainedOperationInput<{name:string}>(scope,'import')?.name??'');
 const [busy,setBusy]=useState(false),[dragging,setDragging]=useState(false);
 const [loaded,setLoaded]=useState<{orders:number;rooms:number}|null>(null);
 const router=useRouter(),pending=useRef(false);
 const t=(cn:string,en:string)=>zh?cn:en;
 useEffect(()=>{let active=true;demoStep('state').then(s=>{if(active&&s.orders)setLoaded(s)}).catch(()=>{});return()=>{active=false}},[]);
 function choose(file?:File){if(pending.current||!file)return;setName(file.name);retainOperationInput(scope,'import',{name:file.name});}
 async function load(){
  if(!name||pending.current)return;pending.current=true;setBusy(true);
  const id=startOperation(scope,'import',{phase:'running',stage:'正在载入订单数据',stageEn:'Loading bookings',detail:'正在准备订单与房量。',detailEn:'Preparing bookings and inventory.'});
  try{
   const result=await demoStep('import');setLoaded(result);
   for(const event of ['staycraft-profile-changed','staycraft-inventory-changed','staycraft-stays-changed','staycraft-import-completed'])window.dispatchEvent(new Event(event));
   router.refresh();
   updateOperation(scope,'import',id,{phase:'complete',stage:'订单数据已就绪',stageEn:'Bookings ready',detail:`已载入 ${result.orders} 条订单、${result.rooms} 间客房。可返回工作台查看统计。`,detailEn:`Loaded ${result.orders} bookings and ${result.rooms} rooms. View the dashboard for statistics.`});
  }catch{
   updateOperation(scope,'import',id,{phase:'failed',stage:'订单数据尚未确认载入',stageEn:'Bookings not confirmed',detail:'所选文件仍保留。可再次点击校验，已有订单不会重复添加。',detailEn:'Your file selection is kept. Validate again; existing bookings will not be duplicated.'});
  }finally{pending.current=false;setBusy(false)}
 }
 return <section className="workspace-section booking-import-panel"><h2>{t('订单数据导入','Import bookings')}</h2><div className="native-card">
  <div className={`demo-import-drop${dragging?' is-dragging':''}`} onDragOver={e=>{e.preventDefault();if(!busy)setDragging(true)}} onDragLeave={()=>setDragging(false)} onDrop={e=>{e.preventDefault();setDragging(false);choose(e.dataTransfer.files[0])}}>
   <label>{t('拖入任意文件，或点击选择','Drop any file, or choose one')}<input type="file" disabled={busy} onChange={e=>choose(e.target.files?.[0])}/></label>
   {name&&<p>{name}</p>}
  </div>
  <p><button type="button" className="native-primary" disabled={!name||busy} onClick={()=>void load()}>{busy?t('正在载入…','Loading…'):t('校验数据','Validate data')}</button></p>
  {loaded&&<p className="booking-import-result" role="status">{t(`已载入 ${loaded.orders} 条订单 · ${loaded.rooms} 间客房`,`Loaded ${loaded.orders} bookings · ${loaded.rooms} rooms`)}</p>}
  <OperationStatus state={operation} zh={zh} compact/>
 </div></section>;
}
