"use client";
import {useEffect,useRef,useState} from "react";
import Link from "next/link";
import {Search,X} from "lucide-react";

const destinations = [
  ["/app","工作台 诊断 AI","Workbench Diagnosis AI"],
  ["/app/work","订单 导入 CSV","Bookings Import CSV"],
  ["/app/analysis","经营数据 收入 指标","Business data Revenue Metrics"],
  ["/app/explore#desktop-collection","市场 报价 采集","Market Quotes Collector"],
  ["/app/promotion","推广 文案 草稿","Promotion Copy Drafts"],
  ["/app/mine#room-types","房型 房间 价格","Rooms Inventory Rates"],
  ["/app/mine","民宿资料 账户","Property Account"],
];

export function DesktopSearch({zh}:{zh:boolean}) {
  const dialog=useRef<HTMLDialogElement>(null);
  const input=useRef<HTMLInputElement>(null);
  const [query,setQuery]=useState("");
  const open=()=>{dialog.current?.showModal();input.current?.focus()};
  useEffect(()=>{
    const key=(event:KeyboardEvent)=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="k"){event.preventDefault();open()}};
    window.addEventListener("keydown",key);
    return()=>window.removeEventListener("keydown",key);
  },[]);
  const matches=destinations.filter(entry=>entry.slice(1).join(" ").toLowerCase().includes(query.trim().toLowerCase()));
  return <div className="desktop-search">
    <button className="desktop-search-trigger" onClick={open}><Search size={15}/><span>{zh?"搜索功能、订单与房型入口":"Find pages and tools"}</span><kbd>Ctrl K</kbd></button>
    <dialog ref={dialog} className="desktop-search-dialog" aria-label={zh?"搜索功能":"Find a tool"} onClick={event=>{if(event.target===dialog.current)dialog.current?.close()}}>
      <header><Search size={18}/><input ref={input} aria-label={zh?"搜索功能":"Find a tool"} placeholder={zh?"输入订单、房型、采集…":"Bookings, rooms, collector…"} value={query} onChange={event=>setQuery(event.target.value)}/><button aria-label={zh?"关闭":"Close"} onClick={()=>dialog.current?.close()}><X size={18}/></button></header>
      <nav>{matches.map(([href,cn,en])=><Link key={href} href={href} onClick={()=>dialog.current?.close()}>{zh?cn:en}</Link>)}</nav>
      {!matches.length&&<p>{zh?"没有匹配的功能":"No matching tools"}</p>}
    </dialog>
  </div>;
}
