"use client";
import {useEffect,useRef,useState} from "react";
import Link from "next/link";
import {X} from "lucide-react";
import {useRoomPreview} from "./room-preview-store";
import {useBookingStays,changeBookingStay} from "./booking-stays";
export function RoomActions({scope,roomId,zh,reserved,onClose,readOnly=false}:{scope:string;roomId:string;zh:boolean;reserved:boolean|null;onClose:()=>void;readOnly?:boolean}){
 const stays=useBookingStays();const [stayBusy,setStayBusy]=useState(false);
 const {data,writing,unavailable,reload}=useRoomPreview(scope),dialog=useRef<HTMLDialogElement>(null);
 const [error,setError]=useState(false);
 const room=data.inventory.rooms.find(r=>r.id===roomId),type=data.inventory.types.find(t=>t.id===room?.typeId);
 const occupied=stays.bookings.find(b=>b.room_id===roomId&&b.stay_state==="checked_in"),today=new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Shanghai",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date()),arrival=stays.bookings.find(b=>b.room_id===roomId&&b.stay_state==="pending"&&b.status==="confirmed"&&b.refund_result!=="review_pending"&&b.arrival<=today&&b.departure>today);
 async function act(){const booking=occupied||arrival;if(!booking||stayBusy)return;setStayBusy(true);setError(false);try{if(!await changeBookingStay(booking.id,occupied?"checkout":"checkin"))setError(true);await reload()}catch{setError(true)}finally{setStayBusy(false)}}
 const t=(en:string,cn:string)=>zh?cn:en;
 useEffect(()=>{const node=dialog.current;node?.showModal();return()=>node?.close()},[]);
 return <dialog ref={dialog} className="room-action-sheet" aria-labelledby="room-action-title" onCancel={onClose} onClick={e=>{if(e.target===e.currentTarget)onClose()}}><div className="room-action-content"><header><div><h2 id="room-action-title">{room?.number||t("Room","客房")}</h2><p>{type?.name}</p></div><button type="button" className="inventory-text" aria-label={t("Close","关闭")} onClick={onClose}><X size={20}/></button></header>
 {room?<><p>{!room.active?t("Inactive","停用"):!stays.ready?(stays.failed?t("Check status","状态待核对"):t("Loading…","读取中…")):occupied?t("Occupied","已入住"):reserved?t("Reserved","已预订"):reserved===null?t("Status unavailable","预订状态待核对"):t("Available","空闲")}</p>
 {stays.failed&&<p role="alert">{t("Stay status unavailable. Reopen to retry.","暂时无法读取入住状态，请重新打开重试。")}</p>}
 {!readOnly&&stays.ready&&(occupied||arrival)&&<button type="button" className="native-primary" disabled={stayBusy||writing||unavailable||(!occupied&&!room.active)} onClick={()=>void act()}>{stayBusy?t("Saving…","正在保存…"):occupied?t("Check out","办理退房"):t("Check in","确认入住")}</button>}
 <Link className="room-action-details" href={`/app/rooms/${roomId}`}>{t("Room details","查看客房详情")} →</Link></>:<p>{t("Room no longer available.","该客房已不存在。")}</p>}
 {error&&<p role="alert">{t("Could not save. Reopen the room to check its latest status.","保存未成功，请重新打开客房核对最新状态。")}</p>}
 </div></dialog>;
}
