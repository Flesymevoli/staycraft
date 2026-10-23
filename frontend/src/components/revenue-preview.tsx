"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import type {RevenueOrder} from "@/lib/revenue-preview";
import {Banknote,ChevronLeft,ChevronRight,ChevronDown} from "lucide-react";
import {useOperatorSample} from "./operator-sample-context";
import {demoRevenueOrders,revenueDays,revenueInsights} from "@/lib/revenue-preview";
import "./revenue-preview.css";
export function RevenuePreview({zh}:{zh:boolean}){
 const sample=useOperatorSample();
 const today=new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Shanghai",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
 const [month,setMonth]=useState(today.slice(0,7)),[open,setOpen]=useState(false),[selected,setSelected]=useState<string|null>(null);
 const [source,setSource]=useState<{month:string;orders:RevenueOrder[]}|null>(null),[failed,setFailed]=useState(false),[retry,setRetry]=useState(0);
 useEffect(()=>{if(sample)return;const controller=new AbortController();async function load(){try{const response=await fetch(`/api/workspace/revenue?month=${month}`,{cache:"no-store",signal:controller.signal});const body=await response.json();if(!response.ok||body.month!==month||!Array.isArray(body.orders))throw new Error();if(!controller.signal.aborted){setSource(body);setFailed(false)}}catch{if(!controller.signal.aborted)setFailed(true)}}void load();const focus=()=>void load();window.addEventListener("focus",focus);window.addEventListener("staycraft-stays-changed",focus);return()=>{controller.abort();window.removeEventListener("focus",focus);window.removeEventListener("staycraft-stays-changed",focus)}},[sample,month,retry]);
 const ready=sample||(!failed&&source?.month===month);
 const t=(en:string,cn:string)=>zh?cn:en;
 const days=revenueDays(month,sample?demoRevenueOrders(today):ready?source!.orders:[]),total=days.reduce((sum,day)=>sum+day.cents,0),peak=Math.max(1,...days.map(day=>day.cents));
 const insights=revenueInsights(days);
 const leader=insights.leaders.length===1?insights.leaders[0]:null;
 const higherRate=leader&&insights.ranked.find(row=>row.cents/row.nights>leader.cents/leader.nights);
 const chosen=days.find(day=>day.date===selected),money=(cents:number)=>"¥"+(cents/100).toLocaleString(zh?"zh-CN":"en-GB",{maximumFractionDigits:2});
 const futureBound=new Date(today+"T12:00:00Z");futureBound.setUTCDate(futureBound.getUTCDate()+30);const lastMonth=sample?today.slice(0,7):futureBound.toISOString().slice(0,7);
 const compactMoney=(cents:number)=>cents<1000000?money(cents):"¥"+(cents/100).toLocaleString(zh?"zh-CN":"en-GB",{notation:"compact",maximumFractionDigits:1});
 const offset=(new Date(month+"-01T12:00:00Z").getUTCDay()+6)%7;
 const monthLabel=new Intl.DateTimeFormat(zh?"zh-CN":"en-GB",{year:"numeric",month:"long",timeZone:"UTC"}).format(new Date(month+"-01T12:00:00Z"));
 function move(delta:number){const d=new Date(month+"-01T12:00:00Z");d.setUTCMonth(d.getUTCMonth()+delta);setMonth(d.toISOString().slice(0,7));setSelected(null)}
 return <section className="revenue-preview" aria-label={t("Revenue","营业额")}>
 <button className="revenue-metric" type="button" aria-expanded={open} aria-controls="revenue-calendar-panel" onClick={()=>setOpen(v=>!v)}><span className="revenue-metric-heading"><Banknote size={18}/>{t("Revenue","营业额")}<small>{monthLabel}</small></span><strong>{ready?money(total):"—"}</strong><span className="revenue-metric-footer">{t("Completed stays","已完成订单")}<span>{open?t("Hide calendar","收起日历"):t("View calendar","查看日历")}<ChevronDown size={15}/></span></span></button>
 {!sample&&!ready&&<p role={failed?"alert":"status"}>{failed?t("Revenue unavailable. Please retry.","营业额暂时无法读取，请重试。"):t("Loading revenue…","正在读取营业额…")}{failed&&<button type="button" className="inventory-text" onClick={()=>{setFailed(false);setSource(null);setRetry(v=>v+1)}}>{t("Retry","重试")}</button>}</p>}
 {open&&<div className="revenue-calendar-panel" id="revenue-calendar-panel">
 <div className="revenue-month"><button type="button" onClick={()=>move(-1)} aria-label={t("Previous month","上个月")}><ChevronLeft size={18}/></button><h2>{monthLabel}</h2><button type="button" disabled={month>=lastMonth} onClick={()=>move(1)} aria-label={t("Next month","下个月")}><ChevronRight size={18}/></button></div>
 {ready&&<>

 <div className="revenue-calendar">{(zh?["一","二","三","四","五","六","日"]:["M","T","W","T","F","S","S"]).map((label,i)=><span className="revenue-weekday" key={i}>{label}</span>)}{Array.from({length:offset},(_,i)=><span aria-hidden="true" key={`blank-${i}`}/>)}{days.map(day=>{const level=day.cents===0?0:Math.min(4,Math.ceil(day.cents/peak*4));return <button key={day.date} type="button" className={`revenue-day revenue-level-${level}`} disabled={day.date>today&&!day.entries.length} aria-pressed={selected===day.date} aria-label={`${day.date} ${money(day.cents)}`} onClick={()=>setSelected(day.date)}><span>{Number(day.date.slice(8))}</span><small>{day.cents?compactMoney(day.cents):"—"}</small></button>})}</div>
 <div className="revenue-key"><span>{t("Lower","低")}</span>{[0,1,2,3,4].map(n=><i key={n} className={`revenue-level-${n}`}/>)}<span>{t("Higher","高")}</span></div>
 <div className="revenue-day-detail" aria-live="polite"><div><h3>{chosen?chosen.date:t("Daily revenue","每日营业额")}</h3>{chosen&&<strong>{money(chosen.cents)}</strong>}</div>{!chosen?<p>{t("Select a date to view its completed stays.","点击日期查看当天已完成订单。")}</p>:!chosen.entries.length?<p>{t("No completed stays for this date.","这一天暂无已完成订单收入。")}</p>:<ul>{chosen.entries.map(entry=><li key={entry.id}><span>{entry.room} · {zh?entry.type:entry.typeEn}<small>{entry.arrival} — {entry.departure}</small></span><strong>{money(entry.cents)}{!sample&&<Link href={`/app/bookings/${entry.id}`}>{t("Details","详情")} →</Link>}</strong></li>)}</ul>}</div>
 <section className="revenue-insights" aria-label={t("Revenue analysis","收入分析")}><h3>{t("Revenue analysis","收入分析")}</h3>{!total?<p>{t("No completed-stay revenue is recorded for this month. This does not establish zero bookings or zero demand; check whether stays have been completed before assessing performance.","本月尚无已完成订单收入记录。这不等于没有预订或没有需求，应先核对订单是否已完成，再判断经营表现。")}</p>:<>
 <h4>{insights.leaders.length===1?t(`${zh?insights.leaders[0].name:insights.leaders[0].nameEn} contributes the most revenue`,`${insights.leaders[0].name}是主要收入来源`):t("Several room types share the lead","多个房型收入并列领先")}</h4>
 <p>{t("Revenue depends on both the nightly rate and completed room nights. Compare both before deciding where to focus promotion; a higher total alone does not establish a more popular room type.","收入由房价与已完成间夜共同贡献。应结合两者决定推广重点，不能仅凭总额较高就认定这个房型更受欢迎。")}</p>
 {leader&&higherRate&&<p>{t(`${leader.nameEn} earns more despite a lower average nightly rate than ${higherRate.nameEn}, because it contributes more completed room nights. Protect its room readiness while checking how to increase completed stays for the higher-rate type.`,`${leader.name}的均价低于${higherRate.name}，总收入却更高，主要由更多已完成间夜支撑。应保障主力房型的接待能力，同时关注高价房型如何增加成交间夜。`)}</p>}
 <ul>{insights.ranked.map(row=><li key={row.name}><span>{zh?row.name:row.nameEn}<small>{t(`${row.nights} completed room nights · ${money(Math.round(row.cents/row.nights))} per night`,`${row.nights} 个已完成间夜 · 均价 ${money(Math.round(row.cents/row.nights))}`)}</small></span><strong>{Math.round(row.cents/total*100)}%</strong></li>)}</ul>
 <h4>{t("Check the reliance on peak dates","关注收入对高峰日期的依赖")}</h4>
 <p>{t(`The top ${insights.topThree.length} revenue dates contribute ${Math.round(insights.topThree.reduce((sum,day)=>sum+day.cents,0)/total*100)}% of recorded revenue across ${insights.earningDays} earning dates. Review those stays before deciding whether similar room types and dates are worth promoting.`, `目前有收入记录的 ${insights.earningDays} 天中，最高的 ${insights.topThree.length} 天贡献了 ${Math.round(insights.topThree.reduce((sum,day)=>sum+day.cents,0)/total*100)}%。可先查看这些日期的订单组合，再判断能否针对类似房型与日期安排推广。`)}</p>
 <div className="revenue-peak-dates">{insights.topThree.map(day=><button type="button" key={day.date} onClick={()=>{setSelected(day.date);document.querySelector('.revenue-day-detail')?.scrollIntoView({block:'center',behavior:'smooth'})}}>{day.date.slice(5)} · {money(day.cents)}</button>)}</div>
 <p>{t("Only completed stays are included. Unfinished stays may change this distribution; without comparable periods or costs, this does not establish growth or profit.","这里只分析已完成订单；尚未完成的住宿可能改变收入结构。缺少可比期间和成本数据，暂不判断增长或利润。")}</p>
 </>}</section>
 <p className="revenue-basis">{t("Completed stays, allocated by night; cancelled orders excluded.","按已完成订单的住宿晚数分摊，取消订单不计入。")}</p>
 </>}</div>}
 </section>;
}
