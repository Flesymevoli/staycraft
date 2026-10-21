"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Check, ClipboardList, ChartNoAxesCombined, RotateCcw, Sparkles } from "lucide-react";
import { useDemoStorage } from "./demo-storage";
import { WorkInbox } from "./work-inbox";
import { WorkOperationDemo } from "./work-operation-demo";
import { useLocalOperations } from "./local-operations";
import { useOperationMetrics } from "./operation-metrics";
import "./native-home.css";
import "./native-work.css";

type TaskId = "reply" | "promotion" | "analysis";
type Language = "en" | "zh";

const tasks: Record<TaskId, {
  type: [string, string]; title: [string, string]; meta: [string, string];
  note: [string, string]; action: [string, string]; draft: [string, string]; source: [string, string];
}> = {
  reply: {
    type: ["GUEST CARE", "客人服务"],
    title: ["Early arrival request", "提前入住咨询"],
    meta: ["Room 102 · Alex", "102 房 · Alex"],
    note: ["AI has prepared a reply.", "AI 已准备好回复。"],
    action: ["Review reply", "审核回复"],
    draft: [
      "Hi Alex, our usual check-in time is 14:00. We can check whether Room 102 will be ready earlier on your arrival day. You are welcome to leave your luggage with us in the meantime.",
      "Alex，你好！我们的常规入住时间是 14:00。抵达当天，我们可以确认 102 房是否能提前准备好。等待期间，你可以先寄存行李。",
    ],
    source: ["Based on your sample check-in policy. Early check-in is not guaranteed.", "依据示例入住规则。未承诺一定能提前入住。"],
  },
  promotion: {
    type: ["CONTENT", "内容推广"],
    title: ["Weekday promotion", "工作日推广"],
    meta: ["Based on your recent occupancy", "依据近期入住率"],
    note: ["Draft is ready for review.", "草稿已准备好，等待审核。"],
    action: ["Review draft", "审核草稿"],
    draft: [
      "A little more room to slow down. Enjoy a quieter weekday escape at Garden House — a comfortable stay and time to explore at your own pace. Ask us about available midweek dates.",
      "给生活多一点留白。在花园民宿享受安静的工作日小住，舒适休息，按自己的节奏探索周边。欢迎咨询工作日可订日期。",
    ],
    source: ["Based on sample occupancy: weekdays have more availability. No discount or publishing is assumed.", "依据示例入住率：工作日空房较多。未设定优惠或自动发布。"],
  },
  analysis: {
    type: ["ANALYSIS", "经营分析"],
    title: ["Weekday occupancy insight", "工作日入住率洞察"],
    meta: ["Sample booking records · Last 7 days", "示例预订记录 · 近 7 天"],
    note: ["Your insight is ready to review.", "分析已准备好，等待查看。"],
    action: ["Review insight", "查看分析"],
    draft: [
      "Reservation data has not loaded. Retry before reviewing this insight.",
      "订单数据尚未读取，请重试后查看洞察。",
    ],
    source: ["No calculation available yet.", "暂未获得计算结果。"],
  },
};

const baseActivity = [
  { time: "14:32", title: ["Guest question answered", "客人问题已回复"], detail: ["Breakfast · Room 201 · AI replied", "早餐时间 · 201 房 · AI 已回复"] },
  { time: "13:18", title: ["Property information updated", "民宿资料已更新"], detail: ["Archived sample · Breakfast time", "历史示例 · 早餐时间"] },
  { time: "11:46", title: ["Weekly insight generated", "每周分析已生成"], detail: ["Weekday occupancy is lower", "工作日入住率较低"] },
] as const;

const decisionNames: Record<string, [string, string]> = {
  check_readiness: ["Check room readiness · Not executed", "核实房间准备情况 · 未执行"],
  consider_early: ["Early arrival plan · Not executed", "提前入住方案 · 未执行"],
  keep_standard: ["Keep standard check-in · Not executed", "按常规时间入住 · 未执行"],
  refund_proposed: ["Refund proposal · No money moved", "退款建议 · 未发生资金交易"],
  hold_review: ["Manual review planned · Not executed", "计划人工核实 · 未执行"],
};

