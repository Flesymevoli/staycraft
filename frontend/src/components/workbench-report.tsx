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
  const futureAmountCents = metrics?.amount_cents ?? run?.metrics.amountCents;
  const futureNights = metrics?.booked_room_nights ?? run?.metrics.bookedRoomNights;
  const futurePeriod = metrics ? {start:metrics.period_start,end:metrics.period_end} : run?.period;

  return <><section className="wb-income-overview" aria-label={zh ? "收入概况" : "Revenue overview"}>
    <div>
      <i className="desktop-kpi-icon" aria-hidden="true"><Banknote size={16}/></i>
      <span>{zh ? "过去 7 天已完成住宿收入" : "Completed revenue · past 7 days"}</span>
      <strong>{money(completed?.amountCny)}</strong>
      {change != null && <small>{zh ? "较前周期" : "Versus previous period"} {change > 0 ? "+" : ""}{change}%</small>}
      <small>{revenue ? `${revenue.period.start} — ${revenue.period.end}` : status === "error" ? (zh ? "收入暂时无法读取" : "Revenue unavailable") : (zh ? "正在读取收入" : "Loading revenue")}</small>
      {status === "error" && <button type="button" onClick={retry}>{zh ? "重试" : "Retry"}</button>}
    </div>
    <div>
      <i className="desktop-kpi-icon" aria-hidden="true"><BedDouble size={16}/></i>
      <span>{zh ? "过去 7 天已完成间夜" : "Completed nights · past 7 days"}</span>
      <strong>{completed?.roomNights ?? "—"}</strong>
      <small>{zh ? "过去 7 天已完成住宿" : "Completed stays · past 7 days"}</small>
    </div>
    <div>
      <i className="desktop-kpi-icon" aria-hidden="true"><Tag size={16}/></i>
      <span>{zh ? "平均成交房价" : "Achieved room rate"}</span>
      <strong>{money(completed?.averageRateCny)}</strong>
      <small>{completed?.roomNights === 0 ? (zh ? "该周期无已完成间夜" : "No completed nights in this period") : (zh ? "同一收入周期实际均价" : "Same revenue period")}</small>
    </div>
    <div>
      <i className="desktop-kpi-icon" aria-hidden="true"><CalendarCheck size={16}/></i>
      <span>{zh ? "未来 7 天已订金额" : "Booked value · next 7 days"}</span>
      <strong>{money(futureAmountCents == null ? null : futureAmountCents / 100)}</strong>
      <small>{futurePeriod&&`${futurePeriod.start} — ${futurePeriod.end}`}{futureNights!=null&&(zh?` · 已订 ${futureNights} 间夜`:` · ${futureNights} nights booked`)}</small>
      <Link href="/app/analysis">{zh ? "核对经营数据" : "View business data"} →</Link>
    </div>
  </section>{completed?.roomNights===0&&revenue&&<details className="wb-revenue-period-note"><summary>{zh?'为什么收入和间夜为 0？':'Why are revenue and nights zero?'}</summary><p>
    {zh ? `${revenue.period.start}—${revenue.period.end} 没有已完成的住宿间夜，因此收入和间夜为 0，均价暂不计算。其他日期的订单仍保留。` : `No completed room nights from ${revenue.period.start} to ${revenue.period.end}, so revenue and nights are 0 and the average rate is unavailable. Orders on other dates are retained.`}
    {!!comparison?.previousCompleted.roomNights&&<>{' '}{zh?`上一周期（${comparison.previousPeriod.start}—${comparison.previousPeriod.end}）已完成 ${comparison.previousCompleted.roomNights} 间夜，收入 ${money(comparison.previousCompleted.amountCny)}。`:`The previous period (${comparison.previousPeriod.start}–${comparison.previousPeriod.end}) has ${comparison.previousCompleted.roomNights} completed nights and ${money(comparison.previousCompleted.amountCny)} revenue.`}</>}
    {' '}<Link href={comparison?.previousCompleted.roomNights ? `/app/analysis?${new URLSearchParams(comparison.previousPeriod)}` : '/app/analysis'}>{zh ? (comparison?.previousCompleted.roomNights ? '查看上一周期订单' : '选择其他日期查看订单') : (comparison?.previousCompleted.roomNights ? 'View previous-period orders' : 'View orders for other dates')} →</Link>
  </p></details>}</>;
}
