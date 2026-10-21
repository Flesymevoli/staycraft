"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, BedDouble, CalendarDays, Check, ChevronDown, ChevronRight, Clock3, Coffee, House, MapPin, MessageCircle, Send, Sparkles, Users, Wifi } from "lucide-react";
import "./guest-client.css";

type View = "stay" | "book" | "orders" | "contact";
type BookingParams = { room?: string; arrival?: string; departure?: string; guests?: string };
type Order = { id: string; room: string; arrival: string; departure: string; guests: number; name: string; total: number; note: string; status: "pending" | "confirmed" };
type Message = { id: string; text: string; side: "guest" | "host"; order?: string };
const ORDER_KEY = "staycraft-guest-prototype-orders-v1";
const MESSAGE_KEY = "staycraft-guest-prototype-messages-v1";
const rooms = [
  { id: "garden", name: "花园大床房", subtitle: "推开窗，就是满眼绿意。", size: "28 m²", bed: "1 张 1.8 米大床", capacity: 2, price: 520, image: "/images/garden-stay-sample.webp", tag: "花园景观" },
  { id: "courtyard", name: "庭院双床房", subtitle: "留一点时间，在庭院里慢下来。", size: "32 m²", bed: "2 张 1.2 米单人床", capacity: 2, price: 580, image: "/images/courtyard-stay-sample.webp", tag: "独立庭院" },
];
function dateString(offset: number) { const d = new Date(); d.setDate(d.getDate() + offset); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
function validDate(value: string) { return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0,10) === value; }
function nights(a: string, b: string) { return validDate(a) && validDate(b) ? Math.round((Date.parse(b)-Date.parse(a))/86400000) : 0; }
function readable(value: string) { return `${Number(value.slice(5,7))}月${Number(value.slice(8,10))}日`; }
function isOrder(value: unknown): value is Order {
  if (!value || typeof value !== "object") return false;
  const o = value as Order;
  return typeof o.id === "string" && /^SC-[A-Z0-9-]+$/.test(o.id) && rooms.some(r=>r.id === o.room) && typeof o.name === "string" && typeof o.note === "string" && typeof o.arrival === "string" && typeof o.departure === "string" && validDate(o.arrival) && validDate(o.departure) && nights(o.arrival,o.departure)>0 && Number.isFinite(o.total) && Number.isInteger(o.guests) && o.guests>0 && o.guests<=2 && ["pending","confirmed"].includes(o.status);
}
function readArray<T>(key: string, validator: (v: unknown)=>v is T): T[] { const parsed: unknown = JSON.parse(localStorage.getItem(key) || "[]"); if (!Array.isArray(parsed)) throw new Error("Invalid demo data"); return parsed.filter(validator).slice(-50); }
function isMessage(value: unknown): value is Message { if(!value || typeof value !== "object") return false; const m=value as Message; return typeof m.id === "string" && typeof m.text === "string" && ["guest","host"].includes(m.side) && (m.order===undefined || typeof m.order === "string"); }

