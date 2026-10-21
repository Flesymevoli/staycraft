"use client";

import { useState } from "react";
import { BedDouble, Check, ChevronDown } from "lucide-react";
import "./room-board.css";

type Status = "ready" | "cleaning" | "occupied";
type Room = { number: string; status: Status; note: [string, string] };
const rooms: Room[] = [
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

export function RoomBoard({ zh }: { zh: boolean }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [cleaned, setCleaned] = useState<string[]>([]);
  const t = (en: string, cn: string) => zh ? cn : en;
  const statusOf = (room: Room): Status => cleaned.includes(room.number) ? "ready" : room.status;
  const room = rooms.find(item => item.number === selected);
  const status = room ? statusOf(room) : null;
  return <section className="room-board" aria-labelledby="room-board-title">
    <div className="native-section-head"><h2 id="room-board-title">{t("Room overview", "客房概览")}</h2><small>{t("Sep 17 · Sample", "9 月 17 日 · 示例")}</small></div>
    <div className="room-board-surface">
      <div className="room-board-legend" aria-label={t("Room status counts", "房态数量")}>
        {(["ready", "cleaning", "occupied"] as Status[]).map(item => <span key={item} className={`room-state-${item}`}><i aria-hidden="true"/>{labels[item][zh ? 1 : 0]}<b>{rooms.filter(r => statusOf(r) === item).length}</b></span>)}
      </div>
      {["1", "2"].map(floor => <div className="room-floor" key={floor}>
        <span className="room-floor-label">{t(`Floor ${floor}`, `${floor} 楼`)}</span>
        <div className="room-grid">{rooms.filter(r => r.number.startsWith(floor)).map(item => {
          const state = statusOf(item);
          return <button type="button" key={item.number} className={`room-tile room-state-${state} ${selected === item.number ? "is-selected" : ""}`} aria-label={`${t("Room", "房间")} ${item.number} · ${labels[state][zh ? 1 : 0]}`} aria-expanded={selected === item.number} aria-controls="room-detail" onClick={() => setSelected(selected === item.number ? null : item.number)}>
            <span className="room-number">{item.number}</span>
            <span className="room-tile-status"><i aria-hidden="true"/>{labels[state][zh ? 1 : 0]}</span>
          </button>;
        })}</div>
      </div>)}
      {room && status && <div className="room-detail" id="room-detail">
        <div className="room-detail-heading"><strong><BedDouble size={17} aria-hidden="true"/>{t("Room", "房间")} {room.number}</strong><button type="button" onClick={() => setSelected(null)} aria-label={t("Collapse room details", "收起房间详情")}><ChevronDown size={18}/></button></div>
        <dl><div><dt>{t("Occupancy", "入住状态")}</dt><dd>{status === "occupied" ? t("Guest in house", "住客在住") : t("Vacant", "空房")}</dd></div><div><dt>{t("Housekeeping", "清洁状态")}</dt><dd>{status === "cleaning" ? t("Cleaning needed", "待清洁") : status === "ready" ? t("Cleaned", "已清洁") : t("In-stay service", "住中服务")}</dd></div></dl>
        <p>{room.note[zh ? 1 : 0]}</p>
        {status === "cleaning" && <button type="button" className="room-clean-button" onClick={() => setCleaned(previous => [...previous, room.number])}><Check size={16}/>{t("Mark cleaned · Demo", "标记清洁完成 · 演示")}</button>}
        {cleaned.includes(room.number) && <p className="room-demo-feedback" role="status">{t("Demo: cleaned and available. Refresh resets this preview.", "演示：已清洁，可安排入住。刷新后恢复示例状态。")}</p>}
      </div>}
      <p className="room-board-hint">{t("Tap a room for details", "点击房间查看详情")}</p>
    </div>
  </section>;
}
