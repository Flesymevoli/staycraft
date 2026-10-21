"use client";

import { useState, type FormEvent } from "react";

type Language = "en" | "zh";
type Decision = {
  disposition: "auto_reply_ready" | "needs_review";
  draft: string | null;
  reason_code: "ready" | "auto_reply_off" | "missing_fact" | "needs_confirmation" | "sensitive_request" | "unsupported_question" | "model_review" | "model_unavailable";
  citations: { key: string; value: string }[];
  engine: "rules_v1" | "model_v1";
  sent: false;
};

const reasons: Record<Decision["reason_code"], [string, string]> = {
  model_review: ["AI draft based on your saved fact. Review before using.", "AI 已依据保存的资料起草，请先审核再使用。"],
  model_unavailable: ["AI could not produce a usable draft. Showing the rules fallback for review.", "AI 暂未生成可用草稿，以下为规则备用回复，请审核。"],
  ready: ["Fact found. Draft is ready for review.", "已找到依据，可查看回复草稿。"],
  auto_reply_off: ["Automatic replies are paused. Review the draft yourself.", "自动回复已暂停，请你审核草稿。"],
  missing_fact: ["No confirmed fact can answer this question. Add it in Mine first.", "没有足够的已确认依据，请先到「我的」补充资料。"],
  needs_confirmation: ["This needs an availability or arrangement check.", "需要先核实可用情况或具体安排。"],
  sensitive_request: ["Refunds and cancellations need your decision.", "退款与取消需由你决定。"],
  unsupported_question: ["This question needs a person to review it.", "这个问题需要人工查看。"],
};

export function WorkDecisionDemo({ language, autoReply }: { language: Language; autoReply: boolean }) {
  const [question, setQuestion] = useState("");
  const [decision, setDecision] = useState<Decision | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const zh = language === "zh";
  const t = (en: string, cn: string) => zh ? cn : en;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!question.trim() || pending) return;
    setPending(true);
    setError(false);
    setDecision(null);
    try {
      const response = await fetch("/api/local/reply-decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question.trim(), language, auto_reply_enabled: autoReply }),
      });
      if (!response.ok) throw new Error("Decision unavailable");
      setDecision(await response.json() as Decision);
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }

  return <section className="work-try-section" aria-labelledby="work-try-heading">
    <div className="work-section-head"><h2 id="work-try-heading">{t("Try a guest question", "试一条客人咨询")}</h2><span>{t("DRAFT TEST", "草稿测试")}</span></div>
    <div className="native-card work-try-card">
      <p className="work-try-intro">{t("Uses the reply facts saved in Mine on this computer. No message is sent.", "使用「我的」中已保存到本机的回复依据，不会发送消息。")}</p>
      <p className="work-try-intro">{t("Use fictional details for this test. When AI is enabled, your question and related facts go to the configured AI service.", "当前请只用虚构资料测试。开启 AI 时，问题及相关依据会提交给配置的 AI 服务。")}</p>
      <a href="/native-mine">{t("Manage reply facts →", "维护回复依据 →")}</a>
      <form onSubmit={submit}>
        <label htmlFor="work-demo-question">{t("Guest's question", "客人的问题")}</label>
        <textarea id="work-demo-question" rows={2} maxLength={2000} value={question} onChange={event => { setQuestion(event.target.value); setDecision(null); setError(false); }} placeholder={t("What time is breakfast?", "早餐时间是几点？")} />
        <div className="work-try-actions"><button type="submit" className="native-primary" disabled={!question.trim() || pending}>{pending ? t("Checking…", "正在判断…") : t("Check reply", "生成判断")}</button></div>
      </form>
      {pending && <p className="work-try-feedback" role="status">{t("Checking saved facts and preparing a draft…", "正在核对已保存资料并准备草稿…")}</p>}
      {error && <p className="work-try-feedback work-try-error" role="alert">{t("The local decision service is unavailable. Start the backend and try again.", "本地判断服务暂时不可用，请启动后端后重试。")}</p>}
      {decision && <div className="work-try-result" role="status">
        <strong>{decision.disposition === "auto_reply_ready" ? t("Draft available", "已有回复草稿") : t("Needs your review", "需要你处理")}</strong>
        <p>{reasons[decision.reason_code][zh ? 1 : 0]}</p>
        {decision.draft && <blockquote>{decision.draft}</blockquote>}
        {decision.citations.length > 0 && <small>{t("Based on saved fact: ", "依据已保存资料：")}{decision.citations.map(item => item.value).join(" · ")}</small>}
        <small>{decision.engine === "model_v1" ? t("AI-generated · Review required · Not sent", "AI 生成 · 待审核 · 未发送") : t("Rule-based preview · Not AI-generated · Not sent", "规则生成预览 · 非模型生成 · 未发送")}</small>
      </div>}
    </div>
  </section>;
}
