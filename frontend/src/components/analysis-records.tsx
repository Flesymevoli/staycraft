import type {DecisionAgentRun} from "@/lib/decision-agent-types";

export function AnalysisRecords({run,zh}:{run:DecisionAgentRun;zh:boolean}){
 const t=(cn:string,en:string)=>zh?cn:en;
 return <details className="wb-source-details desktop-analysis-records">
  <summary>{t("数据与分析记录","Data and analysis records")}</summary>
  {run.evidence.map(item=><div className="wb-inline-source" key={item.id}><p>{item.title}</p><ul>{item.facts.map((fact,index)=><li key={index}>{fact}</li>)}</ul><small>{item.source}{item.period?` · ${item.period.start} — ${item.period.end}`:""}</small></div>)}
  {!!run.dailyMetrics?.length&&<details><summary>{t("每日数据","Daily figures")}</summary><div className="wb-snapshot-table"><table><caption>{run.period.start} — {run.period.end}</caption><thead><tr><th>{t("日期","Date")}</th><th>{t("已订","Booked")}</th><th>{t("空余","Open")}</th></tr></thead><tbody>{run.dailyMetrics.map(day=><tr key={day.date}><td>{day.date}</td><td>{day.booked}</td><td>{day.available??"—"}</td></tr>)}</tbody></table></div></details>}
  {!!run.steps.length&&<details><summary>{t("分析记录","Analysis record")}</summary><ol>{run.steps.map(step=><li key={step.id}><p>{step.label}</p><p>{step.detail}</p></li>)}</ol></details>}
  {!!run.limitations.length&&<details><summary>{t("数据说明","Data notes")}</summary><ul>{run.limitations.map((item,index)=><li key={index}>{item}</li>)}</ul></details>}
 </details>;
}
