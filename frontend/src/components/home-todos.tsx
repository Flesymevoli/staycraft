"use client";
import {useEffect,useRef,useState} from "react";
import Link from "next/link";
import {useBookingStays} from "./booking-stays";
import {ChevronRight,LogIn,LogOut} from "lucide-react";
type Booking={external_snapshot?:{status?:string}|null;id:string;room_id:string;room_number:string;arrival:string;departure:string;expected_arrival:string;status:string};
export function HomeTodos({date,today,zh}:{date:string;today:string;zh:boolean}){
 const stays=useBookingStays();const stayFor=(id:string)=>stays.ready?stays.bookings.find(b=>b.id===id)?.stay_state:undefined;
 const [result,setResult]=useState<{date:string;bookings:Booking[]}|null>(null),[state,setState]=useState("loading"),[retry,setRetry]=useState(0),[expanded,setExpanded]=useState(false);const sequence=useRef(0);
 const t=(en:string,cn:string)=>zh?cn:en;
 useEffect(()=>{const controller=new AbortController();async function load(){const current=++sequence.current;try{const response=await fetch(`/api/workspace/bookings?date=${date}`,{cache:"no-store",signal:controller.signal});const body=await response.json();if(!response.ok||!Array.isArray(body.bookings))throw new Error();if(!controller.signal.aborted&&current===sequence.current){setResult({date,bookings:body.bookings});setState("ready");}}catch{if(!controller.signal.aborted&&current===sequence.current)setState("error");}}
  void load();const focus=()=>void load();window.addEventListener("focus",focus);window.addEventListener("staycraft-stays-changed",focus);return()=>{controller.abort();window.removeEventListener("focus",focus);window.removeEventListener("staycraft-stays-changed",focus);};
 },[date,retry]);
 const confirmed=state==="ready"&&stays.ready?(result?.date===date?result.bookings:[]).filter(booking=>booking.status==="confirmed"&&stayFor(booking.id)!=="completed"):[];
 const arrivals=confirmed.filter(booking=>booking.arrival===date&&stayFor(booking.id)!=="checked_in"),departures=confirmed.filter(booking=>booking.departure===date);
 const rows=[
  ...arrivals.map(booking=>({key:`arrival-${booking.id}`,room:booking.room_number||t("Unassigned","待分房"),label:booking.expected_arrival?t(`Expected arrival · ${booking.expected_arrival}`,`预计到店 · ${booking.expected_arrival}`):t("Expected arrival · time not recorded","预计到店 · 时间未记录"),kind:"arrival",Icon:LogIn,href:`/app/work#booking-${booking.id}`})),
  ...departures.map(booking=>({key:`departure-${booking.id}`,room:booking.room_number||t("Unassigned","待分房"),label:t("Departure scheduled","计划离店"),kind:"departure",Icon:LogOut,href:`/app/work#booking-${booking.id}`})),
 ];
 const visibleRows=rows;
 const loading=(state!=="error"&&result?.date!==date)||state==="loading"||(!stays.ready&&!stays.failed),failed=state==="error"||stays.failed;
 const taskTitle=(kind:string)=>kind==="arrival"?(date===today?t("Guest arriving today","客人待入住"):t("Scheduled arrival","计划入住")):(date===today?t("Guest departing today","客人待退房"):t("Scheduled departure","计划退房"));
 const taskAction=(kind:string)=>date!==today?t("View booking","查看订单"):kind==="arrival"?t("Check in","办理入住"):t("Check out","办理退房");
 return <section className="home-schedule-preview home-todos home-todos-actionable" aria-label={t("Daily to-dos","当日待办")}>
  <div className="native-section-head"><h2>{t("Daily to-dos","当日待办")}</h2><button className="inventory-text" aria-label={t("Refresh to-dos","刷新待办")} type="button" onClick={()=>{setState("loading");setRetry(v=>v+1);stays.retry();}}>{t("Refresh","刷新")}</button></div>
  {loading?<p className="home-todos-feedback" role="status">{t("Loading to-dos…","正在读取待办…")}</p>:<>
   <div className="home-todos-counts"><span>{t("Arrivals","到店")} <b>{state==="error"||stays.failed?"—":arrivals.length}</b></span><span>{t("Departures","离店")} <b>{state==="error"||stays.failed?"—":departures.length}</b></span></div>
   {failed&&<p className="home-todos-feedback" role="alert">{t("Some to-dos could not be loaded. Please retry.","部分待办暂时无法读取，请刷新重试。")}</p>}
   {!visibleRows.length&&!failed?<p className="home-todos-feedback">{t("Nothing scheduled for this day.","这一天暂无待办安排。")}</p>:<div className="home-todos-list">{(expanded?visibleRows:visibleRows.slice(0,3)).map(({key,room,label,kind,Icon})=><Link className={`home-todo-row home-todo-${kind}`} href={`/app/bookings/${key.slice(key.indexOf("-")+1)}`} key={key}><span className="home-todo-icon"><Icon size={20} aria-hidden="true"/></span><span className="home-todo-copy"><b><strong>{room}</strong><span aria-hidden="true"> · </span>{taskTitle(kind)}</b><small>{label}</small></span><span className="home-todo-action">{taskAction(kind)}<ChevronRight size={15} aria-hidden="true"/></span></Link>)}</div>}
   {visibleRows.length>3&&<button type="button" className="home-todos-more" aria-expanded={expanded} onClick={()=>setExpanded(v=>!v)}>{expanded?t("Show less","收起"):t(`Show ${visibleRows.length-3} more`,`展开其余 ${visibleRows.length-3} 项`)}</button>}
  </>}
 </section>;
}
