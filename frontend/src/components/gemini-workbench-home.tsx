"use client";

import Link from "next/link";
import {useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode} from "react";
import {CalendarDays, FileText, Zap} from "lucide-react";
import type {DecisionAgentRun} from "@/lib/decision-agent-types";
import type {Opportunity} from "@/lib/decisions/types";
import {buildHeadline} from "@/lib/decisions/headline";
import {renderOpportunityText, selectPriorityOpportunities} from "@/lib/decisions/opportunity";
import {metricLabel, metricUnit} from "@/lib/decisions/labels";
import type {BookingMetrics} from "./booking-metrics";
import {useRevenueOverview} from "./revenue-overview";
import {IncomeOverview} from "./workbench-report";
import {EvidencePanel} from "./evidence-panel";
import {WorkspaceAssistant} from "./workspace-assistant";
import "./gemini-workbench-home.css";

type Props = {
  scope: string;
  run: DecisionAgentRun | null;
  metrics: BookingMetrics | null;
  zh: boolean;
  busy: boolean;
  error: string;
  onRetry: () => void;
  planPanel: ReactNode;
  onSavePlan: (id: string) => void;
  onCollect: () => void;
  onReport: () => void;
};

const compactDate = (date: string) => date.slice(5).replace("-", "/");
function compactDates(text: string) {
  const years = new Set([...text.matchAll(/(\d{4})-\d{2}-\d{2}/g)].map(match => match[1]));
  return text.replace(/(\d{4})-(\d{2})-(\d{2})/g, (_, year, month, day) => years.size > 1 ? `${year}/${month}/${day}` : `${month}/${day}`);
}
const money = (value: number, zh: boolean) => `¥${value.toLocaleString(zh ? "zh-CN" : "en-GB", {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

type ChartDay = Pick<BookingMetrics["daily"][number], "date" | "booked" | "booked_pct"> & {capacity: number | null};

function OccupancyChart({daily, zh}: {daily: ChartDay[]; zh: boolean}) {
  const gradientId = useId();
  const tooltipId = useId();
  const figureRef = useRef<HTMLElement>(null);
  const tooltipRef = useRef<HTMLElement>(null);
  const [selected, setSelected] = useState<{date: string; source: "pointer" | "focus" | "touch"} | null>(null);
  const highlightedIndex = daily.findIndex(day => day.date === selected?.date && day.booked_pct !== null);
  const highlighted = daily[highlightedIndex];
  const point = (index: number, value: number) => [30 + index * 325 / Math.max(1, daily.length - 1), 120 - value * 0.9];
  const [tooltipX, tooltipY] = highlighted ? point(highlightedIndex, highlighted.booked_pct!) : [0, 0];
  useLayoutEffect(() => {
    const figure = figureRef.current, tooltip = tooltipRef.current;
    if (!highlighted || !figure || !tooltip) return;
    const positionTooltip = () => {
      const bounds = figure.getBoundingClientRect(), box = tooltip.getBoundingClientRect();
      const x = tooltipX / 380 * bounds.width, y = tooltipY / 155 * bounds.height;
      const above = y - box.height - 12;
      // Anchor the callout to the selected observation, then keep it inside the chart.
      tooltip.style.left = `${Math.max(4, Math.min(x - box.width / 2, bounds.width - box.width - 4))}px`;
      tooltip.style.top = `${Math.max(4, Math.min(above >= 4 ? above : y + 12, bounds.height - box.height - 4))}px`;
    };
    positionTooltip();
    const resize = new ResizeObserver(positionTooltip);
    resize.observe(figure);
    resize.observe(tooltip);
    return () => resize.disconnect();
  }, [highlighted, tooltipX, tooltipY, zh]);
  useEffect(() => {
    if (!selected) return;
    const dismiss = (event: KeyboardEvent) => {if (event.key === "Escape") setSelected(null);};
    const dismissOutside = (event: PointerEvent) => {
      if (selected.source === "touch" && event.target instanceof Node && !figureRef.current?.contains(event.target)) setSelected(null);
    };
    document.addEventListener("keydown", dismiss);
    document.addEventListener("pointerdown", dismissOutside);
    return () => {document.removeEventListener("keydown", dismiss); document.removeEventListener("pointerdown", dismissOutside);};
  }, [selected]);
  const usable = daily.filter(day => day.booked_pct !== null);
  if (!usable.length) return <div className="chart-empty">{zh ? "补齐房量与订单后，可查看每日预订分布。" : "Add inventory and bookings to see the daily booking pattern."}</div>;
  // Keep missing dates as gaps instead of drawing an invented observation.
  const segments: number[][][] = [];
  daily.forEach((day, index) => {
    if (day.booked_pct === null) return;
    if (index === 0 || daily[index - 1].booked_pct === null) segments.push([]);
    segments[segments.length - 1].push(point(index, day.booked_pct));
  });
  return <figure className="hero-chart" ref={figureRef} onPointerDown={event => {
    if (event.pointerType === "touch" && !(event.target as Element).closest(".hero-chart-point")) setSelected(null);
  }}>
    <svg viewBox="0 0 380 155" role="group" aria-label={zh ? "每日预订占用率，悬停或选择圆点查看明细" : "Daily booked occupancy. Hover or select a point for details."}>
      <defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6554e8" stopOpacity="0.26"/><stop offset="100%" stopColor="#6554e8" stopOpacity="0"/></linearGradient></defs>
      {[30, 75, 120].map(y => <line key={y} x1="20" y1={y} x2="360" y2={y} stroke="#eceaf5" strokeDasharray={y === 120 ? undefined : "3 4"}/>)}
      {segments.map((points, index) => <g key={index}>
        <polygon points={`${points[0][0]},120 ${points.map(pair => pair.join(",")).join(" ")} ${points.at(-1)![0]},120`} fill={`url(#${gradientId})`}/>
        <polyline points={points.map(pair => pair.join(",")).join(" ")} fill="none" stroke="#6554e8" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/>
      </g>)}
      {daily.map((day, index) => {
        const [x, y] = point(index, day.booked_pct ?? 0);
        const weekend = [0, 6].includes(new Date(`${day.date}T12:00:00Z`).getUTCDay());
        return <g key={day.date}>
          {day.booked_pct !== null && <>
            <circle aria-hidden="true" cx={x} cy={y} r={weekend ? 5 : 3.5} fill={weekend ? "#ffdc32" : "#6554e8"} stroke="#6554e8" strokeWidth={weekend ? 2 : 0}/>
            <circle className="hero-chart-point" data-date={day.date} cx={x} cy={y} r="12" fill="transparent"
              tabIndex={0} role="button" aria-label={`${day.date}: ${day.booked_pct}%, ${zh ? `已订 ${day.booked} / 可售房量 ${day.capacity ?? "—"}` : `${day.booked} booked / ${day.capacity ?? "—"} capacity`}`}
              aria-describedby={highlighted?.date === day.date ? tooltipId : undefined}
              onPointerEnter={event => {if (event.pointerType !== "touch") setSelected({date: day.date, source: "pointer"});}}
              onPointerLeave={event => {if (event.pointerType !== "touch") setSelected(current => current?.source === "pointer" ? null : current);}}
              onPointerDown={event => {if (event.pointerType === "touch") setSelected(current => current?.date === day.date && current.source === "touch" ? null : {date: day.date, source: "touch"});}}
              onFocus={event => {if (event.currentTarget.matches(":focus-visible")) setSelected({date: day.date, source: "focus"});}}
              onBlur={() => setSelected(current => current?.source === "focus" ? null : current)}
              onClick={event => {if (event.detail === 0) setSelected({date: day.date, source: "focus"});}}
              onKeyDown={event => {if (event.key === "Enter" || event.key === " ") {event.preventDefault(); setSelected({date: day.date, source: "focus"});}}}/>
          </>}
          {(index % 2 === 0 || index === daily.length - 1) && <text x={x} y="145" textAnchor="middle" fontSize="10" fill="#73737f">{compactDate(day.date)}</text>}
        </g>;
      })}
    </svg>
    {highlighted && <figcaption ref={tooltipRef} id={tooltipId} role="tooltip"><strong>{compactDate(highlighted.date)} · {highlighted.booked_pct}%</strong><span>{zh ? `已订 ${highlighted.booked} / 可售房量 ${highlighted.capacity ?? "—"}` : `${highlighted.booked} booked / ${highlighted.capacity ?? "—"} capacity`}</span></figcaption>}
  </figure>;
}

