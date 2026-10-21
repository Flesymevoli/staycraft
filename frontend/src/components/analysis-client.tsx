"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ChevronDown, BedDouble, CalendarDays, Tag, TrendingUp, Star } from "lucide-react";
import { useDemoStorage } from "./demo-storage";
import "./native-home.css";
import "./native-analysis.css";
import { GuestFeedback } from "./guest-feedback";
import { AnalysisSummary } from "./analysis-summary";
import { useOperationMetrics } from "./operation-metrics";
import { exploreDays } from "./explore-data";

type Language = "en" | "zh";
const plotX = (index: number, count: number) => 34 + (302 * index) / (count - 1);
const plotY = (value: number) => 192 - value * 1.5;
function curvePath(values: number[]) {
  const points = values.map((value, index) => ({ x: plotX(index, values.length), y: plotY(value) }));
  return points.map((point, index) => {
    if (index === 0) return "M " + point.x + " " + point.y;
    const previous = points[index - 1];
    const midpoint = (previous.x + point.x) / 2;
    return " C " + midpoint + " " + previous.y + ", " + midpoint + " " + point.y + ", " + point.x + " " + point.y;
  }).join("");
}

function TabBar({ language }: { language: Language }) {
  const zh = language === "zh";
  const tabs = [
    { en: "Home", cn: "首页", icon: "home-inactive", href: "/native-home" },
    { en: "Work", cn: "工作", icon: "work", href: "/native-work" },
    { en: "Analysis", cn: "分析", icon: "analysis-active", href: "/native-analysis" },
    { en: "Explore", cn: "探索", icon: "explore", href: "/native-explore" },
    { en: "Mine", cn: "我的", icon: "mine", href: "/native-mine" },
  ];
  return <nav className="native-tabbar" aria-label={zh ? "主导航" : "Main navigation"}>
    {tabs.map((tab, index) => <Link href={tab.href} className={index === 2 ? "is-active" : ""} key={tab.en} aria-current={index === 2 ? "page" : undefined}>
      <Image src={"/figma-icons/" + tab.icon + ".svg"} alt="" width={24} height={24} />
      <span>{zh ? tab.cn : tab.en}</span>
    </Link>)}
  </nav>;
}

