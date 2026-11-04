"use client";
import {useEffect,useState,useMemo} from 'react';
import {marketPriceAdvice,type MarketAnalysis} from '@/lib/market-position';
import {DecisionAdvice} from './decision-advice';
import type {PromotionDraft} from '@/lib/promotion';
export function DecisionSupport({zh,start,end,market}:{zh:boolean;start:string;end:string;market?:MarketAnalysis|null}){
 const t=(en:string,cn:string)=>zh?cn:en;
 const [baseDraft,setDraft]=useState<PromotionDraft|null>(null),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[saved,setSaved]=useState(false),[revision,setRevision]=useState<string|null>(null);
 const [savedMarket,setSavedMarket]=useState('');
 const savedForCurrent=saved&&savedMarket===(market?.checkedAt||'');
 const draft=useMemo(()=>!baseDraft?null:!market?baseDraft:{...baseDraft,content:[marketPriceAdvice(market,zh).content,...baseDraft.content.split('\n\n').slice(1)].join('\n\n'),basis:[...baseDraft.basis,{label:'RollingGo',text:`${market.location} · ${market.start} → ${market.end} · CNY ${market.low}–${market.high} · ${market.count} hotels · ${market.checkedAt}`}]},[baseDraft,market,zh]);
 const [attempt,setAttempt]=useState(0);
 useEffect(()=>{const controller=new AbortController();async function generate(){setBusy(true);setDraft(null);setSaved(false);setNotice('');try{const r=await fetch('/api/workspace/decision',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({start,end,language:zh?'zh':'en'}),signal:controller.signal});if(!r.ok)throw Error();const result=await r.json();if(!controller.signal.aborted){setDraft(result.draft);setRevision(result.sourceRevision);if(result.fallback)setNotice(zh?'当前使用经营数据规则建议。':'Using operating-data rules for these suggestions.')}}catch{if(!controller.signal.aborted)setNotice(zh?'建议暂时无法加载，请重试。':'Suggestions could not be loaded. Please retry.')}finally{if(!controller.signal.aborted)setBusy(false)}}void generate();return()=>controller.abort()},[start,end,zh,attempt]);
 return <section className="native-card decision-support"><h2>{t('AI suggestions','AI 建议')}</h2><p className="decision-period">{start} — {end}</p>
 {busy&&!draft&&<p role="status" className="promotion-muted">{t('Preparing suggestions…','正在整理建议…')}</p>}
 {!busy&&!draft&&<button className="inventory-text" onClick={()=>setAttempt(v=>v+1)}>{t('Retry','重试')}</button>}
 {draft&&<><DecisionAdvice content={draft.content} zh={zh}/><details><summary>{t('Evidence snapshot','依据快照')}</summary>{draft.basis.map((b,i)=><p key={i}>{b.label}：{b.text}{b.url&&<> <a href={b.url} target="_blank" rel="noreferrer">{t('Source','来源')}</a></>}</p>)}</details>
 <button className="inventory-text decision-save" disabled={busy||savedForCurrent||!draft.content.trim()} onClick={async()=>{setBusy(true);setNotice('');try{const r=await fetch('/api/workspace/promotion',{cache:'no-store'});if(!r.ok)throw Error();const current=await r.json();if(current.revision!==revision)throw Error('changed');if(current.state.drafts.length>=20&&!current.state.drafts.some((d:PromotionDraft)=>d.id===draft.id))throw Error('full');const response=await fetch('/api/workspace/promotion',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision:current.revision,state:{...current.state,drafts:[draft,...current.state.drafts.filter((d:PromotionDraft)=>d.id!==draft.id)]}})});if(!response.ok)throw Error('changed');const latest=await response.json();setRevision(latest.revision);setSaved(true);setSavedMarket(market?.checkedAt||'');setNotice(t('Saved with its evidence snapshot.','建议已收藏，并保留依据快照。'));window.dispatchEvent(new Event('staycraft-decisions-changed'))}catch(e){setNotice(e instanceof Error&&e.message==='full'?t('Draft library is full. Remove an old draft first.','草稿库已满，请先删除旧草稿。'):t('Save failed or sources changed. Your suggestion is retained; generate again to use the latest sources.','保存失败或来源已变化。建议已保留，请根据最新来源重新生成后重试。'))}finally{setBusy(false)}}}>{savedForCurrent?t('Saved','已保存'):t('Save suggestion','收藏建议')}</button></>}
 {notice&&<p role="status">{notice}</p>}
 </section>;
}
