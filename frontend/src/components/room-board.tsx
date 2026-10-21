"use client";

import { useEffect, useState } from "react";
import { BedDouble, Check, ChevronDown } from "lucide-react";
import "./room-board.css";

type Status = "ready" | "cleaning" | "occupied";
type Room = { number: string; status: Status; note: [string, string]; housekeeping?: "clean" | "dirty" };
type SavedRoom = { number: string; status: Status; housekeeping: "clean" | "dirty"; departure: string | null; next_arrival: string | null };
const sampleRooms: Room[] = [
  { number: "101", status: "ready", note: ["No arrival today", "今日无预订"] },
  { number: "102", status: "cleaning", note: ["Arrival today · 14:00", "今日 14:00 入住"] },
  { number: "103", status: "occupied", note: ["Check-out tomorrow", "明日退房"] },
  { number: "104", status: "occupied", note: ["Check-out Sep 19", "9 月 19 日退房"] },
  { number: "105", status: "occupied", note: ["Check-out tomorrow", "明日退房"] },
  { number: "201", status: "cleaning", note: ["Checked out · 11:00", "已于 11:00 退房"] },
  { number: "202", status: "occupied", note: ["Check-out Sep 20", "9 月 20 日退房"] },
  { number: "203", status: "occupied", note: ["Check-out tomorrow", "明日退房"] },
  { number: "204", status: "occupied", note: ["Check-out Sep 19", "9 月 19 日退房"] },
  { number: "205", status: "occupied", note: ["Check-out Sep 20", "9 月 20 日退房"] },
];
const labels: Record<Status, [string, string]> = {
  ready: ["Ready", "可入住"], cleaning: ["To clean", "待清洁"], occupied: ["Occupied", "已入住"],
};

function mapRooms(items: SavedRoom[]): Room[] {
  return items.map(item => ({ ...item, note: item.departure
    ? [`Check-out ${item.departure}`, `${item.departure} 退房`]
    : item.next_arrival ? [`Next arrival ${item.next_arrival}`, `${item.next_arrival} 预计到店`]
    : ["No upcoming arrival", "暂无后续预订"] }));
}

export function RoomBoard({ zh }: { zh: boolean }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [mode, setMode] = useState<"loading" | "local" | "sample" | "error">("loading");
  const [reload, setReload] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const t = (en: string, cn: string) => zh ? cn : en;
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/local/room-board", { signal: controller.signal, cache: "no-store" }).then(async response => {
      if (response.status === 404) { setRooms(sampleRooms); setMode("sample"); return; }
      if (!response.ok) throw new Error();
      const result = await response.json() as { items: SavedRoom[] };
      setRooms(mapRooms(result.items)); setMode("local");
    }).catch(() => { if (!controller.signal.aborted) setMode("error"); });
    return () => controller.abort();
  }, [reload]);
  async function markCleaned(number: string) {
    setSaving(true); setSaveError(false); setSaved(null);
    try {
      if (mode === "sample") {
        setRooms(previous => previous.map(item => item.number === number ? { ...item, status: "ready", housekeeping: "clean" } : item));
      } else {
        const response = await fetch("/api/local/room-clean", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ room_number: number }) });
        if (!response.ok) throw new Error();
        const result = await response.json() as { items: SavedRoom[] };
        setRooms(mapRooms(result.items));
      }
      setSaved(number);
    } catch { setSaveError(true); }
    finally { setSaving(false); }
  }
  const statusOf = (room: Room): Status => room.status;
  const room = rooms.find(item => item.number === selected);
  const status = room ? statusOf(room) : null;
  return <section className="room-board" aria-label={t("Room overview · Sep 17 sample", "客房概览 · 9 月 17 日示例")}>
    <div className="room-board-surface">
      {mode === "loading" ? <p className="room-board-hint" role="status">{t("Loading rooms…", "正在读取房态…")}</p> : mode === "error" ? <div role="alert"><p className="room-board-hint">{t("Could not load rooms. Please retry.", "房态读取失败，请重试。")}</p><button className="room-clean-button" onClick={() => { setMode("loading"); setReload(n => n + 1); }}>{t("Retry", "重试")}</button></div> : rooms.length === 0 ? <p className="room-board-hint">{t("No rooms yet.", "暂无客房。")}</p> : <>
      <div className="room-board-legend" aria-label={t("Room status counts", "房态数量")}>
        {(["ready", "cleaning", "occupied"] as Status[]).map(item => <span key={item} className={`room-state-${item}`}><i aria-hidden="true"/>{labels[item][zh ? 1 : 0]}<b>{rooms.filter(r => statusOf(r) === item).length}</b></span>)}
      </div>
      {["1", "2"].map(floor => <div className="room-floor" key={floor}>
        <span className="room-floor-label">{t(`Floor ${floor}`, `${floor} 楼`)}</span>
        <div className="room-grid">{rooms.filter(r => r.number.startsWith(floor)).map(item => {
          const state = statusOf(item);
          return <button type="button" disabled={saving} key={item.number} className={`room-tile room-state-${state} ${selected === item.number ? "is-selected" : ""}`} aria-label={`${t("Room", "房间")} ${item.number} · ${labels[state][zh ? 1 : 0]}`} aria-expanded={selected === item.number} aria-controls="room-detail" onClick={() => { setSelected(selected === item.number ? null : item.number); setSaveError(false); }}>
            <span className="room-number">{item.number}</span>
            <span className="room-tile-status"><i aria-hidden="true"/>{labels[state][zh ? 1 : 0]}</span>
          </button>;
        })}</div>
      </div>)}
      {room && status && <div className="room-detail" id="room-detail">
        <div className="room-detail-heading"><strong><BedDouble size={17} aria-hidden="true"/>{t("Room", "房间")} {room.number}</strong><button type="button" onClick={() => setSelected(null)} aria-label={t("Collapse room details", "收起房间详情")}><ChevronDown size={18}/></button></div>
        <dl><div><dt>{t("Occupancy", "入住状态")}</dt><dd>{status === "occupied" ? t("Guest in house", "住客在住") : t("Vacant", "空房")}</dd></div><div><dt>{t("Housekeeping", "清洁状态")}</dt><dd>{room.housekeeping ? room.housekeeping === "dirty" ? t("Cleaning needed", "待清洁") : t("Cleaned", "已清洁") : status === "cleaning" ? t("Cleaning needed", "待清洁") : status === "ready" ? t("Cleaned", "已清洁") : t("In-stay service", "住中服务")}</dd></div></dl>
        <p>{room.note[zh ? 1 : 0]}</p>
        {status === "cleaning" && <button type="button" className="room-clean-button" disabled={saving} onClick={() => markCleaned(room.number)}><Check size={16}/>{saving ? t("Saving…", "正在保存…") : t("Mark cleaned · Demo", "标记清洁完成 · 演示")}</button>}
        {saved === room.number && <p className="room-demo-feedback" role="status">{mode === "local" ? t("Saved on this computer. Cleaned and ready; no check-in performed.", "已保存到本机。房间已清洁、可入住，未办理入住。") : t("Demo: cleaned and available. Refresh resets this preview.", "演示：已清洁，可安排入住。刷新后恢复示例状态。")}</p>}
        {saveError && <p role="alert">{t("Not saved. Room status is unchanged; please retry.", "保存失败，房态未改变，请重试。")}</p>}
      </div>}
      <p className="room-board-hint">{t("Sep 17 · Sample · Tap a room for details", "9 月 17 日示例 · 点击房间查看详情")}</p>
      </>}
    </div>
  </section>;
}
