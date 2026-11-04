"use client";
import {useCallback,useEffect,useState} from 'react';
import {DecisionAdvice} from './decision-advice';
import type {MarketAnalysis} from '@/lib/market-position';
import type {PromotionDraft} from '@/lib/promotion';
export function DecisionSupport({zh,start,end,market}:{zh:boolean;start:string;end:string;market?:MarketAnalysis|null}){
 const t=useCallback((en:string,cn:string)=>zh?cn:en,[zh]);
 const [draft,setDraft]=useState<PromotionDraft|null>(null),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[saved,setSaved]=useState(false),[revision,setRevision]=useState<string|null>(null),[attempt,setAttempt]=useState(0),[engine,setEngine]=useState<'model_v1'|'rules_v1'|null>(null);
 useEffect(()=>{const controller=new AbortController();async function generate(){setBusy(true);setDraft(null);setSaved(false);setNotice('');setEngine(null);try{const r=await fetch('/api/workspace/decision',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({start,end,language:zh?'zh':'en',...(market?{market}:{})}),signal:controller.signal});if(!r.ok)throw Error();const result=await r.json();if(!controller.signal.aborted){setDraft(result.draft);setRevision(result.sourceRevision);setEngine(result.engine||'rules_v1')}}catch{if(!controller.signal.aborted)setNotice(t('Suggestions could not be loaded. Retry.','建议暂时无法加载，请重试。'))}finally{if(!controller.signal.aborted)setBusy(false)}}void generate();return()=>controller.abort()},[start,end,zh,market,attempt,t]);
 return <section className="native-card decision-support"><h2>{t('Operating suggestions','经营建议')}</h2><p className="decision-period">{start} — {end}</p>
 {engine&&<p className={`decision-engine${engine==='rules_v1'?' is-fallback':''}`}>{engine==='model_v1'?t('AI analysis','AI 分析'):t('Rule-based suggestions · AI not used','规则建议（AI 未参与）')}</p>}
 {busy&&!draft&&<p role="status" className="promotion-muted">{t('Preparing…','正在整理…')}</p>}
 {!busy&&!draft&&<button className="inventory-text" onClick={()=>setAttempt(v=>v+1)}>{t('Retry','重试')}</button>}
 {draft&&<><DecisionAdvice content={draft.content} zh={zh}/><button className="inventory-text decision-save" disabled={busy||saved||!draft.content.trim()} onClick={async()=>{setBusy(true);setNotice('');try{const current=await fetch('/api/workspace/promotion',{cache:'no-store'});if(!current.ok)throw Error();const latest=await current.json();if(latest.revision!==revision)throw Error('changed');if(latest.state.drafts.length>=20&&!latest.state.drafts.some((d:PromotionDraft)=>d.id===draft.id))throw Error('full');const response=await fetch('/api/workspace/promotion',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision:latest.revision,state:{...latest.state,drafts:[draft,...latest.state.drafts.filter((d:PromotionDraft)=>d.id!==draft.id)]}})});if(!response.ok)throw Error('changed');const savedState=await response.json();setRevision(savedState.revision);setSaved(true);window.dispatchEvent(new Event('staycraft-decisions-changed'))}catch(e){setNotice(e instanceof Error&&e.message==='full'?t('The draft library is full.','草稿库已满。'):t('Save failed or the suggestions changed.','保存失败或建议已更新。'))}finally{setBusy(false)}}}>{saved?t('Saved','已保存'):t('Save suggestion','收藏建议')}</button></>}
 {notice&&<p role="status">{notice}</p>}
 </section>;
}