export function AnalysisClient() {
  const [language, setLanguage] = useDemoStorage<Language>("language", "en");
  const [range, setRange] = useState<7 | 28>(7);
  const [selected, setSelected] = useState<number | null>(null);
  const [showDaily, setShowDaily] = useState(false);
  const [metric, setMetric] = useState("occupancy");
  const plotRef = useRef<HTMLDivElement>(null);
  const zh = language === "zh";
  const t = (en: string, cn: string) => (zh ? cn : en);
  const { data: metrics, status: metricsStatus, retry: retryMetrics } = useOperationMetrics(range);
  const data = metrics?.daily.map(item => ({ ...item, value: item.value ?? 0, date: new Date(item.date + "T00:00:00") })) ?? [];
  const mean = metrics?.occupancy_pct;
  const delta = metrics?.occupancy_change_pp;
  const dateLabel = (date: Date) => date.toLocaleDateString(zh ? "zh-CN" : "en-US", { month: "short", day: "numeric" });
  const choosePoint = (clientX: number) => {
    if (!plotRef.current) return;
    const bounds = plotRef.current.getBoundingClientRect();
    const position = Math.max(0, Math.min(1, (clientX - bounds.left - (34 / 360) * bounds.width) / ((302 / 360) * bounds.width)));
    setSelected(Math.round(position * (data.length - 1)));
  };
  const changeRange = (next: 7 | 28) => { setRange(next); setSelected(null); };
  const metricHint = (key: string) => <span className="analysis-metric-hint">{metric === key ? t("Viewing below", "正在查看") : t("View details", "查看详情")}<ChevronDown size={13} aria-hidden="true" /></span>;

  return <div className="native-shell">
    <div className="native-page native-analysis-page">
      <header className="native-header"><span className="native-kicker">{t("ANALYSIS", "经营分析")}</span><button type="button" className="native-language" onClick={() => setLanguage(zh ? "en" : "zh")}>{zh ? "EN" : "中文"}</button></header>
      <section className="analysis-overview">
        <h1>{t("Analysis", "经营分析")}</h1>
        <p className="analysis-switch-hint">{t("Select a metric to view its details below", "点选指标，在下方查看详情")}</p>
        <span className="native-kicker">{t("YOUR BOOKINGS · SAMPLE", "自身预订 · 示例")}</span>
        <div className="analysis-overview-grid">
          <button type="button" aria-pressed={metric === "occupancy"} onClick={() => setMetric("occupancy")}><BedDouble className="analysis-metric-icon" size={18} aria-hidden="true" /><small>{t("Occupancy", "入住率")}</small><strong>{mean === null || mean === undefined ? "—" : `${selected === null ? mean : data[selected]?.value ?? mean}%`}</strong><span>{t("Selected period", "所选期间")}</span>{metricHint("occupancy")}</button>
          <button type="button" aria-pressed={metric === "booking"} onClick={() => setMetric("booking")}><CalendarDays className="analysis-metric-icon" size={18} aria-hidden="true" /><small>{t("Booking pace", "预订进度")}</small><strong>{metrics && metrics.next_week_capacity_nights ? `${metrics.next_week_booked_nights} / ${metrics.next_week_capacity_nights}` : "—"}</strong><span>{t("Next week · Room nights", "下周 · 已订 / 可售间夜")}</span>{metricHint("booking")}</button>
        </div>
        <span className="native-kicker">{t("MARKET & GUEST CONTEXT · SAMPLE", "市场与客人参考 · 示例")}</span>
        <div className="analysis-context-grid">
          <button type="button" aria-pressed={metric === "rate"} onClick={() => setMetric("rate")}><Tag className="analysis-metric-icon" size={18} aria-hidden="true" /><small>{t("Your rate", "当前房价")}</small><strong>¥520</strong><span>{t("Compare position", "查看价格位置")}</span>{metricHint("rate")}</button>
          <button type="button" aria-pressed={metric === "demand"} onClick={() => setMetric("demand")}><TrendingUp className="analysis-metric-icon" size={18} aria-hidden="true" /><small>{t("Demand", "市场需求")}</small><strong>{t("Rising", "上升")}</strong><span>{t("Weekend signal", "周末需求信号")}</span>{metricHint("demand")}</button>
          <button type="button" aria-pressed={metric === "satisfaction"} onClick={() => setMetric("satisfaction")}><Star className="analysis-metric-icon" size={18} aria-hidden="true" /><small>{t("Satisfaction", "满意度")}</small><strong>4.8 <small className="analysis-score-scale">/ 5</small></strong><span>{t("40 sample ratings", "40 条示例评分")}</span>{metricHint("satisfaction")}</button>
        </div>
      </section>
      <div id="analysis-metrics" className="analysis-selected-detail" aria-live="polite">
      {["occupancy", "booking"].includes(metric) && (metricsStatus !== "ready" || !metrics?.capacity_room_nights) && <section className="analysis-main-card"><p role={metricsStatus === "error" ? "alert" : "status"}>{metricsStatus === "loading" ? t("Reading reservation data…", "正在读取订单数据…") : metricsStatus === "error" ? t("Could not load reservation data.", "订单数据读取失败。") : t("No room inventory available.", "暂无客房资料，暂不能计算指标。")}</p>{metricsStatus === "error" && <button type="button" className="analysis-summary-retry" onClick={retryMetrics}>{t("Retry", "重试")}</button>}</section>}
      {metric === "occupancy" && metrics && metrics.capacity_room_nights > 0 && <>
      <section className="analysis-main-card">
        <span className="native-kicker">{t("YOUR STAY, IN PERSPECTIVE", "看懂你的民宿")}</span>
        <div className="analysis-metric-title"><h1>{t("Occupancy", "入住率")}</h1><small>{t("Demo data", "示例数据")}</small></div>

        <div className="analysis-context"><p>{selected === null ? dateLabel(data[0].date) + " – " + dateLabel(data[data.length - 1].date) : dateLabel(data[selected].date)}</p><p>{selected === null ? delta !== null && delta !== undefined ? t(`${delta >= 0 ? "+" : ""}${delta} percentage points vs previous period`, `较上一期间 ${delta >= 0 ? "+" : ""}${delta} 个百分点`) : t("Period average · Sample bookings", "期间平均 · 示例订单") : data[selected].weekend ? t("Weekend · Sample occupancy", "周末 · 示例入住率") : t("Weekday · Sample occupancy", "工作日 · 示例入住率")}</p></div>
        <div className="analysis-toolbar">
          <div role="group" aria-label={t("Chart time range", "图表时间范围")} className="analysis-range">
            <button type="button" aria-pressed={range === 7} onClick={() => changeRange(7)}>{t("7 days", "7 天")}</button>
            <button type="button" aria-pressed={range === 28} onClick={() => changeRange(28)}>{t("28 days", "28 天")}</button>
          </div>
          <button type="button" className="analysis-reset" onClick={() => setSelected(null)}>{t("Period average", "期间平均")}</button>
        </div>
        <div className="analysis-plot" ref={plotRef} onPointerDown={event => choosePoint(event.clientX)} onPointerMove={event => { if (event.buttons) choosePoint(event.clientX); }}>
          <svg viewBox="0 0 360 235" role="img" aria-label={t("Daily occupancy. Hollow points mark weekends.", "每日入住率。空心点表示周末。")}>
            <defs><linearGradient id="analysis-clean-spectrum" x1="0%" y1="0%" x2="100%" y2="0%"><stop stopColor="#dfaaa5" /><stop offset=".28" stopColor="#eac883" /><stop offset=".56" stopColor="#b9a7df" /><stop offset=".8" stopColor="#9bbce6" /><stop offset="1" stopColor="#88c8b6" /></linearGradient></defs>
            {[0, 50, 100].map(value => <g key={value}><line x1="34" x2="336" y1={plotY(value)} y2={plotY(value)} stroke="#dddfe4" strokeWidth=".8" strokeDasharray={value ? "2 5" : undefined} /><text x="28" y={plotY(value) + 4} textAnchor="end" fill="#61656d" fontSize="10">{value}</text></g>)}
            <path d={curvePath(data.map(d => d.value))} fill="none" stroke="url(#analysis-clean-spectrum)" strokeWidth="2.2" strokeLinecap="round" />
            {data.map((item, index) => { const color = ["#dfaaa5", "#eac883", "#b9a7df", "#9bbce6", "#88c8b6"][Math.min(4, Math.floor(index / Math.max(1, data.length - 1) * 5))]; return <circle key={item.date.toISOString()} cx={plotX(index, data.length)} cy={plotY(item.value)} r={selected === index ? 5 : range === 7 ? 3.5 : 2.3} fill={item.weekend ? "#fcfcfd" : color} stroke={selected === index ? "#202124" : color} strokeWidth="1.3" />; })}
            {selected !== null && <line x1={plotX(selected, data.length)} x2={plotX(selected, data.length)} y1={plotY(data[selected].value) + 7} y2="192" stroke="#8b929b" strokeWidth="1" strokeDasharray="3 4" />}
            {[0, Math.floor((data.length - 1) / 2), data.length - 1].map((index, i) => <text key={i} x={plotX(index, data.length)} y="222" fill="#61656d" textAnchor={i === 0 ? "start" : i === 2 ? "end" : "middle"} fontSize="10">{dateLabel(data[index].date)}</text>)}
          </svg>
          <input aria-label={t("Select date on occupancy chart", "选择入住率图表日期")} type="range" min={0} max={data.length - 1} value={selected ?? 0} onChange={event => setSelected(Number(event.target.value))} className="analysis-chart-range" />
        </div>
        <div className="analysis-chart-key"><span>● {t("Weekday", "工作日")} &nbsp; ○ {t("Weekend", "周末")}</span><span>{t("Drag to explore", "拖动查看")}</span></div>
        <button type="button" className="analysis-daily-toggle" aria-expanded={showDaily} onClick={() => setShowDaily(!showDaily)}>{t("View daily values", "查看每日数据")} <span>{showDaily ? "−" : "+"}</span></button>
        {showDaily && <table className="analysis-data-table"><thead><tr><th>{t("Date", "日期")}</th><th>{t("Occupancy", "入住率")}</th></tr></thead><tbody>{data.map(item => <tr key={item.date.toISOString()}><td>{dateLabel(item.date)}</td><td>{item.value}%</td></tr>)}</tbody></table>}
      </section>
      </>}
      {metric === "booking" && metrics && metrics.next_week_capacity_nights > 0 && <section className="analysis-main-card analysis-metric-panel" id="booking-detail"><div className="analysis-metric-title"><h2>{t("Booking pace", "预订进度")}</h2><small>{t("Your bookings · Sample", "自身预订 · 示例")}</small></div><p>{metrics.next_week_start} – {metrics.next_week_end} · {t("As of", "截至")} {metrics.as_of}</p><div className="analysis-progress"><span style={{width:`${metrics.next_week_booked_nights / metrics.next_week_capacity_nights * 100}%`}} /></div><p>{t(`${metrics.next_week_booked_nights} room nights booked, ${metrics.next_week_capacity_nights - metrics.next_week_booked_nights} still available.`, `已订 ${metrics.next_week_booked_nights} 间夜，剩余 ${metrics.next_week_capacity_nights - metrics.next_week_booked_nights} 间夜。`)}</p><p>{t("No historical booking snapshot is available for a pace comparison.", "暂无历史预订快照，暂不比较预订速度。")}</p></section>}
      {metric === "rate" && <section className="analysis-main-card analysis-metric-panel" id="rate-detail"><div className="analysis-metric-title"><h2>{t("Price position", "房价位置")}</h2><small>{t("Market comparison · Sample", "市场比较 · 示例")}</small></div><p>{t("Sep 26 · Per night", "9 月 26 日 · 每晚")}</p><div className="analysis-price-track"><span>{t("You", "你")}</span></div><div className="analysis-panel-labels"><span>¥460</span><span>{t("Sample market range", "示例市场范围")}</span><span>¥590</span></div><p>{t("Your rate sits within the illustrative comparable-stay range. No price change is made.", "当前房价位于示例同类住宿价格范围内，不会自动修改定价。")}</p><Link href="/native-explore">{t("Compare nearby stays", "对比周边住宿")} <ArrowRight size={15}/></Link></section>}
      {metric === "demand" && <section className="analysis-main-card analysis-metric-panel" id="demand-detail">
        <div className="analysis-metric-title"><h2>{t("Market demand", "市场需求")}</h2><small>{t("Sample data", "示例数据")}</small></div>
        <p>{t("September 2026 · Local accommodation demand", "2026 年 9 月 · 周边住宿需求")}</p>
        <div className="analysis-demand-summary"><strong>{t("Sep 26 is the monthly peak", "9 月 26 日为本月高峰")}</strong><span>{t("Demand index 92 / 100", "需求指数 92 / 100")}</span></div>
        <p>{t("Higher scores mean stronger local demand, not your occupancy rate.", "指数越高，周边住宿需求越强；不代表你的入住率。")}</p>
        <svg className="analysis-demand-chart" viewBox="0 0 360 210" role="img" aria-label={t("September sample demand index, from 0 to 100. Peak: September 26, 92.", "9 月示例需求指数，范围 0 至 100。9 月 26 日最高，为 92。") }>
          <defs><linearGradient id="analysis-demand-spectrum" x1="0%" y1="0%" x2="100%" y2="0%"><stop stopColor="#d79992" /><stop offset=".5" stopColor="#efc774" /><stop offset="1" stopColor="#8cbf82" /></linearGradient></defs>
          {[0,50,100].map(value => <g key={value}><line x1="32" x2="344" y1={170-value*1.3} y2={170-value*1.3} stroke="#dde3ea" strokeDasharray={value ? "3 4" : undefined}/><text x="25" y={174-value*1.3} textAnchor="end" fontSize="11" fill="#61656d">{value}</text></g>)}
          <polyline points={exploreDays.map((entry,index)=>`${32+index*312/29},${170-entry.score*1.3}`).join(" ")} fill="none" stroke="url(#analysis-demand-spectrum)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          <line x1={32+25*312/29} x2={32+25*312/29} y1="32" y2="170" stroke="#969c95" strokeDasharray="3 4" />
          <circle cx={32+25*312/29} cy={170-92*1.3} r="4" fill="#fcfcfd" stroke="#899487" strokeWidth="2" />
          <text x={32+25*312/29} y="23" textAnchor="end" fill="#61656d" fontSize="11">{t("Sep 26 · 92", "9/26 · 92")}</text>
          {[1,10,20,30].map(day => <text key={day} x={32+(day-1)*312/29} y="195" textAnchor={day===1?"start":day===30?"end":"middle"} fill="#61656d" fontSize="11">{zh ? `9/${day}` : `Sep ${day}`}</text>)}
        </svg>
        <p>{t("In this demo, weekends have stronger demand, with a local event on Sep 26. Use this as context for promotions.", "示例中周末需求较强，9 月 26 日设有周边活动，可作为安排推广的参考。")}</p>
        <Link href="/native-explore">{t("Explore local opportunities", "查看周边机会")} <ArrowRight size={15}/></Link>
      </section>}
      {metric === "satisfaction" && <section className="analysis-main-card analysis-metric-panel" id="satisfaction-detail">
        <div className="analysis-metric-title"><h2>{t("Guest satisfaction", "客人满意度")}</h2><small>{t("Post-stay ratings · Sample", "入住后评分 · 示例")}</small></div>
        <details className="analysis-rating-disclosure">
          <summary><span>{t("5★: 32 · 4★: 8", "5 星 32 条 · 4 星 8 条")}</span><span className="analysis-rating-action">{t("Rating breakdown", "评分分布")}<ChevronDown size={14} aria-hidden="true" /></span></summary>
          <div className="analysis-rating-breakdown">{[[5,32],[4,8],[3,0],[2,0],[1,0]].map(([stars,count])=><div className="analysis-rating-row" key={stars}><span>{stars} ★</span><div className="analysis-progress"><span style={{width:count/40*100+"%"}}/></div><small>{count}</small></div>)}</div>
        </details>
        <GuestFeedback language={language} />
      </section>}
      </div>
      <AnalysisSummary key={`${language}-${range}`} language={language} days={range} />
      <section className="analysis-decisions">
        <h2>{t("Suggested next steps", "建议决策")}</h2>
        <Link href="/native-explore#promotion" className="analysis-decision-link analysis-decision-priority"><span className="analysis-decision-copy"><span className="analysis-priority-label">{t("Start here", "优先建议")}</span><strong>{t("Promote weekday stays", "推广工作日住宿")}</strong><small>{t("Give guests a reason to arrive early or stay longer", "借周边活动，吸引客人提前来、多住一晚")}</small></span><span className="analysis-decision-cta">{t("Create draft", "生成文案")}<ArrowRight size={16}/></span></Link>
        <Link href="/native-explore" className="analysis-decision-link"><span className="analysis-decision-copy"><strong>{t("Review before changing rates", "调价前先看周边")}</strong><small>{t("Compare similar stays before deciding", "比较同类住宿，再判断是否需要调整")}</small></span><span className="analysis-decision-cta">{t("Compare", "去对比")}<ArrowRight size={16}/></span></Link>
        <button type="button" className="analysis-decision-link" onClick={()=>{setMetric("satisfaction");document.getElementById("analysis-metrics")?.scrollIntoView({behavior:"smooth",block:"start"});}}><span className="analysis-decision-copy"><strong>{t("Review breakfast feedback", "跟进早餐体验")}</strong><small>{t("Read what guests would like improved", "看看客人希望增加哪些选择")}</small></span><span className="analysis-decision-cta">{t("Read reviews", "看评价")}<ArrowRight size={16}/></span></button>
      </section>
      <p className="analysis-footer">{t("SAMPLE DATA · NO CONNECTED PLATFORMS", "示例数据 · 未连接外部平台")}</p>
    </div>
    <TabBar language={language} />
  </div>;
}









