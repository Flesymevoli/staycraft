"use client";

import {useId, useState, type ReactNode} from "react";
import Link from "next/link";
import type {DecisionAgentRun} from "@/lib/decision-agent-types";
import {renderOpportunityText} from "@/lib/decisions/opportunity";
import type {BookingMetrics} from "./booking-metrics";
import {useRevenueOverview} from "./revenue-overview";
import "./gemini-diagnostic-report.css";

type Props = {
  scope: string;
  run: DecisionAgentRun;
  metrics: BookingMetrics | null;
  zh: boolean;
  onNavigate: () => void;
  children: ReactNode;
};
type ReportAction = {
  id: string;
  title: string;
  explanation: string;
  window: {start: string; end: string};
  links: {target: "data" | "market" | "promotion" | "diagnosis"; href?: string}[];
};

export function GeminiDiagnosticReport({scope, run, metrics, zh, onNavigate, children}: Props) {
  const t = (cn: string, en: string) => zh ? cn : en;
  const money = (value: number) => `¥${value.toLocaleString(zh ? "zh-CN" : "en-GB", {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
  const overview = useRevenueOverview(scope);
  const revenue = overview.revenue;
  const roomTypes = revenue?.breakdowns.roomTypes.filter(row => row.completed.roomNights > 0).sort((a, b) => b.completed.amountCents - a.completed.amountCents) ?? [];
  const leading = roomTypes[0];
  const tied = leading && roomTypes.filter(row => row.completed.amountCents === leading.completed.amountCents).length > 1;
  const missingInventory = (metrics?.active_rooms ?? run.metrics.activeRooms) === 0;
  const forecast = metrics ? {
    period: {start: metrics.period_start, end: metrics.period_end},
    booked: metrics.booked_room_nights,
    occupancy: metrics.booked_pct,
    amount: metrics.amount_cents,
  } : {period: run.period, booked: run.metrics.bookedRoomNights, occupancy: run.metrics.bookedPct, amount: run.metrics.amountCents};
  const [expanded, setExpanded] = useState(false);
  const detailId = useId();
  const actionLink = (target: ReportAction["links"][number]["target"], window: ReportAction["window"], reference: {opportunityId: string} | {findingId: string}) => {
    if (target === "diagnosis") return {target};
    const page = target === "promotion" ? "promotion" : target === "market" ? "explore" : "analysis";
    return {target, href: `/app/${page}?${new URLSearchParams({runId: run.id, ...reference, ...window})}`};
  };
  const actions: ReportAction[] = run.opportunities?.length ? run.opportunities.map(opportunity => {
    const text = renderOpportunityText(opportunity, zh);
    return {id: opportunity.id, title: text.title, explanation: text.claim, window: opportunity.window,
      links: opportunity.actions.filter((action, index, all) => all.findIndex(other => other.target === action.target) === index).map(action => actionLink(action.target, opportunity.window, {opportunityId: opportunity.id}))};
  }) : run.findings.map(finding => ({
    id: finding.id, title: finding.title, explanation: finding.action || finding.conclusion,
    window: finding.nextAction?.period ?? run.period,
    links: finding.nextAction ? [actionLink(finding.nextAction.target, finding.nextAction.period, {findingId: finding.id})] : [],
  }));
  const actionLabel = (target: ReportAction["links"][number]["target"]) => target === "promotion" ? t("基于此判断去写推广文案", "Create Promotion from This Finding")
    : target === "market" ? t("查看同日期市场报价", "View Market Quotes for These Dates")
    : target === "data" ? t("核对经营数据", "Review Business Data") : t("展开详细判断与依据", "Read the Full Finding and Evidence");

  return <div className="gemini-diagnostic-report">
    <header className="gdr-heading">
      <span className="gdr-period">{t("经营展望", "Operating Outlook")} · {run.period.start} — {run.period.end}</span>
      <h2>{missingInventory ? t("完善民宿房量与订单，开始经营诊断", "Add Room Inventory and Bookings to Begin") : run.report?.title || run.findings[0]?.title || t("从经营记录中识别下一步", "Find Your Next Step in Operating Records")}</h2>
    </header>
    <section className="gdr-card gdr-insights">
      <h3>{t("一、收入与预订结构洞察", "1. Revenue & Booking Composition")}</h3>
      {revenue ? <>
        <p>{t(`${revenue.period.start} — ${revenue.period.end} 已完成住宿客房收入 ${money(revenue.completed.amountCny)}（${revenue.completed.roomNights} 间夜${revenue.completed.averageRateCny === null ? "，暂无成交均价" : `，成交均价 ${money(revenue.completed.averageRateCny)}`}）。`,
          `${revenue.period.start} — ${revenue.period.end}: completed room revenue ${money(revenue.completed.amountCny)} across ${revenue.completed.roomNights} room nights${revenue.completed.averageRateCny === null ? "; no achieved rate is available" : `, at an achieved rate of ${money(revenue.completed.averageRateCny)}`}.`)}</p>
        {leading ? <p>{t(`${leading.name}贡献 ${money(leading.completed.amountCny)}${leading.completedSharePct === null ? "" : `（占比 ${leading.completedSharePct}%）`}，${tied ? "并列为" : "是"}本周期已完成住宿收入贡献最多的房型。`,
          `${leading.name} contributed ${money(leading.completed.amountCny)}${leading.completedSharePct === null ? "" : ` (${leading.completedSharePct}%)`}, ${tied ? "tied for the highest" : "the highest"} completed room revenue contribution in this period.`)}</p> : <p>{t("本周期尚无已完成住宿记录，完成订单后可查看房型收入贡献。", "There are no completed stays in this period. Room-type contributions appear when stays are completed.")}</p>}
      </> : <p role="status">{overview.status === "error" ? t("已完成住宿收入暂时无法读取。", "Completed revenue is temporarily unavailable.") : t("正在读取已完成住宿收入与房型构成…", "Loading completed revenue and room-type composition…")}{overview.status === "error" && <> <button type="button" className="gdr-text-button" onClick={overview.retry}>{t("重试读取", "Retry")}</button></>}</p>}
      <p>{t(`${forecast.period.start} — ${forecast.period.end} 已记录预订 ${forecast.booked} 间夜${forecast.occupancy === null ? "，房量不足，暂不计算占用率" : `（预订占用率 ${forecast.occupancy}%）`}${forecast.amount == null ? "，预订金额暂不可用" : `，已订金额 ${money(forecast.amount / 100)}`}。`,
        `${forecast.period.start} — ${forecast.period.end}: ${forecast.booked} recorded booked room nights${forecast.occupancy === null ? "; occupancy is unavailable until capacity is complete" : ` (${forecast.occupancy}% booked occupancy)`}${forecast.amount == null ? "; booked value is unavailable" : `, with a booked value of ${money(forecast.amount / 100)}`}.`)}</p>
      <p className="gdr-note">{t("以上按当前已记录订单统计，已完成住宿与未来预订分开；客房收入不代表实收、净收入或利润。", "Current recorded orders only. Completed stays and future bookings are separate; room revenue does not represent cash received, net revenue or profit.")}</p>
    </section>
    <section className="gdr-card">
      <h3>{t("二、已完成住宿房型构成表", "2. Completed Revenue by Room Type")}</h3>
      {revenue && <p className="gdr-table-period">{revenue.period.start} — {revenue.period.end}</p>}
      <table className="gdr-table">
        <caption className="gdr-sr-only">{t("已完成住宿房型收入、间夜与成交均价", "Completed room revenue, room nights and achieved rate by room type")}</caption>
        <colgroup><col className="gdr-type-col"/><col className="gdr-revenue-col"/><col className="gdr-nights-col"/><col className="gdr-rate-col"/></colgroup>
        <thead><tr><th scope="col">{t("房型", "Room Type")}</th><th scope="col">{t("客房收入", "Revenue")}</th><th scope="col">{t("已售间夜", "Nights")}</th><th scope="col">{t("成交均价", "Achieved Rate")}</th></tr></thead>
        <tbody>{roomTypes.map(row => <tr key={row.name}><th scope="row">{row.name}</th><td>{money(row.completed.amountCny)}</td><td>{row.completed.roomNights}</td><td>{row.completed.averageRateCny === null ? "—" : money(row.completed.averageRateCny)}</td></tr>)}
          {!roomTypes.length && <tr><td className="gdr-table-empty" colSpan={4}>{revenue ? t("暂无已完成住宿房型记录", "No completed room-type records yet") : overview.status === "error" ? t("暂时无法读取房型收入", "Room-type revenue is unavailable") : t("正在读取房型收入…", "Loading room-type revenue…")}</td></tr>}
        </tbody>
      </table>
    </section>
    <section className="gdr-card">
      <h3>{t("三、优先执行动作", "3. Recommended Actions")}</h3>
      {actions.length ? <ol className="gdr-actions">{actions.map(action => <li key={action.id}>
        <h4>{action.title}</h4><p>{action.explanation}</p><small>{action.window.start} — {action.window.end}</small>
        <div className="gdr-action-links">{action.links.map(link => link.href ? <Link className={link.target === "promotion" ? "gdr-primary" : "gdr-secondary"} href={link.href} key={link.target} onClick={onNavigate}>{actionLabel(link.target)} →</Link>
          : <button className="gdr-secondary" type="button" key={link.target} onClick={() => setExpanded(true)} aria-controls={detailId}>{actionLabel(link.target)} ↓</button>)}</div>
      </li>)}</ol> : <p>{t("当前记录尚未形成具体行动建议。补齐民宿房量与订单后，再识别需要推广或复核的日期。", "The current records do not support a specific action yet. Add room inventory and bookings to identify dates for promotion or review.")}</p>}
    </section>
    <details id={detailId} className="gdr-details" open={expanded} onToggle={event => setExpanded(event.currentTarget.open)}>
      <summary>{t("查看原始详细报告、证据与分析记录", "View the Full Report, Evidence and Analysis Records")}</summary>
      {expanded && <div className="gdr-details-content"><p className="gdr-note">{t("以下保留本次诊断保存的报告与证据快照。", "The saved report and evidence snapshots for this diagnosis are retained below.")}</p>{children}</div>}
    </details>
  </div>;
}
