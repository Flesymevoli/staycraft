import Link from 'next/link';
import type {DecisionAgentRun} from '@/lib/decision-agent-types';

const sentences=(text:string)=>text.match(/[^。！？!?]+[。！？!?]?/g)?.flatMap(s=>s.split(/(?<=[.!?])\s+(?=[A-Z])/)).map(s=>s.trim()).filter(Boolean)||[];
const rank={high:0,medium:1,low:2};

export function DiagnosisOverview({run,zh}:{run:DecisionAgentRun;zh:boolean}){
 const report=run.report;
 if(!report)return <p className="wb-report-summary">{run.summary}</p>;
 const summary=sentences(report.summary||run.summary);
 const judgment=report.title&&!/^(?:经营诊断报告|经营报告|分析报告|Operating review|Business report)$/i.test(report.title.trim())?report.title:summary[0]||report.sections?.[0]?.title;
 const basis=sentences(report.sections?.[0]?.paragraphs?.[0]||'').filter(s=>s!==judgment).at(-1)||summary.slice(1,3).join(zh?'':' ');
 const decisions=[...(report.recommendations||[])].sort((a,b)=>rank[a.priority]-rank[b.priority]).slice(0,2);
 const legacy=decisions.length?[]:run.findings.slice(0,2);
 return <section className="wb-diagnosis-overview" aria-label={zh?'经营判断与优先决策':'Judgment and priority decisions'}>
  <span className="wb-diagnosis-label">{zh?'核心判断':'Core judgment'}</span>
  <h3>{judgment}</h3>
  {basis&&basis!==judgment&&<div className="wb-judgment-basis"><span className="wb-diagnosis-label">{zh?'关键依据':'Key evidence'}</span><p>{basis}</p></div>}
  {(decisions.length>0||legacy.length>0)&&<div className="wb-priority-decisions"><h4>{zh?'优先决策':'Priority decisions'}</h4><ol>
   {decisions.map((decision,index)=>{
    const finding=run.findings.find(f=>f.id===decision.findingId);
    const action=finding?.nextAction;
    const href=action?.target==='promotion'?`/app/promotion?${new URLSearchParams({runId:run.id,findingId:finding!.id})}`:action&&['market','data'].includes(action.target)?`/app/${action.target==='market'?'explore':'analysis'}?${new URLSearchParams(action.period)}`:null;
    return <li key={index}><h5>{decision.title}</h5><p>{sentences(decision.body)[0]||decision.body}</p>{href&&<Link href={href}>{zh?(action!.target==='promotion'?'制定推广方案':action!.target==='market'?'查看市场报价':'核对经营数据'):(action!.target==='promotion'?'Plan promotion':action!.target==='market'?'View market quotes':'Review business data')} →</Link>}</li>;
   })}
   {legacy.map(f=><li key={f.id}><h5>{f.action}</h5><p>{f.reason}</p></li>)}
  </ol></div>}
 </section>;
}
