"use client";

import Link from "next/link";
import {useId, type ReactNode, type PointerEvent} from "react";
import {Banknote, BedDouble, CalendarDays, Tag} from "lucide-react";
import {bookingChartValues, chartMaximum, type BookingMetric} from "@/lib/booking-chart";
import type {BookingMetrics} from "./booking-metrics";
import {RevenuePreview} from "./revenue-preview";
import "./gemini-business-analysis.css";

type Props = {
  data: BookingMetrics | null;
  status: string;
  zh: boolean;
  metric: BookingMetric;
  onMetric: (value: BookingMetric) => void;
  selected: number | null;
  onSelect: (value: number | null) => void;
  retry: () => void;
  controls: ReactNode;
};

const weekend = (date: string) => [0, 6].includes(new Date(`${date}T12:00:00Z`).getUTCDay());
const money = (cents: number | null | undefined, zh: boolean) => cents == null ? "—" : `¥${(cents / 100).toLocaleString(zh ? "zh-CN" : "en-GB", {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

function DailyChart({data, metric, zh, selected, onSelect}: Pick<Props, "metric" | "zh" | "selected" | "onSelect"> & {data: BookingMetrics}) {
  const gradientId = useId();
  const values = bookingChartValues(data, metric);
  const maximum = chartMaximum(values, metric);
  const last = Math.max(0, values.length - 1);
  const x = (index: number) => values.length === 1 ? 330 : 60 + index * 540 / Math.max(1, last);
  const y = (value: number) => 160 - value / maximum * 130;
  const active = selected !== null && selected >= 0 && selected < values.length ? selected : null;
  const format = (value: number | null) => value === null ? "—" : metric === "occupancy" ? `${value}%` : metric === "booking" ? `${value} ${zh ? "间夜" : "nights"}` : money(value * 100, zh);
  const segments: string[][] = [];
  values.forEach((value, index) => {
    if (value === null) return;
    if (index === 0 || values[index - 1] === null) segments.push([]);
    segments[segments.length - 1].push(`${x(index)},${y(value)}`);
  });
  const choose = (event: PointerEvent<SVGSVGElement>) => {
    const matrix = event.currentTarget.getScreenCTM();
    if (!matrix) return;
    const cursor = event.currentTarget.createSVGPoint();
    cursor.x = event.clientX;
    cursor.y = event.clientY;
    const local = cursor.matrixTransform(matrix.inverse());
    onSelect(Math.max(0, Math.min(last, Math.round((local.x - 60) / 540 * last))));
  };
  if (values.every(value => value === null)) return <p className="analysis-empty">{metric === "occupancy" ? (zh ? "历史房量未知，无法绘制占用率图。" : "Historical inventory is unknown; occupancy cannot be plotted.") : (zh ? "暂无可绘制的每日数值，均价需要对应订单间夜。" : "No daily figures are available. Average rates require recorded order nights.")}</p>;
  return <figure className="analysis-chart">
    <svg viewBox="0 0 640 200" aria-label={zh ? "每日经营指标，选择或拖动圆点查看读数" : "Daily operating figures. Select or drag to inspect a date."} onPointerDown={event => {event.currentTarget.setPointerCapture(event.pointerId); choose(event);}} onPointerMove={event => {if (event.buttons) choose(event);}}>
      <defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6554e8" stopOpacity="0.24"/><stop offset="100%" stopColor="#6554e8" stopOpacity="0"/></linearGradient></defs>
      {[maximum, maximum / 2, 0].map(value => <g key={value}><line x1="40" y1={y(value)} x2="610" y2={y(value)} stroke="#eceaf5" strokeDasharray={value ? "3 4" : undefined}/><text x="32" y={y(value) + 4} fontSize="11" fill="#73737f" textAnchor="end">{metric === "occupancy" ? `${value}%` : value.toLocaleString("en", {notation: "compact", maximumFractionDigits: 1})}</text></g>)}
      {segments.map((points, index) => <g key={index}><polygon points={`${points[0].split(",")[0]},160 ${points.join(" ")} ${points.at(-1)!.split(",")[0]},160`} fill={`url(#${gradientId})`}/><polyline points={points.join(" ")} fill="none" stroke="#6554e8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></g>)}
      {active !== null && <line x1={x(active)} y1="24" x2={x(active)} y2="160" stroke="#6554c7" strokeDasharray="3 4"/>}
      {values.map((value, index) => {
        const date = data.daily[index].date;
        const isWeekend = weekend(date);
        const visibleLabel = values.length <= 8 || index % Math.ceil(values.length / 7) === 0 || index === last;
        return <g key={date}>
          {value !== null && <circle tabIndex={0} role="button" aria-label={`${date} · ${format(value)}`} data-weekend={isWeekend || undefined} cx={x(index)} cy={y(value)} r={active === index ? 7 : isWeekend ? 6 : values.length > 60 ? 2 : 4.5} fill={isWeekend ? "#ffdc32" : "#6554e8"} stroke="#6554e8" strokeWidth={isWeekend ? 2.2 : 0} onFocus={() => onSelect(index)} onClick={() => onSelect(index)} onKeyDown={event => {if (event.key === "Enter" || event.key === " ") {event.preventDefault(); onSelect(index);}}}><title>{date} · {format(value)}</title></circle>}
          {value !== null && isWeekend && values.length <= 8 && <text x={x(index)} y={y(value) - 12} textAnchor="middle" fontSize="11" fontWeight="600" fill="#303039">{format(value)}</text>}
          {visibleLabel && <text x={x(index)} y="182" textAnchor="middle" fontSize="11" fill={isWeekend ? "#303039" : "#73737f"} fontWeight={isWeekend ? "600" : "400"}>{date.slice(5).replace("-", "/")}{values.length <= 8 && isWeekend && zh ? (new Date(`${date}T12:00:00Z`).getUTCDay() === 6 ? "(六)" : "(日)") : ""}</text>}
        </g>;
      })}
    </svg>
    <figcaption><span aria-live="polite">{active === null ? (zh ? "选择日期查看每日读数" : "Select a date for daily figures") : `${data.daily[active].date} · ${format(values[active])}`}</span><button type="button" onClick={() => onSelect(null)}>{zh ? "期间汇总" : "Period Summary"}</button></figcaption>
    <input type="range" min={0} max={last} value={active ?? 0} aria-label={zh ? "选择预订图表日期" : "Select booking chart date"} aria-valuetext={active === null ? undefined : `${data.daily[active].date} · ${format(values[active])}`} onChange={event => onSelect(Number(event.target.value))}/>
  </figure>;
}

