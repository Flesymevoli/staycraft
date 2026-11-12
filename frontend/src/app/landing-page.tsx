"use client";

import Image from "next/image";
import Link from "next/link";
import { DataSample, MarketSample, DecisionSample } from "./landing-samples";
import { useEffect, useRef } from "react";
import { useOperatorLanguage } from "@/components/operator-language";

const courtyard = "/images/landing-courtyard.webp";
const chapters = [
  { id: "data", zh: ["数据管理和可视化", "一周的订单，哪些日子最忙？", "导入订单 CSV，先核对新增、改期和取消记录，再按住宿日查看间夜和渠道构成。"], en: ["Data & visualization", "Which nights fill up first?", "Preview new, changed and cancelled bookings before importing your CSV. Then explore room nights by stay date and channel."] },
  { id: "market", zh: ["市场调研与分析", "同一天，周边怎么报价？", "选定入住日期，把周边住宿的公开报价放在一把尺上。切换日期，看看不同民宿的报价和样本中位数怎样变化。"], en: ["Market research", "What are nearby stays asking?", "Compare nearby listings on a common price scale. Switch the stay date to see how individual quotes and the sample median change."] },
  { id: "decision", zh: ["决策与推广优化", "给订得少的日子，写一份邀请。", "从经营报告里找到值得跟进的日期，再结合民宿特色准备推广草稿。发布前，由你核对房态、修改措辞。"], en: ["Decisions & promotion", "Give quieter nights a reason to book.", "Use the operating report to pick a date worth attention. Turn property details into a draft, check availability and edit the wording before you publish."] },
] as const;

