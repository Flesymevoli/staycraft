"use client";
import {useState} from "react";
import {useSearchParams} from "next/navigation";
import {bookingPeriod} from "@/lib/booking-period";
import Link from "next/link";
import {WorkspaceAnalysis} from "./workspace-analysis";
import {BookingImport} from "./booking-import";
import {WorkspaceBookings} from "./workspace-bookings";
import {RoomPreviewBoard,RoomTypesPreview} from "./room-preview";
import {WorkUrgentTodos} from "./home-todos";
import {OperationActivity} from "./operation-activity";

export function BusinessDataWorkspace({scope,zh,initialTab="overview"}:{scope:string;zh:boolean;initialTab?:"overview"|"orders"}){
 const [tab,setTab]=useState<"overview"|"orders"|"rooms">(initialTab);
 const params=useSearchParams();
 const period=bookingPeriod({start:params.get('start'),end:params.get('end')});
 const initialRange=period?.start&&period.end?{start:period.start,end:period.end}:undefined;
 const t=(en:string,cn:string)=>zh?cn:en;
 return <div className="business-data-workspace">
  <div className="wb-segmented" role="group" aria-label={t("Business data views","经营数据视图")}>
   {([{id:"overview",label:t("Overview","数据概况")},{id:"orders",label:t("Bookings & import","订单与导入")},{id:"rooms",label:t("Room inventory","房型房量")}] as const).map(item=><button key={item.id} type="button" aria-pressed={tab===item.id} onClick={()=>setTab(item.id)}>{item.label}</button>)}
  </div>
  {tab==="overview"&&<WorkspaceAnalysis key={`${initialRange?.start}:${initialRange?.end}`} scope={scope} zh={zh} initialRange={initialRange}/>}
  {tab==="orders"&&<div className="wb-data-orders"><BookingImport zh={zh}/><div className="wb-data-list-heading"><h2>{t("Booking records","预订记录")}</h2><Link href="/app/bookings/history">{t("All records","全部记录")} →</Link></div><WorkspaceBookings zh={zh} pendingOnly/><details className="wb-disclosure"><summary>{t("Daily arrangements & activity","日常安排与操作记录")}</summary><WorkUrgentTodos scope={scope} zh={zh}/><OperationActivity zh={zh}/></details></div>}
  {tab==="rooms"&&<div className="wb-data-rooms"><RoomTypesPreview scope={scope} zh={zh}/><details className="wb-disclosure" open><summary>{t("Available inventory & room records","可用房量与客房记录")}</summary><RoomPreviewBoard scope={scope} zh={zh}/></details></div>}
 </div>;
}
