"use client";

import { useEffect, useState } from "react";

type Summary = { paragraphs: string[]; engine: "model_v1" | "rules_v1"; reason: string; metrics: {period_days: number} };

export function AnalysisSummary({ language, days }: { language: "en" | "zh"; days: 7 | 28 }) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const zh = language === "zh";
  const t = (en: string, cn: string) => zh ? cn : en;
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/local/analysis-summary?days=${days}&language=${language}`, { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error();
      setSummary(await response.json() as Summary); setError(false);
    }).catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [language, days, retry]);
  return <section className="analysis-summary-card" aria-label={t("Your business summary", "经营总结")}>
    <div className="analysis-summary-heading"><h2>{t("Your business summary", "经营总结")}</h2><small>{summary?.engine === "model_v1" ? t("AI summary · Sample", "AI 总结 · 示例") : t("Sample summary", "示例总结")}</small></div>
    {summary && summary.metrics.period_days === days && !error ? <>
      {summary.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
      {summary.reason === "model_unavailable" && <p className="native-muted">{t("AI is unavailable. Showing a rules-based summary.", "AI 暂不可用，当前为规则总结。")}</p>}
      {summary.reason === "preparing" && <p className="native-muted">{t("AI is preparing a summary. Showing the computed sample interpretation for now.", "AI 正在准备总结，当前先显示示例指标的规则解读。")}</p>}
    </> : error ? <p role="alert">{t("Summary service unavailable.", "总结服务暂时不可用。 ")}<button type="button" className="analysis-summary-retry" onClick={() => setRetry(value => value + 1)}>{t("Retry", "重试")}</button></p> : <p role="status">{t("Preparing the summary for this period…", "正在准备所选期间的总结…")}</p>}
  </section>;
}
