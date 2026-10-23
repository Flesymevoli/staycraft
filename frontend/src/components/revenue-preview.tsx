"use client";
import {useState} from "react";
import {Banknote,ChevronLeft,ChevronRight,ChevronDown} from "lucide-react";
import {useOperatorSample} from "./operator-sample-context";
import {demoRevenueOrders,revenueDays} from "@/lib/revenue-preview";
import "./revenue-preview.css";
export function RevenuePreview({zh}:{zh:boolean}){
 const sample=useOperatorSample();
 const today=new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Shanghai",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
 const [month,setMonth]=useState(today.slice(0,7)),[open,setOpen]=useState(false),[selected,setSelected]=useState<string|null>(null);
 const t=(en:string,cn:string)=>zh?cn:en;
 const days=revenueDays(month,sample?demoRevenueOrders(today):[]),total=days.reduce((sum,day)=>sum+day.cents,0),peak=Math.max(1,...days.map(day=>day.cents));
 const chosen=days.find(day=>day.date===selected),money=(cents:number)=>"¥"+(cents/100).toLocaleString(zh?"zh-CN":"en-GB",{maximumFractionDigits:2});
 const offset=(new Date(month+"-01T12:00:00Z").getUTCDay()+6)%7;
 const monthLabel=new Intl.DateTimeFormat(zh?"zh-CN":"en-GB",{year:"numeric",month:"long",timeZone:"UTC"}).format(new Date(month+"-01T12:00:00Z"));
 function move(delta:number){const d=new Date(month+"-01T12:00:00Z");d.setUTCMonth(d.getUTCMonth()+delta);setMonth(d.toISOString().slice(0,7));setSelected(null)}
 return <section className="revenue-preview" aria-label={t("Revenue","营业额")}>
 <button className="revenue-metric" type="button" aria-expanded={open} aria-controls="revenue-calendar-panel" onClick={()=>setOpen(v=>!v)}><span className="revenue-metric-heading"><Banknote size={18}/>{t("Revenue","营业额")}<small>{monthLabel}</small></span><strong>{sample?money(total):"—"}</strong><span className="revenue-metric-footer">{t("Completed stays","已完成订单")}<span>{open?t("Hide calendar","收起日历"):t("View calendar","查看日历")}<ChevronDown size={15}/></span></span></button>
 {open&&<div className="revenue-calendar-panel" id="revenue-calendar-panel">{!sample?<p>{t("Revenue data is not connected yet.","营业额数据尚未接入。")}</p>:<>
 <div className="revenue-month"><button type="button" onClick={()=>move(-1)} aria-label={t("Previous month","上个月")}><ChevronLeft size={18}/></button><h2>{monthLabel}</h2><button type="button" disabled={month>=today.slice(0,7)} onClick={()=>move(1)} aria-label={t("Next month","下个月")}><ChevronRight size={18}/></button></div>
 <div className="revenue-calendar">{(zh?["一","二","三","四","五","六","日"]:["M","T","W","T","F","S","S"]).map((label,i)=><span className="revenue-weekday" key={i}>{label}</span>)}{Array.from({length:offset},(_,i)=><span aria-hidden="true" key={`blank-${i}`}/>)}{days.map(day=>{const level=day.cents===0?0:Math.min(4,Math.ceil(day.cents/peak*4));return <button key={day.date} type="button" className={`revenue-day revenue-level-${level}`} disabled={day.date>today} aria-pressed={selected===day.date} aria-label={`${day.date} ${money(day.cents)}`} onClick={()=>setSelected(day.date)}><span>{Number(day.date.slice(8))}</span><small>{day.cents?money(day.cents):"—"}</small></button>})}</div>
 <div className="revenue-key"><span>{t("Lower","低")}</span>{[0,1,2,3,4].map(n=><i key={n} className={`revenue-level-${n}`}/>)}<span>{t("Higher","高")}</span></div>
 <div className="revenue-day-detail" aria-live="polite"><div><h3>{chosen?chosen.date:t("Daily revenue","每日营业额")}</h3>{chosen&&<strong>{money(chosen.cents)}</strong>}</div>{!chosen?<p>{t("Select a date to view its completed stays.","点击日期查看当天已完成订单。")}</p>:!chosen.entries.length?<p>{t("No completed stays for this date.","这一天暂无已完成订单收入。")}</p>:<ul>{chosen.entries.map(entry=><li key={entry.id}><span>{entry.room} · {zh?entry.type:entry.typeEn}<small>{entry.arrival} — {entry.departure}</small></span><strong>{money(entry.cents)}</strong></li>)}</ul>}</div>
 <p className="revenue-basis">{t("Completed stays, allocated by night; cancelled orders excluded.","按已完成订单的住宿晚数分摊，取消订单不计入。")}</p>
 </>}</div>}
 </section>;
}
