"use client";
import type {DecisionAgentRun} from '@/lib/decision-agent-types';
import type {BookingMetrics} from './booking-metrics';
import {buildHeadline} from '@/lib/decisions/headline';
import './headline-card.css';

// Compact display only; source dates and the diagnosis period remain unchanged.
function compactDates(text:string){
 const years=new Set([...text.matchAll(/(\d{4})-\d{2}-\d{2}/g)].map(match=>match[1]));
 return text.replace(/(\d{4})-(\d{2})-(\d{2})/g,(_,year,month,day)=>years.size>1?`${year}.${month}.${day}`:`${month}.${day}`)
  .replace(/(\d{2}\.\d{2})\s*[–—→]\s*(?=\d{2}\.\d{2})/g,"$1-");
}

// One deterministic line per diagnosis. It renders nothing when no rule can support a claim,
// so the page never shows an invented priority.
export function HeadlineCard({run,zh,metrics}:{run:DecisionAgentRun;zh:boolean;metrics?:BookingMetrics|null}){
 const headline=buildHeadline({signals:run.signals,opportunities:run.opportunities,sources:run.signalSources,dailyMetrics:run.dailyMetrics,zh});
 if(!headline)return null;
 const t=(cn:string,en:string)=>zh?cn:en;
 const daily=metrics?.daily ?? [];
 const points=daily.length>1&&daily.every(day=>day.booked_pct!=null)
  ?daily.map((day,index)=>[8+index*224/(daily.length-1),82-(day.booked_pct??0)*0.72])
  :[];
 return <section className="hl-card" aria-label={t('今天最该做的一件事','Do this today')}>
  <div className="hl-layout-copy">
  <div className="hl-head"><span className="hl-chip">{t('今天最该做的一件事','Do this today')}</span>{headline.window&&<span className="hl-window">{compactDates(`${headline.window.start}–${headline.window.end}`)}</span>}</div>
  <p className="hl-conclusion">{compactDates(headline.conclusion)}</p>
  <p className="hl-reason">{headline.reason}</p>
  </div>
  {points.length>0&&<figure className="desktop-headline-trend">
   <figcaption>{t('每日预订占用率','Daily booked occupancy')}</figcaption>
   <svg viewBox="0 0 240 90" aria-hidden="true">
    <path d="M8 10H232 M8 46H232 M8 82H232" className="desktop-trend-grid"/>
    <polygon points={`8,82 ${points.map(point=>point.join(',')).join(' ')} 232,82`} className="desktop-trend-fill"/>
    <polyline points={points.map(point=>point.join(',')).join(' ')} className="desktop-trend-line"/>
    {points.map(([x,y],index)=><circle key={daily[index].date} cx={x} cy={y} r="2.5" className="desktop-trend-dot" data-weekend={[0,6].includes(new Date(daily[index].date+"T12:00:00Z").getUTCDay())||undefined}/>)}
   </svg>
   <div>{daily[0].date.slice(5)} <span>{daily.at(-1)?.date.slice(5)}</span></div>
  </figure>}
  <div className="hl-kpis">{headline.kpis.map(item=><div className="hl-kpi" key={item.label}><b>{item.value}</b><span>{item.label}</span></div>)}</div>
 </section>;
}
