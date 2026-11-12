"use client";
import type {SourceRef} from '@/lib/signals/types';
import type {DetectorSignal} from '@/lib/decisions/types';
import {metricLabel,metricUnit} from '@/lib/decisions/labels';
import './evidence-panel.css';

const authorityLabel={internal:['内部数据','Internal'],public:['公开来源','Public'],manual:['人工录入','Manual']} as const;
const coverageLabel={complete:['完整','Complete'],partial:['部分','Partial'],none:['无','None']} as const;
const confidenceLabel={high:['高','High'],medium:['中','Medium'],low:['低','Low']} as const;
// Stable formatting across server and client: fixed zone, no locale drift.
const shortTime=(value:string)=>{const time=Date.parse(value);if(!Number.isFinite(time))return value;try{return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(time)}catch{return value}};

export function EvidencePanel({sources,signals,zh,emptyText}:{sources:SourceRef[];signals?:DetectorSignal[];zh:boolean;emptyText?:string}){
 const t=(cn:string,en:string)=>zh?cn:en;
 const sourceList=sources||[],signalList=signals||[];
 if(sourceList.length===0&&signalList.length===0){
  return <section className="ep-panel ep-empty">
   <p>{emptyText??t('本次未获取外部来源，判断仅基于内部数据','No external sources were retrieved; this judgment relies on internal data only.')}</p>
  </section>;
 }
 const valueText=(signal:DetectorSignal)=>{
  const {metric}=signal;
  if(metric.value===null)return t('未获取','Not available');
  if(metric.name==='consecutive_open_nights')return `${metric.value}${metricUnit(metric.name,metric.unit,zh)}`;
  switch(metric.unit){
   case 'pct':return `${metric.value}%`;
   case 'cny':return `¥${metric.value}`;
   case 'room_nights':return `${metric.value} ${t('间夜','room-nights')}`;
   default:return String(metric.value);
  }
 };
 return <section className="ep-panel" aria-label={t('依据与信号','Evidence and signals')}>
  {sourceList.length>0&&<div className="ep-section">
   <h3 className="ep-heading">{t('来源','Sources')}</h3>
   <ul className="ep-sources">
    {sourceList.map((source,index)=><li className="ep-source" key={`${source.id}-${source.observedAt}-${index}`}>
     <div className="ep-source-head">
      <span className="ep-source-id">{source.id}</span>
      <span className="ep-chip">{authorityLabel[source.authority][zh?0:1]}</span>
      <span className="ep-chip ep-chip-coverage">{t('覆盖','Coverage')}·{coverageLabel[source.coverage.kind][zh?0:1]}</span>
      <span className="ep-chip ep-chip-confidence">{t('置信度','Confidence')}·{confidenceLabel[source.confidence][zh?0:1]}</span>
     </div>
     <p className="ep-source-meta">{t('观测时间','Observed')} <b className="ep-num">{shortTime(source.observedAt)}</b>{source.note?` · ${source.note}`:''}</p>
    </li>)}
   </ul>
  </div>}
  {signalList.length>0&&<div className="ep-section">
   <h3 className="ep-heading">{t('检测信号','Detector signals')}</h3>
   <ul className="ep-signals">
    {signalList.map((signal,index)=><li className="ep-signal" key={`${signal.id}-${index}`}>
     <span className="ep-signal-name">{signal.metric.name?metricLabel(signal.metric.name,zh):t('未命名指标','Unnamed metric')}</span>
     <span className={`ep-signal-value${signal.metric.value===null?' is-missing':''}`}>{valueText(signal)}</span>
     <span className="ep-signal-meta">{t('样本','Samples')} <b className="ep-num">{signal.baseline.samples}</b> · {t('置信度','Confidence')} {confidenceLabel[signal.confidence][zh?0:1]}</span>
    </li>)}
   </ul>
  </div>}
 </section>;
}
