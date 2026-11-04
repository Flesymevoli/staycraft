"use client";

import Link from "next/link";
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
    brandNote: "民宿经营工作台",
    eyebrow: "为小型民宿经营者而做",
    title: "让民宿经营，更轻一点。",
    subtitle: "日常运营、经营分析、周边报价与推广建议，收进一个安静的工作台。少一点来回核对，多一点留给客人和生活。",
    valuesLabel: "核心功能",
    values: [
      { title: "日常运营", body: "订单、房态、待办与清洁安排放在一处，减少来回翻找。" },
      { title: "经营分析", body: "看清预订、入住与收入节奏，用当前数据做判断。" },
      { title: "周边报价与推广", body: "参考周边住宿报价，把本地线索整理成可编辑的推广内容。" },
    ],
    cta: "开始使用",
    ctaNote: "已有账号直接登录；新用户在同一页注册。",
    note: "不自动同步 OTA 平台，不自动改价，也不做全市场实时竞价。建议仅供参考，决定权始终在你。",
    switchLabel: "Switch to English",
  },
  en: {
    brandNote: "Homestay workspace",
    eyebrow: "Built for independent homestays",
    title: "Running your homestay, made lighter.",
    subtitle: "Daily operations, business insight, and nearby pricing and promotion ideas in one calm workspace. Less admin, more time for guests.",
    valuesLabel: "What StayCraft does",
    values: [
      { title: "Daily operations", body: "Keep orders, room status, to-dos and cleaning in one place." },
      { title: "Business insight", body: "See booking, occupancy and revenue patterns from the data you already keep." },
      { title: "Nearby pricing & promotion", body: "Check nearby stays and turn local context into editable promotion drafts." },
    ],
    cta: "Get started",
    ctaNote: "Existing account? Sign in. New here? Register on the same page.",
    note: "No automatic OTA sync or price changes, and no whole-market real-time bidding. You review every suggestion.",
    switchLabel: "切换到中文",
  },
};

export function LandingPage() {
  const { language, setLanguage } = useOperatorLanguage();
  const t = content[language];

  return (
    <div className="landing">
      <div className="landing-shell">
        <header className="landing-header">
          <p className="landing-brand">
            StayCraft
            <span className="landing-brand-note">{t.brandNote}</span>
          </p>
          <button
            type="button"
            className="landing-language"
            onClick={() => setLanguage(language === "zh" ? "en" : "zh")}
            aria-label={t.switchLabel}
          >
            {language === "zh" ? "EN" : "中文"}
          </button>
        </header>

        <main className="landing-main" lang={language === "zh" ? "zh-CN" : "en"}>
          <section className="landing-hero" aria-labelledby="landing-title">
            <p className="landing-eyebrow">{t.eyebrow}</p>
            <h1 className="landing-title" id="landing-title">{t.title}</h1>
            <p className="landing-subtitle">{t.subtitle}</p>
            <div className="landing-actions">
              <Link className="landing-cta" href="/login">
                {t.cta}
                <span className="landing-cta-arrow" aria-hidden="true">→</span>
              </Link>
              <p className="landing-cta-note">{t.ctaNote}</p>
            </div>
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
          <p>{t.note}</p>
          <span>StayCraft</span>
        </footer>
      </div>
    </div>
  );
}
