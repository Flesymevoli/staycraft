"use client";
import {useEffect,useState} from "react";
export type Stay={id:string;room_id:string;room_number:string;arrival:string;departure:string;status:string;refund_result:string|null;stay_state:"pending"|"checked_in"|"completed"};
const changed="staycraft-stays-changed";
export function useBookingStays(){const [bookings,setBookings]=useState<Stay[]>([]),[ready,setReady]=useState(false),[failed,setFailed]=useState(false);
 useEffect(()=>{const c=new AbortController();let sequence=0;async function load(){const n=++sequence;try{const r=await fetch("/api/workspace/stays",{cache:"no-store",signal:c.signal});const body=await r.json();if(!r.ok)throw new Error();if(!c.signal.aborted&&n===sequence){setBookings(body.bookings);setReady(true);setFailed(false)}}catch{if(!c.signal.aborted&&n===sequence){setFailed(true);setReady(false)}}}void load();const refresh=()=>void load();window.addEventListener(changed,refresh);window.addEventListener("focus",refresh);return()=>{c.abort();window.removeEventListener(changed,refresh);window.removeEventListener("focus",refresh)}},[]);
 return {bookings,ready,failed};
}
export async function changeBookingStay(booking:string,action:"checkin"|"checkout"){const response=await fetch("/api/workspace/stays",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({booking,action})});window.dispatchEvent(new Event(changed));return response.ok}
