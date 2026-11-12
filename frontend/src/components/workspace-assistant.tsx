"use client";
import {useEffect,useId,useLayoutEffect,useRef,useState} from "react";
import Link from "next/link";
import {ChevronDown,Sparkles,X} from "lucide-react";
import {normalizedQuestion,questionTopic} from "@/lib/assistant-question";
import {decisionQuestions,decisionQuestionIds,isDecisionQuestionId,type DecisionQuestionId} from "@/lib/assistant-suggestions";
import type {Insight} from "@/lib/business-assistant";

export type AssistantAnswer={language:string;unsupported?:boolean;engine:string;fallback:boolean;items:(Insight & {source?:string;ready?:boolean})[];period_start:string;period_end:string};
type Turn={id:string;key:string;question:string;answer:AssistantAnswer};
type PendingTurn=Omit<Turn,"answer"> & {answer?:undefined};


export function WorkspaceAssistant({zh,days=7,range,analysis=false,embedded=false,onAnswer}:{
 zh:boolean;days?:7|28;range?:{start:string;end:string};analysis?:boolean;embedded?:boolean;onAnswer?:(answer:AssistantAnswer)=>void
}){
 const [open,setOpen]=useState(analysis);
 const [draft,setDraft]=useState("");
 const [turns,setTurns]=useState<Turn[]>([]);
 const [busy,setBusy]=useState(false);
 const [activeTurn,setActiveTurn]=useState<PendingTurn|null>(null);
 const [libraryOpen,setLibraryOpen]=useState(false);
 const [animateLibrary,setAnimateLibrary]=useState(false);
 const [failed,setFailed]=useState<{question:string;id?:DecisionQuestionId}|null>(null);
 const [eligible,setEligible]=useState<{key:string;ids:DecisionQuestionId[]}|null>(null);
 const [seen,setSeen]=useState<string[]>([]);
 const [animatePanel,setAnimatePanel]=useState(false);
 const [animateAnswer,setAnimateAnswer]=useState(false);
 const pending=useRef<AbortController|null>(null);
 const trigger=useRef<HTMLButtonElement>(null);
 const input=useRef<HTMLInputElement>(null);
 const latestAnswer=useRef<HTMLHeadingElement>(null);
 const transcript=useRef<HTMLDivElement>(null);
 const questionOrigin=useRef<{turnId:string;bounds:DOMRect}|null>(null);
 const panelId=useId();
 const libraryId=useId();
 const t=(en:string,cn:string)=>zh?cn:en;
 const language=zh?"zh":"en";
 const currentTurns=turns.filter(turn=>turn.answer.language===language);
 const displayedTurns=activeTurn?[...currentTurns,activeTurn]:currentTurns;
 const latestId=displayedTurns.at(-1)?.id;
 const scope=JSON.stringify({days,language,start:range?.start,end:range?.end});
 const requestKey=(question:string,id?:DecisionQuestionId)=>JSON.stringify([scope,id?"decision:"+id:questionTopic(question)??normalizedQuestion(question)]);
 const locale=zh?1:0;
 const selected=(id:DecisionQuestionId)=>{
  const key=requestKey(decisionQuestions[id].label[locale],id);
  return seen.includes(key)||activeTurn?.key===key;
 };
 const suggestions=(eligible?.key===scope?eligible.ids:[]).filter(id=>!selected(id)).slice(0,3);
 const libraryHasQuestions=decisionQuestionIds.some(id=>!selected(id));
 useEffect(()=>{
  if((!open&&!embedded)||analysis)return;
  const controller=new AbortController();
  void fetch("/api/workspace/assistant",{method:"POST",headers:{"Content-Type":"application/json"},
   body:JSON.stringify({...JSON.parse(scope),question:"",catalog:true}),signal:controller.signal})
   .then(async response=>{
    if(!response.ok)return;
    const body=await response.json();
    if(!controller.signal.aborted&&Array.isArray(body.eligible))setEligible({key:scope,ids:body.eligible.filter(isDecisionQuestionId)});
   }).catch(()=>{});
  return ()=>controller.abort();
 },[open,embedded,analysis,scope]);
 useEffect(()=>()=>pending.current?.abort(),[]);
 function revealAnswer(heading:HTMLElement|null){
  const list=transcript.current;
  if(!heading||!list)return;
  const bubble=heading.getBoundingClientRect(),viewport=list.getBoundingClientRect();
  if(bubble.top<viewport.top+8||bubble.bottom>viewport.bottom-8){
   list.scrollTop+=bubble.top-viewport.top-12;
  }
  heading.scrollIntoView({block:"nearest",inline:"nearest",behavior:"instant"});
  heading.focus({preventScroll:true});
 }
 useLayoutEffect(()=>{
  const heading=latestAnswer.current;
  if(!latestId||!heading)return;
  const origin=questionOrigin.current;
  questionOrigin.current=null;
  revealAnswer(heading);
  if(origin?.turnId!==latestId)return;
  const target=heading.getBoundingClientRect();
  if(origin.bounds.bottom<0||origin.bounds.top>window.innerHeight)return;
  const dx=origin.bounds.left-target.left;
  const dy=origin.bounds.top-target.top;
  const duration=Math.hypot(dx,dy)>320?220:180;
  const flight=document.createElement("span");
  flight.className="workspace-assistant-flight";
  flight.textContent=heading.textContent;
  flight.setAttribute("aria-hidden","true");
  Object.assign(flight.style,{left:`${target.left}px`,top:`${target.top}px`,width:`${target.width}px`});
  document.body.append(flight);
  const movement=flight.animate([
   {transform:`translate(${dx}px, ${dy}px)`,opacity:.65},
   {transform:"translate(0, 0)",opacity:1},
  ],{duration,easing:"cubic-bezier(.2,.75,.25,1)"});
  const conceal=heading.animate([{opacity:0},{opacity:0}],{duration});
  const clear=()=>{flight.remove();conceal.cancel()};
  movement.onfinish=clear;
  return ()=>{movement.cancel();clear()};
 },[latestId]);

 async function ask(question:string,origin?:HTMLElement,id?:DecisionQuestionId){
  if(!question||pending.current)return;
  id??=decisionQuestionIds.find(candidate=>decisionQuestions[candidate].label.some(label=>normalizedQuestion(label)===normalizedQuestion(question)));
  const key=requestKey(question,id);
  const existing=currentTurns.find(turn=>turn.key===key);
  if(existing&&!analysis){
   setFailed(null);
   setDraft(previous=>normalizedQuestion(previous)===normalizedQuestion(question)?"":previous);
   revealAnswer(document.getElementById(panelId+"-"+existing.id));
   return;
  }
  const controller=new AbortController();
  const turn={id:activeTurn?.key===key?activeTurn.id:crypto.randomUUID(),key,question};
  const animate=Boolean(origin&&!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  pending.current=controller;
  setBusy(true);
  setFailed(null);
  if(!analysis){
   questionOrigin.current=animate&&origin?{turnId:turn.id,bounds:origin.getBoundingClientRect()}:null;
   setAnimateAnswer(animate);
   setAnimateLibrary(animate);
   setActiveTurn(turn);
  }
  try{
   const response=await fetch("/api/workspace/assistant",{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({question,questionId:id,days,language,...range}),signal:controller.signal
   });
   const answer=await response.json() as AssistantAnswer;
   if(!response.ok||(!answer.unsupported&&!Array.isArray(answer.items)))throw Error();
   if(controller.signal.aborted)return;
   if(!analysis){
    setTurns(previous=>[...previous.slice(-7),{...turn,answer}]);
    setActiveTurn(null);
    if(id)setSeen(previous=>[...previous.filter(item=>item!==key),key]);
    setDraft(previous=>previous.trim()===question?"":previous);
   }
   onAnswer?.(answer);
  }catch{
   if(!controller.signal.aborted)setFailed({question,id});
  }finally{
   if(pending.current===controller){pending.current=null;setBusy(false)}
  }
 }

 function close(){
  pending.current?.abort();
  pending.current=null;
  setBusy(false);
  setActiveTurn(null);
  setFailed(null);
  setAnimateAnswer(false);
  setOpen(false);
  requestAnimationFrame(()=>trigger.current?.focus());
 }
 if(!open&&!embedded)return <button ref={trigger} className="native-primary native-ask" type="button" aria-expanded={false} aria-controls={panelId} onClick={event=>{setAnimatePanel(event.detail>0);setOpen(true);requestAnimationFrame(()=>input.current?.focus({preventScroll:true}))}}><Sparkles size={16}/>{t("Ask AI","问问 AI")}</button>;
 if(analysis)return <div className="business-priority-review">
  <button type="button" className="inventory-text" disabled={busy} onClick={()=>void ask(t("Business analysis","经营分析"))}>{busy?t("Checking…","正在核对…"):t("Review priorities and actions","梳理重点与行动")}</button>
  {failed&&<p role="alert">{t("Review unavailable. Please retry.","暂时无法梳理，请重试。")}</p>}
 </div>;
 return <section id={panelId} className="native-assistant workspace-assistant" data-enter={animatePanel||undefined} aria-label={t("Business assistant","经营助手")} onKeyDown={event=>{if(event.key==="Escape")close()}}>
  <div className="native-assistant-heading">
   <h2>{embedded?t("Ask AI · Business Assistant","问问 AI · 经营助手"):t("Ask AI","问问 AI")}</h2>
   {!embedded&&<button type="button" className="inventory-text" aria-label={t("Close assistant","关闭经营助手")} onClick={close}><X size={20}/></button>}
  </div>
  {range&&<p>{t("Operating dates","经营周期")} {range.start} — {range.end}</p>}
  {embedded&&!displayedTurns.length&&<div className="desktop-assistant-mark" aria-hidden="true"><Sparkles size={24}/></div>}
  <div className="workspace-assistant-composer">
  {suggestions.length>0&&<div className="native-suggestions" aria-label={t("Suggested questions","推荐问题")}>
   {suggestions.map(id=><button type="button" key={id} disabled={busy} onClick={event=>{
    if(event.detail<=1)void ask(decisionQuestions[id].label[locale],event.detail===1?event.currentTarget:undefined,id);
   }}>{decisionQuestions[id].label[locale]}</button>)}
  </div>}
  <div className="workspace-assistant-library" data-motion={animateLibrary}>
   <button type="button" className="inventory-text workspace-assistant-library-toggle" aria-expanded={libraryOpen} aria-controls={libraryId}
    onClick={event=>{setAnimateLibrary(event.detail>0);setLibraryOpen(!libraryOpen)}}>
    {t("All questions","全部问题")}<ChevronDown size={16} aria-hidden="true"/>
   </button>
   <div id={libraryId} className="workspace-assistant-library-panel" data-expanded={libraryOpen} inert={!libraryOpen}>
    <div>
     {decisionQuestionIds.map(id=>{
      const question=decisionQuestions[id].label[locale];
      const hidden=selected(id);
      return <div className="workspace-assistant-library-item" key={id} data-expanded={!hidden} inert={hidden}>
       <div><button type="button" className="inventory-text" disabled={busy} onClick={event=>{if(event.detail<=1)void ask(question,event.detail===1?event.currentTarget:undefined,id)}}>{question}</button></div>
      </div>;
     })}
     {!libraryHasQuestions&&<p>{t("You’ve asked all the questions for these dates.","这段日期的推荐问题已问完。")}</p>}
    </div>
   </div>
  </div>
  <form onSubmit={event=>{event.preventDefault();void ask(draft.trim())}}>
   <label>{t("Your question","你的问题")}<input ref={input} value={draft} maxLength={500} readOnly={busy} onChange={event=>setDraft(event.target.value)} placeholder={t("Ask about bookings or pending work","例如：哪天空房最多？")}/></label>
   <button type="submit" className="inventory-text" disabled={busy||!draft.trim()}>{busy?t("Checking…","核对中…"):t("Ask","提问")}</button>
  </form>
  </div>
  <div ref={transcript} className="workspace-assistant-turns" aria-live="polite">{displayedTurns.map(({id,question,answer})=>
   <article className="workspace-assistant-turn" key={id}>
    <h3 id={panelId+"-"+id} ref={id===latestId?latestAnswer:undefined} tabIndex={-1}>{question}</h3>
    {!answer?(busy?<p role="status">{t("Checking…","正在核对…")}</p>:failed&&<div role="alert">
     <p>{t("Could not answer this question. Please retry.","这次未能回答，请重试。")}</p>
     <button type="button" className="inventory-text" onClick={()=>void ask(failed.question,undefined,failed.id)}>{t("Retry question","重试这条问题")}</button>
    </div>):answer.unsupported?<p>{t("Try asking about bookings, open rooms, booked value or pending work.","可以询问预订、空房日期、已订金额或待处理事项。")}</p>:<div className="workspace-assistant-answer" data-enter={animateAnswer&&id===latestId||undefined}>
     <small>{t("Data period","数据周期")} {answer.period_start} — {answer.period_end}</small>
     {answer.fallback&&<p>{t("Showing the data-based result.","当前展示依据经营数据整理的结果。")}</p>}
     {answer.items.map(item=><article key={item.id}><h4>{item.title}</h4><p>{item.evidence}</p><p>{item.action}</p>{item.source&&<small>{t("Source","来源")} · {item.source}</small>}<Link href={item.href}>{t("Review details","查看详情")} →</Link></article>)}
    </div>}
   </article>
  )}</div>
 </section>;
}
