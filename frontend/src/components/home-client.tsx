"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, X } from "lucide-react";
import { useDemoStorage } from "./demo-storage";
import { RoomBoard } from "./room-board";
import { HomeOccupancy } from "./home-occupancy";
import "./native-home.css";

type Language = "en" | "zh";
type Question = "week" | "attention" | "unsupported";

const events: Record<number, { time: string; title: [string, string]; room: string }[]> = {
  16: [{ time: "14:00", title: ["Guest check-in", "客人入住"], room: "102" }],
  17: [{ time: "11:00", title: ["Guest check-out", "客人退房"], room: "201" }],
  18: [
    { time: "11:00", title: ["Guest check-out", "客人退房"], room: "201" },
    { time: "14:00", title: ["Guest check-in", "客人入住"], room: "102" },
  ],
  21: [{ time: "14:00", title: ["Guest check-in", "客人入住"], room: "102" }],
};

const tabs = [
  { label: ["Home", "首页"], icon: "home", href: "/native-home" },
  { label: ["Work", "工作"], icon: "work", href: "/native-work" },
  { label: ["Analysis", "分析"], icon: "analysis", href: "/native-analysis" },
  { label: ["Explore", "探索"], icon: "explore", href: "/native-explore" },
  { label: ["Mine", "我的"], icon: "mine", href: "/native-mine" },
] as const;

