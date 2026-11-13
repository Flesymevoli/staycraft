'use client';
import {useCallback,useEffect,useState} from 'react';
import {useOperation} from './operation-status';
import {operationActive,readOperation,startOperation,updateOperation} from '@/lib/operation-state';
import './demo-journey.css';
type State={completed:string[];orders:number;rooms:number;quotes:number;start:string;end:string;capturedAt:string};
export async function demoStep(action:string):Promise<State>{const response=await fetch('/api/demo/journey',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action}),signal:AbortSignal.timeout(25000)});if(!response.ok)throw Error('demo_step_failed');return response.json();}
export function useDemoCollection(){
 const {scope,state}=useOperation('collection');
 const sync=useCallback(async()=>{
  if(operationActive(readOperation(scope,'collection')))return;
  const id=startOperation(scope,'collection',{phase:'saving',stage:'正在同步周边报价',stageEn:'Syncing nearby prices',detail:'正在载入已保存的报价与列表。',detailEn:'Loading saved prices and the quote list.'});
  try{const result=await demoStep('collect');window.dispatchEvent(new Event('staycraft-market-synced'));updateOperation(scope,'collection',id,{phase:'complete',stage:'报价已同步',stageEn:'Prices synced',detail:`已同步 ${result.quotes} 条报价 · ${result.start} — ${result.end}`,detailEn:`Synced ${result.quotes} quotes · ${result.start} — ${result.end}`,count:result.quotes});}
  catch{updateOperation(scope,'collection',id,{phase:'failed',stage:'报价尚未同步',stageEn:'Prices not synced',detail:'同步未确认完成，可点击重试；已有报价不会重复添加。',detailEn:'Sync was not confirmed. Retry without duplicating saved quotes.'});}
 },[scope]);
 return {sync,state,busy:operationActive(state)};
}
export function DemoCollectButton({zh,className}:{zh:boolean;className?:string}){
 const {sync,state,busy}=useDemoCollection();
 return <span className="demo-collect-inline"><button type="button" className={className} disabled={busy} onClick={()=>void sync()}>{busy?(zh?'正在同步…':'Syncing…'):state?.phase==='failed'?(zh?'重试同步':'Retry sync'):(zh?'采集并同步':'Collect and sync')}</button>{state&&<small role="status">{zh?state.detail:state.detailEn}</small>}</span>;
}
export function DemoCollection({zh,onSync}:{zh:boolean;onSync:()=>void}){
 const [state,setState]=useState<State|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(false);
 useEffect(()=>{demoStep('state').then(setState).catch(()=>setError(true));},[]);
 async function collect(){setBusy(true);setError(false);try{setState(await demoStep('collect'));window.dispatchEvent(new Event('staycraft-market-synced'));onSync();}catch{setError(true)}finally{setBusy(false)}}
 return <section className="demo-step-body"><h2>{zh?'采集周边报价':'Nearby prices'}</h2><p>{zh?'同步周边报价后即可查看市场参照。':'Sync nearby prices to see market references.'}</p><button type="button" className="native-primary" disabled={busy||!state} onClick={()=>void collect()}>{busy?(zh?'正在同步…':'Syncing…'):(zh?'同步已采集房价':'Sync saved prices')}</button>{state?.quotes? <p role="status">{zh?`已同步 ${state.quotes} 条报价 · ${state.start} — ${state.end}`:`Synced ${state.quotes} quotes · ${state.start} — ${state.end}`}</p>:null}{error&&<p role="alert">{zh?'暂未同步，请先在“订单与导入”载入演示数据后重试。':'Not synced. Load demo data in Bookings & import, then retry.'}</p>}</section>;
}
