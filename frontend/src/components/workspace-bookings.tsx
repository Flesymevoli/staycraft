"use client";
import {useEffect,useRef,useState} from "react";
import Link from "next/link";
import {ChevronDown} from "lucide-react";
type Booking={id:string;room_number:string;type_name:string;arrival:string;departure:string;guest_name:string;expected_arrival:string;total:number;status:string;refund_result?:string;created_at?:string};
export function WorkspaceBookings({date,zh,propertyId,roomId}:{date?:string;zh:boolean;propertyId?:string;roomId?:string}){
 const sequence=useRef(0);const [items,setItems]=useState<Booking[]>([]);const [state,setState]=useState("loading");const [retry,setRetry]=useState(0);const t=(en:string,cn:string)=>zh?cn:en;
 useEffect(()=>{const controller=new AbortController();async function load(){const current=++sequence.current;setState("loading");try{const response=await fetch(`/api/workspace/bookings?${date?`date=${date}`:""}${roomId?`&room=${roomId}`:""}`,{cache:"no-store",signal:controller.signal});const body=await response.json();if(!response.ok)throw new Error();if(!controller.signal.aborted&&current===sequence.current){setItems(body.bookings);setState("ready");}}catch{if(!controller.signal.aborted&&current===sequence.current)setState("error");}}void load();const focus=()=>void load();window.addEventListener("focus",focus);return()=>{controller.abort();window.removeEventListener("focus",focus);};},[date,roomId,retry]);
 const visible=date?items.filter(item=>item.status!=="cancelled"):items;
 useEffect(()=>{if(state!=="ready")return;const locate=()=>{const hash=window.location.hash.slice(1);if(!/^booking-[a-f0-9-]{36}$/i.test(hash))return;const target=document.getElementById(hash);if(target){const detail=target.querySelector("details");if(detail)detail.open=true;target.scrollIntoView({block:"center",behavior:"instant"});target.focus({preventScroll:true});}};locate();window.addEventListener("hashchange",locate);return()=>window.removeEventListener("hashchange",locate);},[state,items]);
 return <section className="workspace-section workspace-orders"><div className="native-section-head"><h2>{date?t("Arrivals & departures","入住与离店安排"):t("Bookings","预订订单")}</h2><button className="inventory-text" type="button" onClick={()=>setRetry(v=>v+1)}>{t("Refresh","刷新")}</button></div>{!date&&propertyId&&<p><Link className="room-add-link" href={`/guest?property=${propertyId}`} target="_blank" rel="noopener noreferrer">{t("Open guest booking page","查看客人预订页")} ↗</Link></p>}
 {state==="loading"?<p role="status">{t("Loading bookings…","正在读取订单…")}</p>:state==="error"?<p role="alert">{t("Bookings are unavailable. Please retry.","暂时无法读取订单，请重试。")}</p>:!visible.length?<p className="inventory-help">{date?t("No arrivals or departures this day.","这一天暂无入住或离店安排。"):t("No bookings yet.","暂无预订订单。客人预订后会自动出现在这里。")}</p>:<div className="workspace-booking-list">{visible.map(item=><article className={`room-type-summary workspace-booking ${item.status==="cancelled"?"booking-cancelled":item.refund_result==="review_pending"?"booking-review":"booking-confirmed"}`} id={`booking-${item.id}`} tabIndex={-1} key={item.id}><details className="booking-disclosure"><summary><div className="booking-summary-copy"><strong>{item.room_number} · {item.guest_name}</strong><small>{item.type_name} · {item.arrival} — {item.departure}</small>{date?<small>{item.arrival===date?t("Arrival expected · ","预计到店 · ")+item.expected_arrival:""}{item.departure===date?t("Departure scheduled · time not recorded","计划离店 · 时间未记录"):""}</small>:<small>¥{item.total} · {item.status==="cancelled"?t("Cancelled","已取消"):item.refund_result==="review_pending"?t("Cancellation needs review","取消申请待审核"):t("Confirmed · not checked in","已确认 · 未办理入住")}</small>}</div><span className="booking-detail-action">{t("Details","详情")}<ChevronDown size={16} aria-hidden="true"/></span></summary>
 <dl className="booking-detail-fields">
 <div><dt>{t("Room","客房")}</dt><dd>{item.room_number} · {item.type_name}</dd></div>
 <div><dt>{t("Guest","入住人")}</dt><dd>{item.guest_name}</dd></div>
 <div><dt>{t("Arrival date","入住日期")}</dt><dd>{item.arrival}</dd></div>
 <div><dt>{t("Departure date","离店日期")}</dt><dd>{item.departure}</dd></div>
 <div><dt>{t("Nights","住宿晚数")}</dt><dd>{Math.round((Date.parse(item.departure)-Date.parse(item.arrival))/86400000)}</dd></div>
 <div><dt>{t("Expected arrival","预计到店")}</dt><dd>{item.expected_arrival||t("Not recorded","未记录")}</dd></div>
 <div><dt>{t("Booking amount","预订金额")}</dt><dd>¥{item.total}</dd></div>
 {item.created_at&&<div><dt>{t("Booked at","下单时间")}</dt><dd>{new Date(item.created_at).toLocaleString(zh?"zh-CN":"en-GB",{timeZone:"Asia/Shanghai"})}</dd></div>}
 <div><dt>{t("Booking ID","订单编号")}</dt><dd>{item.id}</dd></div>
 </dl><p className="booking-detail-note">{item.status==="cancelled"?t("This reservation is cancelled. No payment or refund is processed here.","此预订已取消。这里未进行收款或资金退款。"):item.refund_result==="review_pending"?t("Cancellation is awaiting review; the reservation still holds the room.","取消申请待审核，目前仍保留预订房量。"):t("A confirmed reservation does not mean the guest has checked in or paid.","预订已确认，不代表已办理入住或已收款。")}</p>
 </details></article>)}</div>}
 </section>;
}
