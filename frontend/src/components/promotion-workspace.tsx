"use client";
import {UnsavedPromotionNavigation} from "./unsaved-promotion-navigation";
import {readLocalPromotion,saveLocalPromotion,type LocalPromotion} from '@/lib/promotion-local-draft';
import {OperationStatus,useOperation} from "./operation-status";
import {startOperation,updateOperation,retainOperationInput,retainedOperationInput,operationActive,subscribeOperations,readOperation} from "@/lib/operation-state";
import {promotionRequest} from "@/lib/promotion-request";
import {GuidedDemoContext,useDesktopSurface} from "./desktop-surface";
import {useCallback,useContext,useEffect,useEffectEvent,useRef,useState,useSyncExternalStore} from "react";
import {useSearchParams} from "next/navigation";
import {demoPromotionDraft} from '@/lib/demo-promotion-copy';
import {drawPromotionCopy} from "@/lib/promotion-library";
import {DecisionAdvice} from "./decision-advice";
import {ArrowRight,Copy,Trash2,Save,RefreshCw} from "lucide-react";
import {emptyPromotion,matchingSources,sourceMatchesLocation,validBrief,validPromotion,type PromotionBrief,type PromotionDraft,type PromotionState} from "@/lib/promotion";
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
type Stored={state:PromotionState;revision:string|null;location?:string};
type CopyMode="template"|"live"|"library";
const draftMode=(draft:PromotionDraft):CopyMode=>draft.engine==="library_v1"?"library":draft.engine==="model_v1"?"live":"template";
const subscribeReady=()=>()=>{};
export function PromotionWorkspace(props:{zh:boolean;demo?:boolean}){
 const ready=useSyncExternalStore(subscribeReady,()=>true,()=>false);
 return ready?<PromotionEditor {...props}/>:<p role="status">{props.zh?'正在读取本机草稿…':'Loading local draft…'}</p>;
}
function PromotionEditor({zh,demo=false}:{zh:boolean;demo?:boolean}){
 const desktop=useDesktopSurface();const guidedDemo=useContext(GuidedDemoContext);
 const {scope:operationScope,state:operation}=useOperation('promotion');
 const [retained]=useState(()=>retainedOperationInput<LocalPromotion>(operationScope,'promotion')??readLocalPromotion(operationScope));
 const [localBackup,setLocalBackup]=useState<boolean|null>(null);
 const params=useSearchParams();
 const t=useCallback((en:string,cn:string)=>zh?cn:en,[zh]);
 const modeLabel=(mode:CopyMode)=>mode==="library"?t("Copy library","固定文案库"):t("Promotion copy","推广文案");
 const [decisionVersion,setDecisionVersion]=useState(0);
 useEffect(()=>{const refresh=()=>setDecisionVersion(v=>v+1);window.addEventListener("staycraft-decisions-changed",refresh);return()=>window.removeEventListener("staycraft-decisions-changed",refresh)},[]);
 const [stored,setStored]=useState<Stored>({state:emptyPromotion(),revision:null}),[loading,setLoading]=useState(true),[loadError,setLoadError]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState(""),[conflict,setConflict]=useState(false);
 const [brief,setBrief]=useState<PromotionBrief>(()=>retained?.brief??initialBrief(zh,params.get("start"),params.get("end"),demo)),[draft,setDraft]=useState<PromotionDraft|null>(retained?.draft??null),[dirty,setDirty]=useState(retained?.dirty??false);
 const [generating,setGenerating]=useState(false);
 const [offerFactual,setOfferFactual]=useState(false);
 const generationRequest=useRef<AbortController|null>(null);
 const [savedPlan,setPlan]=useState<PromotionPlan|null>(retained?.savedPlan??null);
 const [planEvidence,setPlanEvidence]=useState(retained?.planEvidence??"");
 // null permits the initial diagnosis link; user-selected draft/date context wins thereafter.
 const [userContext,setUserContext]=useState<{diagnosis?:PromotionPlan['diagnosis']}|null>(retained?.userContext??null);
 const location=stored.location??'';
 const evidenceKey=JSON.stringify([brief.start,brief.end,brief.sourceIds,location]);
 const plan=planEvidence===evidenceKey?savedPlan:null;
 const [mode,setMode]=useState<CopyMode>(retained?.mode??"template");
 const [versions,setVersions]=useState<Partial<Record<CopyMode,{draft:PromotionDraft;dirty:boolean}>>>(retained?.versions??{});
 useEffect(()=>{const value={brief,draft,dirty,mode,versions,savedPlan,planEvidence,userContext};retainOperationInput(operationScope,'promotion',value);const saved=saveLocalPromotion(operationScope,value);queueMicrotask(()=>setLocalBackup(saved))},[operationScope,brief,draft,dirty,mode,versions,savedPlan,planEvidence,userContext]);
 const restoreFinished=useEffectEvent(()=>{const saved=retainedOperationInput<{draft:PromotionDraft|null;dirty:boolean;mode:CopyMode}>(operationScope,'promotion');if(saved?.draft&&saved.draft.id!==draft?.id){setDraft(saved.draft);setDirty(saved.dirty);setMode(saved.mode)}});
 useEffect(()=>subscribeOperations(()=>{if(readOperation(operationScope,'promotion')?.phase==='complete')restoreFinished()}),[operationScope]);
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
 const editor=useRef<HTMLTextAreaElement>(null),alive=useRef(true),scopeVersion=useRef(0);
 useEffect(()=>{const refresh=()=>{scopeVersion.current++;setBrief(value=>({...value,sourceIds:[]}));setPlan(null);setUserContext({});setLoading(true);setDecisionVersion(value=>value+1)};window.addEventListener('staycraft-profile-changed',refresh);return()=>window.removeEventListener('staycraft-profile-changed',refresh)},[]);
 function focusEditor(){requestAnimationFrame(()=>{const field=editor.current;if(field){field.scrollIntoView({block:"center"});field.focus({preventScroll:true});field.setSelectionRange(0,0);field.scrollTop=0}})}
 useEffect(()=>{alive.current=true;return()=>{alive.current=false}},[]);
 const hasUnsaved=dirty||Object.values(versions).some(version=>version?.dirty);
 async function load(){setLoading(true);setLoadError(false);try{const next=await promotionRequest("/api/workspace/promotion",{cache:"no-store"}) as Stored;if(!validPromotion(next.state))throw new Error();if(alive.current){setStored(next);setConflict(false)}}catch{if(alive.current)setLoadError(true)}finally{if(alive.current)setLoading(false)}}
 useEffect(()=>{const controller=new AbortController();promotionRequest("/api/workspace/promotion",{cache:"no-store",signal:controller.signal}).then(next=>{if(!validPromotion(next.state))throw new Error();if(!controller.signal.aborted){setStored(next);setLoading(false);setLoadError(false)}}).catch(()=>{if(!controller.signal.aborted){setLoadError(true);setLoading(false)}});return()=>controller.abort()},[decisionVersion]);
 const message=(code:string,language=zh)=>{const t=(en:string,cn:string)=>language?cn:en;return code==='promotion_rate_limited'?t('The AI service is rate limited. This request failed; try later or use property facts.','AI 服务限流，本次生成未完成。可稍后重试或改用资料生成。'):code==='promotion_invalid_copy'?t('The AI response did not pass validation. Your clue and text are kept.','AI 返回内容未通过校验，线索和已有文案已保留。'):code==='promotion_timeout'?t('The request timed out. Your text is kept; retry or use property facts.','请求等待超时，当前文字已保留。可以重试，或改用本店资料生成。'):code==='promotion_location_changed'?t('The property address changed. Reload local clues before selecting one.','民宿地址已变化，请重新读取当地活动后选用。'):code==="promotion_model_unavailable"?t("AI writing is unavailable. You can still draft from your property facts.","暂时无法使用 AI 创意生成，仍可根据本店资料整理文案。"):code==="promotion_changed"?t("The saved workspace changed elsewhere. Your text is kept. Load the latest version, then save again.","其他页面修改了已保存内容，当前文字已保留。读取最新版本后再保存。") :code==="promotion_setup_required"?t("Add your property location and an active room first.","请先完善民宿位置并添加启用客房。") :code==="promotion_source_required"?t("Select at least one saved source that covers these dates.","请选择适用于本次日期的已保存线索。") :code==="promotion_diagnosis_unavailable"?t("Availability has changed. Refresh the workbench opportunity before drafting.","这段日期的房量已有变化，请更新工作台机会后再生成。"):code==="promotion_too_long"?t("Select fewer sources to keep the draft within 4,000 characters.","请选择更少线索，保持文案在 4000 字以内。") :t("Could not complete this action. Your current text is kept; try again.","操作未完成，当前文字已保留，请重试。");};
 async function persist(next:PromotionState){
  const scope=scopeVersion.current;
  if(!validPromotion(next)){setError(t("Check the text lengths and date ranges. Keep at most 20 drafts and 12 sources.","请核对文字长度与日期范围，最多保存 20 份草稿、12 条线索。"));return false}
  setBusy(true);setError("");setNotice("");
  try{const data=await promotionRequest("/api/workspace/promotion",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({state:next,revision:stored.revision})});if(scope!==scopeVersion.current)return false;setStored(data);return true}catch(e){if(e instanceof Error&&e.message==='promotion_changed')setConflict(true);setError(message(e instanceof Error?e.message:""));return false}finally{setBusy(false)}
 }
 async function useNearbySource(reference:{title:string;url:string;summary:string;start?:string;end?:string;location?:string}){
  const existing=stored.state.sources.find(s=>sourceMatchesLocation(s,location)&&s.url===reference.url&&s.title===reference.title&&s.start<=brief.end&&s.end>=brief.start);
  if(loading||loadError)return;
  if(!reference.location||!sourceMatchesLocation(reference,location)){setError(message('promotion_location_changed'));return;}
  const source={...reference,id:existing?.id??crypto.randomUUID(),start:reference.start??brief.start,end:reference.end??brief.end,checkedOn:workspaceDay(demo)};
  if((!existing||existing.summary!==source.summary||existing.start!==source.start||existing.end!==source.end)&&
    !await persist({...stored.state,sources:[source,...stored.state.sources.filter(item=>item.id!==source.id)].slice(0,12)}))return;
  chooseSource(source.id);
 }
 function chooseSource(id:string){
  setBrief(previous=>({...previous,sourceIds:[id]}));
  setNotice(t("Clue selected. Click Generate copy when the audience is ready.","已选用线索，客群准备完成后点击「生成推广文案」。"));setError("");
  if(mode==="library")switchMode("template");
  requestAnimationFrame(()=>{
   const heading=document.getElementById("promotion-copy-heading");
   heading?.scrollIntoView({block:"start"});
   heading?.focus({preventScroll:true});
  });
 }
 const discard=()=>!dirty||window.confirm(t("Discard unsaved draft changes?","放弃当前未保存的草稿修改吗？"));
 function changeDate(key:"start"|"end",value:string){setUserContext({});setPlan(null);setBrief(previous=>{const next={...previous,[key]:value};return {...next,sourceIds:matchingSources(stored.state.sources,next,location).map(s=>s.id).slice(0,1)}})}
 const draws=useRef<Record<string,number[]>>({});
 const drawnText=useRef<Partial<Record<CopyMode,{id:string;text:string}>>>({});
 async function generate(factualOnly=false){
  if(loading||loadError||busy||conflict||operationActive(operation))return;
  if(!guidedDemo&&!factualOnly&&operation?.phase==='uncertain'&&!window.confirm(t("The previous AI result is unconfirmed. Start a new paid request?","上次 AI 结果尚未确认，确定重新发起可能收费的请求吗？")))return;
  if(mode!=="library"&&brief.sourceIds.length>1){
   setError(t("Choose one source for the new draft.","请选择一条线索生成新文案。"));
   return;
  }
  if(!validBrief({...brief,language:zh?"zh":"en"})){setError(t("Choose a valid date range of 1–366 days.","请选择有效的 1–366 天日期范围。"));return}
  const currentPlan=mode!=="library"&&plan&&validPromotionPlan(plan)&&plan.start===brief.start&&plan.end===brief.end?plan:null;
  if(!guidedDemo&&mode!=="library"&&!currentPlan){setError(t("Wait for the audience and angle, or complete the property details first.","请先等客群与切入角度准备完成；若资料不完整，可先补充本店信息。"));return}
  const previous=drawnText.current[mode];
  if(dirty&&(!previous||previous.id!==draft?.id||previous.text!==draft.content)&&!discard())return;
  const current={...brief,channel:"wechat" as const,goal:"rooms" as const,sourceIds:mode!=="library"?brief.sourceIds:[],language:zh?'zh' as const:'en' as const};
  if(guidedDemo&&mode!=="library"){
   const source=matchingSources(stored.state.sources,current,location).find(item=>current.sourceIds.includes(item.id));
   const next=demoPromotionDraft(current,source);
   const op=startOperation(operationScope,'promotion',{phase:'running',stage:'正在生成文案',stageEn:'Preparing copy',detail:'正在整理所选线索。',detailEn:'Preparing the selected clue.'});
   drawnText.current[mode]={id:next.id,text:next.content};
   const saved=retainedOperationInput<Record<string,unknown>>(operationScope,'promotion')||{};retainOperationInput(operationScope,'promotion',{...saved,draft:next,dirty:true,mode});
   setDraft(next);setDirty(true);setError('');setNotice('');setOfferFactual(false);
   updateOperation(operationScope,'promotion',op,{phase:'complete',stage:'文案已生成',stageEn:'Copy ready',detail:'结果已放入编辑区，尚未保存或发布。',detailEn:'The result is in the editor. It has not been saved or published.'});
   focusEditor();return;
  }
  if(mode!=="library"){
   setBusy(true);setGenerating(true);setError("");setNotice("");setOfferFactual(false);
   const controller=new AbortController();generationRequest.current=controller;
   const requestId=crypto.randomUUID();const op=startOperation(operationScope,'promotion',{phase:'running',stage:factualOnly?'正在整理资料文案':'正在生成 AI 文案',stageEn:factualOnly?'Preparing factual copy':'Generating AI copy',detail:'所选线索和已有文案已保留。关闭页面后可返回核对本次结果。',detailEn:'Clue and existing text are kept. Return here to check this result.',reference:requestId});
   try{
    const scope=scopeVersion.current;
    const result=await promotionRequest("/api/workspace/promotion/generate",{
     method:"POST",signal:controller.signal,headers:{"Content-Type":"application/json"},
     body:JSON.stringify({...current,requestId,...(factualOnly?{factualOnly:true}:{}),...(currentPlan?{plan:currentPlan}:{})})
    },factualOnly?30000:75000);
    if(controller.signal.aborted||scope!==scopeVersion.current)return;
    const engine=result.draft?.engine;
    const expected=factualOnly?engine==="rules_v1":engine==="model_v1"||engine==="rules_v1";
    if(!expected||!validPromotion({sources:[],drafts:[result.draft]}))throw Error("invalid_promotion");
    const generatedMode='live';
    drawnText.current[generatedMode]={id:result.draft.id,text:result.draft.content};
    const saved=retainedOperationInput<Record<string,unknown>>(operationScope,'promotion')||{};retainOperationInput(operationScope,'promotion',{...saved,draft:result.draft,dirty:true,mode:generatedMode});
    updateOperation(operationScope,'promotion',op,{phase:'complete',stage:'文案已生成',stageEn:'Copy ready',detail:'结果已放入编辑区，尚未保存或发布。',detailEn:'The result is in the editor. It has not been saved or published.'});
    if(!alive.current)return;
    setMode(generatedMode);setDraft(result.draft);setDirty(true);
    focusEditor();
   }catch(error){
    const code=error instanceof Error?error.message:"";
    updateOperation(operationScope,'promotion',op,{phase:controller.signal.aborted||code==='promotion_timeout'||code==='Failed to fetch'?'uncertain':'failed',stage:controller.signal.aborted||code==='promotion_timeout'||code==='Failed to fetch'?'文案结果尚未确认':'文案生成未完成',stageEn:controller.signal.aborted||code==='promotion_timeout'||code==='Failed to fetch'?'Result not confirmed':'Generation failed',detail:message(code,true),detailEn:message(code,false)});
    if(!alive.current)return;
    if(controller.signal.aborted)setNotice(t("Stopped waiting. The server may still be generating; your text is kept.","已停止等待，服务端可能仍在生成；当前文字已保留。"));
    else{setError(message(code));if(!factualOnly)setOfferFactual(true);}
   }finally{if(generationRequest.current===controller)generationRequest.current=null;if(alive.current){setBusy(false);setGenerating(false);}}
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
 async function checkGeneration(){
  if(!operation?.reference)return;
  try{const receipt=await promotionRequest('/api/workspace/promotion/generate?requestId='+encodeURIComponent(operation.reference),{cache:'no-store'});
   if(receipt.state==='complete'&&validPromotion({sources:[],drafts:[receipt.value?.draft]})){setDraft(receipt.value.draft);setDirty(true);setMode(draftMode(receipt.value.draft));updateOperation(operationScope,'promotion',operation.id,{phase:'complete',stage:'已找回本次文案',stageEn:'Draft recovered',detail:'复用了本次已生成结果，没有再次调用 AI。',detailEn:'Recovered the existing result without another AI call.'});focusEditor();}
   else if(receipt.state==='failed'){const detail=receipt.error==='generation_failed'?'已确认本次生成失败，未返回文案；线索和已有内容已保留。':message(receipt.error,true);const detailEn=receipt.error==='generation_failed'?'This request failed; no draft was returned. Your clue and text are kept.':message(receipt.error,false);updateOperation(operationScope,'promotion',operation.id,{phase:'failed',stage:'文案生成未完成',stageEn:'Generation failed',detail,detailEn});}else updateOperation(operationScope,'promotion',operation.id,{phase:'uncertain',detail:receipt.state==='running'?'本次请求仍在处理，稍后再次核对。':'暂时无法确认本次结果。可以免费改用资料生成；重新调用 AI 前请明确确认。',detailEn:receipt.state==='running'?'This request is still running. Check again shortly.':'The result is not confirmed. Use factual copy, or explicitly confirm a new AI request.'});
  }catch{updateOperation(operationScope,'promotion',operation.id,{phase:'uncertain',detail:'核对失败，线索和已有文案仍保留。',detailEn:'Could not check. Clue and existing text remain.'});}
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
   const savedOperation=readOperation(operationScope,'promotion');
   if(savedOperation?.phase==='complete')updateOperation(operationScope,'promotion',savedOperation.id,{phase:'complete',stage:'文案已保存',stageEn:'Copy saved',detail:'已保存到当前账号，未发布。',detailEn:'Saved to your account. Not published.'});
   window.dispatchEvent(new Event("staycraft-promotion-saved"));
  }
 }
 const applyDiagnosisPeriod=useCallback((start:string,end:string)=>setBrief(previous=>{
  if(previous.start===start&&previous.end===end)return previous;
  const next={...previous,start,end};
  return {...next,sourceIds:matchingSources(stored.state.sources,next,location).map(source=>source.id).slice(0,1)};
 }),[stored.state.sources,location]);
 const selectedSources=matchingSources(stored.state.sources,brief,location);
 const selectedSource=selectedSources[0];
 const draftContent=draft?.content??"";
 const draftTitle=(draftContent.split("\n").find(line=>line.trim())||"").trim();
 const blocked=loading||loadError||busy||conflict||operationActive(operation);
 const staleDraft=!!draft&&(draft.brief.start!==brief.start||draft.brief.end!==brief.end||mode!=="library"&&brief.sourceIds.length>0&&JSON.stringify(draft.brief.sourceIds)!==JSON.stringify(brief.sourceIds));
 async function copyDraft(){if(!draft)return;try{await navigator.clipboard.writeText(draft.content);setNotice(t("Copied. Review before publishing.","全文已复制，发布前请再核对房态与价格。"))}catch{editor.current?.focus();editor.current?.select();setNotice(t("Select the text and copy it manually.","请选中文字后手动复制。"))}}
 function openDraft(item:PromotionDraft){
  const nextMode=draftMode(item);
  if(!discard()||nextMode!==mode&&versions[nextMode]?.dirty&&!window.confirm(t("Replace the unsaved draft in that writing mode?","该文案方式还有一份未保存草稿，确定打开已保存内容替换它吗？")))return;
  const sources=matchingSources(stored.state.sources,item.brief,location).map(source=>source.id).slice(0,1);
  setUserContext({diagnosis:item.plan?.diagnosis});
  setDraft(structuredClone(item));setMode(nextMode);setVersions(v=>({...v,[mode]:undefined,[nextMode]:undefined}));setBrief({...item.brief,sourceIds:sources});setPlan(sources.length===item.brief.sourceIds.length?item.plan??null:null);setPlanEvidence(JSON.stringify([item.brief.start,item.brief.end,sources,location]));setDirty(false);setNotice("");setError("");focusEditor();
 }
 if(desktop)return <div className="gemini-promotion"><UnsavedPromotionNavigation dirty={hasUnsaved} zh={zh}/>
  <DesktopPageToolbar><details className="gemini-promo-period" open={settingsOpen} onToggle={event=>setSettingsOpen(event.currentTarget.open)}><summary>{t("Target stay dates","推广入住期")}：{brief.start} — {brief.end}</summary><fieldset disabled={blocked}><label>{t("Stay from","入住开始日期")}<input type="date" value={brief.start} onChange={event=>changeDate('start',event.target.value)}/></label><label>{t("Stay through","入住结束日期")}<input type="date" value={brief.end} onChange={event=>changeDate('end',event.target.value)}/></label></fieldset></details></DesktopPageToolbar>
  <div className="gemini-promo-grid"><div className="gemini-promo-column">
   <PromotionCluePool zh={zh} start={brief.start} end={brief.end} selected={selectedSources} disabled={blocked} onUse={useNearbySource}/>
   <PromotionPlanPanel studio zh={zh} brief={brief} plan={plan} onPlan={updatePlan} onPeriod={applyDiagnosisPeriod} context={userContext} onGeneral={()=>setUserContext({})} disabled={blocked}/>
   <details className="gemini-promo-holidays"><summary>{t("Holiday reference","节假日安排参考")}</summary><OfficialHolidayContext zh={zh} start={brief.start} end={brief.end}/></details>
  </div><div className="gemini-promo-column gemini-promo-right">
   <section className="gemini-promo-card gemini-promo-editor" id="promotion-opportunity" aria-busy={generating}>
    <header className="gemini-promo-editor-heading"><div><h2 id="promotion-copy-heading" tabIndex={-1}>{t("Promotion copy editor","推广文案生成与实时编辑")}</h2><p>{t("Active clue: ","当前绑定线索：")}{mode==='library'?t("Copy library","固定文案库"):selectedSource?.title??(draft?.brief.sourceIds.length&&!dirty?t("Saved draft sources","已保存草稿中的原始资料"):t("Property details and selected stay dates","本店资料与所选入住期"))}</p></div><span className={`gemini-promo-status ${draft&&!dirty?'saved':''}`}>{generating?t("Generating","正在生成"):draft?dirty?t("Unsaved changes","未保存修改"):t("Saved","已保存"):t("Ready to draft","待生成")}</span></header>

    <p className="gemini-promo-mode-note">{t('Create a stay invitation using your property details and the selected clue.','结合本店资料与所选线索，生成完整的小住邀请。')}{selectedSource&&<button type="button" disabled={blocked} className="gemini-promo-link" onClick={()=>setBrief(value=>({...value,sourceIds:[]}))}>{t("Clear clue","取消线索")}</button>}</p>
    {draft?.kind==='action'?<DecisionAdvice content={draft.content} zh={zh} label={t('Saved operating suggestion','已收藏经营建议')}/>:<><label className="gemini-promo-sr" htmlFor="workspace-promotion-copy">{t("Review and edit your promotion draft","推广草稿，核对并编辑")}</label><textarea id="workspace-promotion-copy" ref={editor} className="gemini-promo-editor-area" value={draft?.content??''} readOnly={!draft} disabled={busy} maxLength={4000} placeholder={t("Choose a clue on the left, or start with your property details. Generate a draft, then edit it here.","从左侧选一条线索，或直接从本店特色开始。生成后，即可在这里继续编辑小住邀请。")} onChange={event=>{if(draft){setDraft({...draft,content:event.target.value});setDirty(true);setNotice('')}}}/></>}
    {staleDraft&&<p role="status" className="gemini-promo-feedback">{t("Your draft is kept. Dates or clues changed; regenerate before saving.","当前草稿已保留。入住期或线索已有调整，请重新生成后再保存。")}</p>}
    <div className="gemini-promo-editor-meta"><small>{draft?`${draft.content.length} / 4000`:t("A draft will appear here","生成后可编辑、保存或复制")}</small><button type="button" className="gemini-promo-link" disabled={blocked} onClick={()=>switchMode(mode==='library'?'template':'library')}>{mode==='library'?t("Back to copy editor","返回文案生成"):t("Browse copy library","固定文案库")}</button></div>
    <div className="gemini-promo-actions"><div><button type="button" className="gemini-promo-button violet" disabled={blocked||!draft||draft.kind==='action'||!draft.content.trim()||staleDraft} onClick={()=>void saveDraft()}><Save size={14}/>{t("Save draft","保存草稿")}</button><button type="button" className="gemini-promo-button dark" disabled={!draft?.content.trim()} onClick={()=>void copyDraft()}><Copy size={14}/>{t("Copy text","复制全文")}</button></div><button type="button" className="gemini-promo-button" disabled={blocked||!guidedDemo&&mode!=='library'&&!plan} onClick={()=>void generate()}><RefreshCw size={14}/>{generating?t("Generating…","正在生成…"):draft?t("Regenerate","重新生成文案"):t("Generate copy","生成推广文案")}</button></div>
    <OperationStatus state={operation} zh={zh}>
     {['uncertain','failed'].includes(operation?.phase||'')&&<><button type="button" disabled={busy} onClick={()=>void checkGeneration()}>{t('Check this result','核对本次结果')}</button><button type="button" disabled={busy} onClick={()=>void generate(true)}>{t('Retry with saved facts','用现有资料重试')}</button></>}
    </OperationStatus>
    {hasUnsaved&&localBackup!==null&&<p className="gemini-promo-feedback" role="status">{localBackup?t("Draft backed up on this device; not yet saved to your account.","草稿已自动保存在本机，尚未保存到账号。"):t("Local backup failed. Keep this window open and copy or save your text.","本机备份失败，请保留窗口并复制或保存文案。")}</p>}
    {generating&&<p role="status" className="gemini-promo-feedback">{t("Preparing your draft. You can cancel this wait.","正在整理本店资料与所选线索，可以取消本次等待。")} <button type="button" className="gemini-promo-link" onClick={()=>generationRequest.current?.abort()}>{t("Cancel generation","取消本次生成")}</button></p>}
    {offerFactual&&<p className="gemini-promo-feedback" role="status">{t("AI writing is temporarily unavailable. Your current draft is kept.","AI 创意生成暂不可用，当前草稿已保留。")} <button type="button" className="gemini-promo-link" disabled={blocked} onClick={()=>void generate(true)}>{t("Draft from property facts","直接按本店资料生成")}</button></p>}
    {draft?.basis.length? <details className="gemini-promo-basis"><summary>{t("Sources used in this draft","本稿采用的资料")}</summary><ul>{draft.basis.map((item,index)=><li key={index}>{item.url?<a href={item.url} target="_blank" rel="noopener noreferrer">{item.label} ↗</a>:item.label}<p>{item.text}</p></li>)}</ul></details>:null}
    <div aria-live="polite">{notice&&<p role="status" className="gemini-promo-feedback">{notice}</p>}</div>{error&&<div role="alert" className="gemini-promo-feedback"><p>{error}</p>{conflict&&<button type="button" className="gemini-promo-link" disabled={busy} onClick={()=>void load()}>{t("Load latest, keep editor text","读取最新保存版本，保留当前文字")}</button>}</div>}
   </section>
   <section className="gemini-promo-card gemini-promo-saved"><header><h2>{t("Saved drafts","已保存草稿")}</h2><p>{t("Keep useful wording for your next stay invitation.","留住合适的表达，下次推广可以接着写。")}</p></header>{loading?<p role="status">{t("Loading drafts and clues…","正在读取草稿与线索…")}</p>:loadError?<div role="alert"><p>{t("Your saved drafts could not be loaded.","暂时无法读取已保存的草稿。")}</p><button type="button" className="gemini-promo-link" onClick={()=>void load()}>{t("Retry","重新读取")}</button></div>:!stored.state.drafts.length?<p className="gemini-promo-empty">{t("Save your first draft and it will appear here.","第一份小住邀请保存后，会出现在这里。")}</p>:stored.state.drafts.map(item=><article key={item.id} className="gemini-promo-saved-row"><button type="button" disabled={busy} onClick={()=>openDraft(item)}><strong>{item.content.split('\n')[0]}</strong><small>{item.brief.start} — {item.brief.end} · {item.kind==='action'?t("Operating suggestion","经营建议"):modeLabel(draftMode(item))}</small></button><button type="button" className="gemini-promo-delete" disabled={blocked} aria-label={t("Delete draft","删除草稿")} onClick={async()=>{if(!window.confirm(t("Delete this saved draft?","删除这份已保存草稿吗？")))return;if(draft?.id===item.id&&!discard())return;if(await persist({...stored.state,drafts:stored.state.drafts.filter(value=>value.id!==item.id)})){if(draft?.id===item.id){setDraft(null);setDirty(false)}}}}><Trash2 size={15}/></button></article>)}</section>
  </div></div>
 </div>;
 return <div className="workspace-explore-content"><UnsavedPromotionNavigation dirty={hasUnsaved} zh={zh}/>
    <OperationStatus state={operation} zh={zh}>
     {['uncertain','failed'].includes(operation?.phase||'')&&<><button type="button" disabled={busy} onClick={()=>void checkGeneration()}>{t('Check this result','核对本次结果')}</button><button type="button" disabled={busy} onClick={()=>void generate(true)}>{t('Retry with saved facts','用现有资料重试')}</button></>}
    </OperationStatus>
 {generating&&<button type="button" onClick={()=>generationRequest.current?.abort()}>{t('Stop waiting; check later','停止等待，稍后核对')}</button>}




 <div className="promotion-layout-sources"><NearbyDiscovery zh={zh} start={brief.start} end={brief.end} onUseSource={useNearbySource} selectedUrls={selectedSources.map(s=>s.url)} selectedReferences={selectedSources} disabled={blocked}/>
 <PromotionPlanPanel zh={zh} brief={brief} plan={plan} onPlan={updatePlan} onPeriod={applyDiagnosisPeriod} context={userContext} onGeneral={()=>setUserContext({})} disabled={blocked}/>
 <OfficialHolidayContext zh={zh} start={brief.start} end={brief.end}/>
 </div><div className="promotion-layout-copy"><div className="desktop-promotion-studio"><section className="native-card promotion-brief" id="promotion-opportunity"><h2 id="promotion-copy-heading" tabIndex={-1}>{t("Promotion copy","推广文案")}</h2><details open={settingsOpen} onToggle={e=>setSettingsOpen(e.currentTarget.open)} className="promotion-settings"><summary>{t("Stay dates","入住日期")}</summary><fieldset disabled={blocked}><div className="promotion-fields"><label>{t("Stay from","入住开始日期")}<input type="date" value={brief.start} onChange={e=>changeDate("start",e.target.value)}/></label><label>{t("Stay through","入住结束日期")}<input type="date" value={brief.end} onChange={e=>changeDate("end",e.target.value)}/></label></div>
 </fieldset></details>
 {mode!=="library"&&<fieldset disabled={blocked} className="promotion-source-options">
  <legend>{t("Copy evidence","文案证据")}</legend>
  {selectedSource?<>
   <p>{selectedSource.title}</p>
   <button type="button" className="inventory-text" onClick={()=>setBrief(previous=>({...previous,sourceIds:[]}))}>{t("Clear selection","取消选用")}</button>
  </>:<p>{t("Choose an activity or forecast above, or use your property details.","可从上方选择一条活动或天气，也可直接用民宿资料生成。")}</p>}
 </fieldset>}
 <div className="promotion-actions"><button className="native-primary" type="button" onClick={()=>void generate()} disabled={blocked||!guidedDemo&&mode!=="library"&&!plan}>
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

 </div><section className="native-card promotion-library"><h2>{t("Saved drafts","已保存草稿")}</h2>{loading?<p role="status">{t("Loading your drafts and sources…","正在读取草稿与线索…")}</p>:loadError?<div role="alert"><p>{t("Your saved drafts and sources could not be loaded.","暂时无法读取已保存的草稿和线索。")}</p><button type="button" className="inventory-text" onClick={()=>void load()}>{t("Retry","重试")}</button></div>:!stored.state.drafts.length?<p>{t("Your saved drafts will appear here, ready to reuse.","保存后的草稿会出现在这里，方便下次继续使用。")}</p>:stored.state.drafts.map(d=><article className="promotion-list-row" key={d.id}><button type="button" className="promotion-draft-open" disabled={busy} onClick={()=>openDraft(d)}><strong>{d.content.split("\n")[0]}</strong><small>{d.brief.start} — {d.brief.end} · {d.kind==="action"?t("Operating plan","经营方案"):modeLabel(draftMode(d))}</small></button><button type="button" className="inventory-text" disabled={blocked} aria-label={t("Delete draft","删除草稿")} onClick={async()=>{if(!window.confirm(t("Delete this saved draft?","删除这份已保存草稿吗？")))return;if(draft?.id===d.id&&!discard())return;if(await persist({...stored.state,drafts:stored.state.drafts.filter(v=>v.id!==d.id)})){if(draft?.id===d.id){setDraft(null);setDirty(false)}}}}><Trash2 size={16}/></button></article>)}</section>
 </div></div>;
}
