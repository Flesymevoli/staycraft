"use client";

import Link from "next/link";
import {useEffect,useState} from "react";
import type {PropertyInventory} from "@/lib/property-inventory";

type Progress = {skipped:number[]; reviewed:boolean; paused:boolean; finished:boolean; promotionHelpClosed:boolean};
const initial:Progress={skipped:[],reviewed:false,paused:false,finished:false,promotionHelpClosed:false};
const changes=["staycraft-profile-changed","staycraft-inventory-changed","staycraft-stays-changed","staycraft-market-synced","staycraft-promotion-saved","focus"];

async function read<T>(path:string,signal:AbortSignal):Promise<T>{
 const response=await fetch("/api/workspace/"+path,{cache:"no-store",signal});
 if(!response.ok)throw Error(path);
 return response.json();
}

export function DesktopFirstRun({scope,section,zh,onRooms}:{scope:string;section:string;zh:boolean;onRooms:()=>void}){
 const key="staycraft-desktop-guide-v1:"+scope;
 const [progress,setProgress]=useState<Progress|null>(null);
 const [ready,setReady]=useState({profile:false,rooms:false,orders:false,market:false,promotion:false});
 const [checked,setChecked]=useState(false);
 const t=(cn:string,en:string)=>zh?cn:en;
 useEffect(()=>{
  const bridge=window.staycraftDesktop;
  if(!bridge)return;
  let saved=initial;
  try{
   const value=JSON.parse(localStorage.getItem(key)||"null");
   if(value&&Array.isArray(value.skipped))saved={...initial,...value};
  }catch{}
  let controller:AbortController;
  async function refresh(){
   controller?.abort();
   const request=new AbortController();
   controller=request;
   const results=await Promise.allSettled([
    read<{profile?:{name?:string;location?:string}}>("profile",request.signal),
    read<{inventory:PropertyInventory}>("inventory",request.signal),
    read<{batches?:unknown[]}>("booking-import?view=state",request.signal),
    bridge!.status(),
    read<{state?:{drafts?:{kind?:string}[]}}>("promotion",request.signal),
   ]);
   if(request.signal.aborted)return;
   const [profile,inventory,orders,market,promotion]=results;
   const stock=inventory.status==="fulfilled"?inventory.value.inventory:null;
   setReady(previous=>({
    profile:profile.status==="fulfilled"?Boolean(profile.value.profile?.name?.trim()&&profile.value.profile.location?.trim()):previous.profile,
    rooms:inventory.status==="fulfilled"?Boolean(stock?.rooms.some(room=>room.active&&stock.types.some(type=>type.id===room.typeId&&type.price>0))):previous.rooms,
    orders:orders.status==="fulfilled"?Boolean(orders.value.batches?.length):previous.orders,
    market:market.status==="fulfilled"?market.value.state==="saved"&&Boolean(market.value.observed):previous.market,
    promotion:promotion.status==="fulfilled"?Boolean(promotion.value.state?.drafts?.some(draft=>draft.kind!=="action")):previous.promotion,
   }));
   const hasDraft=promotion.status==="fulfilled"&&Boolean(promotion.value.state?.drafts?.some(draft=>draft.kind!=="action"));
   setProgress(previous=>{
    const current=previous??saved;
    return hasDraft&&!current.promotionHelpClosed?{...current,promotionHelpClosed:true}:current;
   });
   setChecked(true);
  }
  void refresh();
  changes.forEach(event=>window.addEventListener(event,refresh));
  return ()=>{controller?.abort();changes.forEach(event=>window.removeEventListener(event,refresh));};
 },[key]);

 useEffect(()=>{
  if(progress)try{localStorage.setItem(key,JSON.stringify(progress));}catch{}
 },[key,progress]);

 if(!progress||!checked)return null;
 function save(next:Progress){
  setProgress(next);
  try{localStorage.setItem(key,JSON.stringify(next));}catch{}
 }
 const steps=[
  {done:ready.profile&&ready.rooms,title:t("完善民宿资料","Set up your property"),description:t("填写名称和地址，再添加启用客房，为房型设置每晚价格。客房数由你添加的客房计算。","Save the property name and address, then add active rooms with nightly rates. Room count comes from the rooms you add."),href:ready.profile?"/app/mine#room-types":"/app/mine#property-profile",page:"mine",link:ready.profile?t("设置房型与价格","Set rooms and rates"):t("编辑民宿资料","Edit property details")},
  {done:ready.orders,title:t("导入订单","Import bookings"),description:t("在订单页下载 CSV 模板，上传文件，核对预览后确认导入。","Download the CSV template on the bookings page, upload your file, review the preview and confirm the import."),href:"/app/work",page:"work",link:t("打开订单导入","Open booking import")},
  {done:ready.market,title:t("连接市场数据源","Connect market data"),description:t("打开价格采集窗口登录携程，粘贴住宿搜索结果页链接，再采集并同步首批报价。","Open the collection window to sign in to Ctrip, paste a search results link, then collect and sync your first batch."),href:"/app/explore#market-snapshot",page:"explore",link:t("打开市场采集","Open market collection")},
  {done:progress.reviewed,title:t("查看经营诊断","Review your diagnosis"),description:t("在工作台查看经营指标、市场证据和行动建议。读完后标记本步完成。","Review your operating metrics, market evidence and suggested actions on the workbench, then mark this step as reviewed."),href:"/app",page:"home",link:t("打开工作台","Open workbench")},
  {done:ready.promotion,title:t("生成并保存推广文案","Create and save promotion copy"),description:t("从工作台的经营机会进入推广，或直接打开推广页。生成方案后编辑文案，再点击保存。","Open Promotion from a workbench opportunity or from the navigation. Generate a plan, edit your copy and save it."),href:"/app/promotion",page:"promotion",link:t("打开推广","Open Promotion")},
 ];
 const current=steps.findIndex((step,index)=>!step.done&&!progress.skipped.includes(index));
 const step=steps[current];
 const promotionHelp=section==="promotion"&&!progress.promotionHelpClosed&&!ready.promotion;
 return <>
  {!progress.finished&&(progress.paused?<div className="desktop-guide-resume">
   <button type="button" onClick={()=>save({...progress,paused:false})}>{t("继续首次使用引导","Resume setup guide")}</button>
  </div>:<section className="native-card" aria-label={t("首次使用引导","Setup guide")}>
   <div className="native-section-head"><h2>{t("首次使用引导","Setup guide")}</h2>
    {step&&<span>{t(`第 ${current+1} 步，共 ${steps.length} 步`,`Step ${current+1} of ${steps.length}`)}</span>}
   </div>
   {step?<><h3>{step.title}</h3><p>{step.description}</p></>:<p>{t("引导已走完，可以开始日常经营。","You've reached the end of setup.")}</p>}
   <div className="promotion-actions">
    {!step?<button className="native-primary" type="button" onClick={()=>save({...progress,finished:true})}>{t("完成引导","Finish setup")}</button>:
     current===3&&section==="home"?<button className="native-primary" type="button" onClick={()=>save({...progress,reviewed:true})}>{t("已查看诊断","Mark as reviewed")}</button>:
     (section!==step.page||current===0)&&<Link className="native-primary" href={step.href}
      onClick={section==="mine"&&current===0?event=>{event.preventDefault();window.location.hash=ready.profile?"room-types":"property-profile";if(ready.profile)onRooms();}:undefined}>{step.link}</Link>}
    {step&&<button className="inventory-text" type="button" onClick={()=>save({...progress,skipped:[...progress.skipped,current]})}>{t("跳过这一步","Skip this step")}</button>}
    {step&&<button className="inventory-text" type="button" onClick={()=>save({...progress,paused:true})}>{t("稍后继续","Continue later")}</button>}
    {step&&<button className="inventory-text" type="button" onClick={()=>save({...progress,finished:true})}>{t("跳过引导","Skip guide")}</button>}
   </div>
  </section>)}
  {promotionHelp&&<section className="native-card" aria-label={t("推广使用指引","Promotion guide")}>
   <div className="native-section-head"><h2>{t("第一次使用推广","Getting started with Promotion")}</h2></div>
   <ol>
    <li>{t("先确定想推广的入住日期。若从经营机会进入，可沿用带入的日期和依据。","Choose the stay dates you want to promote. If you came from an opportunity, review the prefilled dates and context.")}</li>
    <li>{t("查看自动生成的推广人群和建议，再选择文案模板或结合线索生成文案。","Review the suggested audience and approach, then use a copy template or generate copy from a lead.")}</li>
    <li>{t("核对并编辑文案，点击「保存文案」，以后可从草稿中继续编辑。","Review and edit the copy, then save it. Reopen it from your drafts whenever you need it.")}</li>
   </ol>
   <button className="inventory-text" type="button" onClick={()=>save({...progress,promotionHelpClosed:true})}>{t("知道了","Got it")}</button>
  </section>}
 </>;
}
