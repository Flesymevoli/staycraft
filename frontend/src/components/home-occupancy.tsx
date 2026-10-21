"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useOperationMetrics } from "./operation-metrics";

export function HomeOccupancy({ zh }: { zh: boolean }) {
  const { data, status, retry } = useOperationMetrics(7);
  const t = (en: string, cn: string) => zh ? cn : en;
  const weekdayOpportunity = data && data.weekday_pct !== null && data.weekend_pct !== null && data.weekday_pct < data.weekend_pct;
  return <article className="native-card home-occupancy">
    <span className="native-card-label">{t("Occupancy", "入住率")}</span>
    <div className="native-metric">{data?.occupancy_pct ?? "—"}{data?.occupancy_pct !== null && data && <span>%</span>}</div>
    {status === "loading" ? <p role="status">{t("Reading reservation data…", "正在读取订单数据…")}</p> : status === "error" ? <p role="alert">{t("Could not load occupancy.", "入住率读取失败。 ")}<button type="button" className="analysis-summary-retry" onClick={retry}>{t("Retry", "重试")}</button></p> : data?.occupancy_pct === null ? <p>{t("No room inventory available.", "暂无客房资料，暂不能计算入住率。")}</p> : <>
      <h3>{weekdayOpportunity ? t("Fill your weekdays.", "填满工作日。") : t("Review your open dates.", "看看哪些日期还有空房。")}</h3>
      <p>{weekdayOpportunity ? t("More weekday availability. Review a midweek stay offer.", "工作日仍有空房，可以考虑工作日住宿优惠。") : t("Check daily availability before choosing a promotion.", "先查看每日空房情况，再决定推广时段。")}</p>
      <p className="native-muted">{data?.period_start} – {data?.period_end} · {t("Sample bookings", "示例订单")}</p>
    </>}
    <Link className="native-primary" href="/native-analysis">{t("View suggestion", "查看建议")} <ArrowRight size={16}/></Link>
  </article>;
}