export function GuestClient({ view, bookingParams = {}, orderId }: { view: View; bookingParams?: BookingParams; orderId?: string }) {
  const [arrival,setArrival] = useState(bookingParams.arrival && validDate(bookingParams.arrival) ? bookingParams.arrival : "");
  const [departure,setDeparture] = useState(bookingParams.departure && validDate(bookingParams.departure) ? bookingParams.departure : "");
  const [guests,setGuests] = useState(bookingParams.guests === "1" ? 1 : 2);
  const [ready,setReady] = useState(false);
  const [orders,setOrders] = useState<Order[]>([]);
  const [messages,setMessages] = useState<Message[]>([]);
  const [storageError,setStorageError] = useState("");
  const [error,setError] = useState("");
  const [searched,setSearched] = useState(false);
  const [name,setName] = useState("");
  const [phone,setPhone] = useState("");
  const [note,setNote] = useState("");
  const [consent,setConsent] = useState(false);
  const [created,setCreated] = useState<Order | null>(null);
  const [expanded,setExpanded] = useState<string | null>(null);
  const [draft,setDraft] = useState("");
  const [filter,setFilter] = useState("all");
  const selectedRoom = rooms.find(r=>r.id === bookingParams.room) || rooms[0];
  const duration = nights(arrival,departure);
  // Hydrate browser-only prototype records after SSR; the initial render must stay empty.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(()=>{
    try { setOrders(readArray(ORDER_KEY,isOrder)); setMessages(readArray(MESSAGE_KEY,isMessage)); }
    catch { setStorageError("本机记录暂时无法读取。可以继续预览，刷新后可能无法保留记录。"); }
    if (!bookingParams.arrival) setArrival(dateString(1));
    if (!bookingParams.departure) setDeparture(dateString(2));
    setReady(true);
  },[bookingParams.arrival,bookingParams.departure]);
  /* eslint-enable react-hooks/set-state-in-effect */
  function persist(key: string, data: Order[] | Message[]) { try { localStorage.setItem(key,JSON.stringify(data.slice(-50))); } catch { setStorageError("浏览器无法保存本机记录，本次操作仍可预览，刷新后不会保留。"); } }
  function validateDates() { if (!validDate(arrival) || !validDate(departure) || arrival < dateString(0) || duration<1 || duration>30) { setError("请选择今天或之后的入住日期，离店须晚于入住，最多预订 30 晚。"); return false; } setError(""); return true; }
  function reserve(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validateDates()) return;
    if (!name.trim() || !/^[\d+ ()-]{7,20}$/.test(phone) || !consent) { setError("请填写示例姓名和有效格式的示例联系电话，并确认预订须知。"); return; }
    const order: Order = { id: `SC-${crypto.randomUUID().slice(0,8).toUpperCase()}`, room: selectedRoom.id, arrival, departure, guests, name: name.trim(), total: selectedRoom.price*duration, note: note.trim(), status:"pending" };
    const updated=[...orders,order].slice(-50); setOrders(updated); persist(ORDER_KEY,updated); setCreated(order); window.scrollTo({top:0,behavior:"instant"});
  }
  function send(text: string) {
    if (!text.trim()) return;
    const related=orders.find(o=>o.id===orderId)?.id;
    const question: Message={id:crypto.randomUUID(),text:text.trim().slice(0,500),side:"guest",order:related};
    const answer=text.includes("入住") ? "示例回复：常规入住时间为 15:00 后。提前入住需要由民宿另行确认。" : text.includes("早餐") ? "示例回复：早餐时间为 07:30–10:00，地点在一楼餐厅。" : "示例回复：已在此原型中记录你的咨询。实际消息尚未发送给民宿。";
    const updated=[...messages,question,{id:crypto.randomUUID(),text:answer,side:"host" as const,order:related}].slice(-50);
    setMessages(updated); persist(MESSAGE_KEY,updated); setDraft("");
  }
  const bookingUrl=(room: string)=>`/guest/book?room=${room}&arrival=${arrival}&departure=${departure}&guests=${guests}`;
  const knownOrder=orders.find(o=>o.id===orderId);
  const visibleMessages=messages.filter(m=>m.order === knownOrder?.id);
  const dateFields=<div className="guest-date-grid"><label><span>入住</span><input aria-label="入住日期" type="date" required min={ready?dateString(0):undefined} value={arrival} onChange={e=>{setArrival(e.target.value);setSearched(false);}} /></label><label><span>离店</span><input aria-label="离店日期" type="date" required min={arrival || undefined} value={departure} onChange={e=>{setDeparture(e.target.value);setSearched(false);}} /></label><label className="guest-guests"><span>入住人数</span><select aria-label="入住人数" value={guests} onChange={e=>setGuests(Number(e.target.value))}><option value={1}>1 位客人</option><option value={2}>2 位客人</option></select></label></div>;

  return <div className="guest-shell" lang="zh-CN"><div className="guest-page">
    <header className="guest-header"><Link href="/guest" className="guest-brand" aria-label="湖畔小筑首页"><House size={23} strokeWidth={1.6}/><span>湖畔小筑<small>LAKESIDE RETREAT</small></span></Link><span className="guest-prototype">交互原型</span></header>
    {storageError && <p className="guest-notice" role="status">{storageError}</p>}
    <main>
    {view === "stay" && <>
      <section className="guest-hero"><Image src="/images/garden-house-sample.webp" alt="湖畔花园民宿场景示意" fill priority sizes="(max-width: 560px) 100vw, 520px"/><div className="guest-hero-shade"/><div className="guest-hero-copy"><span>在湖边，住几天。</span><h1>把日子，过慢一点。</h1><p><MapPin size={14}/> 湖畔花园 · 示例民宿</p></div><span className="guest-image-note">场景示意</span></section>
      <section className="guest-search guest-card" aria-label="选择住宿日期"><div className="guest-section-heading"><h2>安排一段小住</h2><CalendarDays size={18}/></div>{dateFields}<button className="guest-primary guest-wide" disabled={!ready} onClick={()=>{if(validateDates()){setSearched(true);document.getElementById("guest-rooms")?.scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth",block:"start"});}}}>查看房型 <ArrowRight size={17}/></button>{error && <p className="guest-error" role="alert">{error}</p>}</section>
      <div className="guest-amenities"><span><Wifi size={16}/> 免费 Wi-Fi</span><span><Coffee size={16}/> 含双人早餐</span><span><Sparkles size={16}/> 每日清洁</span></div>
      <section id="guest-rooms" className="guest-rooms"><div className="guest-section-heading"><div><p className="guest-eyebrow">YOUR STAY</p><h2>选一间喜欢的房</h2></div><span>2 种房型</span></div><p className="guest-search-result" aria-live="polite">{searched ? `${readable(arrival)} — ${readable(departure)} · ${duration} 晚 · ${guests} 位客人` : "一间好房，和一段不赶时间的旅程。"}</p>
      {rooms.map(room=><article className="guest-room guest-card" key={room.id}><div className="guest-room-photo"><Image src={room.image} alt={`${room.tag}场景示意，非房间实拍`} fill sizes="(max-width: 560px) 90vw, 472px"/><span>{room.tag} · 场景示意</span></div><div className="guest-room-body"><h3>{room.name}</h3><p>{room.subtitle}</p><div className="guest-room-spec"><span>{room.size}</span><span><Users size={14}/>最多 {room.capacity} 人</span><span><BedDouble size={14}/>{room.bed}</span></div><div className="guest-room-bottom"><div><strong>¥{room.price}</strong><span> / 晚</span><small>含早餐 · 示例价格</small></div><Link className="guest-primary" href={bookingUrl(room.id)} aria-label={`预订${room.name}`}>预订 <ArrowRight size={16}/></Link></div></div></article>)}
      </section><section className="guest-rules guest-card"><h2>入住前，了解一点</h2><div><Clock3 size={18}/><p>15:00 后入住 · 12:00 前离店<small>提前入住及特殊需求，请先联系民宿。</small></p></div><Link href="/guest/contact">还有问题？联系民宿 <ChevronRight size={16}/></Link></section>
    </>}
    {view === "book" && <>
      <Link className="guest-back" href="/guest"><ArrowLeft size={17}/> 返回选房</Link>
      {created ? <section className="guest-success guest-card" aria-labelledby="guest-success-title"><div className="guest-success-icon"><Check size={28}/></div><p className="guest-eyebrow">REQUEST RECEIVED</p><h1 id="guest-success-title">预订申请已记录</h1><p>接下来，等待民宿确认。</p><div className="guest-receipt"><span>{selectedRoom.name}</span><strong>{readable(created.arrival)} — {readable(created.departure)}</strong><small>{duration} 晚 · {created.guests} 位客人 · ¥{created.total}</small><small>{created.id}</small></div><p className="guest-muted">这是本机演示记录，未实际锁房或通知民宿。</p><Link href="/guest/orders" className="guest-primary guest-wide">查看我的订单 <ArrowRight size={16}/></Link><Link href={`/guest/contact?order=${created.id}`} className="guest-text-link">联系民宿</Link></section> : <>
      <div className="guest-page-title"><p className="guest-eyebrow">ONE STEP AWAY</p><h1>确认这次小住</h1><p>填写预订信息，余下的交给民宿确认。</p></div>
      <form onSubmit={reserve} className="guest-book-form"><section className="guest-card guest-book-section"><div className="guest-book-room"><BedDouble size={22}/><div><h2>{selectedRoom.name}</h2><p>{selectedRoom.size} · {selectedRoom.bed} · 含早餐</p></div></div>{dateFields}</section><section className="guest-card guest-book-section"><h2>入住人信息</h2><p className="guest-muted">原型体验，请使用虚构姓名和号码。</p><label>入住人姓名<input required maxLength={40} autoComplete="off" placeholder="例如：林小夏" value={name} onChange={e=>setName(e.target.value)}/></label><label>联系电话<input required inputMode="tel" type="tel" maxLength={20} autoComplete="off" placeholder="例如：13800000000（虚构）" value={phone} onChange={e=>setPhone(e.target.value)}/></label><label>特殊需求 <span className="guest-muted">选填</span><textarea maxLength={300} placeholder="如预计到店时间、安静房间等" value={note} onChange={e=>setNote(e.target.value)}/></label><p className="guest-muted">特殊需求以民宿确认结果为准。</p></section><section className="guest-card guest-book-section"><h2>费用明细</h2><div className="guest-price-line"><span>¥{selectedRoom.price} × {duration>0?duration:"—"} 晚</span><span>¥{duration>0?selectedRoom.price*duration:"—"}</span></div><div className="guest-price-line guest-total"><span>预计合计</span><strong>¥{duration>0?selectedRoom.price*duration:"—"}</strong></div><p className="guest-muted">当前不收款，提交后也不会实际锁定房间。</p></section><label className="guest-consent"><input type="checkbox" required checked={consent} onChange={e=>setConsent(e.target.checked)}/><span>我已了解：此为交互原型，申请仅记录在本机，预订需民宿确认。</span></label>{error && <p className="guest-error" role="alert">{error}</p>}<button className="guest-primary guest-wide" disabled={!ready || !!created}>提交预订申请 <ArrowRight size={17}/></button></form></>}
    </>}
    {view === "orders" && <>
      <div className="guest-page-title"><p className="guest-eyebrow">YOUR RESERVATIONS</p><h1>我的订单</h1><p>期待的旅程，都在这里。</p></div><div className="guest-filters" aria-label="订单筛选">{[["all","全部"],["pending","待确认"],["confirmed","已确认"]].map(([id,title])=><button key={id} aria-pressed={filter===id} onClick={()=>setFilter(id)}>{title}</button>)}</div>
      {!ready ? <p role="status">正在读取本机订单…</p> : orders.filter(o=>filter==="all" || o.status===filter).length===0 ? <section className="guest-empty guest-card"><CalendarDays size={32} strokeWidth={1.4}/><h2>{filter==="all"?"下一段旅程，从这里开始":"暂无这类订单"}</h2><p>{filter==="all"?"选一间喜欢的房，安排一段湖畔小住。":"新提交的申请会显示在「待确认」里。"}</p><Link href="/guest" className="guest-primary">去看看房型 <ArrowRight size={16}/></Link></section> : <div className="guest-order-list">{[...orders].reverse().filter(o=>filter==="all" || o.status===filter).map(order=>{const room=rooms.find(r=>r.id===order.room)!;return <article key={order.id} className="guest-card guest-order"><div className="guest-section-heading"><span className="guest-status"><Clock3 size={14}/>{order.status==="pending"?"等待民宿确认":"预订已确认"}</span><span>{nights(order.arrival,order.departure)} 晚</span></div><h2>{room.name}</h2><p>{readable(order.arrival)} 入住 — {readable(order.departure)} 离店</p><div className="guest-order-summary"><span>{order.guests} 位客人</span><strong>¥{order.total}</strong></div><button className="guest-order-expand" aria-expanded={expanded===order.id} aria-controls={`detail-${order.id}`} onClick={()=>setExpanded(expanded===order.id?null:order.id)}>订单详情 <ChevronDown size={16}/></button>{expanded===order.id && <div id={`detail-${order.id}`} className="guest-order-detail"><p>预订编号<span>{order.id}</span></p><p>入住人<span>{order.name}</span></p><p>入住时间<span>15:00 后</span></p>{order.note && <p>特殊需求<span>{order.note}</span></p>}<small>本机示例记录，未实际锁房、付款或通知民宿。</small></div>}<Link href={`/guest/contact?order=${order.id}`} className="guest-secondary"><MessageCircle size={16}/> 联系民宿</Link></article>;})}</div>}
      <p className="guest-footnote">仅显示此浏览器保存的原型订单，无需登录。</p>
    </>}
    {view === "contact" && <>
      <div className="guest-page-title"><p className="guest-eyebrow">HERE TO HELP</p><h1>联系民宿</h1><p>关于这次入住，有什么想问的？</p></div><section className="guest-contact-host guest-card"><div className="guest-host-icon"><House size={24} strokeWidth={1.5}/></div><div><h2>湖畔小筑</h2><p>入住咨询与预订安排</p></div><span>示例会话</span></section>
      {knownOrder && <div className="guest-related-order"><CalendarDays size={16}/><span>关联订单 {knownOrder.id}<small>{readable(knownOrder.arrival)} · {rooms.find(r=>r.id===knownOrder.room)?.name}</small></span></div>}
      <section className="guest-conversation" aria-label="民宿对话"><p className="guest-chat-notice">仅演示对话效果，不会发送消息或调用 AI。</p><div className="guest-message guest-host">你好，欢迎来到湖畔小筑。想了解房间、早餐，还是入住安排？</div><div className="guest-quick-questions">{["几点可以入住？","早餐几点开始？"].map(q=><button disabled={!ready} key={q} onClick={()=>send(q)}>{q} <ArrowRight size={14}/></button>)}</div><div role="log" aria-live="polite" aria-relevant="additions">{visibleMessages.map(m=><div className={`guest-message guest-${m.side}`} key={m.id}><small>{m.side==="guest"?"我":"民宿 · 示例回复"}</small>{m.text.replace(/^示例回复：/,"")}</div>)}</div></section><form className="guest-compose" onSubmit={e=>{e.preventDefault();send(draft);}}><label className="guest-sr-only" htmlFor="guest-message">咨询内容</label><textarea id="guest-message" rows={2} value={draft} maxLength={500} placeholder="写下想问的事…" onChange={e=>setDraft(e.target.value)}/><button className="guest-primary" aria-label="发送示例消息" disabled={!ready || !draft.trim()}><Send size={19}/></button></form>
    </>}
    </main>
    <footer className="guest-footer">Staycraft 客人端原型 · 虚构资料 · 未连接后台</footer>
    <nav className="guest-nav" aria-label="客人导航">{([{id:"stay",url:"/guest",label:"预订住宿",Icon:House},{id:"orders",url:"/guest/orders",label:"我的订单",Icon:CalendarDays},{id:"contact",url:"/guest/contact",label:"联系民宿",Icon:MessageCircle}] as const).map(({id,url,label,Icon})=><Link key={id} href={url} aria-current={view===id || (id==="stay" && view==="book")?"page":undefined}><Icon size={21} strokeWidth={1.7}/><span>{label}</span></Link>)}</nav>
  </div></div>;
}
