"use client";
import {useEffect,useRef,useState} from "react";
export type BookingMetrics={source:string;as_of:string;period_days:number;period_start:string;period_end:string;active_rooms:number;capacity_room_nights:number;booked_room_nights:number;inactive_booked_room_nights:number;available_room_nights:number;booked_pct:number|null;rate_min:number|null;rate_max:number|null;daily:{date:string;booked:number;capacity:number;available:number;booked_pct:number|null}[]};
export function useBookingMetrics(days:7|28,scope:string){
 const [data,setData]=useState<BookingMetrics|null>(null),[status,setStatus]=useState("loading"),[revision,setRevision]=useState(0),[dataScope,setDataScope]=useState(scope);const sequence=useRef(0);
 useEffect(()=>{const controller=new AbortController();async function load(){const current=++sequence.current;setStatus("loading");try{const response=await fetch(`/api/workspace/metrics?days=${days}`,{cache:"no-store",signal:controller.signal});const body=await response.json();if(!response.ok)throw new Error();if(!controller.signal.aborted&&current===sequence.current){setData(body);setDataScope(scope);setStatus("ready");}}catch{if(!controller.signal.aborted&&current===sequence.current){setData(null);setStatus("error")}}}void load();const focus=()=>void load();window.addEventListener("focus",focus);return()=>{controller.abort();window.removeEventListener("focus",focus);};},[days,scope,revision]);
 const matches=data?.period_days===days&&dataScope===scope;
 return {data:status==="ready"&&matches?data:null,status:status==="ready"&&!matches?"loading":status,retry:()=>setRevision(v=>v+1)};
}
