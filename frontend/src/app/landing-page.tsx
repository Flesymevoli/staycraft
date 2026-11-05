"use client";

import Link from "next/link";
import Image from "next/image";
import {useActionState} from 'react';
import {signInDemo,type LoginState} from './login/actions';
import { useOperatorLanguage } from "@/components/operator-language";

type LandingCopy = {
  brandNote: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  valuesLabel: string;
  values: { title: string; body: string }[];
  cta: string;
  ctaNote: string;
  note: string;
  switchLabel: string;
};

const content: Record<"zh" | "en", LandingCopy> = {
  zh: {
    brandNote: "AI 经营决策工作台",
    eyebrow: "为小型民宿经营者而做",
    title: "看清经营，决定下一步。",
    subtitle: "连接订单与房态，按需调查周边酒店报价。StayCraft 主动发现值得关注的问题，把数据、原因和行动建议放在一起。",
    valuesLabel: "三步开始使用",
    values: [
      { title: "导入经营数据", body: "上传订单 CSV，补全民宿资料与房态，让分析有准确的起点。" },
      { title: "让 AI 主动调查", body: "打开决策总览，AI 读取经营记录，按需查询真实酒店报价。" },
      { title: "审核经营建议", body: "查看结论与数据依据，选择适合民宿的下一步行动。" },
    ],
    cta: "试用演示账号",
    ctaNote: "无需注册，先用演示数据体验完整工作台。",
    note: "AI 负责调查与分析，经营决策由你掌握。",
    switchLabel: "Switch to English",
  },
  en: {
    brandNote: "AI decision workbench",
    eyebrow: "Built for independent homestays",
    title: "See your business. Know your next move.",
    subtitle: "Connect bookings and room data with live hotel quotes. StayCraft investigates what matters, then brings evidence, business judgments and next steps together.",
    valuesLabel: "How it works",
    values: [
      { title: "Connect your data", body: "Upload a booking CSV and complete your property profile and room inventory." },
      { title: "Let AI investigate", body: "Open the overview. AI reads your records and checks live hotel quotes when needed." },
      { title: "Review your next move", body: "Read the evidence, assess the recommendations and choose your next action." },
    ],
    cta: "Try the demo",
    ctaNote: "No sign-up needed. Explore the full workbench with demo data.",
    note: "AI investigates and explains. You make the business decisions.",
    switchLabel: "切换到中文",
  },
};

export function LandingPage({demoAvailable=false}:{demoAvailable?:boolean}) {
  const { language, setLanguage } = useOperatorLanguage();
  const [state,action,pending]=useActionState<LoginState,FormData>(signInDemo,undefined);
  const t = content[language];

  return (
    <div className="landing" lang={language === "zh" ? "zh-CN" : "en"}>
      <a className="landing-skip" href="#landing-main">{language === "zh" ? "跳至主要内容" : "Skip to main content"}</a>
      <div className="landing-shell">
        <header className="landing-header">
          <div className="landing-brand">
            <Image src="/brand/staycraft-violet-yellow.png" alt="StayCraft" width={2172} height={724} priority />
            <span className="landing-brand-note">{t.brandNote}</span>
          </div>
          <button
            type="button"
            className="landing-language"
            onClick={() => setLanguage(language === "zh" ? "en" : "zh")}
            aria-label={t.switchLabel}
          >
            {language === "zh" ? "EN" : "中文"}
          </button>
        </header>

        <main id="landing-main" tabIndex={-1} className="landing-main" lang={language === "zh" ? "zh-CN" : "en"}>
          <section className="landing-hero" aria-labelledby="landing-title">
            <p className="landing-eyebrow">{t.eyebrow}</p>
            <h1 className="landing-title" id="landing-title">{t.title}</h1>
            <p className="landing-subtitle">{t.subtitle}</p>
            <div className="landing-actions">
              {demoAvailable?<form action={action}><button className="landing-cta" disabled={pending}>{pending?(language==='zh'?'正在进入…':'Opening…'):t.cta}<span aria-hidden="true">↗</span></button>{state?.error&&<p role="alert">{language==='zh'?'演示暂时无法打开，请稍后重试。':'Demo unavailable. Please retry.'}</p>}</form>:<Link className="landing-cta" href="/login">
                {t.cta}
                <span className="landing-cta-arrow" aria-hidden="true">→</span>
              </Link>}
              <Link className="landing-login" href="/login">{language==='zh'?'登录 / 注册':'Sign in / Register'} <span aria-hidden="true">→</span></Link>
            </div>
            {demoAvailable&&<p className="landing-demo-note">{t.ctaNote}</p>}
          </section>

          <ul className="landing-values" aria-label={t.valuesLabel}>
            {t.values.map((value, index) => (
              <li key={value.title}>
                <span className="landing-value-index" aria-hidden="true">0{index + 1}</span>
                <h2>{value.title}</h2>
                <p>{value.body}</p>
              </li>
            ))}
          </ul>
        </main>

        <footer className="landing-footer">
          <div><p>{t.note}</p><p className="landing-team">{language==='zh'?'关于我们 · ENT207 Digital Startup Lab 六人团队。':'Who we are · A six-person ENT207 Digital Startup Lab team.'}<br/>{language==='zh'?'我们为小型民宿经营者探索更易用的 AI 决策支持。':'We build accessible AI decision support for independent homestay owners.'}</p></div>
          <span>StayCraft</span>
        </footer>
      </div>
    </div>
  );
}