export function GeminiBusinessAnalysis({data, status, zh, metric, onMetric, selected, onSelect, retry, controls}: Props) {
  const historical = data?.historical_inventory_unknown;
  const weekendRates = data ? bookingChartValues(data, "adr").filter((value, index): value is number => value !== null && weekend(data.daily[index].date)) : [];
  const cards = [
    {id: "occupancy" as const, Icon: BedDouble, title: zh ? "预订占用率" : "Booked Occupancy", value: data?.booked_pct == null ? "—" : `${data.booked_pct}%`, caption: historical ? (zh ? "历史房量未知" : "Historical inventory unknown") : (zh ? `按 ${data?.active_rooms ?? "—"} 间启用客房计算` : `Based on ${data?.active_rooms ?? "—"} active rooms`), pill: null},
    {id: "booking" as const, Icon: CalendarDays, title: historical ? (zh ? "已记录间夜" : "Recorded Nights") : (zh ? "预订进度" : "Booking Progress"), value: historical ? String(data?.booked_order_room_nights ?? "—") : data ? `${data.booked_room_nights} / ${data.capacity_room_nights}` : "—", caption: historical ? (zh ? "已记录订单间夜" : "Recorded order nights") : (zh ? "已订 / 库存总间夜" : "Booked / capacity nights"), pill: data && !historical ? (zh ? `余 ${data.available_room_nights} 间夜` : `${data.available_room_nights} open nights`) : null},
    {id: "amount" as const, Icon: Banknote, title: zh ? "预订金额" : "Booked Amount", value: money(data?.amount_cents, zh), caption: zh ? "按所选住宿期间分摊" : "Allocated to stay period", pill: null},
    {id: "adr" as const, Icon: Tag, title: zh ? "平均预订房价" : "Average Booked Rate", value: money(data?.average_booked_rate_cents, zh), caption: zh ? "每个已订订单间夜" : "Per booked order night", pill: weekendRates.length ? `${zh ? "周末峰值" : "Weekend peak"} ${money(Math.max(...weekendRates) * 100, zh)}` : null},
  ];
  const title = metric === "occupancy" ? (zh ? "每日预订占用率走势" : "Daily Booked Occupancy Trend") : metric === "booking" ? (zh ? "每日已订间夜分布" : "Daily Booked Room Nights") : metric === "amount" ? (zh ? "每日分摊预订金额" : "Daily Allocated Booking Value") : (zh ? "每日订单平均房价" : "Daily Average Booked Rate");
  const weekdayNights = data?.daily.filter(day => !weekend(day.date)).reduce((sum, day) => sum + (historical ? day.order_room_nights ?? 0 : day.booked), 0) ?? 0;
  const weekendNights = data?.daily.filter(day => weekend(day.date)).reduce((sum, day) => sum + (historical ? day.order_room_nights ?? 0 : day.booked), 0) ?? 0;
  const denominator = historical ? null : data?.capacity_room_nights;
  const breakdown = [
    {label: zh ? "工作日已订间夜" : "Weekday booked nights", nights: weekdayNights, color: "violet"},
    {label: zh ? "周末已订间夜（周六/周日）" : "Weekend booked nights", nights: weekendNights, color: "yellow"},
    {label: zh ? "剩余可售空房间夜" : "Open available nights", nights: historical ? null : data?.available_room_nights ?? null, color: "lavender"},
  ];
  const rangeQuery = data ? `?${new URLSearchParams({start: data.period_start, end: data.period_end})}` : "";
  return <div className="gemini-business-analysis">
    {controls}
    <div className="analysis-status">
      {status === "loading" && <p role="status">{zh ? "正在读取订单指标…" : "Reading booking data…"}</p>}
      {status === "error" && <p role="alert">{zh ? "订单指标暂时无法读取。" : "Booking figures could not be read."} <button type="button" onClick={retry}>{zh ? "重试" : "Retry"}</button></p>}
      {historical && <p role="note">{zh ? "缺少历史房量，不展示历史占用率与剩余库存；仍可查看订单金额和已记录间夜。" : "Historical inventory is unknown. Recorded order nights and amounts remain available."}</p>}
    </div>
    <div className="kpi-row" aria-label={zh ? "选择图表指标" : "Select chart metric"}>{cards.map(({id, Icon, title: label, value, caption, pill}) => <button key={id} type="button" className={`kpi-card is-selectable${metric === id ? " is-selected" : ""}`} aria-pressed={metric === id} onClick={() => onMetric(id)}>
      <span className="kpi-head"><span className="kpi-label">{label}</span><span className="kpi-icon"><Icon size={17} strokeWidth={1.75}/></span></span>
      <span className="kpi-main"><strong className="kpi-value">{value}</strong>{pill && <span className="pill pill-violet">{pill}</span>}</span><span className="kpi-sub">{caption}</span>
    </button>)}</div>
    {data ? <div className="bento-grid" id="booking-analysis-detail" tabIndex={-1}>
      <article className="bento-card"><div className="card-header"><div><h3 className="card-title">{title}</h3><p className="card-subtitle">{zh ? "蓝紫主线代表每日读数，亮黄圆点标记周六与周日" : "Violet line shows daily figures; yellow dots highlight weekends"}</p></div><strong className="chart-big-value">{cards.find(card => card.id === metric)?.value}</strong></div>
        {data.active_rooms === 0 && !historical ? <div className="analysis-empty"><p>{zh ? "添加或启用客房后，即可查看预订占用率。" : "Add or enable rooms to see booked occupancy."}</p><Link href="/app/mine#room-types">{zh ? "设置房型与价格" : "Set up rooms and rates"} →</Link></div> : <DailyChart data={data} metric={metric} zh={zh} selected={selected} onSelect={onSelect}/>}
        <div className="segmented-breakdown"><div className="segmented-cols">{breakdown.map(item => {
          const share = item.nights !== null && denominator ? Math.round(item.nights / denominator * 1000) / 10 : null;
          return <div className={`seg-col c-${item.color}`} key={item.color}><strong>{item.nights ?? "—"} {zh ? "间夜" : "nights"}{share !== null && <span className="pill">{share}%</span>}</strong><span>{item.label}</span><div className="seg-track"><div className="seg-fill" style={{width: `${Math.min(100, Math.max(0, share ?? 0))}%`}}/></div></div>;
        })}</div></div>
        {!!data.overlapping_order_room_nights && <p className="analysis-note" role="alert">{zh ? "发现客房重复占用，请先核对订单分配。" : "Overlapping orders were found. Review room allocations."}</p>}
      </article>
      <article className="bento-card"><div className="card-header"><div><h3 className="card-title">{zh ? "每日明细核对表" : "Daily Figures Breakdown"}</h3><p className="card-subtitle">{zh ? "数值列右对齐，周末以浅黄色标识" : "Right-aligned figures; weekends highlighted in yellow"}</p></div></div>
        <div className="daily-table-scroll"><table className="bento-table"><thead><tr><th scope="col">{zh ? "日期" : "Date"}</th><th scope="col">{zh ? "已订" : "Booked"}</th><th scope="col">{zh ? "未订" : "Open"}</th><th scope="col">{zh ? "分摊金额" : "Amount"}</th></tr></thead><tbody>{data.daily.map(day => <tr key={day.date} data-weekend={weekend(day.date) || undefined} data-selected={data.daily[selected ?? -1]?.date === day.date || undefined}><th scope="row">{day.date}</th><td>{historical ? day.order_room_nights ?? "—" : day.booked}</td><td>{historical ? "—" : day.available}</td><td>{money(day.amount_cents, zh)}</td></tr>)}</tbody></table></div>
      </article>
    </div> : <article className="bento-card analysis-empty" aria-busy={status === "loading"}>{status === "loading" ? (zh ? "正在整理每日预订分布…" : "Preparing the daily booking pattern…") : (zh ? "读取订单与房量后，图表和每日明细将在这里呈现。" : "Daily charts and figures appear when bookings and inventory are available.")}</article>}
    {data?.partial_channel_coverage && <p className="analysis-note">{zh ? "当前汇总仅包含已导入订单。" : "This summary covers imported bookings."}{data.last_import && ` ${zh ? "最近导入" : "Last import"} ${new Date(data.last_import.imported_at).toLocaleString(zh ? "zh-CN" : "en-GB", {timeZone: "Asia/Shanghai"})} · ${data.last_import.channels.join(" / ")}`}</p>}
    <div className="analysis-extra"><div className="analysis-rate-context"><span>{zh ? "内部基础房价" : "Configured room rates"}</span><strong>{data?.rate_min == null ? "—" : `${money(data.rate_min * 100, zh)}${data.rate_min === data.rate_max ? "" : ` — ${money((data.rate_max ?? data.rate_min) * 100, zh)}`}`}</strong><Link href={`/app/explore${rangeQuery}`}>{zh ? "查看同日周边报价" : "Compare same-date nearby rates"} →</Link></div>
      <details className="analysis-revenue"><summary>{zh ? "已完成订单金额与月历" : "Completed Booking Value & Calendar"}</summary><RevenuePreview zh={zh}/></details>
    </div>
  </div>;
}