function TabBar({ language }: { language: Language }) {
  const zh = language === "zh";
  const tabs = [
    { en: "Home", cn: "首页", icon: "home-inactive", href: "/native-home" },
    { en: "Work", cn: "工作", icon: "work-active", href: "/native-work" },
    { en: "Analysis", cn: "分析", icon: "analysis", href: "/native-analysis" },
    { en: "Explore", cn: "探索", icon: "explore", href: "/native-explore" },
    { en: "Mine", cn: "我的", icon: "mine", href: "/native-mine" },
  ];
  return <nav className="native-tabbar" aria-label={zh ? "主导航" : "Main navigation"}>
    {tabs.map((tab, index) => <Link href={tab.href} className={index === 1 ? "is-active" : ""} key={tab.en} aria-current={index === 1 ? "page" : undefined}>
      <Image src={"/figma-icons/" + tab.icon + ".svg"} alt="" width={24} height={24} />
      <span>{zh ? tab.cn : tab.en}</span>
    </Link>)}
  </nav>;
}

export function WorkClient({ initialTask = null }: { initialTask?: TaskId | null }) {
  const [autoReply, setAutoReply] = useDemoStorage<boolean>("autoReply", true);
  const [language, setLanguage] = useDemoStorage<Language>("language", "en");
  const [confirmed, setConfirmed] = useDemoStorage<TaskId[]>("confirmed", []);
  const [analysisReady, setAnalysisReady] = useDemoStorage<boolean>("analysisReady", false);
  const [expanded, setExpanded] = useState<TaskId | null>(initialTask);
  const [drafts, setDrafts] = useState<Partial<Record<TaskId, string>>>({});
  const [notice, setNotice] = useState("");
  const [activityOpen, setActivityOpen] = useState<number | null>(null);
  const operations = useLocalOperations();
  const booking = useOperationMetrics(7);
  const zh = language === "zh";
  const t = (en: string, cn: string) => (zh ? cn : en);
  const tx = (value: readonly [string, string]) => value[zh ? 1 : 0];
  const insightReady = booking.status === "ready" && !!booking.data?.capacity_room_nights;
  const metrics = booking.data;
  const weekdays = metrics?.daily.filter(d => !d.weekend) ?? [];
  const weekends = metrics?.daily.filter(d => d.weekend) ?? [];
  const nights = (items: typeof weekdays) => `${items.reduce((sum,d) => sum+d.occupied_nights,0)} / ${items.reduce((sum,d) => sum+d.capacity_nights,0)}`;
  const weekdayOpportunity = metrics?.weekday_pct !== null && metrics?.weekend_pct !== null && metrics && metrics.weekday_pct! < metrics.weekend_pct!;
  const insightTask = insightReady && metrics ? { ...tasks.analysis,
    draft: [`Weekday occupancy averages ${metrics.weekday_pct}%, compared with ${metrics.weekend_pct}% at the weekend. ${weekdayOpportunity ? "Review a weekday promotion; check costs before any discount." : "Review daily availability before choosing a promotion."}`,
      `工作日平均入住率为 ${metrics.weekday_pct}%，周末为 ${metrics.weekend_pct}%。${weekdayOpportunity ? "可以评估工作日推广，决定折扣前先核对成本。" : "先查看每日空房情况，再选择推广时段。"}`] as [string,string],
    source: [`${metrics.period_start} – ${metrics.period_end} · Sample reservations: weekdays ${nights(weekdays)} room nights; weekends ${nights(weekends)}. Rules-based insight, not a market forecast.`,
      `${metrics.period_start} – ${metrics.period_end} · 示例订单：工作日 ${nights(weekdays)} 间夜；周末 ${nights(weekends)} 间夜。规则解读，不代表市场预测。`] as [string,string] } : tasks.analysis;
  const candidates: TaskId[] = analysisReady ? ["analysis"] : [];
  const pending = candidates.filter(id => !confirmed.includes(id));

  const confirm = (id: TaskId) => {
    if (!(drafts[id] ?? tx(tasks[id].draft)).trim() && id !== "analysis") {
      setNotice(t("Please add some text before saving.", "保存前请输入内容。"));
      return;
    }
    setConfirmed(current => [...current, id]);
    setExpanded(null);
    setNotice(t("Saved for this demo. Nothing was sent or published.", "已在本次演示中保存，没有发送或发布。"));
  };

  const reset = () => {
    setConfirmed([]);
    setAnalysisReady(false);
    setExpanded(null);
    setDrafts({});
    setNotice(t("Demo controls reset. Saved conversations and booking plans stay on this computer.", "演示设置已重置，已保存的会话与订单方案仍保留在本机。"));
    setAutoReply(true);
    operations.resetPrototype();
  };

  return <div className="native-shell">
    <div className="native-page native-work-page">
      <header className="native-header">
        <span className="native-kicker">{t("SAMPLE WORKSPACE", "示例工作区")}</span>
        <button className="native-language" type="button" aria-label={t("Switch to Chinese", "切换为英文")} onClick={() => setLanguage(zh ? "en" : "zh")}>{zh ? "EN" : "中文"}</button>
      </header>
      <section className="work-summary">
        <h1>{t("Work", "工作")}</h1>
      </section>
      <section className="native-card work-auto-settings">
        <div><strong>{t("Always-on AI replies", "AI 随时回复")}</strong><p>{autoReply ? t("On · Uses your property information", "已开启 · 依据你的民宿资料") : t("Paused · New enquiries go to you", "已暂停 · 新咨询由你处理")}</p></div>
        <button type="button" role="switch" aria-checked={autoReply} aria-label={t("Always-on AI replies", "AI 随时回复")} className="work-auto-switch" onClick={() => { setAutoReply(!autoReply); setNotice(t("Demo setting updated. Existing conversations stay available.", "演示设置已更新，已有对话仍可查看。")); }}><span /></button>
      </section>
      <WorkInbox language={language} autoReply={autoReply} />
      <section className="work-needs">
        <div className="work-section-head"><h2>{t("Your decisions", "待你决策")}</h2><span>{operations.status === "ready" ? String(pending.length + operations.pending.length).padStart(2, "0") : "—"}</span></div>
        {operations.status === "loading" && <p role="status">{t("Loading booking requests…", "正在读取订单申请…")}</p>}
        {operations.status === "error" && <p role="alert">{t("Could not load booking requests.", "订单申请读取失败。 ")}<button type="button" className="work-text-action" onClick={operations.retry}>{t("Retry", "重试")}</button></p>}
        {operations.pending.map(operation => <WorkOperationDemo key={operation.id} id={operation.id} operation={operation} source={operations.data!.source} language={language} onDecision={(decision, result) => {
          if (result) operations.update(result); else operations.recordPrototype(operation.id, decision);
          setNotice(t("Demo plan saved. No external action was performed.", "演示方案已保存，未执行外部操作。"));
        }} />)}
        {pending.length ? pending.map((id) => {
          const task = id === "analysis" ? insightTask : tasks[id];
          const open = expanded === id;
          return <article className="native-card work-task-card" key={id}>
            <span className="work-task-type">{id === "reply" ? <ClipboardList size={15} /> : id === "analysis" ? <ChartNoAxesCombined size={15} /> : <Sparkles size={15} />}{tx(task.type)}</span>
            <h3>{tx(task.title)}</h3>
            <p className="work-meta">{tx(task.meta)}</p>
            <p className="work-note">{tx(task.note)}</p>
            {id === "analysis" && !insightReady && <p role={booking.status === "error" ? "alert" : "status"}>{booking.status === "loading" ? t("Reading reservation data…", "正在读取订单数据…") : t("Reservation data is unavailable. Retry in Booking insight below.", "订单数据暂不可用，请在下方经营洞察中重试。")}</p>}
            <button className="native-primary work-review" disabled={id === "analysis" && !insightReady} type="button" aria-expanded={open} aria-controls={"work-draft-" + id} onClick={() => {
              setExpanded(open ? null : id);
              if (id !== "analysis" && drafts[id] === undefined) setDrafts(current => ({ ...current, [id]: tx(task.draft) }));
              setNotice("");
            }}>{tx(task.action)} <ArrowRight size={15} /></button>
            {open && <div className="work-draft" id={"work-draft-" + id}>
              <label htmlFor={"work-text-" + id}>{id === "analysis" ? t("Booking insight · Sample", "经营洞察 · 示例") : t("AI draft · Sample", "AI 草稿 · 示例")}</label>
              <textarea id={"work-text-" + id} rows={5} value={id === "analysis" ? tx(task.draft) : drafts[id] ?? tx(task.draft)} readOnly={id === "analysis"} onChange={event => setDrafts(current => ({ ...current, [id]: event.target.value }))} />
              <p>{tx(task.source)}</p>
              <button className="native-primary" disabled={id === "analysis" && !insightReady} type="button" onClick={() => confirm(id)}>{id === "analysis" ? t("Mark as reviewed", "标记为已查看") : t("Confirm & save", "确认并保存")} <ArrowRight size={15} /></button>
              <small>{t("Demo only. Nothing is sent or published.", "仅供演示，不会发送或发布内容。")}</small>
            </div>}
          </article>;
        }) : operations.status === "ready" && !operations.pending.length && <div className="work-all-clear">{t("All caught up. The next decision will appear here.", "都处理好了，新的确认事项会出现在这里。")}</div>}
      </section>
      <section className="work-working">
        <div className="work-section-head"><h2>{t("Booking insight", "经营洞察")}</h2></div>
        {booking.status === "loading" ? <>
          <p role="status">{t("Reading reservation data…", "正在读取订单数据…")}</p>
          <div className="work-progress" role="progressbar" aria-label={t("Reading bookings", "读取订单")}><span /></div>
        </> : booking.status === "error" ? <p role="alert">{t("Could not load booking data.", "订单数据读取失败。 ")}<button type="button" className="work-text-action" onClick={booking.retry}>{t("Retry", "重试")}</button></p> : !insightReady ? <p>{t("No room inventory available.", "暂无客房资料，暂不能准备洞察。")}</p> : analysisReady ? <p className="native-muted">{t("Nothing running right now. The latest insight is ready.", "当前没有处理中任务，最新洞察已准备好。")}</p> : <>
          <div className="work-working-row"><ChartNoAxesCombined size={22}/><div><h3>{t("Booking data is ready", "订单数据已准备好")}</h3><p>{t("Review the same recent bookings used in Analysis.", "依据分析页同一批近期订单，查看经营洞察。")}</p></div></div>
          <button className="work-text-action" type="button" onClick={() => { setAnalysisReady(true); setNotice(t("Booking insight is ready for review.", "经营洞察已准备好，等待查看。")); }}>{t("Prepare insight", "准备洞察")} <ArrowRight size={15}/></button>
        </>}
      </section>
      <section className="work-done">
        <div className="work-section-head"><h2>{t("Done", "已完成")}</h2><span>{t("AI work & your decisions", "AI 工作与确认记录")}</span></div>
        <p className="work-day">{t("TODAY", "今天")}</p>
        {operations.data?.decisions.map(({id, decision, created_at}) => <div className="work-activity" key={id}><time>{created_at ? new Date(created_at).toLocaleTimeString(zh ? "zh-CN" : "en-GB", {hour:"2-digit",minute:"2-digit"}) : "—"}</time><Check size={15} /><div><strong>{id === "arrival" ? t("Check-in plan recorded", "入住方案已记录") : t("Refund plan recorded", "退款方案已记录")}</strong><small>{tx(decisionNames[decision] ?? [decision, decision])}</small><small>{t("Demo decision · No external action", "演示决定 · 未执行外部操作")}</small></div></div>)}
        {[...confirmed.slice().reverse().map(id => ({
          time: "14:45",
          title: [id === "reply" ? "Guest reply confirmed" : id === "promotion" ? "Promotion draft approved" : "Occupancy insight reviewed",
            id === "reply" ? "客人回复已确认" : id === "promotion" ? "推广草稿已确认" : "入住率分析已查看"] as [string,string],
          detail: [id === "reply" ? "Saved · Not sent" : id === "promotion" ? "Saved · Not published" : "Reviewed · No pricing changes",
            id === "reply" ? "已保存 · 未发送" : id === "promotion" ? "已保存 · 未发布" : "已查看 · 未调整价格"] as [string,string],
        })), ...baseActivity].map((item, index) =>
          <div className="work-activity" key={item.time + index}>
            <time>{item.time}</time><Check size={15} />
            <button type="button" onClick={() => setActivityOpen(activityOpen === index ? null : index)} aria-expanded={activityOpen === index}>
              <strong>{tx(item.title)}</strong><small>{tx(item.detail)}</small>
              {activityOpen === index && <em>{t("Sample activity. No connected booking platform.", "示例动态，未连接预订平台。")}</em>}
            </button>
          </div>)}
        <p className="work-day">{t("YESTERDAY", "昨天")}</p>
        <div className="work-activity"><time>18:20</time><Check size={15} /><div><strong>{t("Promotion draft saved", "推广草稿已保存")}</strong><small>{t("Midweek stay offer", "工作日住宿推广")}</small></div></div>
      </section>
      <footer className="work-footer"><p>{t("Sample data · No connected booking platforms", "示例数据 · 未连接预订平台")}</p><button type="button" onClick={reset}><RotateCcw size={13} /> {t("Reset demo", "重置演示")}</button></footer>
    </div>
    {notice && <div className="work-notice" role="status">{notice}<button aria-label={t("Dismiss", "关闭提示")} type="button" onClick={() => setNotice("")}>×</button></div>}
    <TabBar language={language} />
  </div>;
}








