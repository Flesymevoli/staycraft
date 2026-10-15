"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowRight, Check, ClipboardList, ChartNoAxesCombined, RotateCcw, Sparkles } from "lucide-react";
import { useDemoStorage } from "./demo-storage";
import { WorkDecisionDemo } from "./work-decision-demo";
import { WorkOperationDemo, type OperationId } from "./work-operation-demo";
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
    meta: ["Sample booking records · This week", "示例预订记录 · 本周"],
    note: ["Your insight is ready to review.", "分析已准备好，等待查看。"],
    action: ["Review insight", "查看分析"],
    draft: [
      "Weekday occupancy averages 64%, compared with 85% at the weekend. Consider a midweek stay offer; review your costs before deciding on any discount.",
      "工作日平均入住率为 64%，周末为 85%。可考虑工作日住宿推广；决定折扣前请先核对成本。",
    ],
    source: ["Sample: 32 / 50 weekday room nights and 17 / 20 weekend room nights. This is not a market forecast.", "示例：工作日 32 / 50 间夜，周末 17 / 20 间夜。不代表市场预测。"],
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
  const [conversation, setConversation] = useState<string | null>(null);
  const [followup, setFollowup] = useState("");
  const [messages, setMessages] = useDemoStorage<Record<string, string[]>>("ownerReplies", {});
  const [language, setLanguage] = useDemoStorage<Language>("language", "en");
  const [confirmed, setConfirmed] = useDemoStorage<TaskId[]>("confirmed", []);
  const [analysisReady, setAnalysisReady] = useDemoStorage<boolean>("analysisReady", false);
  const [expanded, setExpanded] = useState<TaskId | null>(initialTask);
  const [drafts, setDrafts] = useState<Partial<Record<TaskId, string>>>({});
  const [notice, setNotice] = useState("");
  const [activityOpen, setActivityOpen] = useState<number | null>(null);
  const [decisions, setDecisions] = useDemoStorage<Record<string, string>>("operationDecisions", {});
  const zh = language === "zh";
  const t = (en: string, cn: string) => (zh ? cn : en);
  const tx = (value: readonly [string, string]) => value[zh ? 1 : 0];
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
    setNotice(t("Demo reset.", "演示已重置。"));
    setMessages({});
    setAutoReply(true);
    setConversation(null);
    setFollowup("");
    setDecisions({});
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
      <WorkDecisionDemo language={language} autoReply={autoReply} />
      <section className="work-conversations">
        <div className="work-section-head"><h2>{t("Guest messages", "客人消息")}</h2><span>{t("2 conversations", "2 条对话")}</span></div>
        <div className="native-card work-inbox">
        {[
          { id: "breakfast", title: t("Breakfast time", "早餐时间"), guest: "Jamie · 201", question: t("What time is breakfast tomorrow?", "明天早餐几点开始？"), reply: t("Breakfast is served from 07:30 to 10:00 in the ground-floor dining room. Let us know if you have any dietary requirements.", "早餐时间是 07:30–10:00，地点在一楼餐厅。如果有饮食需求，欢迎告诉我们。"), basis: t("Property guide · Breakfast hours", "民宿指南 · 早餐时间"), preview: t("Answered using your breakfast information.", "已根据早餐信息回复。") },
          { id: "transfer", title: t("Airport transfer recommendation", "机场接送推荐"), guest: "Morgan · 103", question: t("Can you recommend a driver from the airport? There are two of us.", "可以推荐机场接送司机吗？我们有两个人。"), reply: t("Our sample partner, Garden Transfer, offers airport pickup for two guests. Please share your arrival time and luggage needs so we can check a suitable option. A booking is only confirmed after the service provider accepts it.", "示例合作服务 Garden Transfer 可提供双人机场接送。请告知到达时间和行李情况，方便核对合适的安排；接送需服务方确认后才算预约成功。"), basis: t("Saved services · Sample airport transfer partner", "已保存服务 · 示例接送合作方"), preview: t("Recommended a saved service and asked for arrival details.", "已推荐合作服务，并询问到达信息。") },
        ].filter(item => conversation === null || conversation === item.id).map(item => <article key={item.id} className="work-conversation-card">
          {conversation === null ? <button className="work-inbox-row" type="button" aria-label={t("Open conversation with ", "打开与客人的对话：") + item.guest.split(" · ")[0]} onClick={() => { setConversation(item.id); setFollowup(""); }}>
            <span className={"work-avatar work-avatar-" + item.id} aria-hidden="true">{item.guest.charAt(0)}</span>
            <span className="work-inbox-copy"><span className="work-inbox-name"><strong>{item.guest.split(" · ")[0]}</strong><time>{item.id === "breakfast" ? "14:32" : "14:18"}</time></span>
              <span className="work-inbox-preview">{(messages[item.id] ?? []).length ? t("You: ", "你：") + messages[item.id].at(-1) : t("AI: ", "AI：") + item.reply}</span>
              <span className="work-inbox-meta"><span>{t("Room ", "房间 ") + item.guest.split(" · ")[1]} · {item.title}</span><span className="work-replied-badge">{(messages[item.id] ?? []).length ? t("You replied", "你已回复") : t("AI replied", "AI 已回复")}</span></span>
            </span>
          </button> : <header className="work-chat-header"><button type="button" className="work-chat-back" aria-label={t("Back to messages", "返回消息列表")} onClick={() => { setConversation(null); setFollowup(""); }}><ArrowLeft size={19} /></button><span className="work-avatar" aria-hidden="true">{item.guest.charAt(0)}</span><div><strong>{item.guest}</strong><small>{item.title}</small></div></header>}
          {conversation === item.id && <div className="work-thread">
            <div className="work-message"><small>{t("Guest", "客人")}</small><p>{item.question}</p></div>
            <div className="work-message work-message-ai"><small>{t("AI · Replied", "AI · 已回复")}</small><p>{item.reply}</p></div>
            <p className="work-basis">{t("Based on: ", "回复依据：")}{item.basis}</p>
            {(messages[item.id] ?? []).map((message, index) => <div className="work-message work-message-owner" key={index}><small>{t("You · Follow-up", "你 · 补充回复")}</small><p>{message}</p></div>)}
            <form onSubmit={event => { event.preventDefault(); if (!followup.trim()) return; setMessages(current => ({ ...current, [item.id]: [...(current[item.id] ?? []), followup.trim()] })); setFollowup(""); setNotice(t("Your follow-up was added to the demo conversation.", "补充回复已加入演示对话。")); }}>
              <label htmlFor={"followup-" + item.id}>{t("Add your reply", "补充你的回复")}</label>
              <textarea id={"followup-" + item.id} value={followup} rows={3} onChange={event => setFollowup(event.target.value)} placeholder={t("Add a personal note or clarify an arrangement…", "补充说明或确认具体安排…")} />
              <button className="native-primary" type="submit" disabled={!followup.trim()}>{t("Reply in demo", "演示回复")} <ArrowRight size={15} /></button>
            </form>
          </div>}
        </article>)}
        </div>
      </section>
      <section className="work-needs">
        <div className="work-section-head"><h2>{t("Your decisions", "待你决策")}</h2><span>{String(pending.length + ["arrival", "refund"].filter(id => !decisions[id]).length).padStart(2, "0")}</span></div>
        {(["arrival", "refund"] as OperationId[]).filter(id => !decisions[id]).map(id => <WorkOperationDemo key={id} id={id} language={language} onDecision={decision => {
          setDecisions(current => ({ ...current, [id]: decision }));
          setNotice(t("Demo plan saved. No external action was performed.", "演示方案已保存，未执行外部操作。"));
        }} />)}
        {pending.length ? pending.map((id) => {
          const task = tasks[id];
          const open = expanded === id;
          return <article className="native-card work-task-card" key={id}>
            <span className="work-task-type">{id === "reply" ? <ClipboardList size={15} /> : id === "analysis" ? <ChartNoAxesCombined size={15} /> : <Sparkles size={15} />}{tx(task.type)}</span>
            <h3>{tx(task.title)}</h3>
            <p className="work-meta">{tx(task.meta)}</p>
            <p className="work-note">{tx(task.note)}</p>
            <button className="native-primary work-review" type="button" aria-expanded={open} aria-controls={"work-draft-" + id} onClick={() => {
              setExpanded(open ? null : id);
              if (drafts[id] === undefined) setDrafts(current => ({ ...current, [id]: tx(task.draft) }));
              setNotice("");
            }}>{tx(task.action)} <ArrowRight size={15} /></button>
            {open && <div className="work-draft" id={"work-draft-" + id}>
              <label htmlFor={"work-text-" + id}>{t("AI draft · Sample", "AI 草稿 · 示例")}</label>
              <textarea id={"work-text-" + id} rows={5} value={drafts[id] ?? tx(task.draft)} readOnly={id === "analysis"} onChange={event => setDrafts(current => ({ ...current, [id]: event.target.value }))} />
              <p>{tx(task.source)}</p>
              <button className="native-primary" type="button" onClick={() => confirm(id)}>{id === "analysis" ? t("Mark as reviewed", "标记为已查看") : t("Confirm & save", "确认并保存")} <ArrowRight size={15} /></button>
              <small>{t("Demo only. Nothing is sent or published.", "仅供演示，不会发送或发布内容。")}</small>
            </div>}
          </article>;
        }) : ["arrival", "refund"].every(id => decisions[id]) && <div className="work-all-clear">{t("All caught up. The next decision will appear here.", "都处理好了，新的确认事项会出现在这里。")}</div>}
      </section>
      <section className="work-working">
        <div className="work-section-head"><h2>{t("Working", "正在处理")}</h2><span className="work-dots" aria-hidden="true">···</span></div>
        {analysisReady ? <p className="native-muted">{t("Nothing running right now. The latest insight is ready.", "当前没有处理中任务，最新分析已准备好。")}</p> :
          <>
            <div className="work-working-row"><ChartNoAxesCombined size={22} /><div><h3>{t("Analysing this week's bookings", "正在分析本周预订")}</h3><p>{t("Looking for changes in weekday occupancy.", "正在寻找工作日入住率的变化。")}</p></div></div>
            <div className="work-progress" role="progressbar" aria-label={t("Analysing bookings", "正在分析预订")} aria-valuetext={t("Analysis in progress", "分析正在进行中")}><span /></div>
            <button className="work-text-action" type="button" onClick={() => { setAnalysisReady(true); setNotice(t("Analysis is ready for your review.", "分析已完成，等待你查看。")); }}>{t("Demo: finish analysis", "演示：完成分析")} <ArrowRight size={15} /></button>
          </>}
      </section>
      <section className="work-done">
        <div className="work-section-head"><h2>{t("Done", "已完成")}</h2><span>{t("AI work & your decisions", "AI 工作与确认记录")}</span></div>
        <p className="work-day">{t("TODAY", "今天")}</p>
        {Object.entries(decisions).map(([id, decision]) => <div className="work-activity" key={id}><time>14:45</time><Check size={15} /><div><strong>{id === "arrival" ? t("Check-in plan recorded", "入住方案已记录") : t("Refund plan recorded", "退款方案已记录")}</strong><small>{tx(decisionNames[decision] ?? [decision, decision])}</small><small>{t("Demo decision · No external action", "演示决定 · 未执行外部操作")}</small></div></div>)}
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