// The anchors stay in normal document flow, including while the desktop stage is pinned.
function useLandingScroll() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const page = root.current;
    if (!page) return;
    const anchors = Array.from(page.querySelectorAll<HTMLElement>(".story-stop"));
    const scenes = Array.from(page.querySelectorAll<HTMLElement>(".story"));
    const links = Array.from(page.querySelectorAll<HTMLAnchorElement>(".landing-index a"));
    const stage = page.querySelector<HTMLElement>(".story-stage")!;
    const nav = page.querySelector<HTMLElement>(".landing-index")!;
    const hero = page.querySelector<HTMLElement>(".landing-hero")!;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const desktop = window.matchMedia("(min-width: 850px) and (min-height: 620px)");
    const clamp = (n: number) => Math.max(0, Math.min(1, n));
    let frame = 0;

    function draw() {
      frame = 0;
      if (!page) return;
      const viewport = document.documentElement.clientHeight;
      const navHeight = nav.offsetHeight;
      const pinned = desktop.matches && !reduced.matches &&
        scenes.every(scene => [".story-copy", ".story-object"].every(selector =>
          scene.querySelector<HTMLElement>(selector)!.offsetHeight + 48 < viewport - navHeight));
      page.toggleAttribute("data-pinned", pinned);
      const top = anchors.map(anchor => anchor.getBoundingClientRect().top);
      const chapterHeight = top[1] - top[0] || viewport;
      const position = (navHeight - top[0]) / chapterHeight;
      const current = pinned ? Math.min(scenes.length - 1, Math.max(0, Math.round(position))) :
        Math.max(0, top.filter(y => y < viewport * .54).length - 1);
      const heroBounds = hero.getBoundingClientRect();
      hero.style.setProperty("--hero-travel", String(reduced.matches ? 0 : clamp(-heroBounds.top / heroBounds.height)));

      scenes.forEach((scene,i) => {
        const figure = scene.querySelector("figure")!.getBoundingClientRect();
        const progress = pinned ? 1 :
          clamp((viewport * .94 - figure.top) / Math.min(figure.height * .70, viewport * .50));
        scene.style.setProperty("--reveal", String(reduced.matches ? 1 : progress));
        scene.inert = pinned && i !== current;
        if (i === current && top[0] < viewport * .65) links[i].setAttribute("aria-current", "location");
        else links[i].removeAttribute("aria-current");
      });
    }
    function queue() {
      if (!frame) frame = requestAnimationFrame(draw);
    }
    const resize = new ResizeObserver(queue);
    resize.observe(stage);
    scenes.forEach(scene => resize.observe(scene.querySelector(".story-inner")!));
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    reduced.addEventListener("change", queue);
    draw();
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      window.removeEventListener("scroll", queue);
      window.removeEventListener("resize", queue);
      reduced.removeEventListener("change", queue);
      page.removeAttribute("data-pinned");
      scenes.forEach(scene => { scene.inert = false; });
    };
  }, []);
  return root;
}
export function LandingPage() {
  const root = useLandingScroll();
  const { language, setLanguage } = useOperatorLanguage();
  const zh = language === "zh";
  const trialLabel = zh ? "查看概念演示" : "Explore the concept";
  const login = zh ? "登录 / 注册" : "Sign in / Register";
  return <div ref={root} className="landing" lang={zh ? "zh-CN" : "en"}>
    <a className="landing-skip" href="#landing-main">{zh ? "跳至主要内容" : "Skip to content"}</a>
    <header className="landing-header">
      <Image src="/brand/StayCraft-main-HD.png" alt="StayCraft" width={4102} height={1058} priority unoptimized/>
      <div><button className="landing-language" type="button" aria-label={zh ? "Switch to English" : "切换到中文"} onClick={() => setLanguage(zh ? "en" : "zh")}>{zh ? "EN" : "中文"}</button><Link href="/login">{login}</Link></div>
    </header>
    <main id="landing-main" tabIndex={-1}>
      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-intro"><h1 id="landing-title">{zh ? "看清经营，" : "See your business."}<br/>{zh ? "决定下一步。" : "Plan your next move."}</h1>
          <p>{zh ? "整理订单，看懂预订走势，调查周边报价。StayCraft 帮你判断哪些日子值得跟进，把经营建议写进推广草稿。" : "Organize bookings, track demand and explore nearby rates. StayCraft helps you decide where to focus and prepare a promotion for your stay."}</p>
          <div className="landing-actions">
            <a className="landing-cta" href="/try">{trialLabel} <span aria-hidden="true">↗</span></a>
            <Link className="landing-discover" href={zh ? "/download" : "/download?lang=en"}>{zh ? "下载桌面端" : "Download desktop app"} <span aria-hidden="true">↓</span></Link>
            <a className="landing-discover" href="#data">{zh ? "浏览功能" : "Explore features"} <span aria-hidden="true">↓</span></a>
          </div>
          <small>{zh ? "无需登录，体验完整的交互概念。" : "Explore the interactive concept without signing in."}</small>
        </div>
        <div className="landing-photo"><Image src={courtyard} alt={zh ? "临河小院的树荫、茶桌与客房，民宿场景示意" : "Illustration of a canal-side guesthouse, with a shaded table and open guest room"} fill priority sizes="(max-width: 720px) 100vw, 54vw"/></div>
      </section>
      <nav className="landing-index" aria-label={zh ? "功能章节" : "Feature chapters"}>{chapters.map((c,i) => <a href={`#${c.id}`} key={c.id}>{(zh ? ["数据可视化", "市场调研", "决策与推广"] : ["Data", "Market", "Decisions"])[i]}</a>)}<a className="index-trial" href="/try">{trialLabel} <span aria-hidden="true">↗</span></a></nav>
      <div className="story-flow"><div className="story-stops" aria-hidden="true">{chapters.map(c => <div className="story-stop" key={c.id} id={c.id}/>)}</div>
      <div className="story-stage">{chapters.map(c => <section key={c.id} className={`story story-${c.id}`} aria-labelledby={`title-${c.id}`}>
        <div className="story-inner"><div className="story-copy"><p className="story-label">{c[language][0]}</p><h2 id={`title-${c.id}`}>{c[language][1]}</h2><p>{c[language][2]}</p></div>
        <div className="story-object">{c.id === "data" && <DataSample zh={zh}/>} {c.id === "market" && <MarketSample zh={zh}/>} {c.id === "decision" && <DecisionSample zh={zh}/>}</div></div>
      </section>)}</div></div>
    </main>
    <footer className="landing-footer"><div><strong>StayCraft</strong><p>{zh ? "ENT207 Digital Startup Lab 六人团队 · 为小型民宿经营者而做" : "A six-person ENT207 Digital Startup Lab team building for independent homestays."}</p></div>
      <a href="#landing-title">{zh ? "回到首屏" : "Back to top"} ↑</a></footer>
  </div>;
}
