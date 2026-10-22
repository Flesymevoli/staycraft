"use client";
import {useEffect,useRef,useState} from "react";
import Link from "next/link";
import {ArrowUpRight,Brush,LogIn,LogOut} from "lucide-react";
import {useRoomPreview} from "./room-preview-store";
type Booking={id:string;room_id:string;room_number:string;arrival:string;departure:string;expected_arrival:string;status:string};
export function HomeTodos({date,today,scope,zh}:{date:string;today:string;scope:string;zh:boolean}){
 const inventory=useRoomPreview(scope);const [bookings,setBookings]=useState<Booking[]>([]),[state,setState]=useState("loading"),[retry,setRetry]=useState(0),[expanded,setExpanded]=useState(false);const sequence=useRef(0);
 const t=(en:string,cn:string)=>zh?cn:en;
 useEffect(()=>{const controller=new AbortController();async function load(){const current=++sequence.current;try{const response=await fetch(`/api/workspace/bookings?date=${date}`,{cache:"no-store",signal:controller.signal});const body=await response.json();if(!response.ok||!Array.isArray(body.bookings))throw new Error();if(!controller.signal.aborted&&current===sequence.current){setBookings(body.bookings);setState("ready");}}catch{if(!controller.signal.aborted&&current===sequence.current)setState("error");}}
  void load();const focus=()=>void load();window.addEventListener("focus",focus);return()=>{controller.abort();window.removeEventListener("focus",focus);};
 },[date,retry]);
 const cleanRooms=date===today&&inventory.ready&&!inventory.unavailable?inventory.data.inventory.rooms.filter(room=>room.active&&room.housekeeping==="dirty"):[];
 const confirmed=state==="ready"?bookings.filter(booking=>booking.status==="confirmed"):[];
 const arrivals=confirmed.filter(booking=>booking.arrival===date),departures=confirmed.filter(booking=>booking.departure===date);
 const rows=[
  ...cleanRooms.map(room=>({key:`clean-${room.id}`,room:room.number,label:t("To clean","待清洁"),kind:"clean",Icon:Brush,href:`/app/rooms/${room.id}`})),
  ...arrivals.map(booking=>({key:`arrival-${booking.id}`,room:booking.room_number,label:booking.expected_arrival?t(`Expected arrival · ${booking.expected_arrival}`,`预计到店 · ${booking.expected_arrival}`):t("Expected arrival · time not recorded","预计到店 · 时间未记录"),kind:"arrival",Icon:LogIn,href:`/app/rooms/${booking.room_id}`})),
  ...departures.map(booking=>({key:`departure-${booking.id}`,room:booking.room_number,label:t("Departure scheduled","计划离店"),kind:"departure",Icon:LogOut,href:`/app/rooms/${booking.room_id}`})),
 ];
 const loading=state==="loading"||(date===today&&!inventory.ready),failed=state==="error"||(date===today&&inventory.unavailable);
 return <section className="home-schedule-preview home-todos" aria-label={t("Daily to-dos","当日待办")}>
  <div className="native-section-head"><h2>{t("Daily to-dos","当日待办")}</h2><button className="inventory-text" aria-label={t("Refresh to-dos","刷新待办")} type="button" onClick={()=>{setState("loading");setRetry(v=>v+1);void inventory.reload();}}>{t("Refresh","刷新")}</button></div>
  {loading?<p className="home-todos-feedback" role="status">{t("Loading to-dos…","正在读取待办…")}</p>:<>
   <div className="home-todos-counts">{date===today&&<span>{t("To clean","待清洁")} <b>{inventory.unavailable?"—":cleanRooms.length}</b></span>}<span>{t("Arrivals","到店")} <b>{state==="error"?"—":arrivals.length}</b></span><span>{t("Departures","离店")} <b>{state==="error"?"—":departures.length}</b></span></div>
   {failed&&<p className="home-todos-feedback" role="alert">{t("Some to-dos could not be loaded. Please retry.","部分待办暂时无法读取，请刷新重试。")}</p>}
   {!rows.length&&!failed?<p className="home-todos-feedback">{t("Nothing scheduled for this day.","这一天暂无待办安排。")}</p>:<div className="home-todos-list">{(expanded?rows:rows.slice(0,3)).map(({key,room,label,kind,Icon,href})=><Link className={`home-todo-row home-todo-${kind}`} href={href} key={key}><Icon size={17} aria-hidden="true"/><strong>{room}</strong><span>{label}</span><ArrowUpRight size={14} aria-hidden="true"/></Link>)}</div>}
   {rows.length>3&&<button type="button" className="home-todos-more" aria-expanded={expanded} onClick={()=>setExpanded(v=>!v)}>{expanded?t("Show less","收起"):t(`Show ${rows.length-3} more`,`展开其余 ${rows.length-3} 项`)}</button>}
  </>}
 </section>;
}
