"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {BedDouble,CalendarDays,Banknote,Tag,ArrowUpRight} from "lucide-react";
import {BookingTrend} from "./booking-trend";
import type {BookingMetric} from "@/lib/booking-chart";
import {businessAnalysis} from "@/lib/business-analysis";
import {BookingNextSteps} from "./booking-insight";
import {RevenuePreview} from "./revenue-preview";
import {useBookingMetrics} from "./booking-metrics";
import {bookingPeriod,type BookingRange} from "@/lib/booking-period";
import {LocalReferences} from "./local-references";
import "./workspace-analysis.css";
export function HomeBookingOverview({scope,zh}:{scope:string;zh:boolean}){
 const {data,status,retry}=useBookingMetrics(7,scope);const t=(en:string,cn:string)=>zh?cn:en;
 return <section className="workspace-section"><h2>{t("Your stay at a glance","经营一览")}</h2>{status==="error"&&<p role="alert">{t("Metrics unavailable.","暂时无法读取经营数据。")} <button type="button" className="inventory-text" onClick={retry}>{t("Retry","重试")}</button></p>}<div className="workspace-metrics"><Link href="/app/work" className="workspace-metric"><span>{t("Active rooms","启用客房")}</span><strong>{data?.active_rooms??"—"}</strong><small>{status==="loading"?t("Loading…","正在读取…"):t("Current room configuration","当前客房设置")}</small></Link><Link href="/app/analysis" className="workspace-metric"><span>{t("Booked occupancy","预订占用率")}</span><strong>{data?.booked_pct==null?"—":`${data.booked_pct}%`}</strong><small>{t("Next 7 days · booked room nights","未来7天 · 已订间夜口径")}</small></Link></div></section>;
}
export function WorkspaceAnalysis({scope,zh}:{scope:string;zh:boolean}){
 const defaultDays=7; const [range,setRange]=useState<BookingRange|undefined>(),[draftStart,setDraftStart]=useState(""),[draftEnd,setDraftEnd]=useState(""),[rangeError,setRangeError]=useState(false),[metric,setMetric]=useState<BookingMetric>("occupancy"),[selected,setSelected]=useState<number|null>(null),[showDaily,setShowDaily]=useState(false);const {data,status,retry}=useBookingMetrics(defaultDays,scope,range);const t=(en:string,cn:string)=>zh?cn:en;
 useEffect(()=>{if(status!=="ready"||window.location.hash!=="#booking-analysis-detail")return;const target=document.getElementById("booking-analysis-detail");target?.scrollIntoView({block:"start"});target?.focus({preventScroll:true})},[status,data]);
 const analysis=data?businessAnalysis(data,zh):null;
 const money=(cents:number|null|undefined)=>cents==null?"—":"¥"+(cents/100).toLocaleString(zh?"zh-CN":"en-GB",{maximumFractionDigits:2});
 const rate=data?.rate_min==null?"—":data.rate_min===data.rate_max?`¥${data.rate_min}`:`¥${data.rate_min}–${data.rate_max}`;
 return <div className="workspace-analysis">
 <RevenuePreview zh={zh}/>
 <form className="booking-period-form" onSubmit={event=>{event.preventDefault();const next={start:draftStart||data?.period_start||"",end:draftEnd||data?.period_end||""};if(!bookingPeriod(next)){setRangeError(true);return}setRange(next);setSelected(null);setRangeError(false)}}>
 <div className="booking-period-fields" role="group" aria-label={t("Booking period","预订统计期间")}><label>{t("Start date","开始日期")}<input type="date" required min="2000-01-01" max="2100-12-31" value={draftStart||data?.period_start||""} onChange={event=>setDraftStart(event.target.value)} /></label><span aria-hidden="true">—</span><label>{t("End date","结束日期")}<input type="date" required min="2000-01-01" max="2100-12-31" value={draftEnd||data?.period_end||""} onChange={event=>setDraftEnd(event.target.value)} /></label><button type="submit" className="inventory-text">{t("Apply","应用")}</button><button className="inventory-text" type="button" onClick={retry}>{t("Refresh","刷新")}</button></div>
 {rangeError&&<p role="alert">{t("Choose a valid range of 1–366 days, with the end on or after the start.","请选择有效的 1–366 天范围，结束日期不能早于开始日期。")}</p>}
 </form>
 <p className="booking-analysis-source">{data?`${data.period_start} — ${data.period_end} · ${t("Current bookings","当前订单快照")}`:t("Your bookings","自身预订")}</p>
 {status==="loading"&&<p role="status">{t("Reading booking data…","正在读取订单指标…")}</p>}{status==="error"&&<p role="alert">{t("Booking metrics could not be loaded. Please refresh.","订单指标暂时无法读取，请刷新重试。")}</p>}
 {data?.partial_channel_coverage&&<p className="booking-analysis-source">{t("Imported channels may be incomplete; this is not live OTA data.","导入渠道可能不完整，不是实时 OTA 数据。")}{data.last_import&&<> {t("Last import","最近导入")}：{new Date(data.last_import.imported_at).toLocaleString(zh?"zh-CN":"en-GB",{timeZone:"Asia/Shanghai"})} · {data.last_import.channels.join(" / ")}</>}</p>}
 {data?.historical_inventory_unknown&&<p role="note">{t("Historical inventory is unknown. Occupancy and available nights are not reported; amounts and recorded order nights remain available.","缺少历史房量，不展示历史占用率与剩余库存；仍可查看订单金额和已记录间夜。")}</p>}
 <p className="booking-analysis-group">{t("YOUR BOOKINGS", "自身预订")}</p><div className="booking-analysis-cards">{[{id:"occupancy",Icon:BedDouble,title:t("Booked occupancy","预订占用率"),value:data?.booked_pct==null?"—":`${data.booked_pct}%`,caption:data?.historical_inventory_unknown?t("Historical inventory unknown","历史房量未知"):t("Based on active rooms","按当前启用客房计算")},{id:"booking",Icon:CalendarDays,title:data?.historical_inventory_unknown?t("Recorded order nights","已记录间夜"):t("Booking progress","预订进度"),value:data?.historical_inventory_unknown?String(data.booked_order_room_nights||0):data&&data.capacity_room_nights?`${data.booked_room_nights} / ${data.capacity_room_nights}`:"—",caption:data?.historical_inventory_unknown?t("Recorded order nights","已记录订单间夜"):t("Booked / capacity room nights","已订 / 库存间夜")},{id:"amount",Icon:Banknote,title:data?.historical_inventory_unknown?t("Recorded booking value","已记录订单金额"):t("Booked amount","预订金额"),value:money(data?.amount_cents),caption:t("Allocated to this stay period","按所选住宿期间分摊")},{id:"adr",Icon:Tag,title:data?.historical_inventory_unknown?t("Average recorded rate","订单平均房价"):t("Average booked rate","平均预订房价"),value:money(data?.average_booked_rate_cents),caption:t("Per booked order night","每个订单间夜")}].map(({id,Icon,title,value,caption})=><button type="button" key={id} aria-pressed={metric===id} onClick={()=>setMetric(id as BookingMetric)}><span className="booking-analysis-card-title"><Icon size={18}/>{title}</span><strong>{value}</strong><small>{caption}</small><span>{metric===id?t("Viewing below","正在查看"):t("View details","查看详情")} ↓</span></button>)}</div>
 {data&&data.active_rooms===0&&!data.historical_inventory_unknown&&<section className="booking-analysis-panel" id="booking-analysis-detail" tabIndex={-1}><h2>{t("No active rooms","暂无启用客房")}</h2><p>{t("Add or enable rooms before calculating a booking ratio.","添加或启用客房后，才能计算预订占用率。")}</p><Link href="/app/work" className="inventory-text">{t("Manage rooms","管理客房")} →</Link></section>}
 {data&&(data.active_rooms>0||data.historical_inventory_unknown)&&<section className="booking-analysis-panel" id="booking-analysis-detail" tabIndex={-1}><h2>{metric==="amount"?t("Daily booked amount","每日预订金额"):metric==="adr"?t("Daily average booked rate","每日平均预订房价"):metric==="occupancy"?t("Daily booked occupancy","每日预订占用率"):t("Daily booked room nights","每日已订间夜")}</h2>
 <BookingTrend data={data} metric={metric} zh={zh} selected={selected} onSelect={setSelected}/>
 {!!data.overlapping_order_room_nights&&<p role="alert">{t("Overlapping orders detected; review allocations before interpreting the figures.","发现客房重复占用，请先核对订单分配。")}</p>}
 <button type="button" className="inventory-text" aria-expanded={showDaily} onClick={()=>setShowDaily(v=>!v)}>{t("Daily details","每日明细")} {showDaily?"−":"+"}</button>{showDaily&&<div className="booking-analysis-table"><table><thead><tr><th>{t("Date","日期")}</th><th>{t("Booked","已订")}</th><th>{t("Unbooked","未订")}</th><th>{t("Amount","金额")}</th></tr></thead><tbody>{data.daily.map(day=><tr key={day.date}><td>{day.date}</td><td>{data.historical_inventory_unknown?day.order_room_nights:day.booked}</td><td>{data.historical_inventory_unknown?"—":day.available}</td><td>{money(day.amount_cents)}</td></tr>)}</tbody></table></div>}
 </section>}
 <p className="booking-analysis-group">{t("PROPERTY & MARKET", "房价与市场参考")}</p>
 <div className="booking-analysis-context"><div><span><Tag size={16}/>{t('Configured rates','内部基础房价')}</span><strong>{rate}</strong><small>{t('Current active room types','当前启用房型')}</small></div><Link href="/app/explore" className="booking-market-link"><span><ArrowUpRight size={16}/>{t('Market intelligence','市场情报')}</span><strong>{t('Compare nearby stays','查看周边报价')}</strong><small>{t('Same-date supplier prices','按入住日期查询真实酒店起价')}</small></Link></div>
 {analysis&&<section className="booking-analysis-panel business-analysis"><h2>{t('Period summary','所选期间摘要')}</h2><h3>{analysis.title}</h3><p>{analysis.evidence}</p>{analysis.risk&&<p className="booking-analysis-warning">{analysis.risk}</p>}<p>{analysis.action}</p><Link className="inventory-text" href="/app">{t('Open the AI decision workbench','前往 AI 决策工作台')} <ArrowUpRight size={15}/></Link></section>}

 {data&&<BookingNextSteps data={data} zh={zh} onDate={index=>{setMetric("occupancy");setSelected(index);setShowDaily(true);document.getElementById("booking-analysis-detail")?.scrollIntoView({block:"start",behavior:"smooth"});}}/>}
 {data&&<LocalReferences start={data.period_start} end={data.period_end} zh={zh}/>}
 </div>;
}
