"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ChevronLeft, ChevronRight, X } from "lucide-react";
import { exploreDays } from "./explore-data";
import { useDemoStorage } from "./demo-storage";
import { PromotionEditor } from "./promotion-editor";
import "./native-home.css";
import "./native-explore.css";

type Language = "en" | "zh";



const plotX = (index: number) => 8 + index * 344 / 29;
const plotY = (score: number) => 168 - score * 1.36;
function pulsePath() {
  return exploreDays.map((entry, index) => {
    const x = plotX(index), y = plotY(entry.score);
    if (index === 0) return "M " + x + " " + y;
    const previous = exploreDays[index - 1];
    const previousX = plotX(index - 1), previousY = plotY(previous.score);
    const mid = (previousX + x) / 2;
    return " C " + mid + " " + previousY + ", " + mid + " " + y + ", " + x + " " + y;
  }).join("");
}
const linePath = pulsePath();

function TabBar({ language }: { language: Language }) {
  const zh = language === "zh";
  const tabs = [
    { en: "Home", cn: "首页", icon: "home-inactive", href: "/native-home" },
    { en: "Work", cn: "工作", icon: "work", href: "/native-work" },
    { en: "Analysis", cn: "分析", icon: "analysis", href: "/native-analysis" },
    { en: "Explore", cn: "探索", icon: "explore-active", href: "/native-explore" },
    { en: "Mine", cn: "我的", icon: "mine", href: "/native-mine" },
  ];
  return <nav className="native-tabbar" aria-label={zh ? "主导航" : "Main navigation"}>
    {tabs.map((tab, index) => <Link href={tab.href} className={index === 3 ? "is-active" : ""} key={tab.en} aria-current={index === 3 ? "page" : undefined}>
      <Image src={"/figma-icons/" + tab.icon + ".svg"} alt="" width={24} height={24} />
      <span>{zh ? tab.cn : tab.en}</span>
    </Link>)}
  </nav>;
}

