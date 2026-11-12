"use client";

import Link from "next/link";
import {Banknote, BedDouble, CalendarCheck, Tag} from "lucide-react";
import type {DecisionAgentRun} from "@/lib/decision-agent-types";
import type {BookingMetrics} from "./booking-metrics";
import {useRevenueOverview} from "./revenue-overview";

type ReportProps = {
  run: DecisionAgentRun | null;
  metrics: BookingMetrics | null;
  zh: boolean;
};

export function WorkbenchReport({run, metrics, zh, scope = "workspace"}: ReportProps & {scope?: string}) {
  const overview = useRevenueOverview(scope);
  return <IncomeOverview run={run} metrics={metrics} zh={zh} overview={overview}/>;
}

export function IncomeOverview({run, metrics, zh, overview}: ReportProps & {overview: ReturnType<typeof useRevenueOverview>}) {
  const {revenue, status, retry} = overview;
  const completed = revenue?.completed;
  const comparison = revenue?.comparison;
  const change = comparison?.available ? comparison.amountChangePct : null;
  const money = (value: number | null | undefined) => value == null ? "—" : "¥" + value.toLocaleString(zh ? "zh-CN" : "en-GB", {maximumFractionDigits: 2});
  const futureAmountCents = run?.metrics.amountCents ?? metrics?.amount_cents;

  return <section className="wb-income-overview" aria-label={zh ? "收入概况" : "Revenue overview"}>
    <div>
      <i className="desktop-kpi-icon" aria-hidden="true"><Banknote size={16}/></i>
      <span>{zh ? "已完成住宿客房收入" : "Completed room revenue"}</span>
      <strong>{money(completed?.amountCny)}</strong>
      {change != null && <small>{zh ? "较前周期" : "Versus previous period"} {change > 0 ? "+" : ""}{change}%</small>}
      <small>{revenue ? `${revenue.period.start} — ${revenue.period.end}` : status === "error" ? (zh ? "收入暂时无法读取" : "Revenue unavailable") : (zh ? "正在读取收入" : "Loading revenue")}</small>
      {status === "error" && <button type="button" onClick={retry}>{zh ? "重试" : "Retry"}</button>}
    </div>
    <div>
      <i className="desktop-kpi-icon" aria-hidden="true"><BedDouble size={16}/></i>
      <span>{zh ? "已售间夜" : "Sold room nights"}</span>
      <strong>{completed?.roomNights ?? "—"}</strong>
      <small>{zh ? "已完成住宿" : "Completed stays"}</small>
    </div>
    <div>
      <i className="desktop-kpi-icon" aria-hidden="true"><Tag size={16}/></i>
      <span>{zh ? "平均成交房价" : "Achieved room rate"}</span>
      <strong>{money(completed?.averageRateCny)}</strong>
      <small>{completed?.roomNights === 0 ? (zh ? "该周期无已完成间夜" : "No completed nights in this period") : (zh ? "同一收入周期实际均价" : "Same revenue period")}</small>
    </div>
    <div>
      <i className="desktop-kpi-icon" aria-hidden="true"><CalendarCheck size={16}/></i>
      <span>{zh ? "未来已订金额" : "Future booked value"}</span>
      <strong>{money(futureAmountCents == null ? null : futureAmountCents / 100)}</strong>
      <Link href="/app/analysis">{zh ? "核对经营数据" : "View business data"} →</Link>
    </div>
  </section>;
}
