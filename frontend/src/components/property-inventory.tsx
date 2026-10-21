"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { BedDouble, Check, ImagePlus, Plus, RefreshCw, Settings2 } from "lucide-react";
import { emptyInventory, validateInventory, type PropertyInventory, type RoomType, type PropertyRoom } from "@/lib/property-inventory";
import "./property-inventory.css";
import "./room-board.css";

async function photoBytes(file: File) {
  if(!["image/jpeg","image/png","image/webp"].includes(file.type) || file.size>12*1024*1024)throw new Error("invalid_photo");
  const image=await createImageBitmap(file);
  try {
    const canvas=document.createElement("canvas");const ratio=Math.min(1,960/Math.max(image.width,image.height));
    canvas.width=Math.max(1,Math.round(image.width*ratio));canvas.height=Math.max(1,Math.round(image.height*ratio));
    canvas.getContext("2d")!.drawImage(image,0,0,canvas.width,canvas.height);
    const blob=await new Promise<Blob | null>(resolve=>canvas.toBlob(resolve,"image/webp",.78));
    if(!blob || blob.type!=="image/webp" || blob.size>262144)throw new Error("invalid_photo");
    return blob;
  }finally{image.close();}
}

export function PropertyInventoryPanel({zh,mode="edit",onCount}:{zh:boolean;mode?:"edit"|"board";onCount?:(count:number|null)=>void}) {
  const t=(en:string,cn:string)=>zh?cn:en;
  const [inventory,setInventory]=useState<PropertyInventory>(emptyInventory);
  const [revision,setRevision]=useState<string|null>(null);
  const [state,setState]=useState<"loading"|"ready"|"error"|"unassigned">("loading");
  const [error,setError]=useState("");const [busy,setBusy]=useState("");const [saved,setSaved]=useState(false);
  const [reload,setReload]=useState(0);const [template,setTemplate]=useState("double");
  const [selectedRoom,setSelectedRoom]=useState("");
  const [savedRoomIds,setSavedRoomIds]=useState<string[]>([]);
  const dirty=useRef(false);
  const [needsReload,setNeedsReload]=useState(false);
  useEffect(()=>{
    const controller=new AbortController();
    fetch("/api/workspace/inventory",{cache:"no-store",signal:controller.signal}).then(async response=>{
      const body=await response.json();if(!response.ok)throw new Error(body.error || "inventory_unavailable");
      const parsed=validateInventory(body.inventory);if(!parsed)throw new Error("inventory_unavailable");
      if(!dirty.current){setInventory(parsed);setSavedRoomIds(parsed.rooms.map(r=>r.id));setRevision(body.revision);setError("");setNeedsReload(false);}
      else if(parsed.types.length || parsed.rooms.length){setNeedsReload(true);setError(t("Saved room settings already exist. Your input is retained. Reload saved settings before editing them.","云端已有房间设置，当前输入已保留。请先重新读取已保存设置，再继续编辑，避免覆盖原资料。"));}
      else {setRevision(body.revision);setNeedsReload(false);}
      setState("ready");onCount?.(parsed.rooms.filter(r=>r.active).length);
    }).catch(e=>{if(!controller.signal.aborted){setState(e.message==="property_not_linked"?"unassigned":"error");onCount?.(null);}});
    return()=>controller.abort();
  // Language only changes presentation; do not reload or replace in-progress edits.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[reload,onCount]);
  const change=(next:PropertyInventory)=>{dirty.current=true;setInventory(next);setSaved(false);if(!needsReload)setError("");};
  const editType=(id:string,patch:Partial<RoomType>)=>change({...inventory,types:inventory.types.map(r=>r.id===id?{...r,...patch}:r)});
  const editRoom=(id:string,patch:Partial<PropertyRoom>)=>change({...inventory,rooms:inventory.rooms.map(r=>r.id===id?{...r,...patch}:r)});
  const available=state==="ready" && !busy;
  const editable=state!=="loading" && !busy;
  function addType(){
    const presets=template==="twin"?{name:t("Twin room","双床房"),beds:t("2 single beds","2 张单人床"),capacity:2}:template==="family"?{name:t("Family room","家庭房"),beds:t("1 double + 1 single bed","1 张大床 + 1 张单人床"),capacity:3}:{name:t("Double room","大床房"),beds:t("1 double bed","1 张大床"),capacity:2};
    change({...inventory,types:[...inventory.types,{...presets,id:crypto.randomUUID(),price:0,photo:""}]});
  }
  async function upload(id:string,file?:File){
    if(!file)return;setBusy(id);setError("");
    try{
      const blob=await photoBytes(file);const response=await fetch("/api/workspace/room-photo",{method:"POST",headers:{"Content-Type":"image/webp"},body:blob});
      const body=await response.json();if(!response.ok)throw new Error("photo_unavailable");editType(id,{photo:body.path});
    }catch{setError(t("Photo not uploaded. Use a JPG, PNG or WebP under 12 MB; try a smaller photo.","图片未上传成功，请使用 12 MB 以内的 JPG、PNG、WebP，或换一张较小的图片重试。"));}
    finally{setBusy("");}
  }
  async function save(event:React.FormEvent){
    event.preventDefault();setSaved(false);setError("");
    if(state!=="ready" || needsReload){setError(t("Connect and load saved settings before saving. Your input is retained.","请先恢复连接并读取已保存设置，再保存。当前输入已保留。"));return;}
    const parsed=validateInventory(inventory);if(!parsed){setError(t("Check room names, prices and unique room numbers. Every room must have a room type.","请检查房型名称、价格和房号。房号不能重复，每个房间都需要所属房型。"));return;}
    setBusy("save");
    try{
      const response=await fetch("/api/workspace/inventory",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({inventory:parsed,revision})});
      const body=await response.json();if(!response.ok)throw new Error(body.error);
      dirty.current=false;setInventory(body.inventory);setSavedRoomIds(body.inventory.rooms.map((r:PropertyRoom)=>r.id));setRevision(body.revision);setSaved(true);
    }catch(e){setError(e instanceof Error && e.message==="inventory_changed"?t("Another page changed these rooms. Your input is retained; reload before saving again.","房间资料已在其他页面更新。当前输入已保留，请重新读取后再编辑保存。") : t("Not saved. Your input is still here. Please retry.","保存未成功，输入内容已保留，请重试。"));}
    finally{setBusy("");}
  }
  const status=state!=="ready" && <div className="inventory-status" role="status"><p>{state==="loading"?t("Loading room configuration…","正在读取房间配置…"):state==="unassigned"?t("You can prepare room types and numbers. Link a property before uploading photos or saving.","尚未关联民宿，可先编辑房型和房号；关联后才能上传图片和保存。"):t("You can prepare room types and numbers here. Uploading and saving need a connection; unsaved input stays on this page only.","暂时无法连接，可先编辑房型和房号；图片上传和保存需等待连接恢复。当前输入仅保留在本页。")}</p>{state!=="loading" && <button type="button" onClick={()=>{setState("loading");setReload(n=>n+1);}}><RefreshCw size={15}/>{t("Retry","重试")}</button>}</div>;

  if(mode==="board"){
    const room=inventory.rooms.find(r=>r.id===selectedRoom);
    return <section className="inventory-home room-board" aria-label={t("Your rooms","你的客房")}><div className="native-section-head"><h2>{t("Your rooms","客房概览")}</h2><Link href="/app/mine#rooms"><Settings2 size={14}/>{t("Manage","管理")}</Link></div>{status}{state==="ready" && (!inventory.rooms.length?<div className="inventory-status"><p>{t("Add your room types and room numbers to get started.","先添加房型和房号，这里就会显示你的客房。")}</p><Link className="native-primary" href="/app/mine#rooms">{t("Set up rooms","设置房间")}</Link></div>:<div className="room-board-surface"><div className="room-board-legend"><span>{t("Rooms","客房")} <b>{inventory.rooms.filter(r=>r.active).length}</b></span><span>{t("Cleaned","已清洁")} <b>{inventory.rooms.filter(r=>r.active&&r.housekeeping==="clean").length}</b></span><span>{t("To clean","待清洁")} <b>{inventory.rooms.filter(r=>r.active&&r.housekeeping==="dirty").length}</b></span></div>{Array.from(new Set(inventory.rooms.map(r=>r.floor))).map(floor=><div className="room-floor" key={floor}><span className="room-floor-label">{floor}</span><div className="room-grid">{inventory.rooms.filter(r=>r.floor===floor).map(r=><button key={r.id} type="button" className={`inventory-room ${!r.active?"is-inactive":r.housekeeping==="clean"?"is-clean":"is-dirty"}`} aria-pressed={selectedRoom===r.id} onClick={()=>setSelectedRoom(selectedRoom===r.id?"":r.id)}><strong>{r.number}</strong><span>{!r.active?t("Inactive","停用"):r.housekeeping==="clean"?t("Cleaned","已清洁"):t("To clean","待清洁")}</span></button>)}</div></div>)}{room && <div className="inventory-room-detail"><strong>{room.number} · {inventory.types.find(r=>r.id===room.typeId)?.name}</strong><p>{room.floor} · {t("Manage room details and cleaning status in Mine.","房间信息和清洁状态可在「我的」中修改。")}</p><Link href="/app/mine#rooms">{t("Edit room","编辑房间")} →</Link></div>}<p className="room-board-hint">{t("Saved room configuration · Reservations are not connected yet.","已保存的房间配置 · 尚未接入预订，不推测入住状态")}</p></div>)}</section>;
  }
  return <section className="inventory-editor" id="rooms" aria-label={t("Room types and rooms","房型与房间")}><div className="native-section-head"><h2>{t("Room types & rooms","房型与房间")}</h2><span>{t("Direct setup","直接设置")}</span></div><p className="inventory-help">{t("Choose a template, set a price, then add your room numbers. No document needed.","选房型模板，填写价格，再添加房号。不需要准备文档。")}</p>{status}<form onSubmit={save}>
    <fieldset disabled={!editable} className="inventory-fields"><div className="inventory-add"><label>{t("Room type template","房型模板")}<select aria-label={t("Room type template","房型模板")} value={template} onChange={e=>setTemplate(e.target.value)}><option value="double">{t("Double room","大床房")}</option><option value="twin">{t("Twin room","双床房")}</option><option value="family">{t("Family room","家庭房")}</option></select></label><button type="button" className="inventory-soft" disabled={inventory.types.length>=20} onClick={addType}><Plus size={16}/>{t("Add room type","添加房型")}</button></div>
    {inventory.types.map((type,index)=><article key={type.id} className="inventory-type"><div className="inventory-type-head"><BedDouble size={20}/><strong>{type.name || t("Room type","房型")}</strong><button type="button" className="inventory-text" onClick={()=>{if(inventory.rooms.some(r=>r.typeId===type.id)){setError(t("Move all rooms to another type first, including inactive rooms.","请先修改该房型下所有房间的所属房型，包括停用房间。"));return;}change({...inventory,types:inventory.types.filter(r=>r.id!==type.id)});}}>{t("Remove","移除")}</button></div>
      <label className="inventory-photo">{type.photo ? <Image unoptimized src={`/api/workspace/room-photo?path=${encodeURIComponent(type.photo)}`} alt={type.name} width={320} height={180}/> : <span><ImagePlus size={25}/>{t("Add a room photo","添加房型图片")}</span>}<input type="file" disabled={!available || needsReload} accept="image/jpeg,image/png,image/webp" aria-label={t(`Photo for room type ${index+1}`,`房型 ${index+1} 图片`)} onChange={e=>{void upload(type.id,e.target.files?.[0]);e.target.value="";}}/><small>{busy===type.id?t("Uploading…","正在上传…"):t("Choose / replace photo","选择或更换图片")}</small></label>
      <div className="inventory-input-grid"><label>{t("Name","房型名称")}<input required maxLength={60} value={type.name} onChange={e=>editType(type.id,{name:e.target.value})}/></label><label>{t("Nightly rate (CNY)","每晚价格（元）")}<input required type="number" min="0.01" max="99999" step="0.01" value={type.price || ""} placeholder={t("Set a price","填写价格")} onChange={e=>editType(type.id,{price:Number(e.target.value)})}/></label><label>{t("Beds","床型")}<input required maxLength={80} value={type.beds} onChange={e=>editType(type.id,{beds:e.target.value})}/></label><label>{t("Max guests","最多入住人数")}<input required type="number" min={1} max={12} step={1} value={type.capacity} onChange={e=>editType(type.id,{capacity:Number(e.target.value)})}/></label></div>
    </article>)}
    <div className="inventory-room-heading"><h3>{t("Room numbers","具体客房")}</h3><button type="button" className="inventory-soft" disabled={!inventory.types.length || inventory.rooms.length>=200} onClick={()=>change({...inventory,rooms:[...inventory.rooms,{id:crypto.randomUUID(),number:"",floor:t("Floor 1","1 楼"),typeId:inventory.types[0].id,housekeeping:"clean",active:true}]})}><Plus size={16}/>{t("Add room","添加房间")}</button></div>
    {!inventory.rooms.length && <p className="inventory-help">{t("Create a room type, then add rooms such as 101 and 102.","添加房型后，再添加 101、102 等实际房号。")}</p>}
    {inventory.rooms.map((room,index)=><article className="inventory-room-row" key={room.id}><div className="inventory-room-row-head"><strong>{room.number || t("New room","新房间")}</strong>{!savedRoomIds.includes(room.id) && <button type="button" className="inventory-text" onClick={()=>change({...inventory,rooms:inventory.rooms.filter(r=>r.id!==room.id)})}>{t("Remove","移除")}</button>}<label><input type="checkbox" checked={room.active} onChange={e=>editRoom(room.id,{active:e.target.checked})}/>{t("In use","启用")}</label></div><div className="inventory-input-grid"><label>{t("Room number","房号")}<input required maxLength={24} aria-label={t(`Room number ${index+1}`,`房间 ${index+1} 房号`)} value={room.number} onChange={e=>editRoom(room.id,{number:e.target.value})}/></label><label>{t("Floor / area","楼层 / 区域")}<input required maxLength={30} aria-label={t(`Floor ${index+1}`,`房间 ${index+1} 楼层`)} value={room.floor} onChange={e=>editRoom(room.id,{floor:e.target.value})}/></label><label>{t("Room type","所属房型")}<select aria-label={t(`Type ${index+1}`,`房间 ${index+1} 房型`)} value={room.typeId} onChange={e=>editRoom(room.id,{typeId:e.target.value})}>{inventory.types.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label><label>{t("Housekeeping","清洁状态")}<select aria-label={t(`Housekeeping ${index+1}`,`房间 ${index+1} 清洁状态`)} value={room.housekeeping} onChange={e=>editRoom(room.id,{housekeeping:e.target.value as "clean"|"dirty"})}><option value="clean">{t("Cleaned","已清洁")}</option><option value="dirty">{t("To clean","待清洁")}</option></select></label></div><small>{t("Disable unused rooms; their IDs and records are retained.","不使用的房间可以停用，保留原房间标识和记录。")}</small></article>)}
    </fieldset>
    {error && <p className="profile-error" role="alert">{error}</p>}{saved && <p className="profile-saved" role="status"><Check size={16}/>{t("Saved. Home now uses these rooms.","已保存，首页将显示这些房间。")}</p>}
    <div className="inventory-save"><button type="submit" className="native-primary" disabled={!available || needsReload}>{busy==="save"?t("Saving…","正在保存…"):t("Save rooms","保存房间设置")}</button><button type="button" className="inventory-text" disabled={!!busy} onClick={()=>{dirty.current=false;setNeedsReload(false);setState("loading");setSaved(false);setReload(n=>n+1);}}>{t("Reload saved settings","重新读取已保存设置")}</button></div>
  </form></section>;
}
