"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {OfficialHolidayContext} from "./official-holiday-context";
import {validPromotion,type PromotionSource} from "@/lib/promotion";
export function LocalReferences({start,end,zh}:{start:string;end:string;zh:boolean}){
 const [sources,setSources]=useState<PromotionSource[]|null>(null),[error,setError]=useState(false),[retry,setRetry]=useState(0);
 const t=(en:string,cn:string)=>zh?cn:en;
 useEffect(()=>{const controller=new AbortController();fetch("/api/workspace/promotion",{cache:"no-store",signal:controller.signal}).then(async response=>{if(!response.ok)throw new Error();const data=await response.json();if(!validPromotion(data.state))throw new Error();if(!controller.signal.aborted){setSources(data.state.sources);setError(false)}}).catch(()=>{if(!controller.signal.aborted)setError(true)});return()=>controller.abort()},[retry]);
 const relevant=sources?.filter(s=>s.start<=end&&s.end>=start)||[];
 return <section className="booking-analysis-panel local-references"><h2>{t("Local context","周边参考资料")}</h2>{error?<p role="alert">{t("References could not be loaded.","暂时无法读取参考资料。")} <button type="button" className="inventory-text" onClick={()=>setRetry(v=>v+1)}>{t("Retry","重试")}</button></p>:sources===null?<p role="status">{t("Loading references…","正在读取参考资料…")}</p>:relevant.length?<><p>{t("These owner-checked references overlap the selected period. They do not establish demand, price changes or the cause of your booking results.","以下经营者核对的资料与所选期间重叠，可供安排推广时参考，不能据此确定市场需求、房价变化或预订结果的原因。")}</p>{relevant.map(s=><article key={s.id}><h3><a href={s.url} target="_blank" rel="noopener noreferrer">{s.title} ↗</a></h3><p>{s.summary}</p><small>{s.start} — {s.end} · {t("Owner checked","经营者核对于")} {s.checkedOn}</small></article>)}</>:<p>{t("No checked local references cover this period yet. Business conclusions above use only your own booking data.","所选期间暂无已核对的周边资料，上方经营判断仅依据自家预订数据。")}</p>}<OfficialHolidayContext start={start} end={end} zh={zh}/><Link href={`/app/explore?start=${start}&end=${end}`} className="inventory-text">{t("Manage references and prepare a promotion","管理线索与准备推广")} →</Link></section>;
}
