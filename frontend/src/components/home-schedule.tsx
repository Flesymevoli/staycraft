"use client";
import { useEffect, useState } from "react";

type Event = { id: string; room: string; kind: "checkin" | "checkout"; date: string; time: string | null; time_basis: string };
const prototypeEvents: Event[] = [
  {id:"demo-out",room:"201",kind:"checkout",date:"2026-09-17",time:null,time_basis:"not_recorded"},
  {id:"demo-in",room:"102",kind:"checkin",date:"2026-09-17",time:"14:00",time_basis:"standard_policy"},
];

export function HomeSchedule({ zh }: { zh: boolean }) {
  const [selectedDay, setSelectedDay]=useState(17);
  const [open,setOpen]=useState(false);
  const [result,setResult]=useState<{items:Event[];status:"loading"|"ready"|"error"}>({items:[],status:"loading"});
  const [revision,setRevision]=useState(0);
  const t=(en:string,cn:string)=>zh?cn:en;
  useEffect(()=>{
    const controller=new AbortController();
    fetch("/api/local/schedule",{signal:controller.signal,cache:"no-store"}).then(async response=>{
      if (!response.ok && response.status!==404) throw new Error();
      const items=response.status===404?prototypeEvents:(await response.json() as {items:Event[]}).items;
      if (!Array.isArray(items)) throw new Error();
      setResult({items,status:"ready"});
    }).catch(()=>{if(!controller.signal.aborted)setResult({items:[],status:"error"});});
    return()=>controller.abort();
  },[revision]);
  const items=result.items.filter(item=>Number(item.date.slice(-2))===selectedDay);
  return <section className="native-calendar-section" aria-label={t("September 2026 schedule", "2026 年 9 月日程")}>
    <div className="native-section-head"><h2>{t("September 2026", "2026 年 9 月")}</h2></div>
    <div className="native-dates">{Array.from({length:17},(_,i)=>i+14).map(day=>{
      const selected=day===selectedDay;
      const date=new Date(2026,8,day);
      return <div className="native-date" key={day}>
        <span>{date.toLocaleDateString(zh?"zh-CN":"en-US",{weekday:"short"})}</span>
        <button type="button" className={selected?"is-selected":""} aria-pressed={selected} aria-expanded={selected&&open} aria-controls="native-schedule" aria-label={date.toLocaleDateString(zh?"zh-CN":"en-US")} onClick={()=>{
          if(selected) setOpen(!open);
          else { setSelectedDay(day); setOpen(true); }
        }}>{day}</button>
        <i className={result.items.some(item=>Number(item.date.slice(-2))===day)?"has-event":""} aria-hidden="true"/>
      </div>;
    })}</div>
    {open && <div id="native-schedule" className="native-schedule">
      <div className="native-schedule-title"><strong>{new Date(2026,8,selectedDay).toLocaleDateString(zh?"zh-CN":"en-US",{month:"short",day:"numeric",weekday:"short"})}</strong><span>{result.status==="ready"?`${items.length} ${t("events","项日程")}`:"—"}</span></div>
      {result.status==="loading"?<p role="status">{t("Loading reservation dates…","正在读取订单日程…")}</p>:result.status==="error"?<p role="alert">{t("Could not load the schedule.","日程读取失败。 ")}<button type="button" className="native-soft-link" onClick={()=>{setResult({items:[],status:"loading"});setRevision(n=>n+1);}}>{t("Retry","重试")}</button></p>:items.length?items.map(event=><div className="native-event" key={event.id}>
        <time>{event.time??"—"}</time><div><strong>{event.kind==="checkin"?t("Guest check-in","客人入住"):t("Guest check-out","客人退房")}</strong><small>{t("Room","房间")} {event.room} · {t("Sample reservation","示例预订")}{event.time_basis==="standard_policy"?t(" · Standard time"," · 常规时间"):t(" · Time not recorded"," · 时间未记录")}</small></div>
      </div>):<p className="native-muted">{t("No events for this date.","这一天没有日程。")}</p>}
    </div>}
  </section>;
}