function OpportunityTile({opportunity, runId, zh, onSavePlan, onReport}: {
  opportunity: Opportunity; runId: string; zh: boolean; onSavePlan: Props["onSavePlan"]; onReport: Props["onReport"];
}) {
  const copy = renderOpportunityText(opportunity, zh);
  const primary = opportunity.actions[0];
  const dates = new URLSearchParams(opportunity.window).toString();
  const href = primary?.target === "promotion" ? `/app/promotion?${new URLSearchParams({runId, opportunityId: opportunity.id})}`
    : primary?.target === "market" ? `/app/explore?${dates}` : `/app/analysis?${dates}`;
  const label = primary?.target === "promotion" ? (zh ? "制定推广文案" : "Create Promotion")
    : primary?.target === "market" ? (zh ? "查看市场报价" : "View Market Quotes") : (zh ? "核对经营数据" : "Review Business Data");
  return <article className="opp-card">
    <div className="opp-card-head"><span className={`pill ${opportunity.kind === "risk" ? "pill-coral" : "pill-emerald"}`}>
      {opportunity.kind === "risk" ? (zh ? "经营风险" : "Operating risk") : (zh ? "收益机会" : "Opportunity")} · {compactDate(opportunity.window.start)} → {compactDate(opportunity.window.end)}
    </span><small>{zh ? `依据 ${opportunity.basis.length} 条` : `${opportunity.basis.length} signals`}</small></div>
    <h3>{copy.title}</h3><p>{copy.claim}</p>
    <div className="opp-card-foot">
      {primary?.target === "diagnosis" ? <button type="button" className="btn-action-violet" onClick={onReport}>{zh ? "查看诊断" : "View Diagnosis"} →</button>
        : primary && <Link className="btn-action-violet" href={href}>{label} →</Link>}
      {primary?.target !== "promotion" && opportunity.actions.some(action => action.target === "promotion") && <Link className="btn-action-outline" href={`/app/promotion?${new URLSearchParams({runId, opportunityId: opportunity.id})}`}>{zh ? "制定推广文案" : "Create Promotion"} →</Link>}
      <button type="button" className="btn-action-outline" onClick={() => onSavePlan(opportunity.id)}>{zh ? "+ 加入计划" : "+ Save Plan"}</button>
    </div>
  </article>;
}

