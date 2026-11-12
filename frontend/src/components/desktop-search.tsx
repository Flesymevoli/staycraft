"use client";
import {useEffect,useRef,useState} from "react";
import Link from "next/link";
import {ArrowUpRight, BedDouble, FileText, Search, X} from "lucide-react";
import {normalizeWorkspaceSearch, workspaceSearchMaxLength, type WorkspaceSearchResults} from "@/lib/workspace-search";
import "./desktop-search.css";

const destinations = [
  ["/app","工作台 诊断 AI","Workbench Diagnosis AI"],
  ["/app/work","订单 导入 CSV","Bookings Import CSV"],
  ["/app/analysis","经营数据 收入 指标","Business data Revenue Metrics"],
  ["/app/explore#desktop-collection","市场 报价 采集","Market Quotes Collector"],
  ["/app/promotion","推广 文案 草稿","Promotion Copy Drafts"],
  ["/app/mine#room-types","房型 房间 价格","Rooms Inventory Rates"],
  ["/app/mine","民宿资料 账户","Property Account"],
];

type SearchResponse = {query: string; results?: WorkspaceSearchResults; error?: string};
export function DesktopSearch({zh}: {zh: boolean}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [opened, setOpened] = useState(false);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [retry, setRetry] = useState(0);
  const [composing, setComposing] = useState(false);
  const needle = normalizeWorkspaceSearch(query);
  const open = () => {if (!dialog.current?.open) dialog.current?.showModal(); setOpened(true); input.current?.focus();};
  const close = () => dialog.current?.close();
  const t = (en: string, cn: string) => zh ? cn : en;
  useEffect(() => {
    const key = (event: KeyboardEvent) => {if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {event.preventDefault(); open();}};
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  useEffect(() => {
    if (!opened || !needle || composing) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const result = await fetch(`/api/workspace/search?q=${encodeURIComponent(needle)}`, {cache: "no-store", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)])});
        const body = await result.json();
        if (controller.signal.aborted) return;
        if (!result.ok) setResponse({query: needle, error: body.error ?? "search_unavailable"});
        else setResponse({query: needle, results: body});
      } catch {
        if (!controller.signal.aborted) setResponse({query: needle, error: "search_unavailable"});
      }
    }, 220);
    return () => {clearTimeout(timer); controller.abort();};
  }, [needle, opened, composing, retry]);
  const matches = destinations.filter(entry => entry.slice(1).join(" ").toLowerCase().includes(needle.toLowerCase()));
  const current = response?.query === needle ? response : null;
  const results = current?.results;
  const loading = Boolean(needle && !current);
  const count = results ? results.bookings.length + results.rooms.length + results.roomTypes.length : 0;
  const more = results && Object.values(results.more).some(Boolean);
  return <div className="desktop-search">
    <button type="button" className="desktop-search-trigger" onClick={open} aria-haspopup="dialog"><Search size={15}/><span>{t("Search bookings, rooms and tools", "搜索订单、房型与功能")}</span><kbd>Ctrl K</kbd></button>
    <dialog ref={dialog} className="desktop-search-dialog desktop-search-expanded" aria-label={t("Search bookings, rooms and tools", "搜索订单、房型与功能")} onClose={() => {setOpened(false); setQuery(""); setResponse(null); setComposing(false);}} onClick={event => {if (event.target === dialog.current) close();}}>
      <header><Search size={18} aria-hidden="true"/><input ref={input} aria-label={t("Search bookings, room types or tools", "搜索订单、房型或功能")} aria-describedby="desktop-search-help" placeholder={t("Booking ID, guest, room number, room type…", "订单号、客人姓名、房号、房型…")} maxLength={workspaceSearchMaxLength} value={query} onChange={event => {setQuery(event.target.value); if (normalizeWorkspaceSearch(event.target.value) !== needle) setResponse(null);}} onCompositionStart={() => setComposing(true)} onCompositionEnd={() => setComposing(false)}/><button type="button" aria-label={t("Close", "关闭")} onClick={close}><X size={18}/></button></header>
      <p className="desktop-search-help" id="desktop-search-help">{t("Search this property's bookings and rooms. Use Tab to select a result and Enter to open it.", "搜索当前民宿的订单与客房，可按 Tab 选择结果、Enter 打开。")}</p>
      <div className="desktop-search-results" aria-busy={loading}>
        {needle && <p className="desktop-search-status" role="status">{loading ? t("Searching bookings and rooms…", "正在查找订单与客房…") : results ? count ? t(`${count} matching records`, `找到 ${count} 条相关记录`) : t("No matching bookings or rooms. Try another booking ID, guest name or room name.", "没有找到匹配的订单或客房，请换一个订单号、客人姓名或房型名称。") : null}</p>}
        {current?.error && <div className="desktop-search-error" role="alert"><p>{current.error === "sign_in_required" ? t("Your session has expired. Sign in again to search your records.", "登录已失效，请重新登录后搜索订单与客房。") : t("Records could not be searched. Please try again.", "暂时无法搜索订单与客房，请重试。")}</p>{current.error === "sign_in_required" ? <Link href="/login" onClick={close}>{t("Sign in", "前往登录")}</Link> : <button type="button" onClick={() => {setResponse(null); setRetry(value => value + 1);}}>{t("Retry", "重试")}</button>}</div>}
        {!!results?.bookings.length && <section><h2>{t("Bookings", "订单")}</h2><nav aria-label={t("Matching bookings", "订单搜索结果")}>{results.bookings.map(booking => <Link prefetch={false} href={`/app/bookings/${booking.id}`} key={booking.id} onClick={close}><FileText size={17} aria-hidden="true"/><span><strong>{booking.externalId || booking.guestName || booking.id}</strong><small>{[booking.roomNumber || t("Unassigned", "待分房"), booking.typeName, booking.externalId ? booking.guestName : ""].filter(Boolean).join(" · ")}</small><small>{booking.arrival} — {booking.departure}</small></span><ArrowUpRight size={14} aria-hidden="true"/></Link>)}</nav></section>}
        {!!results?.rooms.length && <section><h2>{t("Rooms", "客房")}</h2><nav aria-label={t("Matching rooms", "客房搜索结果")}>{results.rooms.map(room => <Link prefetch={false} href={`/app/rooms/${room.id}`} key={room.id} onClick={close}><BedDouble size={17} aria-hidden="true"/><span><strong>{room.number} · {room.typeName}</strong><small>{room.floor}{!room.active ? t(" · Inactive", " · 已停用") : ""}</small></span><ArrowUpRight size={14} aria-hidden="true"/></Link>)}</nav></section>}
        {!!results?.roomTypes.length && <section><h2>{t("Room types", "房型")}</h2><nav aria-label={t("Matching room types", "房型搜索结果")}>{results.roomTypes.map(type => <Link prefetch={false} href={`/app/mine#room-type-${type.id}`} key={type.id} onClick={close}><BedDouble size={17} aria-hidden="true"/><span><strong>{type.name}</strong><small>{type.beds} · {t(`Up to ${type.capacity} guests`, `可住 ${type.capacity} 人`)} · ¥{type.price}{t(" / night", " / 晚")}</small></span><ArrowUpRight size={14} aria-hidden="true"/></Link>)}</nav></section>}
        {more && <p className="desktop-search-help">{t("Showing up to 6 records per group. Add more detail to narrow your search.", "每类最多显示 6 条，输入更完整的关键词可缩小范围。")}</p>}
        {!!matches.length && <section><h2>{t("Pages & tools", "功能入口")}</h2><nav aria-label={t("Matching tools", "功能搜索结果")}>{matches.map(([href, cn, en]) => <Link key={href} href={href} onClick={close}><Search size={16} aria-hidden="true"/><span>{zh ? cn : en}</span><ArrowUpRight size={14} aria-hidden="true"/></Link>)}</nav></section>}
      </div>
    </dialog>
  </div>;
}
