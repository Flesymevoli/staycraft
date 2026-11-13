"use client";

import {useContext,useEffect,useState} from "react";
import {GuidedDemoContext} from './desktop-surface';
import {DemoCollectButton} from './demo-journey';
import {Zap} from "lucide-react";

const AVAILABILITY_EVENT="staycraft-collection-hint";

// Reuse confirmed page results: a failed or pending request must not mean "not collected".
export function useCollectionHint(missingWindow:string|null){
 useEffect(()=>{
  window.dispatchEvent(new CustomEvent(AVAILABILITY_EVENT,{detail:missingWindow}));
  return()=>{window.dispatchEvent(new CustomEvent(AVAILABILITY_EVENT,{detail:null}))};
 },[missingWindow]);
}

export function DesktopCollectionHint({zh,onOpen}:{zh:boolean;onOpen:()=>void}){
 const guidedDemo=useContext(GuidedDemoContext);
 const [missing,setMissing]=useState(false);
 useEffect(()=>{
  const receive=(event:Event)=>setMissing(Boolean((event as CustomEvent<string|null>).detail));
  const synced=()=>setMissing(false);
  window.addEventListener(AVAILABILITY_EVENT,receive);
  window.addEventListener("staycraft-market-synced",synced);
  return()=>{window.removeEventListener(AVAILABILITY_EVENT,receive);window.removeEventListener("staycraft-market-synced",synced)};
 },[]);
 return <section className="desktop-sidebar-collector">
  <Zap size={18} aria-hidden="true"/>
  <strong>{guidedDemo?(zh?"周边住宿报价":"Nearby prices"):(zh?"携程周边实时采集":"Live Nearby Ctrip Quotes")}</strong>
  <p>{missing?(zh?"所选日期还没有报价，采集后可查看市场参照与调价建议。":"Collect quotes for these dates to compare the market and review rate advice."):(zh?"同步周边同行日历参考价，结合本店房量查看调价建议。":"Sync nearby calendar rates and review advice alongside your available rooms.")}</p>
  {guidedDemo?<DemoCollectButton zh={zh}/>:<button type="button" onClick={onOpen}>{zh?"打开采集抽屉":"Open Collection Drawer"}</button>}
 </section>;
}