export function HomeClient() {
  const [language, setLanguage] = useDemoStorage<Language>("language", "en");
  const [decisions] = useDemoStorage<Record<string, string>>("operationDecisions", {});
  const pending = ["arrival", "refund"].filter(id => !decisions[id]);
  const [selectedDay, setSelectedDay] = useState(17);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [question, setQuestion] = useState<Question | null>(null);
  const [draft, setDraft] = useState("");
  const [answer, setAnswer] = useState<{language: Language; text: string} | null>(null);
  const [answerPending, setAnswerPending] = useState(false);
  const [answerError, setAnswerError] = useState(false);
  const answerRequest = useRef<AbortController | null>(null);
  const zh = language === "zh";
  const t = (en: string, cn: string) => (zh ? cn : en);

  useEffect(() => () => answerRequest.current?.abort(), []);

  const ask = async (next: Question) => {
    answerRequest.current?.abort();
    const controller = new AbortController();
    answerRequest.current = controller;
    setQuestion(next);
    setAnswer(null); setAnswerError(false);
    if (next === "unsupported") {
      setAnswerPending(false);
      setAnswer({language, text:t("This demo can explain your business summary and current items needing review. Choose a question below.", "当前演示可以查看经营总结和待处理事项，请选择下方问题。")});
      return;
    }
    setAnswerPending(true);
    try {
      if (next === "week") {
        const response = await fetch(`/api/local/analysis-summary?days=7&language=${language}`, {signal: controller.signal});
        if (!response.ok) throw new Error();
        const data = await response.json() as {paragraphs:string[]};
        if (!controller.signal.aborted) setAnswer({language,text:data.paragraphs.join("\n\n")});
      } else {
        const response = await fetch("/api/local/conversations", {signal: controller.signal});
        if (!response.ok) throw new Error();
        const data = await response.json() as {items:{messages:{sender:string}[]}[]};
        const guestItems = data.items.filter(item => !item.messages.some(message => message.sender === "owner")).length;
        if (!controller.signal.aborted) setAnswer({language,text:t(
          `${pending.length} booking items and ${guestItems} guest conversations need review. Open Work to check them. Saved demo replies stay on this computer; nothing is sent automatically.`,
          `有 ${pending.length} 项订单事务和 ${guestItems} 条客人会话等待处理，可以到工作页逐项查看。演示回复保存在本机，不会自动发送。`)});
      }
    } catch { if (!controller.signal.aborted) setAnswerError(true); }
    finally { if (!controller.signal.aborted) setAnswerPending(false); }
  };

  const submitQuestion = () => {
    if (!draft.trim()) return;
    const value = /week|occupancy|business|booking|这周|经营|入住率|预订情况/i.test(draft) ? "week" : /attention|review|pending|todo|待办|处理|待审核/i.test(draft) ? "attention" : "unsupported";
    void ask(value);
  };

  return (
    <div className="native-shell">
      <div className="native-page native-home-page">
        <header className="native-header">
          <span className="native-kicker">{t("HOME", "首页")}</span>
          <div className="native-header-actions">
            <button className="native-language" type="button" onClick={() => setLanguage(zh ? "en" : "zh")} aria-label={t("Switch to Chinese", "切换为英文")}>
              {zh ? "EN" : "中文"}
            </button>
            <Link className="native-avatar" href="/native-mine" aria-label={t("Open Mine", "打开我的")}>A</Link>
          </div>
        </header>

        {assistantOpen ? (
          <section className="native-assistant" aria-label={t("Demo assistant", "演示助手")}>
            <div className="native-assistant-heading">
              <h1>{t("✦ What can I help with?", "✦ 我能帮你什么？")}</h1>
              <button type="button" className="native-close" aria-label={t("Close assistant", "关闭助手")} onClick={() => { answerRequest.current?.abort(); setAnswerPending(false); setAssistantOpen(false); setQuestion(null); }}><X size={20} /></button>
            </div>
            <p className="native-muted">{t("Demo assistant · Uses sample data", "演示助手 · 使用示例数据")}</p>
            <label className="native-input-label" htmlFor="native-question">{t("Ask about your homestay", "问问你的民宿")}</label>
            <div className="native-input-row">
              <input id="native-question" value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") submitQuestion(); }} placeholder={t("Ask about your homestay...", "问问你的民宿……")} />
              <button type="button" disabled={answerPending || !draft.trim()} onClick={submitQuestion} aria-label={t("Ask question", "提交问题")}><ArrowRight size={20} /></button>
            </div>
            {question && (
              <div className="native-answer" role="status">
                <small>{question === "week" ? t("How is this week going?", "这周经营怎么样？") : question === "attention" ? t("What needs my attention?", "哪些事情需要我处理？") : t("Your question", "你的问题")}</small>
                {answerPending ? <p>{t("Reading your current sample information…", "正在读取当前示例信息…")}</p> : answerError ? <p role="alert">{t("The service is unavailable. Select the question again to retry.", "服务暂不可用，请再次选择问题重试。")}</p> : answer?.language === language ? answer.text.split("\n\n").map((text,index) => <p key={index}>{text}</p>) : <p>{t("Choose a question below to continue.", "请选择下方问题继续。")}</p>}
                {question !== "unsupported" && <Link href={question === "week" ? "/native-analysis" : "/native-work"}>{question === "week" ? t("Open Analysis", "打开分析") : t("Open Work", "打开工作")} <ArrowRight size={16} /></Link>}
              </div>
            )}
            <div className="native-suggestions">
              <button type="button" onClick={() => void ask("week")}>{t("How is this week going?", "这周经营怎么样？")}</button>
              <button type="button" onClick={() => void ask("attention")}>{t("What needs my attention?", "哪些事情需要我处理？")}</button>
            </div>
          </section>
        ) : (
          <section className="native-greeting">
            <h1>{t("Hi, Alex.", "你好，Alex。")}</h1>
            <p>{t("A little clarity for your day.", "让经营的每一天，更清晰。")}</p>
            <button className="native-primary native-ask" type="button" onClick={() => setAssistantOpen(true)}>✦ {t("Ask AI", "问问 AI")}</button>
          </section>
        )}

        <section className="native-calendar-section" aria-label={t("September 2026 schedule", "2026 年 9 月日程")}>
          <div className="native-section-head">
            <h2>{t("September 2026", "2026 年 9 月")}</h2>
          </div>
          <div className="native-dates">
            {Array.from({ length: 17 }, (_, index) => index + 14).map((day) => {
              const selected = day === selectedDay;
              const weekday = new Date(2026, 8, day).toLocaleDateString(zh ? "zh-CN" : "en-US", { weekday: "short" });
              return (
                <div className="native-date" key={day}>
                  <span>{weekday}</span>
                  <button type="button" className={selected ? "is-selected" : ""} aria-pressed={selected} aria-expanded={selected && scheduleOpen} aria-controls="native-schedule" aria-label={new Date(2026, 8, day).toLocaleDateString(zh ? "zh-CN" : "en-US")} onClick={() => {
                    if (selected) setScheduleOpen(!scheduleOpen);
                    else { setSelectedDay(day); setScheduleOpen(true); }
                  }}>{day}</button>
                  <i className={events[day] ? "has-event" : ""} aria-hidden="true" />
                </div>
              );
            })}
          </div>
          {scheduleOpen && (
            <div id="native-schedule" className="native-schedule">
              <div className="native-schedule-title">
                <strong>{new Date(2026, 8, selectedDay).toLocaleDateString(zh ? "zh-CN" : "en-US", { month: "short", day: "numeric", weekday: "short" })}</strong>
                <span>{(events[selectedDay] || []).length} {t("events", "项日程")}</span>
              </div>
              {(events[selectedDay] || []).length ? events[selectedDay].map((event, index) => (
                <div className="native-event" key={event.time + index}>
                  <time>{event.time}</time>
                  <div><strong>{event.title[zh ? 1 : 0]}</strong><small>{t("Room", "房间")} {event.room} · {t("Sample reservation", "示例预订")}</small></div>
                </div>
              )) : <p className="native-muted">{t("No events for this date.", "这一天没有日程。")}</p>}
            </div>
          )}
        </section>

        <RoomBoard zh={zh} />

        <section className="native-overview" aria-label={t("Your stay at a glance", "经营一览")}>
          <div className="native-section-head native-overview-head"><h2>{t("Your stay at a glance", "经营一览")}</h2><small>{t("Last 7 days · Sample", "近 7 天 · 示例")}</small></div>
          <HomeOccupancy zh={zh}/>
          <article className="native-card native-pending">
            <div className="native-pending-head"><span>{t("Needs you", "待你处理")}</span><span>{pending.length}</span></div>
            {pending.includes("arrival") && <div className="native-task">
              <div><strong>{t("Early check-in", "提前入住安排")}</strong><small>{t("Room 102 · Decision needed", "102 房 · 等待确认")}</small></div>
              <Link className="native-primary" href="/native-work#operation-arrival">{t("Review", "查看")}</Link>
            </div>}
            {pending.includes("refund") && <div className="native-task">
              <div><strong>{t("Cancellation & refund", "取消与退款")}</strong><small>{t("GH-204 · Decision needed", "GH-204 · 等待确认")}</small></div>
              <Link className="native-primary" href="/native-work#operation-refund">{t("Review", "查看")}</Link>
            </div>}
            {!pending.length && <p className="native-muted">{t("All caught up for now.", "目前都处理好了。")}</p>}
            <Link className="native-soft-link" href="/native-work">{t("Open Work", "打开工作")} <ArrowRight size={15} /></Link>
          </article>
        </section>

        <section className="native-recent">
          <h2>{t("Recently completed", "最近完成")}</h2>
          <Link href="/native-mine">{t("Keep your property information up to date", "及时更新你的民宿资料")} <ArrowRight size={14} /></Link>
          <div className="native-history"><span><Check size={13} /> {t("Weekly analysis ready", "每周分析已完成")}</span><time>11:46</time></div>
          <Link className="native-activity" href="/native-work">{t("View all activity", "查看全部动态")} <ArrowRight size={14} /></Link>
        </section>
        <p className="native-footer">{t("CONCEPT PREVIEW · SAMPLE DATA · BRAND TBD", "概念预览 · 示例数据 · 品牌待定")}</p>
      </div>

      <nav className="native-tabbar" aria-label={t("Main navigation", "主导航")}>
        {tabs.map((tab, index) => (
          <Link href={tab.href} key={tab.icon} className={index === 0 ? "is-active" : ""} aria-current={index === 0 ? "page" : undefined}>
            <Image src={"/figma-icons/" + tab.icon + ".svg"} alt="" width={24} height={24} />
            <span>{tab.label[zh ? 1 : 0]}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}








