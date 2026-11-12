"use client";

import {useEffect,useRef,useState,useSyncExternalStore} from "react";
import type {ReactNode} from "react";

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
 collectAndSync(hotels:string|{hotels:string;contextKey:string}):Promise<CollectionResult>;
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
 const [hotels,setHotels]=useState('');
 const [listUrl,setListUrl]=useState('');
 const [targets,setTargets]=useState<CollectionTargets|null>(null);
 const [settingsNotice,setSettingsNotice]=useState('');
 const [quoteMode,setQuoteMode]=useState<'calendar'|'list'>('calendar');
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
     if(value.contextKey!==lastContext.current){setHotels(value.hotels||'');setListUrl('');}
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

 if(!bridge)return demo?<small className="mo-demo-collection-note">{t('当前为浏览器演示。实时采集请在桌面端使用。','Browser demo. Use the desktop app for live collection.')}</small>:fallback;
 const desktop=bridge;
 const calendarMode=result?.sample||quoteMode==='calendar';
 const errors:Record<string,string>={
  invalid_hotels:calendarMode?t('每行填写携程酒店详情页链接和页面显示的完整名称，最多 5 家。','Enter up to five hotel detail URLs and their full displayed names, one per line.'):t('请粘贴携程住宿搜索结果页链接。','Paste a Ctrip accommodation search results link.'),
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
   if(saved.error){setResult(saved);return;}
   if(saved.contextKey!==contextKey){setResult({state:'failed',error:'collection_context_changed'});return;}
   setTargets(saved);setHotels(saved.hotels||'');setResult(previous=>previous?{...previous,error:undefined}:null);
   setSettingsNotice(t('已保存，下次采集会自动带入。','Saved. These stays will be ready for your next collection.'));
  }catch{if(requested===generation.current)setResult({state:'failed',error:'desktop_unavailable'})}
  finally{setBusy(null)}
 }
 async function perform(action:'login'|'collect'){
  if(busy)return;
  const requested=generation.current,contextKey=targets?.contextKey;
  const input=calendarMode?hotels:listUrl;
  const listInput=/^https:\/\/hotels\.ctrip\.com\/hotels\/list(?:\?|$)/.test(input.trim());
  if(action==='collect'&&result?.state!=='pending'&&(calendarMode?listInput:!listInput)){
   setResult(previous=>({...previous,state:'failed',error:'invalid_hotels'}));return;
  }
  setBusy(action);
  try{
   const value=action==='login'?await desktop.openLogin():await desktop.collectAndSync(targets?.contextKey?{hotels:input,contextKey:targets.contextKey}:input);
   if(requested!==generation.current)return;
   if(value.state!=='pending'&&(value.error==='sync_failed'||value.error==='sync_conflict')){
    const pending=await desktop.status();
    if(requested!==generation.current)return;
    setResult({...pending,error:value.error});
   }else setResult(value);
   if(value.state==='saved'){
    if(calendarMode&&desktop.readTargets){
     const saved=await desktop.readTargets();
     if(requested!==generation.current)return;
     if(!saved.error&&saved.contextKey===contextKey)setTargets(saved);
    }
    onSync();
    window.dispatchEvent(new Event("staycraft-market-synced"));
   }
  }catch{if(requested===generation.current)setResult({state:'failed',error:'desktop_unavailable'})}
  finally{setBusy(null)}
 }

 return <details className="mo-collection" id="desktop-collection" open={expanded||undefined}>
  <summary className="mo-chip">{t('实时采集','Collect live prices')}</summary>
  <section className="native-card desktop-collection" aria-label={t('本地报价采集','Local quote collection')}>
  {desktop.readTargets&&!targets&&!result?.error&&<p role="status">{t('正在读取对标住宿…','Loading comparable stays…')}</p>}
  {targets?.location&&<p><strong>{t('当前民宿地址','Property address')}</strong><br/>{targets.location}</p>}
  {!result?.sample&&<label>{t('采集类型','Quote type')}<select style={{display:'block',width:'100%',maxWidth:'100%',marginTop:6}} value={quoteMode} disabled={Boolean(busy)||result?.state==='pending'} onChange={event=>{setQuoteMode(event.target.value as 'calendar'|'list');setSettingsNotice('')}}>
   <option value="calendar">{t('日历参考价 · 用于样本统计','Calendar references · Included in sample statistics')}</option>
   <option value="list">{t('列表展示起价 · 不计入统计','List starting prices · Excluded from statistics')}</option>
  </select></label>}
  <p>{result?.sample?t('开发演示使用虚构报价，重启后工作区数据会还原。','This development sample uses fictional quotes and resets when restarted.'):calendarMode?t('从酒店详情页日历读取未来 7 晚参考价，按 1 间、2 成人、每晚单独统计。参考价不代表具体房型、早餐或退改方案。','Read the next seven nights from hotel calendars for one room and two adults, one night at a time. References do not specify room types, breakfast or cancellation terms.'):t('按入住日期采集携程搜索列表起价，仅展示，不计入中位数和调价依据。','Collect Ctrip search-list starting prices by check-in date for display only. They are excluded from medians and rate advice.')}</p>
  <label htmlFor="desktop-hotel-list">{calendarMode?t('酒店详情页链接和完整名称（每行一家，最多 5 家）','Hotel detail URL and full name, one per line, up to five'):t('携程住宿搜索结果页链接','Ctrip search results link')}</label>
  {calendarMode&&<small>{t('选择当前民宿周边、客群与房价相近的住宿。至少 3 家才形成样本价带；名称请以携程详情页为准。','Choose nearby stays with comparable guests and rates. At least three are needed for a sample price band. Use each name as displayed on Ctrip.')}</small>}
  <textarea id="desktop-hotel-list" rows={3} maxLength={4000} value={calendarMode?hotels:listUrl} disabled={Boolean(busy)||Boolean(desktop.readTargets&&!targets?.contextKey)||result?.state==='pending'} onChange={event=>{(calendarMode?setHotels:setListUrl)(event.target.value);setSettingsNotice('')}} placeholder={calendarMode?'https://hotels.ctrip.com/hotels/123456.html 酒店完整名称':'https://hotels.ctrip.com/hotels/list?...'}/>
  {calendarMode&&desktop.saveTargets&&targets?.contextKey&&<div className="promotion-actions"><button className="inventory-text" type="button" disabled={Boolean(busy)||result?.state==='pending'} onClick={()=>void saveSelection()}>{busy==='save'?t('保存中…','Saving…'):t('保存对标住宿','Save comparable stays')}</button><small>{t('按民宿地址保存在这台电脑，采集时也会自动保存。','Saved on this computer for this property address, also when you collect.')}</small></div>}
  {settingsNotice&&<p role="status">{settingsNotice}</p>}
  <div className="promotion-actions">
   <button type="button" className="native-primary" disabled={Boolean(busy)||Boolean(desktop.readTargets&&!targets?.contextKey)||(!(calendarMode?hotels:listUrl).trim()&&result?.state!=='pending')} onClick={()=>void perform('collect')}>
    {busy==='collect'?t('采集与同步中…','Collecting and syncing…'):result?.state==='pending'?t('重试同步','Retry sync'):t('采集并同步','Collect and sync')}
   </button>
   {!result?.sample&&<button type="button" className="inventory-text" disabled={Boolean(busy)} onClick={()=>void perform('login')}>{t('打开携程登录','Open Ctrip sign-in')}</button>}
  </div>
  {busy==='login'&&<p role="status">{t('请在打开的窗口登录携程，完成后关掉该窗口。','Sign in to Ctrip in the new window and close it when done.')}</p>}
  {result?.observed!==undefined&&<p role="status">{result.state==='saved'?t('已同步','Synced')+' · ':''}{t('有效报价','Valid quotes')} {result.observed}{result.missing!==undefined&&<> · {t('缺失','Missing')} {result.missing}</>}{result.failedHotels!==undefined&&<> · {t('失败住宿','Failed properties')} {result.failedHotels}</>}</p>}
  {error&&<p role="alert">{error}</p>}
  </section>
 </details>;
}