export function GeminiWorkbenchHome({scope, run, metrics, zh, busy, error, onRetry, planPanel, onSavePlan, onCollect, onReport}: Props) {
  const overview = useRevenueOverview(scope);
  const [showRevenueDetails, setShowRevenueDetails] = useState(false);
  const revenueDetailsId = useId();
  const headline = run ? buildHeadline({signals: run.signals, opportunities: run.opportunities, sources: run.signalSources, dailyMetrics: run.dailyMetrics, zh}) : null;
  const period = run?.period ?? (metrics ? {start: metrics.period_start, end: metrics.period_end} : null);
  const daily = metrics?.daily ?? run?.dailyMetrics?.map(day => ({date: day.date, booked: day.booked, capacity: day.capacity, booked_pct: day.bookedPct})) ?? [];
  const bookedPct = metrics?.booked_pct ?? run?.metrics.bookedPct ?? null;
  const booked = metrics?.booked_room_nights ?? run?.metrics.bookedRoomNights;
  const capacity = metrics?.capacity_room_nights ?? run?.metrics.capacityRoomNights;
  const roomTypes = overview.revenue?.breakdowns.roomTypes.filter(type => type.completed.roomNights > 0) ?? [];
  const opportunities = selectPriorityOpportunities(run?.opportunities ?? []);
  const featuredOpportunities = selectPriorityOpportunities(opportunities, 2);
  const remainingOpportunities = opportunities.filter(item => !featuredOpportunities.some(featured => featured.id === item.id));
  const sources = run?.signalSources ?? [];
  const internalEvidence = run?.evidence.filter(evidence => ["metrics", "inventory", "bookings", "revenue"].includes(evidence.kind)) ?? [];
  const sourceNames = {
    orders: zh ? "内部订单记录" : "Booking records", inventory: zh ? "房型与可售房量" : "Rooms and sellable inventory",
    weather: zh ? "民宿所在地天气" : "Local weather", events: zh ? "周边文旅活动" : "Local cultural events",
    competitor: zh ? "周边住宿参考报价" : "Nearby reference rates", market: zh ? "市场采集快照" : "Market price snapshot",
  };
  const coverageNames = {complete: zh ? "覆盖完整" : "Complete", partial: zh ? "部分覆盖" : "Partial", none: zh ? "待补充" : "Unavailable"};
  const internalSourceLabel = (kind: string) => kind === "inventory" ? (zh ? "民宿房型与挂牌价" : "Property rooms and listed rates")
    : kind === "revenue" ? (zh ? "已完成住宿记录" : "Completed stay records")
    : (zh ? "本店订单与房量记录" : "Property bookings and inventory");
  const count = bookedPct === null ? 0 : Math.ceil(Math.max(0, Math.min(100, bookedPct)) * 18 / 100);
  const primaryFinding = run?.findings[0];
  return <div className="gemini-workbench-home">
    <header className="section-header"><div>
      <h1>{zh ? "经营决策工作台" : "Decision Workbench"}</h1>
      <p>{zh ? "收入概况、AI 经营诊断、优先决策机会与实时依据一览" : "Revenue overview, AI diagnosis, priority opportunities & evidence"}</p>
    </div><div className="header-controls">
      {period && <span className="date-pill"><CalendarDays size={14}/>{period.start} — {period.end}</span>}
      <button type="button" className="btn-action-outline" onClick={onCollect}><Zap size={14}/>{zh ? "实时采集报价" : "Collect Quotes"}</button>
      <button type="button" className="btn-action-violet" onClick={onReport} disabled={!run}><FileText size={14}/>{zh ? "完整诊断报告" : "Full Report"}</button>
    </div></header>
    <IncomeOverview run={run} metrics={metrics} zh={zh} overview={overview}/>
    {error && <div className="home-status" role="alert"><p>{zh ? "本次诊断尚未完成，请重新分析。" : "This diagnosis could not finish. Please retry."}</p><button type="button" className="btn-action-outline" disabled={busy} onClick={onRetry}>{zh ? "重新分析" : "Retry Analysis"}</button></div>}
    <div className="bento-grid"><div className="bento-col">
      <article className="bento-card">
        <div className="hero-composite-top"><div>
          <span className="pill pill-violet">{zh ? "核心诊断" : "Core Judgment"}{headline?.window && ` · ${compactDate(headline.window.start)} → ${compactDate(headline.window.end)}`}</span>
          <h2 className="hero-judgment-title">{compactDates(headline?.conclusion ?? primaryFinding?.conclusion ?? (busy ? (zh ? "正在分析经营情况" : "Investigating your business") : (zh ? "从订单与房量开始，看清经营机会" : "Find operating opportunities in your bookings and inventory")))}</h2>
          <p className="hero-judgment-desc">{headline?.reason ?? primaryFinding?.reason ?? (busy ? (zh ? "读取经营记录、核对库存与市场信号。" : "Reading records, inventory and market signals.") : (zh ? "完善民宿资料并导入订单，经营判断将随数据更新。" : "Complete your property profile and import bookings to build your operating review."))}</p>
          {!busy && !run && <Link href="/app/analysis" className="inline-link">{zh ? "导入并核对订单" : "Import and review bookings"} →</Link>}
        </div><OccupancyChart daily={daily} zh={zh}/></div>
        <div className="segmented-breakdown">
          <div className="segmented-breakdown-head"><span>{zh ? "房型收入与间夜构成（已完成住宿）" : "Completed Revenue & Nights by Room Type"}</span><button type="button" className="btn-action-outline" aria-expanded={showRevenueDetails} aria-controls={revenueDetailsId} onClick={() => setShowRevenueDetails(open => !open)} disabled={!overview.revenue}>{showRevenueDetails ? (zh ? "收起明细表" : "Hide Breakdown") : (zh ? "查看明细表 →" : "Breakdown →")}</button></div>
          {roomTypes.length ? <div className="segmented-cols">{roomTypes.map((type, index) => <div className={`seg-col c-${index % 3}`} key={type.name}>
            <strong>{money(type.completed.amountCny, zh)}<span className="pill pill-violet">{type.completedSharePct ?? 0}%</span></strong>
            <span>{type.name} · {type.completed.roomNights} {zh ? "间夜" : "nights"}</span><div className="seg-track"><div className="seg-fill" style={{width: `${Math.max(0, Math.min(100, type.completedSharePct ?? 0))}%`}}/></div>
          </div>)}</div> : <p className="empty-copy">{overview.status === "loading" ? (zh ? "正在读取房型收入…" : "Loading room-type revenue…") : overview.status === "error" ? (zh ? "房型收入暂时无法读取。" : "Room-type revenue is unavailable.") : (zh ? "本周期暂无已完成住宿，完成订单后可查看房型贡献。" : "No completed stays in this period. Room-type contributions appear as stays complete.")}</p>}
          {overview.status === "error" && <button type="button" className="inline-link" onClick={overview.retry}>{zh ? "重试读取" : "Retry"}</button>}
          {overview.revenue && <div id={revenueDetailsId} className="revenue-details" hidden={!showRevenueDetails}>
            <p>{overview.revenue.period.start} — {overview.revenue.period.end}</p>
            <div className="revenue-table-scroll"><table><caption>{zh ? "已完成住宿 · 房型明细" : "Completed Stays · Room Types"}</caption><thead><tr><th scope="col">{zh ? "房型" : "Room Type"}</th><th scope="col">{zh ? "收入" : "Revenue"}</th><th scope="col">{zh ? "间夜" : "Nights"}</th><th scope="col">ADR</th></tr></thead><tbody>{overview.revenue.breakdowns.roomTypes.map(type => <tr key={type.name}><th scope="row">{type.name}</th><td>{money(type.completed.amountCny, zh)}</td><td>{type.completed.roomNights}</td><td>{type.completed.averageRateCny === null ? "—" : money(type.completed.averageRateCny, zh)}</td></tr>)}</tbody></table></div>
            <div className="revenue-table-scroll"><table><caption>{zh ? "已完成住宿 · 每日明细" : "Completed Stays · Daily Breakdown"}</caption><thead><tr><th scope="col">{zh ? "住宿日" : "Stay Date"}</th><th scope="col">{zh ? "收入" : "Revenue"}</th><th scope="col">{zh ? "间夜" : "Nights"}</th><th scope="col">ADR</th></tr></thead><tbody>{overview.revenue.breakdowns.dates.map(day => <tr key={day.date}><th scope="row">{day.date}</th><td>{money(day.completed.amountCny, zh)}</td><td>{day.completed.roomNights}</td><td>{day.completed.averageRateCny === null ? "—" : money(day.completed.averageRateCny, zh)}</td></tr>)}</tbody></table></div>
          </div>}
        </div>
      </article>
      {opportunities.length > 0 ? <><div className="opp-grid">{featuredOpportunities.map(opportunity => <OpportunityTile key={opportunity.id} opportunity={opportunity} runId={run!.id} zh={zh} onSavePlan={onSavePlan} onReport={onReport}/>)}</div>
        {remainingOpportunities.length > 0 && <details className="more-opportunities"><summary>{zh ? `查看其余 ${remainingOpportunities.length} 项机会与风险` : `View ${remainingOpportunities.length} more opportunities & risks`}</summary><div className="opp-grid">{remainingOpportunities.map(opportunity => <OpportunityTile key={opportunity.id} opportunity={opportunity} runId={run!.id} zh={zh} onSavePlan={onSavePlan} onReport={onReport}/>)}</div></details>}</>
        : <article className="bento-card"><h3 className="card-title">{zh ? "优先经营机会" : "Priority Opportunities"}</h3><p className="empty-copy">{busy ? (zh ? "正在结合订单与周边信号识别机会…" : "Reviewing bookings and nearby signals…") : (zh ? "当前数据尚未形成可执行机会，可补充订单与市场报价后重新分析。" : "No actionable opportunities yet. Add bookings and market quotes, then review again.")}</p></article>}
      <article className="bento-card"><div className="card-header"><div><h3 className="card-title">{zh ? "实时检测信号与数据来源" : "Detector Signals & Evidence Sources"}</h3><p className="card-subtitle">{zh ? "结合本店订单、可售房量与已获取的周边信号，查看每项判断的依据" : "Trace each judgment to your bookings, sellable inventory and available local signals"}</p></div></div>
        <div className="clean-list">{sources.map((source, index) => <div className="clean-row" key={`${source.id}-${index}`}><div className="row-left"><span className="row-badge-icon">{source.authority === "internal" ? "DATA" : source.id === "weather" ? "WTH" : source.id === "events" ? "EVT" : "OTA"}</span><div className="row-meta"><strong>{sourceNames[source.id]}</strong><small>{source.coverage.from} — {source.coverage.to}</small></div></div><div className="row-right"><span className={`pill ${source.coverage.kind === "complete" ? "pill-emerald" : "pill-amber"}`}>{coverageNames[source.coverage.kind]}</span></div></div>)}</div>
        {internalEvidence.length > 0 && <div className="clean-list internal-evidence">{internalEvidence.map(evidence => <div className="clean-row" key={evidence.id}><div className="row-left"><span className="row-badge-icon">DATA</span><div className="row-meta"><strong>{evidence.title}</strong><small>{evidence.period ? `${evidence.period.start} — ${evidence.period.end}` : internalSourceLabel(evidence.kind)}</small></div></div><div className="row-right"><span className="pill pill-violet">{zh ? "内部记录" : "Internal records"}</span></div></div>)}</div>}
        {!sources.length && !internalEvidence.length && <p className="empty-copy">{zh ? "来源记录将在诊断完成后展示。" : "Source records appear when the diagnosis finishes."}</p>}
        {!!run?.signals?.length && <div className="signal-summary">{run.signals.filter(signal => signal.metric.value !== null).slice(0, 3).map(signal => <div key={signal.id}><span>{metricLabel(signal.metric.name, zh)}</span><strong>{signal.metric.unit === "cny" ? money(signal.metric.value!, zh) : `${signal.metric.value}${metricUnit(signal.metric.name, signal.metric.unit, zh)}`}</strong></div>)}</div>}
        {run && <details className="source-details"><summary>{zh ? "查看观测时间、覆盖与详细依据" : "Observation times, coverage & detailed evidence"}</summary><EvidencePanel sources={sources} signals={run.signals} zh={zh}/>{internalEvidence.map(evidence => <section className="internal-evidence-detail" key={evidence.id}><h4>{evidence.title}</h4><p>{internalSourceLabel(evidence.kind)}</p><time dateTime={evidence.capturedAt}>{evidence.capturedAt}</time><ul>{evidence.facts.map((fact, index) => <li key={index}>{fact}</li>)}</ul></section>)}</details>}
      </article>
    </div><aside className="bento-col">
      <article className="bento-card"><div className="card-header"><div><h3 className="card-title">{zh ? "未来 7 天预订占用率" : "7-Day Booked Occupancy"}</h3><p className="card-subtitle">{zh ? "已确认订单与可售房量" : "Confirmed bookings and sellable inventory"}</p></div></div>
        <div className="gauge-wrap"><svg viewBox="0 0 220 124" aria-hidden="true">{Array.from({length: 18}, (_, index) => {
          const angle = Math.PI * (1 - index / 17);
          const color = index < count ? (index >= Math.max(0, count - 2) ? "#ffdc32" : "#6554e8") : "#eae8f4";
          return <line key={index} x1={110 + 68 * Math.cos(angle)} y1={108 - 68 * Math.sin(angle)} x2={110 + 96 * Math.cos(angle)} y2={108 - 96 * Math.sin(angle)} stroke={color} strokeWidth="7.5" strokeLinecap="round"/>;
        })}</svg><div className="gauge-center"><strong>{bookedPct === null ? "—" : `${bookedPct}%`}</strong><span>{zh ? `已订 ${booked ?? "—"} / 总量 ${capacity ?? "—"} 间夜` : `${booked ?? "—"} booked / ${capacity ?? "—"} capacity`}</span></div></div>
        <div className="gauge-scale"><span>0%</span><span>{zh ? "预订占用率" : "Booked occupancy"}</span><span>100%</span></div>
        <button type="button" className="btn-action-outline full-width" onClick={onReport} disabled={!run}>{zh ? "查看完整报告与每日分布" : "View Full Report & Daily Breakdown"}</button>
      </article>
      <div className="gemini-action-plan">{planPanel}</div>
      <div className="docked-ai-card"><WorkspaceAssistant key={scope} zh={zh} embedded range={period ?? undefined}/></div>
    </aside></div>
  </div>;
}
