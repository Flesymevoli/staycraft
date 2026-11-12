"use client";
import {useDesktopSurface} from "./desktop-surface";
import {SegmentedControl} from "./segmented-control";
import {useCallback,useEffect,useRef,useState} from "react";
import {useSearchParams} from "next/navigation";
import {drawPromotionCopy} from "@/lib/promotion-library";
import {DecisionAdvice} from "./decision-advice";
import {ArrowRight,Copy,Trash2,Save,RefreshCw} from "lucide-react";
import {emptyPromotion,matchingSources,validBrief,validPromotion,type PromotionBrief,type PromotionDraft,type PromotionState} from "@/lib/promotion";
import {bookingPeriod} from "@/lib/booking-period";
import {workspaceDay} from "@/lib/demo-period";
import {NearbyDiscovery} from './nearby-discovery';
import {OfficialHolidayContext} from './official-holiday-context';
import {PromotionPlanPanel} from './promotion-plan-panel';
import {PromotionCluePool} from './promotion-clue-pool';
import {DesktopPageToolbar} from './desktop-page-toolbar';
import {validPromotionPlan,type PromotionPlan} from '@/lib/promotion-plan';
import "./workspace-explore.css";
import "./gemini-promotion.css";

function initialBrief(zh:boolean,start:string|null,end:string|null,demo:boolean):PromotionBrief{
 const period=start&&end?bookingPeriod({start,end}):null;
 const date=workspaceDay(demo);
 const weekEnd=new Date(Date.parse(date)+6*86400000).toISOString().slice(0,10);
 return {language:zh?"zh":"en",channel:"wechat",goal:"rooms",start:period?.start??date,end:period?.end??weekEnd,sourceIds:[]};
}
type Stored={state:PromotionState;revision:string|null};
type CopyMode="template"|"live"|"library";
const draftMode=(draft:PromotionDraft):CopyMode=>draft.engine==="library_v1"?"library":draft.engine==="model_v1"?"live":"template";
export function PromotionWorkspace({zh,demo=false}:{zh:boolean;demo?:boolean}){
 const desktop=useDesktopSurface();
 const params=useSearchParams();
 const t=useCallback((en:string,cn:string)=>zh?cn:en,[zh]);
 const modeLabel=(mode:CopyMode)=>mode==="template"?t("Property-based copy","本店资料生成"):mode==="live"?t("AI writing","AI 创意生成"):t("Copy library","固定文案库");
 const [decisionVersion,setDecisionVersion]=useState(0);
 useEffect(()=>{const refresh=()=>setDecisionVersion(v=>v+1);window.addEventListener("staycraft-decisions-changed",refresh);return()=>window.removeEventListener("staycraft-decisions-changed",refresh)},[]);
 const [stored,setStored]=useState<Stored>({state:emptyPromotion(),revision:null}),[loading,setLoading]=useState(true),[loadError,setLoadError]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState(""),[conflict,setConflict]=useState(false);
 const [brief,setBrief]=useState<PromotionBrief>(()=>initialBrief(zh,params.get("start"),params.get("end"),demo)),[draft,setDraft]=useState<PromotionDraft|null>(null),[dirty,setDirty]=useState(false);
 const [generating,setGenerating]=useState(false);
 const [offerFactual,setOfferFactual]=useState(false);
 const [savedPlan,setPlan]=useState<PromotionPlan|null>(null);
 const [planEvidence,setPlanEvidence]=useState("");
 const evidenceKey=JSON.stringify([brief.start,brief.end,brief.sourceIds]);
 const plan=planEvidence===evidenceKey?savedPlan:null;
 const [mode,setMode]=useState<CopyMode>("template");
 const [versions,setVersions]=useState<Partial<Record<CopyMode,{draft:PromotionDraft;dirty:boolean}>>>({});
 function switchMode(next:CopyMode){
  if(next===mode)return;
  setVersions(previous=>({...previous,[mode]:draft?{draft,dirty}:undefined,[next]:undefined}));
  setMode(next);
  setDraft(versions[next]?.draft??null);
  setDirty(versions[next]?.dirty??false);
  setNotice("");
  setError("");
  setOfferFactual(false);
 }
 function updatePlan(next:PromotionPlan|null){setPlan(next);setPlanEvidence(evidenceKey)}

 const [settingsOpen,setSettingsOpen]=useState(false);
 const editor=useRef<HTMLTextAreaElement>(null),alive=useRef(true);
 function focusEditor(){requestAnimationFrame(()=>{const field=editor.current;if(field){field.focus({preventScroll:true});field.setSelectionRange(0,0);field.scrollTop=0}})}
 useEffect(()=>{alive.current=true;return()=>{alive.current=false}},[]);
 const hasUnsaved=dirty||Object.values(versions).some(version=>version?.dirty);
 useEffect(()=>{if(!hasUnsaved)return;const leave=(event:BeforeUnloadEvent)=>event.preventDefault();const navigate=(event:MouseEvent)=>{if(event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;const anchor=(event.target as Element)?.closest?.("a[href]");if(!(anchor instanceof HTMLAnchorElement)||anchor.target==="_blank"||anchor.hasAttribute("download"))return;const url=new URL(anchor.href);if(url.href===window.location.href||url.pathname===window.location.pathname&&url.search===window.location.search)return;if(!window.confirm(zh?"当前草稿尚未保存，确定离开吗？":"Your draft has unsaved changes. Leave this page?")){event.preventDefault();event.stopPropagation()}};window.addEventListener("beforeunload",leave);document.addEventListener("click",navigate,true);return()=>{window.removeEventListener("beforeunload",leave);document.removeEventListener("click",navigate,true)}},[hasUnsaved,zh]);
 async function load(){setLoading(true);setLoadError(false);try{const response=await fetch("/api/workspace/promotion",{cache:"no-store"});if(!response.ok)throw new Error();const next=await response.json() as Stored;if(!validPromotion(next.state))throw new Error();if(alive.current){setStored(next);setConflict(false)}}catch{if(alive.current)setLoadError(true)}finally{if(alive.current)setLoading(false)}}
 useEffect(()=>{const controller=new AbortController();fetch("/api/workspace/promotion",{cache:"no-store",signal:controller.signal}).then(async response=>{if(!response.ok)throw new Error();const next=await response.json() as Stored;if(!validPromotion(next.state))throw new Error();if(!controller.signal.aborted){setStored(next);setLoading(false);setLoadError(false)}}).catch(()=>{if(!controller.signal.aborted){setLoadError(true);setLoading(false)}});return()=>controller.abort()},[decisionVersion]);
 const message=(code:string)=>code==="promotion_model_unavailable"?t("AI writing is unavailable. You can still draft from your property facts.","暂时无法使用 AI 创意生成，仍可根据本店资料整理文案。"):code==="promotion_changed"?t("The saved workspace changed elsewhere. Your text is kept. Load the latest version, then save again.","其他页面修改了已保存内容，当前文字已保留。读取最新版本后再保存。") :code==="promotion_setup_required"?t("Add your property location and an active room first.","请先完善民宿位置并添加启用客房。") :code==="promotion_source_required"?t("Select at least one saved source that covers these dates.","请选择适用于本次日期的已保存线索。") :code==="promotion_diagnosis_unavailable"?t("Availability has changed. Refresh the workbench opportunity before drafting.","这段日期的房量已有变化，请更新工作台机会后再生成。"):code==="promotion_too_long"?t("Select fewer sources to keep the draft within 4,000 characters.","请选择更少线索，保持文案在 4000 字以内。") :t("Could not complete this action. Your current text is kept; try again.","操作未完成，当前文字已保留，请重试。");
 async function persist(next:PromotionState){
  if(!validPromotion(next)){setError(t("Check the text lengths and date ranges. Keep at most 20 drafts and 12 sources.","请核对文字长度与日期范围，最多保存 20 份草稿、12 条线索。"));return false}
  setBusy(true);setError("");setNotice("");
  try{const response=await fetch("/api/workspace/promotion",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({state:next,revision:stored.revision})});const data=await response.json();if(!response.ok){if(response.status===409)setConflict(true);throw new Error(data.error)}setStored(data);return true}catch(e){setError(message(e instanceof Error?e.message:""));return false}finally{setBusy(false)}
 }
 async function useNearbySource(reference:{title:string;url:string;summary:string;start?:string;end?:string}){
  const existing=stored.state.sources.find(s=>s.url===reference.url&&s.title===reference.title&&s.start<=brief.end&&s.end>=brief.start);
  if(loading||loadError)return;
  const source={...reference,id:existing?.id??crypto.randomUUID(),start:reference.start??brief.start,end:reference.end??brief.end,checkedOn:workspaceDay(demo)};
  if((!existing||existing.summary!==source.summary||existing.start!==source.start||existing.end!==source.end)&&
    !await persist({...stored.state,sources:[source,...stored.state.sources.filter(item=>item.id!==source.id)].slice(0,12)}))return;
  chooseSource(source.id);
 }
 function chooseSource(id:string){
  setBrief(previous=>({...previous,sourceIds:[id]}));
  if(mode==="library")switchMode("template");
  requestAnimationFrame(()=>{
   const heading=document.getElementById("promotion-copy-heading");
   heading?.scrollIntoView({block:"start"});
   heading?.focus({preventScroll:true});
  });
 }
 const discard=()=>!dirty||window.confirm(t("Discard unsaved draft changes?","放弃当前未保存的草稿修改吗？"));
 function changeDate(key:"start"|"end",value:string){setPlan(null);setBrief(previous=>{const next={...previous,[key]:value};return {...next,sourceIds:matchingSources(stored.state.sources,next).map(s=>s.id).slice(0,1)}})}
 const draws=useRef<Record<string,number[]>>({});
 const drawnText=useRef<Partial<Record<CopyMode,{id:string;text:string}>>>({});
 async function generate(factualOnly=mode==="template"){
  if(loading||loadError||busy||conflict)return;
  if(mode!=="library"&&brief.sourceIds.length>1){
   setError(t("Choose one source for the new draft.","请选择一条线索生成新文案。"));
   return;
  }
  if(!validBrief({...brief,language:zh?"zh":"en"})){setError(t("Choose a valid date range of 1–366 days.","请选择有效的 1–366 天日期范围。"));return}
  const currentPlan=mode!=="library"&&plan&&validPromotionPlan(plan)&&plan.start===brief.start&&plan.end===brief.end?plan:null;
  if(mode!=="library"&&!currentPlan){setError(t("Wait for the audience and angle, or complete the property details first.","请先等客群与切入角度准备完成；若资料不完整，可先补充本店信息。"));return}
  const previous=drawnText.current[mode];
  if(dirty&&(!previous||previous.id!==draft?.id||previous.text!==draft.content)&&!discard())return;
  const current={...brief,channel:"wechat" as const,goal:"rooms" as const,sourceIds:mode!=="library"?brief.sourceIds:[],language:zh?'zh' as const:'en' as const};
  if(mode!=="library"){
   setBusy(true);setGenerating(true);setError("");setNotice("");setOfferFactual(false);
   try{
    const response=await fetch("/api/workspace/promotion/generate",{
     method:"POST",headers:{"Content-Type":"application/json"},
     body:JSON.stringify({...current,...(factualOnly?{factualOnly:true}:{requireModel:true}),...(currentPlan?{plan:currentPlan}:{})})
    });
    const result=await response.json();
    if(!response.ok)throw Error(result.error);
    const engine=result.draft?.engine;
    const expected=factualOnly?engine==="rules_v1":engine==="model_v1";
    if(!expected||!validPromotion({sources:[],drafts:[result.draft]}))throw Error("invalid_promotion");
    drawnText.current[mode]={id:result.draft.id,text:result.draft.content};
    setDraft(result.draft);setDirty(true);
    focusEditor();
   }catch(error){
    const code=error instanceof Error?error.message:"";
    if(code==="promotion_model_unavailable")setOfferFactual(true);
    else setError(message(code));
   }finally{setBusy(false);setGenerating(false);}
   return;
  }
  const key=current.language;
  const pick=drawPromotionCopy(key,draws.current[key]||[]);
  draws.current[key]=pick.used;
  const id=crypto.randomUUID();
  drawnText.current[mode]={id,text:pick.content};
  setDraft({id,brief:{...current,channel:pick.channel},createdAt:new Date().toISOString(),engine:'library_v1',content:pick.content,basis:[]});
  setDirty(true);setError('');setNotice('');
  focusEditor();
 }
 async function saveDraft(){
  if(!draft||!draft.content.trim())return;
  const datesChanged=draft.brief.start!==brief.start||draft.brief.end!==brief.end;
  const sourcesChanged=JSON.stringify([...draft.brief.sourceIds].sort())!==JSON.stringify([...brief.sourceIds].sort());
  const reopeningSavedDraft=brief.sourceIds.length===0&&stored.state.drafts.some(saved=>saved.id===draft.id);
  if(datesChanged||mode!=="library"&&sourcesChanged&&!reopeningSavedDraft){
   setError(t("The dates or sources changed. Generate copy again before saving.","入住日期或线索已调整，请重新生成文案后保存。"));
   return;
  }
  const next={...draft,content:draft.content.trim()};
  if(await persist({...stored.state,drafts:[next,...stored.state.drafts.filter(d=>d.id!==next.id)]})){
   setDraft(next);setDirty(false);setNotice(t("Saved to your account. Not published.","已保存到当前账号，未发布。"));
   window.dispatchEvent(new Event("staycraft-promotion-saved"));
  }
 }
 const selectedSources=matchingSources(stored.state.sources,brief);
 const selectedSource=selectedSources[0];
 const draftContent=draft?.content??"";
 const draftTitle=(draftContent.split("\n").find(line=>line.trim())||"").trim();
 const blocked=loading||loadError||busy||conflict;
 const staleDraft=!!draft&&(draft.brief.start!==brief.start||draft.brief.end!==brief.end||mode!=="library"&&brief.sourceIds.length>0&&JSON.stringify(draft.brief.sourceIds)!==JSON.stringify(brief.sourceIds));
 async function copyDraft(){if(!draft)return;try{await navigator.clipboard.writeText(draft.content);setNotice(t("Copied. Review before publishing.","全文已复制，发布前请再核对房态与价格。"))}catch{editor.current?.focus();editor.current?.select();setNotice(t("Select the text and copy it manually.","请选中文字后手动复制。"))}}
 function openDraft(item:PromotionDraft){
  const nextMode=draftMode(item);
  if(!discard()||nextMode!==mode&&versions[nextMode]?.dirty&&!window.confirm(t("Replace the unsaved draft in that writing mode?","该文案方式还有一份未保存草稿，确定打开已保存内容替换它吗？")))return;
  const sources=matchingSources(stored.state.sources,item.brief).map(source=>source.id).slice(0,1);
  setDraft(structuredClone(item));setMode(nextMode);setVersions(v=>({...v,[mode]:undefined,[nextMode]:undefined}));setBrief({...item.brief,sourceIds:sources});setPlan(item.plan??null);setPlanEvidence(JSON.stringify([item.brief.start,item.brief.end,sources]));setDirty(false);setNotice("");setError("");focusEditor();
 }
 if(desktop)return <div className="gemini-promotion">
  <DesktopPageToolbar><details className="gemini-promo-period" open={settingsOpen} onToggle={event=>setSettingsOpen(event.currentTarget.open)}><summary>{t("Target stay dates","推广入住期")}：{brief.start} — {brief.end}</summary><fieldset disabled={blocked}><label>{t("Stay from","入住开始日期")}<input type="date" value={brief.start} onChange={event=>changeDate('start',event.target.value)}/></label><label>{t("Stay through","入住结束日期")}<input type="date" value={brief.end} onChange={event=>changeDate('end',event.target.value)}/></label></fieldset></details></DesktopPageToolbar>
  <div className="gemini-promo-grid"><div className="gemini-promo-column">
   <PromotionCluePool zh={zh} start={brief.start} end={brief.end} selected={selectedSources} disabled={blocked} onUse={useNearbySource}/>
   <PromotionPlanPanel studio zh={zh} brief={brief} plan={plan} onPlan={updatePlan} onPeriod={(start,end)=>setBrief(value=>{const next={...value,start,end};return {...next,sourceIds:matchingSources(stored.state.sources,next).map(source=>source.id).slice(0,1)}})} disabled={blocked}/>
   <details className="gemini-promo-holidays"><summary>{t("Holiday reference","节假日安排参考")}</summary><OfficialHolidayContext zh={zh} start={brief.start} end={brief.end}/></details>
  </div><div className="gemini-promo-column gemini-promo-right">
   <section className="gemini-promo-card gemini-promo-editor" id="promotion-opportunity" aria-busy={generating}>
    <header className="gemini-promo-editor-heading"><div><h2 id="promotion-copy-heading" tabIndex={-1}>{t("Promotion copy editor","推广文案生成与实时编辑")}</h2><p>{t("Active clue: ","当前绑定线索：")}{mode==='library'?t("Copy library","固定文案库"):selectedSource?.title??(draft?.brief.sourceIds.length&&!dirty?t("Saved draft sources","已保存草稿中的原始资料"):t("Property details and selected stay dates","本店资料与所选入住期"))}</p></div><span className={`gemini-promo-status ${draft&&!dirty?'saved':''}`}>{generating?t("Generating","正在生成"):draft?dirty?t("Unsaved changes","未保存修改"):t("Saved","已保存"):t("Ready to draft","待生成")}</span></header>
    <SegmentedControl className="gemini-promo-modes" label={t("Writing mode","文案方式")} value={mode} onChange={switchMode} disabled={blocked} options={[{id:'template',label:modeLabel('template')},{id:'live',label:modeLabel('live')}]}/>
    <p className="gemini-promo-mode-note">{mode==='template'?t("Draft from your property, stay dates and selected clue. No AI request is needed.","把本店资料、入住期与所选线索整理成小住邀请，无需调用 AI。"):mode==='live'?t("AI develops a creative opening from the same facts when you choose Generate.","点击生成后，AI 会围绕同一组真实资料创作开场与表达。"):t("Library wording is a starting point. Replace it with your actual property details before use.","固定文案仅供表达参考，使用前请替换为本店真实信息。")}{selectedSource&&<button type="button" disabled={blocked} className="gemini-promo-link" onClick={()=>setBrief(value=>({...value,sourceIds:[]}))}>{t("Clear clue","取消线索")}</button>}</p>
    {draft?.kind==='action'?<DecisionAdvice content={draft.content} zh={zh} label={t('Saved operating suggestion','已收藏经营建议')}/>:<><label className="gemini-promo-sr" htmlFor="workspace-promotion-copy">{t("Review and edit your promotion draft","推广草稿，核对并编辑")}</label><textarea id="workspace-promotion-copy" ref={editor} className="gemini-promo-editor-area" value={draft?.content??''} readOnly={!draft} disabled={busy} maxLength={4000} placeholder={t("Choose a clue on the left, or start with your property details. Generate a draft, then edit it here.","从左侧选一条线索，或直接从本店特色开始。生成后，即可在这里继续编辑小住邀请。")} onChange={event=>{if(draft){setDraft({...draft,content:event.target.value});setDirty(true);setNotice('')}}}/></>}
    {staleDraft&&<p role="status" className="gemini-promo-feedback">{t("Your draft is kept. Dates or clues changed; regenerate before saving.","当前草稿已保留。入住期或线索已有调整，请重新生成后再保存。")}</p>}
    <div className="gemini-promo-editor-meta"><small>{draft?`${draft.content.length} / 4000`:t("A draft will appear here","生成后可编辑、保存或复制")}</small><button type="button" className="gemini-promo-link" disabled={blocked} onClick={()=>switchMode(mode==='library'?'template':'library')}>{mode==='library'?t("Back to property copy","返回本店资料生成"):t("Browse copy library","固定文案库")}</button></div>
    <div className="gemini-promo-actions"><div><button type="button" className="gemini-promo-button violet" disabled={blocked||!draft||draft.kind==='action'||!draft.content.trim()||staleDraft} onClick={()=>void saveDraft()}><Save size={14}/>{t("Save draft","保存草稿")}</button><button type="button" className="gemini-promo-button dark" disabled={!draft?.content.trim()} onClick={()=>void copyDraft()}><Copy size={14}/>{t("Copy text","复制全文")}</button></div><button type="button" className="gemini-promo-button" disabled={blocked||mode!=='library'&&!plan} onClick={()=>void generate()}><RefreshCw size={14}/>{generating?t("Generating…","正在生成…"):draft?t("Regenerate","重新生成文案"):t("Generate copy","生成推广文案")}</button></div>
    {offerFactual&&<p className="gemini-promo-feedback" role="status">{t("AI writing is temporarily unavailable. Your current draft is kept.","AI 创意生成暂不可用，当前草稿已保留。")} <button type="button" className="gemini-promo-link" disabled={blocked} onClick={()=>switchMode('template')}>{t("Use property facts","改用本店资料生成")}</button></p>}
    {draft?.basis.length? <details className="gemini-promo-basis"><summary>{t("Sources used in this draft","本稿采用的资料")}</summary><ul>{draft.basis.map((item,index)=><li key={index}>{item.url?<a href={item.url} target="_blank" rel="noopener noreferrer">{item.label} ↗</a>:item.label}<p>{item.text}</p></li>)}</ul></details>:null}
    <div aria-live="polite">{notice&&<p role="status" className="gemini-promo-feedback">{notice}</p>}</div>{error&&<div role="alert" className="gemini-promo-feedback"><p>{error}</p>{conflict&&<button type="button" className="gemini-promo-link" disabled={busy} onClick={()=>void load()}>{t("Load latest, keep editor text","读取最新保存版本，保留当前文字")}</button>}</div>}
   </section>
   <section className="gemini-promo-card gemini-promo-saved"><header><h2>{t("Saved drafts","已保存草稿")}</h2><p>{t("Keep useful wording for your next stay invitation.","留住合适的表达，下次推广可以接着写。")}</p></header>{loading?<p role="status">{t("Loading drafts and clues…","正在读取草稿与线索…")}</p>:loadError?<div role="alert"><p>{t("Your saved drafts could not be loaded.","暂时无法读取已保存的草稿。")}</p><button type="button" className="gemini-promo-link" onClick={()=>void load()}>{t("Retry","重新读取")}</button></div>:!stored.state.drafts.length?<p className="gemini-promo-empty">{t("Save your first draft and it will appear here.","第一份小住邀请保存后，会出现在这里。")}</p>:stored.state.drafts.map(item=><article key={item.id} className="gemini-promo-saved-row"><button type="button" disabled={busy} onClick={()=>openDraft(item)}><strong>{item.content.split('\n')[0]}</strong><small>{item.brief.start} — {item.brief.end} · {item.kind==='action'?t("Operating suggestion","经营建议"):modeLabel(draftMode(item))}</small></button><button type="button" className="gemini-promo-delete" disabled={blocked} aria-label={t("Delete draft","删除草稿")} onClick={async()=>{if(!window.confirm(t("Delete this saved draft?","删除这份已保存草稿吗？")))return;if(draft?.id===item.id&&!discard())return;if(await persist({...stored.state,drafts:stored.state.drafts.filter(value=>value.id!==item.id)})){if(draft?.id===item.id){setDraft(null);setDirty(false)}}}}><Trash2 size={15}/></button></article>)}</section>
  </div></div>
 </div>;
 return <div className="workspace-explore-content">




 <div className="promotion-layout-sources"><NearbyDiscovery zh={zh} start={brief.start} end={brief.end} onUseSource={useNearbySource} selectedUrls={selectedSources.map(s=>s.url)} selectedReferences={selectedSources} disabled={loading||loadError||busy||conflict}/>
 <PromotionPlanPanel zh={zh} brief={brief} plan={plan} onPlan={updatePlan} onPeriod={(start,end)=>setBrief(v=>{const next={...v,start,end};return {...next,sourceIds:matchingSources(stored.state.sources,next).map(source=>source.id)}})} disabled={loading||loadError||busy||conflict}/>
 <OfficialHolidayContext zh={zh} start={brief.start} end={brief.end}/>
 </div><div className="promotion-layout-copy"><div className="desktop-promotion-studio"><section className="native-card promotion-brief" id="promotion-opportunity"><h2 id="promotion-copy-heading" tabIndex={-1}>{t("Promotion copy","推广文案")}</h2><SegmentedControl className="promotion-versions" label={t("Copy mode","文案方式")} value={mode} onChange={switchMode}
  disabled={loading||loadError||busy||conflict} options={[{id:"template",label:modeLabel("template")},{id:"live",label:modeLabel("live")}]}/><details open={settingsOpen} onToggle={e=>setSettingsOpen(e.currentTarget.open)} className="promotion-settings"><summary>{t("Stay dates","入住日期")}</summary><fieldset disabled={loading||loadError||busy||conflict}><div className="promotion-fields"><label>{t("Stay from","入住开始日期")}<input type="date" value={brief.start} onChange={e=>changeDate("start",e.target.value)}/></label><label>{t("Stay through","入住结束日期")}<input type="date" value={brief.end} onChange={e=>changeDate("end",e.target.value)}/></label></div>
 </fieldset></details>
 {mode!=="library"&&<fieldset disabled={loading||loadError||busy||conflict} className="promotion-source-options">
  <legend>{t("Copy evidence","文案证据")}</legend>
  {selectedSource?<>
   <p>{selectedSource.title}</p>
   <button type="button" className="inventory-text" onClick={()=>setBrief(previous=>({...previous,sourceIds:[]}))}>{t("Clear selection","取消选用")}</button>
  </>:<p>{t("Choose an activity or forecast above, or use your property details.","可从上方选择一条活动或天气，也可直接用民宿资料生成。")}</p>}
 </fieldset>}
 <div className="promotion-actions"><button className="native-primary" type="button" onClick={()=>void generate()} disabled={loading||loadError||busy||conflict||mode!=="library"&&!plan}>
  {generating?t("Generating…","正在生成…"):mode==="library"?t("Use a library template","选用固定文案"):t("Generate copy","生成文案")}<ArrowRight size={16}/>
 </button></div>
 <button type="button" className="inventory-text" disabled={blocked} onClick={()=>switchMode(mode==='library'?'template':'library')}>{mode==='library'?t("Back to property copy","返回本店资料生成"):t("Browse copy library","固定文案库")}</button>
 {mode==="live"&&offerFactual&&<p role="status">{t("AI generation is temporarily unavailable.","暂时无法使用 AI 生成。")} <button type="button" className="inventory-text" disabled={busy||conflict} onClick={()=>void generate(true)}>{t("Draft from selected facts","按现有资料整理")}</button></p>}
 </section>
 {desktop&&!draft&&<div className="desktop-copy-empty"><textarea readOnly aria-label={t("Promotion draft","推广草稿")} placeholder={t("Choose a template or a local clue to start your draft.","选用模板或左侧线索，生成后在这里编辑文案。")}/></div>}
 {draft&&<section className="native-card promotion-editor"><div className="native-section-head"><h2>{draft.kind==="action"?t("Saved operating suggestion","已收藏经营建议"):t("Your draft","推广草稿")}</h2><small>{draft.engine==="library_v1"?t("From the copy library","文案库"):draft.engine==="model_v1"?t("AI-written from your facts","AI 根据资料智能生成"):t("Factual template","资料模板")}</small></div><p className="promotion-muted">{draft.brief.start} — {draft.brief.end} · {draft.brief.language==="zh"?"中文":"English"}</p>{draft.kind==="action"?<DecisionAdvice content={draft.content} zh={zh} label={t('Saved operating suggestion','已收藏经营建议')}/>:<><label htmlFor="workspace-promotion-copy">{t("Review and edit","核对并编辑")}</label><textarea ref={editor} id="workspace-promotion-copy" value={draft.content} maxLength={4000} rows={12} disabled={busy} onChange={e=>{setDraft({...draft,content:e.target.value});setDirty(true);setNotice("")}}/><small className="promotion-muted">{draft.brief.channel==="wechat"?t("Invite guests to send their dates. Check availability and offers before posting.","小提示：结尾请客人私信入住日期；发布余房或折扣前，先核对当天情况。"):t("Pair with a real photo and three to five relevant tags, including your city.","小提示：标题可带真实地名，封面用一张竖版实拍；余房、折扣和住客引语请按实际情况填写。")}</small></>}{draft.basis.length>0&&<details className="promotion-settings">
  <summary>{t("Sources used in this draft","本稿采用的资料")}</summary>
  <ul>{draft.basis.map((item,index)=><li key={index}>{item.url?<a href={item.url} target="_blank" rel="noopener noreferrer">{item.label} ↗</a>:item.label}<p style={{whiteSpace:"pre-line"}}>{item.text}</p></li>)}</ul>
 </details>}<small>{draft.content.length} / 4000 · {dirty?t("Unsaved changes","尚未保存"):t("Saved","已保存")}</small><div className="promotion-actions">{draft.kind!=="action"&&<button type="button" className="native-primary" disabled={busy||conflict||!draft.content.trim()} onClick={()=>void saveDraft()}>{t("Save copy","保存文案")}</button>}<button type="button" className="inventory-text" disabled={!draft.content.trim()} onClick={async()=>{try{await navigator.clipboard.writeText(draft.content);setNotice(t("Copied. Review it before publishing on your chosen channel.","已复制，前往对应渠道发布前请再次核对。"))}catch{editor.current?.focus();editor.current?.select();setNotice(t("Select the text and copy it manually.","请选中文字后手动复制。"))}}}><Copy size={15}/>{t("Copy","复制")}</button>{draft.kind!=="action"&&draftTitle&&<button type="button" className="inventory-text" disabled={busy} onClick={async()=>{try{await navigator.clipboard.writeText(draftTitle);setNotice(t("Title copied.","标题已复制。"))}catch{setNotice(t("Copy failed; select the title manually.","复制失败，请手动选中标题复制。"))}}}><Copy size={15}/>{t("Copy title","复制标题")}</button>}</div></section>}
 <div aria-live="polite">{notice&&<p role="status">{notice}</p>}</div>{error&&<div role="alert"><p>{error}</p>{conflict&&<button type="button" className="inventory-text" disabled={busy} onClick={()=>void load()}>{t("Load latest saved version (keep editor text)","读取最新保存版本（保留编辑文字）")}</button>}</div>}

 </div><section className="native-card promotion-library"><h2>{t("Saved drafts","已保存草稿")}</h2>{loading?<p role="status">{t("Loading your drafts and sources…","正在读取草稿与线索…")}</p>:loadError?<div role="alert"><p>{t("Your saved drafts and sources could not be loaded.","暂时无法读取已保存的草稿和线索。")}</p><button type="button" className="inventory-text" onClick={()=>void load()}>{t("Retry","重试")}</button></div>:!stored.state.drafts.length?<p>{t("Your saved drafts will appear here, ready to reuse.","保存后的草稿会出现在这里，方便下次继续使用。")}</p>:stored.state.drafts.map(d=><article className="promotion-list-row" key={d.id}><button type="button" className="promotion-draft-open" disabled={busy} onClick={()=>{if(discard()){setDraft(structuredClone(d));setMode(draftMode(d));setVersions(v=>({...v,[mode]:undefined,[draftMode(d)]:undefined}));setBrief({...d.brief,sourceIds:[]});setPlan(null);setDirty(false);setNotice("");setTimeout(()=>editor.current?.focus(),0)}}}><strong>{d.content.split("\n")[0]}</strong><small>{d.brief.start} — {d.brief.end} · {d.kind==="action"?t("Operating plan","经营方案"):modeLabel(draftMode(d))}</small></button><button type="button" className="inventory-text" disabled={loading||loadError||busy||conflict} aria-label={t("Delete draft","删除草稿")} onClick={async()=>{if(!window.confirm(t("Delete this saved draft?","删除这份已保存草稿吗？")))return;if(draft?.id===d.id&&!discard())return;if(await persist({...stored.state,drafts:stored.state.drafts.filter(v=>v.id!==d.id)})){if(draft?.id===d.id){setDraft(null);setDirty(false)}}}}><Trash2 size={16}/></button></article>)}</section>
 </div></div>;
}
