"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ChevronLeft, ChevronRight, MapPin, Check, SlidersHorizontal } from "lucide-react";
import { useDemoStorage } from "./demo-storage";
import { LivePriceWatch } from "./live-price-watch";
import "./native-home.css";
import "./native-explore.css";
import "./explore-observation.css";
type Language = "en" | "zh";
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


const stays = [
  { cn: "青禾庭院", en: "Qinghe Courtyard", image: "courtyard-stay-sample", distance: "0.8", price: 468, room: 498, breakfast: true },
  { cn: "山间小住", en: "Hill House", image: "garden-house-sample", distance: "1.2", price: 498, room: 558, breakfast: true },
  { cn: "溪畔花园", en: "Riverside Garden", image: "garden-stay-sample", distance: "2.1", price: null, room: null, breakfast: false },
];
export function ExploreClient({embedded=false, language:providedLanguage}:{embedded?:boolean;language?:Language}={}) {
  const [savedLanguage, setLanguage] = useDemoStorage<Language>("language", "zh");
  const language=providedLanguage??savedLanguage;
  const Container=embedded?"div":"main";
  const zh = language === "zh";
  const t = (en: string, cn: string) => zh ? cn : en;
  const [period, setPeriod] = useState(0);
  const [live, setLive] = useState(!embedded);
  const [view, setView] = useState(false);
  const [selected, setSelected] = useState([true, true, true]);
  const [checked, setChecked] = useState<Record<string, string>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [logs, setLogs] = useState<string[]>([]);
  const [context, setContext] = useState("walk");
  const [draft, setDraft] = useState("");
  const [saved, setSaved] = useState(false);
  const [channel, setChannel] = useState("red");
  const carousel = useRef<HTMLDivElement>(null);
  const offset = period ? 60 : 0;
  const key = (i: number) => `${period}-${i}`;
  const valid = stays.filter((s,i) => selected[i] && s.room !== null && checked[key(i)] === "verified");
  const date = period ? "11.07 — 11.08" : "11.04 — 11.05";
  function review(i: number, status: string) {
    setChecked(prev => ({...prev, [key(i)]: status}));
    setLogs(prev => [`${new Date().toLocaleTimeString(zh ? "zh-CN" : "en-GB")} · ${date} · ${zh ? stays[i].cn : stays[i].en} · ${status === "verified" ? t("Verified", "已核验") : t("Excluded", "不纳入")} · ${reasons[key(i)] || t("Matching room conditions", "房型条件一致")}`, ...prev]);
  }
  const startCompare = () => { setView(true); window.scrollTo(0,0); };
  const back = () => { setView(false); window.scrollTo(0,0); };
  return <div className={embedded?"workspace-competitor-preview":"native-shell"}><Container className={embedded?"observation-page":"native-page native-explore-page observation-page"}>
    {!embedded&&<header className="native-header"><span className="native-kicker">{t("EXPLORE", "探索")} · {t("LOCAL PREVIEW", "本机预览")}</span><button className="native-language" onClick={()=>setLanguage(zh ? "en" : "zh")}>{zh ? "EN" : "中文"}</button></header>}
    {!embedded&&<div className="ob-mode" role="group" aria-label={t("Data mode","数据模式")}><button aria-pressed={live} onClick={()=>{setLive(true);setView(false)}}>{t("Collected prices","真实参考价")}</button><button aria-pressed={!live} onClick={()=>{setLive(false);setView(false)}}>{t("Layout examples","布局示例")}</button></div>}
    {!live&&<div className="ob-demo">{t("Fictional stays & prices · Separate from collected records", "虚构住宿与报价 · 与真实采集记录隔离")}</div>}
    {live ? <LivePriceWatch language={language}/> : view ? <>
      <button className="ob-link" onClick={back}><ChevronLeft size={17}/>{t("Back to Explore", "返回探索")}</button>
      <h1 className="ob-title">{t("Compare & verify", "价格对比与核验")}</h1>
      <p className="ob-muted">{t("Ctrip scenario", "携程场景")} · 2026.{date} · {t("1 room · 2 adults · 1 night", "1 间 · 2 成人 · 1 晚")}</p>
      <p className="ob-muted">{t("Compare a double room with breakfast and free cancellation until 18:00 the day before arrival. All amounts are sample tax-inclusive totals.", "统一口径：大床房、双早、入住前一天 18:00 前免费取消；报价为示例含税总价。")}</p>
      {stays.map((s,i)=>selected[i] && <article className="native-card ob-review" key={i}>
        <div className="explore-section-head"><h2>{zh ? s.cn : s.en}</h2><span className="ob-tag">{checked[key(i)] === "verified" ? t("Verified", "已核验") : checked[key(i)] === "excluded" ? t("Excluded", "不纳入") : t("Needs review", "待核验")}</span></div>
        <dl><div><dt>{t("Starting price", "列表起价")}</dt><dd>{s.price ? `¥${s.price+offset}` : t("Unavailable", "未获取")}</dd></div><div><dt>{t("Comparable room", "同口径房型报价")}</dt><dd>{s.room ? `¥${s.room+offset}` : "—"}</dd></div><div><dt>{t("Room", "房型")}</dt><dd>{t("Garden double", "花园大床房")}</dd></div><div><dt>{t("Conditions", "早餐 / 取消")}</dt><dd>{s.breakfast ? t("Breakfast for 2 / free cancellation", "双早 / 限时免费取消") : t("Not retrieved", "未获取，待核对")}</dd></div></dl>
        <details><summary>{t("View sample source snapshot", "查看示例来源快照")}</summary><p>{t("Fictional Ctrip listing → room details. Observed 2026-10-31 10:30. No real property page is linked.", "虚构携程列表页 → 房型详情；观察时间 2026-10-31 10:30。没有真实房源链接。")}</p></details>
        {!s.room && <p className="ob-warning">{t("Price missing. This does not mean sold out; excluded from price range.", "价格缺失不代表满房；不计入房价区间。")}</p>}
        <label>{t("Review note / exclusion reason", "核验备注 / 排除原因")}<input value={reasons[key(i)] || ""} onChange={e=>setReasons({...reasons,[key(i)]:e.target.value})} placeholder={t("e.g. Breakfast differs", "例如：早餐条件不同")}/></label>
        <div className="ob-actions"><button disabled={!s.room} onClick={()=>review(i,"verified")}><Check size={15}/>{t("Mark verified", "标记已核验")}</button><button disabled={!reasons[key(i)]?.trim()} onClick={()=>review(i,"excluded")}>{t("Exclude", "不纳入比较")}</button></div>
      </article>)}
      {!selected.some(Boolean) && <p>{t("No stays selected. Return to choose competitors.", "尚未选入住宿，请返回选择竞品。")}</p>}
      <section className="ob-log"><h2>{t("Review history", "本次核验记录")}</h2><p className="ob-muted">{t("Prototype only; resets on reload.", "仅供原型体验，刷新后重置。")}</p><ul aria-live="polite">{logs.map((log,i)=><li key={i}>{log}</li>)}</ul></section>
    </> : <>
      <section className="ob-overview"><div className="explore-section-head"><h1 className="ob-title">{t("Neighbourhood prices", "周边价格观察")}</h1><span className="ob-platform">{t("Ctrip", "携程")}</span></div>
        <div className="ob-period"><button aria-pressed={!period} onClick={()=>setPeriod(0)}>{t("Midweek", "工作日")} <span>11.04 — 11.05</span></button><button aria-pressed={!!period} onClick={()=>setPeriod(1)}>{t("Weekend", "周末")} <span>11.07 — 11.08</span></button></div>
        <p className="ob-muted">2026 · {t("1 night · 1 room · 2 adults", "1 晚 · 1 间 · 2 成人")}<br/>{t("Sample observed", "示例采集于")} 10.31 10:30</p>
        <div className="ob-summary"><div><span>{t("Listed starting prices", "周边列表起价")}</span><strong>¥{468+offset}<small> — </small>¥{498+offset}</strong></div><div className="ob-missing"><b>1</b><span>{t("missing price", "家价格待核对")}</span></div></div>
        <p className="ob-muted">{t("2 quoted stays · Starting prices are discovery clues, not comparable room rates.", "2 家有报价 · 起价仅作浏览线索，不直接判断贵或便宜。")}</p>
      </section>
      <section className="ob-nearby"><div className="explore-section-head"><h2>{t("A look around", "看看附近住宿")}</h2><div className="explore-stay-controls"><button aria-label={t("Previous stays", "上一组住宿")} onClick={()=>carousel.current?.scrollBy({left:-300,behavior:"smooth"})}><ChevronLeft size={18}/></button><button aria-label={t("Next stays", "下一组住宿")} onClick={()=>carousel.current?.scrollBy({left:300,behavior:"smooth"})}><ChevronRight size={18}/></button></div></div>
        <p className="ob-muted">{t("Similar setting · Within 3 km · Select once to compare", "相近环境 · 3 公里内 · 选入后统一对比")}</p>
        <div className="explore-stay-carousel" ref={carousel} tabIndex={0} aria-label={t("Nearby stays", "附近住宿")}>
          {stays.map((s,i)=><article className="explore-stay-card ob-stay" key={s.en}><div className="explore-stay-art"><Image src={`/images/${s.image}.webp`} alt={t("Sample accommodation photo", "住宿示例图片")} fill sizes="320px" className="explore-stay-photo"/><span className="explore-art-caption">{t("SAMPLE", "示例")}</span></div><div className="ob-stay-body"><div className="explore-stay-info"><h3>{zh?s.cn:s.en}</h3><strong>{s.price ? `¥${s.price+offset}` : "—"}<small>{s.price ? t("from", "起") : ""}</small></strong></div><p><MapPin size={12}/> {s.distance} km · {t("Courtyard / garden", "庭院 / 花园住宿")}</p><button aria-pressed={selected[i]} onClick={()=>setSelected(selected.map((v,j)=>i===j?!v:v))}>{selected[i] && <Check size={14}/>} {selected[i] ? t("Selected", "已选入对比") : t("Add to compare", "选入对比")}</button></div></article>)}
        </div><button className="ob-link ob-compare" onClick={startCompare}><SlidersHorizontal size={16}/>{t("Compare & verify", "查看对比与核验")} · {selected.filter(Boolean).length}<ArrowRight size={16}/></button>
      </section>
      <section className="explore-price ob-price"><div className="explore-section-head"><h2>{t("Where your rate sits", "你的房价位置")}</h2><span className="ob-tag">{t("Same conditions", "同口径比较")}</span></div><p className="explore-price-value">{t("Your double room", "本店大床房")} <strong>¥{520+offset}</strong><span>{t("/ night", "/ 晚")}</span></p>
        {valid.length >= 2 ? <><div className="explore-spectrum"><div className="explore-market-band"/><span className="explore-rate-marker" style={{left:"43%"}}><b>{t("You", "你")}</b><i/></span></div><div className="explore-spectrum-labels"><span>¥{498+offset}</span><span>{t("Verified range", "已核验样本区间")}</span><span>¥{558+offset}</span></div><p className="ob-muted">{t("Your rate is within these 2 sample quotes. This does not establish an optimal rate.", "本店位于这 2 家样本报价之间，不能据此认定为最优价格。")}</p></> : <div className="ob-pending"><span className="ob-pending-line"/><p>{t("Verify at least 2 comparable quotes to see your position.", "核验至少 2 家同口径报价后，再看房价位置。")}</p><button className="ob-link" onClick={startCompare}>{t("Review sample quotes", "去核验示例报价")} <ArrowRight size={16}/></button></div>}
      </section>
    </>}
    {!embedded&&(!view||live)&&<><section className="explore-local"><div className="explore-section-head"><h2>{t("Around your neighbourhood", "周边活动与服务")}</h2><span className="ob-tag">{t("Ideas", "示例线索")}</span></div>
        {[{id:"walk",cn:"村落晨间漫步",en:"A slow morning in the village",meta:t("45-minute walk · Quiet weekdays", "45 分钟步行路线 · 适合工作日")},{id:"market",cn:"湖畔周末市集",en:"Lakeside weekend market",meta:t("Weekend event · Confirm schedule", "周末活动 · 营业安排待确认")}].map((item,i)=><article className="native-card ob-local" key={item.id}><span className="ob-local-number">0{i+1}</span><div><h3>{zh?item.cn:item.en}</h3><p>{item.meta}</p><button className="ob-link" onClick={()=>{setContext(item.id);setDraft("");setSaved(false);document.getElementById("promotion")?.scrollIntoView({behavior:"smooth"});}}>{t("Use for promotion", "用于推广")} <ArrowRight size={15}/></button></div></article>)}
      </section>
      <section className="native-card explore-promotion ob-promotion" id="promotion"><span className="native-kicker">{t("FROM INSIGHT TO ACTION", "从发现到行动")}</span><h2>{t("Make quieter days count", "给安静的日子，一个入住理由")}</h2><p>{context==="walk" ? t("Pair a two-night weekday stay with a village walking guide.", "把工作日两晚小住，与村落漫步攻略组合起来。") : t("Pair a weekend stay with a lakeside market guide.", "把周末小住，与湖畔市集游玩攻略组合起来。")}</p><p className="ob-muted">{t("Sample availability + local idea. No price change or demand forecast.", "示例空房线索 + 周边体验；不自动降价，不推断需求。")}</p><label>{t("Content channel", "内容渠道")}<select value={channel} onChange={e=>{setChannel(e.target.value);setDraft("");setSaved(false);}}><option value="red">{t("Xiaohongshu", "小红书")}</option><option value="wechat">{t("WeChat Moments", "朋友圈")}</option></select></label><button className="native-primary" onClick={()=>{setSaved(false);setDraft(t("A slower escape: stay a little longer and explore the " + (context==="walk"?"village paths":"lakeside market") + ". Contact us for availability. [Sample draft]", "把脚步放慢，在"+(context==="walk"?"村落的小路上散散步":"湖畔市集逛一逛")+"，给自己留一段小住时光。具体房型与日期欢迎咨询。【示例文案】"));}}>{t("Preview sample copy", "预览示例文案")} <ArrowRight size={16}/></button>{draft && <div className="ob-draft"><label>{t("Edit draft", "编辑草稿")}<textarea value={draft} onChange={e=>{setDraft(e.target.value);setSaved(false);}}/></label><button className="ob-link" onClick={()=>setSaved(true)}>{t("Keep in this preview", "保留在本次预览")}</button>{saved && <p role="status">{t("Kept for this session; reload resets it.", "已保留，刷新页面后重置。")}</p>}</div>}</section>
    </>}
    <p className="explore-footer">{t("OBSERVE → VERIFY → COMPARE → ACT", "观察 → 核验 → 比较 → 行动")}</p>
  </Container>{!embedded&&<TabBar language={language}/>}</div>;
}
