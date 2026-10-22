"use client";
import {useState} from "react";
import Link from "next/link";
type Decision={draft:string|null;engine:"rules_v1"|"model_v1";reason_code:string;citations:{key:string;value:string}[];sent:false};
export function ConversationDraft({thread,zh,disabled,hasText,onUse}:{thread:string;zh:boolean;disabled:boolean;hasText:boolean;onUse:(text:string)=>void}){
 const [state,setState]=useState("idle"),[decision,setDecision]=useState<Decision|null>(null),[conflict,setConflict]=useState(false);
 const t=(en:string,cn:string)=>zh?cn:en;
 async function prepare(){if(state==="loading"||disabled)return;setState("loading");setConflict(false);
  try{const response=await fetch("/api/workspace/conversations/draft",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({thread,language:zh?"zh":"en"})});const body=await response.json();if(!response.ok){setConflict(response.status===409);throw new Error();}setDecision(body.decision);setState("ready");}
  catch{setState("error");}
 }
 return <section className="conversation-draft" aria-label={t("Reply draft","回复草稿")}>
 <button className="inventory-text" type="button" disabled={disabled||state==="loading"} onClick={()=>void prepare()}>{state==="loading"?t("Checking confirmed facts…","正在核对已确认资料…"):t("Prepare reply draft","准备回复草稿")}</button>
 {state==="error"&&<p role="alert">{conflict?t("The facts or conversation changed. Refresh before preparing another draft.","资料或会话已更新，请先刷新会话后重新准备草稿。"):t("Draft service unavailable. You can still reply manually; your text is retained.","草稿服务暂不可用，可以继续人工回复；已保留你的输入。")}</p>}
 {state==="ready"&&decision&&<><small>{decision.engine==="model_v1"?t("AI draft · Review required","AI 草稿 · 待审核"):t("Fact-based suggestion · Review required","资料建议 · 待审核")}</small>
 {decision.draft?<p className="conversation-draft-text">{decision.draft}</p>:<p>{decision.reason_code==="missing_fact"?t("No confirmed fact is available.","暂缺已确认资料，无法准备有依据的回复。"):t("This request needs your verification and arrangement.","这条请求需要你核实安排后回复。")}</p>}
 {decision.citations.length>0&&<p>{t("Based on: ","回复依据：")}{decision.citations.map(c=>`${c.key==="breakfast"?t("Breakfast","早餐时间"):t("Check-in","常规入住时间")} ${c.value}`).join(" · ")}</p>}
 {decision.reason_code==="model_unavailable"&&<p>{t("Model unavailable; showing a rules fallback.","模型暂不可用，当前为规则备用建议。")}</p>}
 {decision.reason_code==="missing_fact"&&<Link href="/app/mine" className="inventory-text">{t("Update property details","补充民宿资料")} →</Link>}
 {decision.draft&&<><button className="inventory-text" disabled={disabled||hasText} type="button" onClick={()=>onUse(decision.draft!)}>{t("Use in reply","填入回复框")}</button>{hasText&&<p>{t("Clear your existing text before inserting the draft.","回复框已有文字，清空后可填入草稿。")}</p>}</>}
 <p>{t("Not sent. Review the wording and confirm the facts before sending.","尚未发送，请核对措辞及当前资料后再发送。")}</p></>}
 </section>;
}