export function ExploreClient() {
  const [language, setLanguage] = useDemoStorage<Language>("language", "en");
  const [day, setDay] = useState(26);

  const [stay, setStay] = useState(0);
  const [dayExpanded, setDayExpanded] = useState(false);
  const [channel, setChannel] = useState("xiaohongshu");
  const [promotionContext, setPromotionContext] = useState("market");
  const stayRef = useRef<HTMLDivElement>(null);
  const pulseRef = useRef<HTMLDivElement>(null);
  const zh = language === "zh";
  const t = (en: string, cn: string) => (zh ? cn : en);
  const selected = exploreDays[day - 1];

  const dateLabel = (value: number) => new Date(2026, 8, value).toLocaleDateString(zh ? "zh-CN" : "en-US", { month: "short", day: "numeric" });
  const signal = (score: number) => score >= 70 ? t("Higher demand than usual", "需求高于平常") : score >= 48 ? t("Typical demand", "需求处于常态") : t("Quieter than usual", "需求低于平常");
  const marketPosition = Math.max(5, Math.min(95, 25 + (selected.rate - selected.low) / (selected.high - selected.low) * 50));

  const selectStay = (index: number) => {
    const next = Math.max(0, Math.min(2, index));
    setStay(next);
    const target = stayRef.current?.children[next] as HTMLElement | undefined;
    target?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
  };
  const scrubPulse = (clientX: number) => {
    const bounds = pulseRef.current?.getBoundingClientRect();
    if (!bounds) return;
    setDay(Math.max(1, Math.min(30, Math.round(((clientX - bounds.left) / bounds.width * 360 - 8) / 344 * 29) + 1)));
  };

  return <div className="native-shell">
    <div className="native-page native-explore-page">
      <header className="native-header"><span className="native-kicker">{t("EXPLORE", "探索")}</span><button type="button" className="native-language" onClick={() => setLanguage(zh ? "en" : "zh")}>{zh ? "EN" : "中文"}</button></header>

      <section className="explore-pulse">
        <div className="explore-section-head"><h2>{t("Market pulse", "市场脉动")}</h2><span className="explore-live-dot" aria-hidden="true" /></div>
        <p className="explore-pulse-headline">{t("Demand appears to be rising this weekend.", "这个周末，需求似乎正在升温。")}</p>
        <div className="explore-pulse-chart" ref={pulseRef} role="slider" tabIndex={0} aria-label={t("Select demand date", "选择需求日期")} aria-valuemin={1} aria-valuemax={30} aria-valuenow={day} aria-valuetext={dateLabel(day) + " · " + signal(selected.score)} onKeyDown={event => { if (["ArrowLeft", "ArrowDown", "ArrowRight", "ArrowUp", "Home", "End"].includes(event.key)) { event.preventDefault(); setDay(current => event.key === "Home" ? 1 : event.key === "End" ? 30 : Math.max(1, Math.min(30, current + (["ArrowRight", "ArrowUp"].includes(event.key) ? 1 : -1)))); } }} onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); scrubPulse(event.clientX); }} onPointerMove={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) scrubPulse(event.clientX); }} onPointerUp={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }}>
          <svg viewBox="0 0 360 190" aria-hidden="true">
            <defs>
              <linearGradient id="explore-line-spectrum" x1="0%" y1="0%" x2="100%" y2="0%"><stop stopColor="#d79992" /><stop offset=".5" stopColor="#efc774" /><stop offset="1" stopColor="#8cbf82" /></linearGradient>
              <linearGradient id="explore-fill-spectrum" x1="0%" y1="0%" x2="100%" y2="0%"><stop stopColor="#f9dedb" /><stop offset=".5" stopColor="#fff0cb" /><stop offset="1" stopColor="#e4f2df" /></linearGradient>
              <linearGradient id="explore-vertical-fade" x1="0%" y1="0%" x2="0%" y2="100%"><stop stopColor="white" stopOpacity=".68" /><stop offset="1" stopColor="white" stopOpacity="0" /></linearGradient>
              <mask id="explore-fill-mask"><rect width="360" height="190" fill="url(#explore-vertical-fade)" /></mask>
            </defs>
            <path d={linePath + " L 352 188 L 8 188 Z"} fill="url(#explore-fill-spectrum)" mask="url(#explore-fill-mask)" />
            <path d={linePath} fill="none" stroke="url(#explore-line-spectrum)" strokeWidth="2.3" strokeLinecap="round" />
            <line x1={plotX(day - 1)} x2={plotX(day - 1)} y1={plotY(selected.score)} y2="188" stroke="#928f8e" strokeWidth="1" strokeDasharray="3 5" />
            <circle cx={plotX(day - 1)} cy={plotY(selected.score)} r="9" fill="#fff8" />
            <circle cx={plotX(day - 1)} cy={plotY(selected.score)} r="4" fill="#fff" stroke="#8a8d88" strokeWidth="2" />
            <text x={Math.max(32, Math.min(328, plotX(day - 1)))} y={plotY(selected.score) - 15} textAnchor="middle" fill="#61656d" fontSize="11">{dateLabel(day)}</text>
          </svg>
        </div>
        <div className="explore-pulse-axis"><span>{t("Sep 1", "9 月 1 日")}</span><span>{t("Tap or drag the chart", "点选或拖动曲线")}</span><span>{t("Sep 30", "9 月 30 日")}</span></div>
      </section>

      <section className="explore-demand" aria-label={t("September 2026 demand calendar", "2026 年 9 月需求日历")}>
        <div className="explore-weekdays">{(zh ? ["一","二","三","四","五","六","日"] : ["M","T","W","T","F","S","S"]).map((label, index) => <span key={index}>{label}</span>)}</div>
        <div className="explore-heat-grid"><span aria-hidden="true" />{exploreDays.map(entry => <button type="button" key={entry.day} className={"explore-heat-day level-" + (entry.score >= 70 ? 3 : entry.score >= 48 ? 2 : 1)} aria-pressed={entry.day === day} aria-label={dateLabel(entry.day) + " · " + signal(entry.score)} aria-controls="explore-day-detail" aria-expanded={entry.day === day && dayExpanded} onClick={() => { setDay(entry.day); setDayExpanded(true); }}><span className="explore-date-number">{entry.day}</span>{entry.event && <i aria-hidden="true" />}</button>)}</div>
        <div className="explore-heat-legend"><span>{t("Quieter", "较低")}</span><i /><i /><i /><span>{t("Higher", "较高")}</span><span className="explore-event-key">• {t("Sample event", "示例活动")}</span></div>
        {dayExpanded && <div id="explore-day-detail" className="explore-day-detail" role="region" aria-label={t("Selected date details", "所选日期详情")} aria-live="polite">
          <button type="button" className="explore-day-collapse" aria-label={t("Collapse date details", "收起日期详情")} onClick={() => setDayExpanded(false)}><X size={18} /></button>
          <h2>{dateLabel(day)}</h2><p className="explore-day-signal">{signal(selected.score)}</p><p>{selected.event ? t("A nearby event is included as a sample demand signal.", "示例周边活动已计入需求信号。") : t("Demand level is estimated from a fictional scenario.", "需求等级来自虚构情景。")}</p><p>{t("Sample market range ¥" + selected.low + "–¥" + selected.high, "示例市场范围 ¥" + selected.low + "–¥" + selected.high)}</p><p className="explore-note">{t("This does not change your ¥520 rate.", "这不会修改你的 ¥520 房价。")}</p>
        </div>}
      </section>

      <section className="native-card explore-promotion" id="promotion">
        <span className="native-kicker">{t("FROM INSIGHT TO ACTION", "从发现到行动")}</span>
        <h2>{t("Promotion opportunity", "推广机会")}</h2><p className="explore-note">{promotionContext === "market" ? t("Selected idea: lakeside weekend market · Sample", "已选线索：湖畔周末市集 · 示例") : t("Selected idea: village morning walk · Sample", "已选线索：村落晨间漫步 · 示例")}</p>
        <p>{t("Connect a lively weekend with a quieter weekday stay.", "把热闹的周末，与安静的工作日小住连接起来。")}</p>
        <ul><li>{t("Market: sample weekend demand is rising.", "市场信号：示例周末需求升温。")}</li><li>{t("Your availability: weekday occupancy is 64%.", "自身经营：工作日入住率 64%，仍有空房。")}</li><li>{t("Guest feedback: location is mentioned in 26 sample reviews.", "客人反馈：26 条示例评价提到位置。")}</li></ul>
        <p className="explore-note">{t("Suggested angle: arrive early, explore locally and enjoy a quieter stay. Fictional inputs; no discount assumed.", "建议方向：提前抵达、探索周边、享受安静小住。依据虚构示例信息，未自动设定优惠。")}</p>
        <label htmlFor="promotion-channel">{t("Content channel", "内容渠道")}</label>
        <select id="promotion-channel" value={channel} onChange={event => { setChannel(event.target.value); }}><option value="xiaohongshu">{t("Xiaohongshu post", "小红书帖子")}</option><option value="wechat">{t("WeChat Moments", "朋友圈文案")}</option></select>
        <PromotionEditor key={`${language}-${channel}-${promotionContext}`} language={language} channel={channel} context={promotionContext} />
      </section>

      <section className="explore-price">
        <div className="explore-section-head"><h2>{t("Where your rate sits", "你的房价位置")}</h2><label><span className="sr-only">{t("Rate comparison date", "房价比较日期")}</span><select value={day} onChange={event => setDay(Number(event.target.value))}>{exploreDays.map(entry => <option value={entry.day} key={entry.day}>{dateLabel(entry.day)}</option>)}</select></label></div>
        <p className="explore-price-value">{t("Your rate", "你的房价")} <strong>¥520</strong><span>{t("/ night", "/ 晚")}</span></p>
        <div className="explore-spectrum"><div className="explore-market-band" /><span className="explore-rate-marker" style={{ left: marketPosition + "%" }}><b>{t("You", "你")}</b><i /></span></div>
        <div className="explore-spectrum-labels"><span>{t("Lower", "较低")}</span><span>{t("Market", "市场")}</span><span>{t("Higher", "较高")}</span></div>
        <p className="explore-market-range">{t("Sample market range ¥" + selected.low + "–¥" + selected.high, "示例市场范围 ¥" + selected.low + "–¥" + selected.high)}</p>
        <p className="explore-note">{t("Illustrative comparable stays · Same date, per night. Rates stay unchanged.", "虚构同类住宿 · 同一天每晚房价，不会修改定价。")}</p>
      </section>

      <section className="explore-local">
        <div className="explore-section-head"><h2>{t("Around your neighbourhood", "周边活动与服务")}</h2><span>{t("Sample listings", "示例信息")}</span></div>
        <p className="explore-note">{t("Local ideas for guest recommendations and promotion.", "为客人推荐和民宿推广提供线索。")}</p>
        {[
          {id:"market",title:t("Lakeside weekend market", "湖畔周末市集"),meta:t("Sep 26 · 10:00–18:00 · 15 min walk", "9 月 26 日 · 10:00–18:00 · 步行 15 分钟"),note:t("A sample event linked to the demand peak. Suggest a stay before the weekend rush.", "与需求高峰关联的示例活动，可考虑提前入住的推广方向。")},
          {id:"walk",title:t("Village morning walk", "村落晨间漫步"),meta:t("Daily · Suggested route · 45 min", "每日 · 推荐路线 · 45 分钟"),note:t("A quieter weekday experience to include in guest recommendations.", "适合工作日客人的安静体验，可作为游玩推荐。")},
          {id:"transfer",title:t("Garden Transfer", "Garden Transfer 接送服务"),meta:t("Saved partner · Airport pickup", "已保存合作方 · 机场接送"),note:t("AI can recommend this sample service and ask for arrival details. Availability needs provider confirmation.", "AI 可推荐此示例服务并询问到达信息，可用时间需服务方确认。")},
        ].map(item=><article key={item.id} className="native-card explore-local-card"><h3>{item.title}</h3><small>{item.meta}</small><p>{item.note}</p>{item.id === "transfer" ? <Link href="/native-work" className="work-text-action">{t("See guest messages", "查看客人消息")} <ArrowRight size={15}/></Link> : <button type="button" className="explore-local-action" onClick={()=>{setPromotionContext(item.id === "market" ? "market" : "walk");document.getElementById("promotion")?.scrollIntoView({behavior:"smooth"});}}>{t("Use for promotion", "用于推广")} <ArrowRight size={15}/></button>}</article>)}
      </section>

      <section className="explore-nearby">
        <div className="explore-section-head"><h2>{t("A look around", "看看附近住宿")}</h2><div className="explore-stay-controls"><button type="button" aria-label={t("Previous stay", "上一家住宿")} onClick={() => selectStay(stay - 1)} disabled={stay === 0}><ChevronLeft size={18} /></button><button type="button" aria-label={t("Next stay", "下一家住宿")} onClick={() => selectStay(stay + 1)} disabled={stay === 2}><ChevronRight size={18} /></button></div></div>
        <p className="explore-note">{t("Fictional comparable stays · Selected date", "虚构同类住宿 · 当前所选日期")} {dateLabel(day)}</p>
        <div className="explore-stay-carousel" ref={stayRef} tabIndex={0} aria-label={t("Swipe through nearby stays", "左右滑动浏览附近住宿")} onScroll={event => { const element = event.currentTarget; setStay(Math.round(element.scrollLeft / (element.firstElementChild?.getBoundingClientRect().width || 1))); }} onKeyDown={event => { if (event.key === "ArrowRight" || event.key === "ArrowLeft") { event.preventDefault(); selectStay(stay + (event.key === "ArrowRight" ? 1 : -1)); } }}>
          {[0,1,2].map(index => <article className="explore-stay-card" key={index}><div className="explore-stay-art"><Image src={["/images/garden-house-sample.webp", "/images/courtyard-stay-sample.webp", "/images/garden-stay-sample.webp"][index]} alt={t(["Sample photo of Garden House", "Sample photo of a courtyard stay", "Sample photo of a garden stay"][index], ["花园小屋示例照片", "庭院住宿示例照片", "花园住宿示例照片"][index])} fill sizes="(max-width: 480px) 75vw, 340px" className="explore-stay-photo" /><span className="explore-art-caption">{t("SAMPLE IMAGE", "示例图片")}</span></div><div className="explore-stay-info"><h3>{t(["You","Nearby Stay A","Nearby Stay B"][index], ["你的民宿","附近住宿 A","附近住宿 B"][index])}</h3><strong>¥{[520,selected.low + 30,selected.high - 30][index]}</strong></div><p>{t(["Your sample property","Courtyard stay · Similar size","Garden stay · Similar amenities"][index], ["你的示例民宿","庭院住宿 · 规模相似","花园住宿 · 设施相似"][index])}</p></article>)}
        </div>
        <p className="explore-note">{t("Compare context, not just price. No real properties or OTA reviews are shown.", "结合环境理解价格。此处没有真实房源或 OTA 评价。")}</p>
      </section>
      <p className="explore-footer">{t("DISCOVER → COMPARE → UNDERSTAND", "发现 → 比较 → 理解")}</p>
    </div>
    <TabBar language={language} />
  </div>;
}


