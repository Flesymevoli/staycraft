"use client";

import { useEffect, useState } from "react";
import { BedDouble, ChevronDown } from "lucide-react";
import "./room-board.css";

type Status = "ready" | "occupied";
type Room = { number: string; status: Status; note: [string, string] };
type SavedRoom = { number: string; status: Status | "cleaning"; departure: string | null; next_arrival: string | null };
const sampleRooms: Room[] = [
  { number: "101", status: "ready", note: ["No arrival today", "今日无预订"] },
  { number: "102", status: "ready", note: ["Arrival today · 14:00", "今日 14:00 入住"] },
  { number: "103", status: "occupied", note: ["Check-out tomorrow", "明日退房"] },
  { number: "104", status: "occupied", note: ["Check-out Sep 19", "9 月 19 日退房"] },
  { number: "105", status: "occupied", note: ["Check-out tomorrow", "明日退房"] },
  { number: "201", status: "ready", note: ["Checked out · 11:00", "已于 11:00 退房"] },
  { number: "202", status: "occupied", note: ["Check-out Sep 20", "9 月 20 日退房"] },
  { number: "203", status: "occupied", note: ["Check-out tomorrow", "明日退房"] },
  { number: "204", status: "occupied", note: ["Check-out Sep 19", "9 月 19 日退房"] },
  { number: "205", status: "occupied", note: ["Check-out Sep 20", "9 月 20 日退房"] },
];
const labels: Record<Status, [string, string]> = {
  ready: ["Ready", "可入住"], occupied: ["Occupied", "已入住"],
};

function mapRooms(items: SavedRoom[]): Room[] {
  return items.map(item => ({ ...item, status:item.status==="cleaning"?"ready":item.status, note: item.departure
    ? [`Check-out ${item.departure}`, `${item.departure} 退房`]
    : item.next_arrival ? [`Next arrival ${item.next_arrival}`, `${item.next_arrival} 预计到店`]
    : ["No upcoming arrival", "暂无后续预订"] }));
}

export function RoomBoard({ zh }: { zh: boolean }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [mode, setMode] = useState<"loading" | "local" | "sample" | "error">("loading");
  const [reload, setReload] = useState(0);
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
  const statusOf = (room: Room): Status => room.status;
  const room = rooms.find(item => item.number === selected);
  const status = room ? statusOf(room) : null;
  return <section className="room-board" aria-label={t("Room overview · Sep 17 sample", "客房概览 · 9 月 17 日示例")}>
    <div className="room-board-surface">
      {mode === "loading" ? <p className="room-board-hint" role="status">{t("Loading rooms…", "正在读取房态…")}</p> : mode === "error" ? <div role="alert"><p className="room-board-hint">{t("Could not load rooms. Please retry.", "房态读取失败，请重试。")}</p><button className="room-clean-button" onClick={() => { setMode("loading"); setReload(n => n + 1); }}>{t("Retry", "重试")}</button></div> : rooms.length === 0 ? <p className="room-board-hint">{t("No rooms yet.", "暂无客房。")}</p> : <>
      <div className="room-board-legend" aria-label={t("Room status counts", "房态数量")}>
        {(["ready", "occupied"] as Status[]).map(item => <span key={item} className={`room-state-${item}`}><i aria-hidden="true"/>{labels[item][zh ? 1 : 0]}<b>{rooms.filter(r => statusOf(r) === item).length}</b></span>)}
      </div>
      {["1", "2"].map(floor => <div className="room-floor" key={floor}>
        <span className="room-floor-label">{t(`Floor ${floor}`, `${floor} 楼`)}</span>
        <div className="room-grid">{rooms.filter(r => r.number.startsWith(floor)).map(item => {
          const state = statusOf(item);
          return <button type="button" key={item.number} className={`room-tile room-state-${state} ${selected === item.number ? "is-selected" : ""}`} aria-label={`${t("Room", "房间")} ${item.number} · ${labels[state][zh ? 1 : 0]}`} aria-expanded={selected === item.number} aria-controls="room-detail" onClick={() => { setSelected(selected === item.number ? null : item.number); }}>
            <span className="room-number">{item.number}</span>
            <span className="room-tile-status"><i aria-hidden="true"/>{labels[state][zh ? 1 : 0]}</span>
          </button>;
        })}</div>
      </div>)}
      {room && status && <div className="room-detail" id="room-detail">
        <div className="room-detail-heading"><strong><BedDouble size={17} aria-hidden="true"/>{t("Room", "房间")} {room.number}</strong><button type="button" onClick={() => setSelected(null)} aria-label={t("Collapse room details", "收起房间详情")}><ChevronDown size={18}/></button></div>
        <dl><div><dt>{t("Occupancy", "入住状态")}</dt><dd>{status === "occupied" ? t("Guest in house", "住客在住") : t("Vacant", "空房")}</dd></div></dl>
        <p>{room.note[zh ? 1 : 0]}</p>
      </div>}
      <p className="room-board-hint">{t("Sep 17 · Sample · Tap a room for details", "9 月 17 日示例 · 点击房间查看详情")}</p>
      </>}
    </div>
  </section>;
}
