"use client";

import {useContext,useEffect,useId,useRef,useState,useSyncExternalStore} from "react";
import type {ReactNode} from "react";
import {DesktopTrialContext} from "./desktop-surface";

type CollectionResult={
 state:'idle'|'saved'|'pending'|'failed';
 observed?:number;
 missing?:number;
 failedHotels?:number;
 error?:string;
 sample?:boolean;
};

type DesktopBridge={
 status():Promise<CollectionResult>;
 openLogin():Promise<CollectionResult>;
 collectAndSync(hotels:string|{hotels:string;contextKey:string;star?:string}):Promise<CollectionResult>;
 readTargets?():Promise<CollectionTargets>;
 saveTargets?(input:{hotels:string;contextKey:string}):Promise<CollectionTargets>;
};
type CollectionTargets=CollectionResult&{contextKey?:string;location?:string;hotels?:string;savedAt?:string|null};

declare global {interface Window {staycraftDesktop?:DesktopBridge}}
const subscribe=()=>()=>{};
const desktopBridge=()=>window.staycraftDesktop;
const webBridge=()=>undefined;
export function DesktopCollection({zh,onSync,demo=false,fallback,expanded=false}:{zh:boolean;onSync:()=>void;demo?:boolean;fallback?:ReactNode;expanded?:boolean}){
 const bridge=useSyncExternalStore(subscribe,desktopBridge,webBridge);
 const localTrial=useContext(DesktopTrialContext);
 const inputId=useId();
 const [hotels,setHotels]=useState('');
 const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai'}).format(new Date());
 const [cityName,setCityName]=useState('');
 const [checkin,setCheckin]=useState(today);
 const [star,setStar]=useState('3');
 const [targets,setTargets]=useState<CollectionTargets|null>(null);
 const [settingsNotice,setSettingsNotice]=useState('');
 const [result,setResult]=useState<CollectionResult|null>(null);
 const [busy,setBusy]=useState<'login'|'collect'|'save'|null>(null);
 const generation=useRef(0);
 const lastContext=useRef<string|undefined>(undefined);
 const t=(cn:string,en:string)=>zh?cn:en;

 useEffect(()=>{
  let mounted=true;
  const nextRequest=()=>++generation.current;
  const refresh=()=>{
   const requested=nextRequest();
   if(!bridge)return;
   setTargets(null);setSettingsNotice('');
   void Promise.allSettled([bridge.status(),bridge.readTargets?.()]).then(([status,selection])=>{
    if(!mounted||requested!==generation.current)return;
    const value=selection.status==='fulfilled'?selection.value:undefined;
    if(bridge.readTargets&&(!value||value.error)){
     setResult(value||{state:'failed',error:'desktop_unavailable'});return;
    }
    if(value){
     if(value.contextKey!==lastContext.current){setHotels(value.hotels||'');}
     lastContext.current=value.contextKey;setTargets(value);
    }
    setResult(status.status==='fulfilled'?status.value:{state:'failed',error:'desktop_unavailable'});
   });
  };
  refresh();window.addEventListener('staycraft-profile-changed',refresh);
  return()=>{mounted=false;nextRequest();window.removeEventListener('staycraft-profile-changed',refresh)};
 },[bridge]);

 useEffect(()=>{
  const reveal=(event?:Event)=>{if(event?.type==="staycraft-open-collector"||window.location.hash==="#desktop-collection"){const panel=document.getElementById("desktop-collection") as HTMLDetailsElement|null;if(panel){panel.open=true;panel.scrollIntoView({block:"nearest"});panel.querySelector<HTMLElement>("summary")?.focus()}}};
  reveal();window.addEventListener("hashchange",reveal);window.addEventListener("staycraft-open-collector",reveal);return()=>{window.removeEventListener("hashchange",reveal);window.removeEventListener("staycraft-open-collector",reveal)};
 },[bridge]);

 if(!bridge){
  if(expanded)return <section className="native-card desktop-collection">
   <p role="status">{t('请在 StayCraft 桌面窗口选择城市、入住日期和星级并开始采集。','Choose the city, check-in date and star rating in the StayCraft desktop window.')}</p>

  </section>;
  return demo?<small className="mo-demo-collection-note">{t('实时采集请在 StayCraft 桌面窗口使用。','Use the StayCraft desktop window to collect prices.')}</small>:fallback;
 }
 const desktop=bridge;
 const sample=localTrial||Boolean(result?.sample);
 const calendarMode=sample;
 const exampleHotels=[1,2,3].map(number=>`https://hotels.ctrip.com/hotels/${910000+number}.html ${t('试用住宿','Example Hotel')} ${number}`).join('\n');
 const errors:Record<string,string>={
  invalid_search:t('请选择城市和有效的入住日期。','Select a city and a valid check-in date.'),
  city_not_found:t('未能确认携程城市，请填写完整城市名后重试。','The city could not be confirmed on Ctrip. Enter its full name and retry.'),
  invalid_hotels:calendarMode?t('每行填写携程酒店详情页链接和页面显示的完整名称，最多 5 家。','Enter up to five hotel detail URLs and their full displayed names, one per line.'):t('请重新选择采集条件后再试。','Choose the collection filters again and retry.'),
  date_not_confirmed:t('无法确认搜索页已刷新到新日期，采集已停止。','Could not confirm the results refreshed for the new date. Collection stopped.'),
  filters_changed:t('携程未保留所选筛选条件，采集已停止。请重新选择后再试。','Ctrip did not retain the filters. Choose them again and retry.'),
  occupancy_not_confirmed:t('无法确认携程列表的入住人数，采集已停止。','Collection stopped because the guest count could not be confirmed.'),
  login_required:t('携程要求登录。打开登录窗口，完成后再试。','Ctrip requires sign-in. Open the sign-in window and try again.'),
  verification_required:t('携程要求安全验证，采集已暂停。','Ctrip requested verification. Collection stopped.'),
  access_restricted:t('携程限制访问，采集已暂停。','Ctrip restricted access. Collection stopped.'),
  browser_unavailable:t('采集窗口未能启动，请重新打开桌面端后再试。','The collection window could not start. Restart the desktop app and try again.'),
  no_quotes:t('这次没有采到有效报价。检查链接、名称和登录状态。','No valid quotes. Check the URLs, names and sign-in status.'),
  sync_failed:t('同步暂未完成，已采集报价仍保留在本机。','Sync did not finish. The collected batch is still on this device.'),
  sync_conflict:t('同一批次已有不同内容，请检查同步记录。','A batch with the same identity has different content.'),
  account_changed:t('账号已切换。请切回采集时的账号再同步。','The account changed. Switch back to the collecting account to sync.'),
  sign_in:t('请先登录经营账号。','Sign in to a business account first.'),
  demo_only:t('在线演示账号仅展示示例报价。','The online demo account only shows sample quotes.'),
  cooldown:t('请等待五分钟再启动下一次采集。','Wait five minutes before starting another collection.'),
  busy:t('已有采集或登录窗口在运行。','A collection or sign-in window is already running.'),
  login_failed:t('登录窗口未能完成，请重新打开后再试。','Sign-in did not finish. Reopen the window and try again.'),
  property_location_required:t('先在「我的民宿」保存地址，再添加对标住宿。','Save your property address in My Property before adding comparable stays.'),
  collection_context_changed:t('账号或民宿地址已变更，请重新打开采集抽屉并核对住宿。','Your account or address changed. Reopen the collector and review the stays.'),
  location_changed:t('采集时的民宿地址与当前地址不同，报价仍保留在本机。请核对地址后再同步。','The address changed during collection. Quotes remain on this device. Check the address before syncing.'),
 };
 const error=result?.error&&(errors[result.error]??t('桌面采集暂不可用，请重试。','Desktop collection is unavailable. Try again.'));
 async function saveSelection(){
  if(busy||!desktop.saveTargets||!targets?.contextKey)return;
  const requested=generation.current,contextKey=targets.contextKey;
  setBusy('save');setSettingsNotice('');
  try{
   const saved=await desktop.saveTargets({hotels:hotels.trim(),contextKey});
   if(requested!==generation.current)return;
   if(saved.error){setResult({...saved,sample:saved.sample??result?.sample});return;}
   if(saved.contextKey!==contextKey){setResult({state:'failed',error:'collection_context_changed'});return;}
   setTargets(saved);setHotels(saved.hotels||'');setResult(previous=>previous?{...previous,error:undefined}:null);
   setSettingsNotice(t('已保存，下次采集会自动带入。','Saved. These stays will be ready for your next collection.'));
  }catch{if(requested===generation.current)setResult({state:'failed',error:'desktop_unavailable'})}
  finally{setBusy(null)}
 }
 async function perform(action:'login'|'collect'){
  if(busy)return;
  const requested=generation.current;
  const useExamples=action==='collect'&&sample&&!hotels.trim()&&result?.state!=='pending';
  let input=useExamples?exampleHotels:hotels;
  if(action==='collect'&&!sample&&result?.state!=='pending'){
   const city=cityName.trim();
   if(!city||city.length>40||!checkin||checkin<today||!Number.isFinite(Date.parse(checkin))){
    setResult(previous=>({...previous,state:'failed',error:'invalid_search'}));return;
   }
   const checkout=new Date(Date.parse(checkin)+86400000).toISOString().slice(0,10);
   input='https://hotels.ctrip.com/hotels/list?'+new URLSearchParams({
    cityName:city,destName:city,countryId:'1',checkin,checkout,crn:'1',locale:'zh-CN',
   });
  }
  if(useExamples)setHotels(exampleHotels);
  setBusy(action);setSettingsNotice('');
  setResult(previous=>previous?{...previous,error:undefined}:null);
  try{
   const value=action==='login'?await desktop.openLogin():await desktop.collectAndSync(targets?.contextKey?{hotels:input,contextKey:targets.contextKey,...(sample?{}:{star})}:input);
   if(requested!==generation.current)return;
   if(value.state!=='pending'&&(value.error==='sync_failed'||value.error==='sync_conflict')){
    const pending=await desktop.status();
    if(requested!==generation.current)return;
    setResult({...pending,error:value.error});
   }else setResult({...value,sample:value.sample??result?.sample});
   if(action==='login'&&!value.error){
    setSettingsNotice(t('携程窗口已关闭。选好采集条件后，点击「采集并同步」。','The Ctrip window is closed. Choose your filters and select Collect and sync.'));
   }
   if(action==='collect'&&value.state==='saved'){
    onSync();
    window.dispatchEvent(new Event("staycraft-market-synced"));
   }
  }catch{if(requested===generation.current)setResult(previous=>({...previous,state:'failed',error:'desktop_unavailable'}))}
  finally{setBusy(null)}
 }

 return <details className="mo-collection" id="desktop-collection" open={expanded||undefined}>
  <summary className="mo-chip">{t('实时采集','Collect live prices')}</summary>
  <section className="native-card desktop-collection" aria-label={t('本地报价采集','Local quote collection')}>
  {desktop.readTargets&&!targets&&!result?.error&&<p role="status">{t('正在读取对标住宿…','Loading comparable stays…')}</p>}
  {targets?.location&&<p><strong>{t('当前民宿地址','Property address')}</strong><br/>{targets.location}</p>}
  {!sample&&<fieldset className="desktop-collection-filters" disabled={Boolean(busy)||result?.state==='pending'}>
   <label>{t('城市','City')}<input aria-label={t('城市','City')} value={cityName} maxLength={40} placeholder={t('输入城市，如南京、丽江','Enter a city, e.g. Nanjing')} onChange={event=>setCityName(event.target.value)}/></label>
   <label>{t('入住日期','Check-in date')}<input type="date" min={today} value={checkin} onChange={event=>setCheckin(event.target.value)}/></label>
   <label>{t('星级','Star rating')}<select aria-label={t('星级','Star rating')} value={star} onChange={event=>setStar(event.target.value)}>
    {[2,3,4,5].map(value=><option key={value} value={value}>{value===2?t('2 星及以下','2 stars or fewer'):t(value+' 星',value+' stars')}</option>)}
   </select></label>
   <p>{t('默认筛选民宿，从入住日起采集 7 天，每天取前五家。','Homestays are selected by default. Collect the first five results per day for seven days from check-in.')}</p>
  </fieldset>}
  {sample&&<div><button className="inventory-text" type="button" disabled={Boolean(busy)||!targets?.contextKey||result?.state==='pending'} onClick={()=>{
   setHotels(exampleHotels);
   setResult(previous=>previous?{...previous,error:undefined}:null);
  }}>{t('填入 3 家示例住宿','Fill in three example hotels')}</button></div>}
  {sample&&<textarea id={inputId} rows={3} maxLength={4000} value={hotels} disabled={Boolean(busy)||Boolean(desktop.readTargets&&!targets?.contextKey)||result?.state==='pending'} onChange={event=>{setHotels(event.target.value);setSettingsNotice('');if(result?.error==='invalid_hotels')setResult({...result,error:undefined})}}/>}
  {calendarMode&&desktop.saveTargets&&targets?.contextKey&&<div className="promotion-actions"><button className="inventory-text" type="button" disabled={Boolean(busy)||result?.state==='pending'} onClick={()=>void saveSelection()}>{busy==='save'?t('保存中…','Saving…'):t('保存对标住宿','Save comparable stays')}</button><small>{t('按民宿地址保存在这台电脑，采集时也会自动保存。','Saved on this computer for this property address, also when you collect.')}</small></div>}
  {settingsNotice&&<p role="status">{settingsNotice}</p>}
  <div className="promotion-actions">
   <button type="button" className="native-primary" disabled={Boolean(busy)||Boolean(desktop.readTargets&&!targets?.contextKey)} onClick={()=>void perform('collect')}>
    {busy==='collect'?t('采集与同步中…','Collecting and syncing…'):result?.state==='pending'?t('重试同步','Retry sync'):sample?t('采集示例报价','Collect example prices'):t('采集并同步','Collect and sync')}
   </button>
   {!sample&&result&&<button type="button" className="inventory-text" disabled={Boolean(busy)} onClick={()=>void perform('login')}>{busy==='login'?t('携程登录进行中…','Ctrip sign-in in progress…'):t('打开携程登录','Open Ctrip sign-in')}</button>}
  </div>
  {busy==='collect'&&<p role="status">{t('正在采集并同步报价，请稍候。','Collecting and syncing prices. Please wait.')}</p>}
  {busy==='login'&&<p role="status">{t('请在携程窗口完成登录，再关闭窗口。','Sign in to Ctrip, then close the window.')}</p>}
  {busy!=='collect'&&result?.observed!==undefined&&<p role="status">{result.state==='saved'?t('已同步','Synced')+' · ':''}{t('有效报价','Valid quotes')} {result.observed}{result.missing!==undefined&&<> · {t('缺失','Missing')} {result.missing}</>}{result.failedHotels!==undefined&&<> · {t('失败住宿','Failed properties')} {result.failedHotels}</>}</p>}
  {error&&<p role="alert">{error}</p>}
  </section>
 </details>;
}
