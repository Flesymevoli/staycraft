"use client";
import type {Opportunity,OpportunityAction} from '@/lib/decisions/types';
import {renderOpportunityText} from '@/lib/decisions/opportunity';
import './opportunity-card.css';

const kindLabel=(kind:Opportunity['kind'],zh:boolean)=>kind==='risk'?(zh?'风险':'Risk'):(zh?'机会':'Opportunity');

export function OpportunityCard({opportunity,zh,onPrimaryAction,onSavePlan}:{opportunity:Opportunity;zh:boolean;onPrimaryAction?:(target:OpportunityAction['target'])=>void;onSavePlan?:()=>void}){
 const t=(cn:string,en:string)=>zh?cn:en;
 const primary=opportunity.actions.at(0);
 const basis=opportunity.basis||[],count=basis.length;
 const rendered=renderOpportunityText(opportunity,zh);
 const claim=(rendered.claim||'').trim();
 const coverage=(rendered.coverage||'').trim();
 const title=(rendered.title||'').trim();
 // Action titles are generated in Chinese; in English render them from the action target instead.
 const actionLabel=(target:OpportunityAction['target'],zhTitle?:string)=>zh?(zhTitle||t('去处理','Open')):(target==='data'?'Review business data':target==='market'?'View market quotes':'Plan promotion');
 const window_=opportunity.window;
 return <article className="oc-card" aria-label={title||t('经营机会','Business opportunity')}>
  <div className="oc-head">
   <span className={`oc-kind oc-kind-${opportunity.kind}`}>{kindLabel(opportunity.kind,zh)}</span>
   {window_&&<span className="oc-window">{t('窗口','Window')} <b>{window_.start}</b><span className="oc-arrow" aria-hidden="true">→</span><b>{window_.end}</b></span>}
  </div>
  <h3 className="oc-title">{title||t('未命名机会','Untitled opportunity')}</h3>
  <p className="oc-claim">{claim||t('暂无判断说明。','No summary available.')}</p>
  <div className="oc-meta">
   <span className="oc-basis">{count>0?t(`依据 ${count} 条`,`${count} ${count===1?'piece':'pieces'} of evidence`):t('暂无依据','No evidence yet')}</span>
   {coverage&&<span className="oc-coverage">{t('覆盖','Coverage')}：{coverage}</span>}
  </div>
  {primary&&onPrimaryAction&&<div className="oc-actions">
   <button type="button" className="oc-primary" onClick={()=>onPrimaryAction(primary.target)}>{actionLabel(primary.target,primary.title)}<span className="oc-arrow" aria-hidden="true">→</span></button>
   {primary.target!=='promotion'&&opportunity.actions.some(action=>action.target==='promotion')&&
    <button type="button" className="wb-secondary-link" onClick={()=>onPrimaryAction('promotion')}>{t('制定推广方案','Plan promotion')}</button>}
   {onSavePlan&&<button type="button" className="wb-secondary-link" onClick={onSavePlan}>{t('保存行动计划','Save action plan')}</button>}
  </div>}
 </article>;
}
