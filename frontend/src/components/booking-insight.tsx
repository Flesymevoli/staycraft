"use client";
import Link from "next/link";
import {ArrowRight} from "lucide-react";
import {useBookingMetrics,type BookingMetrics} from "./booking-metrics";
import {bookingSuggestions} from "@/lib/booking-suggestions";
export function BookingNextSteps({data,zh,onDate}:{data:BookingMetrics;zh:boolean;onDate:(index:number)=>void}){
 const t=(en:string,cn:string)=>zh?cn:en,{quietest,hasInactive,needsRooms,fullyBooked}=bookingSuggestions(data);
 return <section className="booking-next-steps" aria-label={t("Suggested next steps","建议决策")}><h2>{t("Suggested next steps","建议决策")}</h2>
 {hasInactive&&<Link href="/app/work#workspace-bookings" className="booking-next-step is-priority"><span><strong>{t("Check bookings in inactive rooms","核对停用客房的预订")}</strong><small>{t(`${data.inactive_booked_room_nights} booked room nights fall outside active inventory.`,`${data.inactive_booked_room_nights} 个已订间夜属于停用客房，请核对安排。`)}</small></span><ArrowRight size={18}/></Link>}
 {needsRooms?<Link href="/app/rooms/new" className="booking-next-step"><span><strong>{t("Set up your rooms","先设置客房")}</strong><small>{t("Add or enable rooms before reviewing availability.","添加或启用客房后，再查看预订占用情况。")}</small></span><ArrowRight size={18}/></Link>:quietest?<button type="button" className="booking-next-step" onClick={()=>onDate(data.daily.findIndex(day=>day.date===quietest.date))}><span><strong>{t("Review the date with most availability","先看空余最多的一天")}</strong><small>{t(`${quietest.date} · ${quietest.available} unbooked room nights.`,`${quietest.date} · 还有 ${quietest.available} 个间夜未订。`)}</small></span><ArrowRight size={18}/></button>:fullyBooked?<Link href="/app/work#workspace-bookings" className="booking-next-step"><span><strong>{t("Review your booking arrangements","核对预订安排")}</strong><small>{t("All active room nights in this period are booked.","所选期间的启用客房间夜均已预订。")}</small></span><ArrowRight size={18}/></Link>:null}
 </section>;
}
export function WorkBookingInsight({scope,zh}:{scope:string;zh:boolean}){
 const {data,status,retry}=useBookingMetrics(7,scope),t=(en:string,cn:string)=>zh?cn:en;
 return <section className="workspace-section work-booking-insight"><div className="native-section-head"><h2>{t("Booking insight","经营洞察")}</h2></div><div className="native-card">{status==="loading"?<p role="status">{t("Reading bookings…","正在读取订单数据…")}</p>:status==="error"||!data?<p role="alert">{t("Booking data is unavailable.","暂时无法读取订单数据。 ")}<button className="inventory-text" type="button" onClick={retry}>{t("Retry","重试")}</button></p>:<>
 <small>{data.period_start} — {data.period_end}</small><h3>{data.active_rooms===0?t("Set up your rooms first","先设置客房"):data.inactive_booked_room_nights>0?t("Some room arrangements need checking","有客房安排需要核对"):data.available_room_nights===0?t("All room nights are booked","所选期间间夜已订满"):t("Review your unbooked dates","看看哪些日期还有空余")}</h3>
 <p>{data.active_rooms===0?t("No active rooms are configured yet.","当前还没有启用的客房。"):t(`${data.booked_room_nights} of ${data.capacity_room_nights} room nights booked; ${data.available_room_nights} remain unbooked.`,`未来7天共 ${data.capacity_room_nights} 个间夜，已订 ${data.booked_room_nights} 个，未订 ${data.available_room_nights} 个。`)}</p>
 {data.inactive_booked_room_nights>0&&<p>{t(`${data.inactive_booked_room_nights} additional room nights are in inactive rooms.`, `另有 ${data.inactive_booked_room_nights} 个已订间夜属于停用客房。`)}</p>}
 <Link href="/app/analysis#booking-analysis-detail" className="inventory-text">{t("View analysis","查看分析")} <ArrowRight size={16}/></Link>
 </>}</div></section>;
}
