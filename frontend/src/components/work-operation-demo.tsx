"use client";

import { useState } from "react";
import { ArrowRight, ClipboardList } from "lucide-react";

export type OperationId = "arrival" | "refund";
type Language = "en" | "zh";
type Advice = {
  kind: "early_checkin" | "refund";
  recommended_action: "verify_readiness" | "consider_early_checkin" | "keep_standard_time" | "propose_full_refund" | "review_refund";
  reason_code: string;
  basis: string[];
  missing_checks: string[];
  suggested_refund_yuan: number | null;
  requires_owner_decision: true;
  external_status: "not_started";
};

const copy = {
  arrival: {
    title: ["Early check-in request", "提前入住申请"],
    meta: ["Room 102 · Alex · Sep 18", "102 房 · Alex · 9 月 18 日"],
    note: ["Requested 12:00 · Standard check-in 14:00", "希望 12:00 入住 · 常规时间 14:00"],
  },
  refund: {
    title: ["Cancellation & refund request", "取消与退款申请"],
    meta: ["Order GH-204 · Casey · ¥1,040 paid", "订单 GH-204 · Casey · 已付 ¥1,040"],
    note: ["Requested Sep 18 · Arrival Sep 22", "9 月 18 日申请 · 9 月 22 日入住"],
  },
} as const;

const actionText: Record<Advice["recommended_action"], [string, string]> = {
  verify_readiness: ["Check cleaning before deciding on an early arrival.", "先确认清洁完成情况，再决定能否提前入住。"],
  consider_early_checkin: ["Room checks passed. You can consider the request.", "房间检查已通过，可由你决定是否同意。"],
  keep_standard_time: ["Keep the standard check-in time for now.", "暂按常规入住时间处理。"],
  propose_full_refund: ["Sample policy suggests a full refund; execution still needs review.", "示例规则支持建议全额退款，执行仍需另行确认。"],
  review_refund: ["Review the policy and payment before deciding.", "请先核对规则和付款状态，再作决定。"],
};

const basisLabels: Record<string, [string, string]> = {
  standard_checkin: ["Standard check-in", "常规入住"],
  requested_checkin: ["Requested arrival", "申请入住"],
  days_before_arrival: ["Days before arrival", "距入住天数"],
  full_refund_min_days: ["Full-refund threshold", "全额退款门槛"],
  paid_amount_yuan: ["Paid", "已付"],
};

const missingLabels: Record<string, [string, string]> = {
  cleaning_ready: ["Cleaning completion", "清洁完成确认"],
  room_available: ["Room availability", "房间可用确认"],
  payment_confirmation: ["Payment confirmation", "付款确认"],
};

export function WorkOperationDemo({ id, language, onDecision }: {
  id: OperationId;
  language: Language;
  onDecision: (decision: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const [advice, setAdvice] = useState<Advice | null>(null);
  const zh = language === "zh";
  const t = (en: string, cn: string) => zh ? cn : en;
  const tx = (pair: readonly [string, string]) => pair[zh ? 1 : 0];

  async function loadAdvice() {
    setPending(true);
    setFailed(false);
    try {
      const response = await fetch("/api/demo/operation-advice", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }),
      });
      if (!response.ok) throw new Error("Advice unavailable");
      const result = await response.json() as Advice;
      if (result.external_status !== "not_started" || result.kind !== (id === "arrival" ? "early_checkin" : "refund")) throw new Error("Invalid advice");
      setAdvice(result);
    } catch {
      setFailed(true);
      setAdvice(null);
    } finally {
      setPending(false);
    }
  }

  function toggle() {
    setOpen(!open);
    if (!open && advice === null && !pending) void loadAdvice();
  }

  const primaryCode = advice?.recommended_action === "consider_early_checkin" ? "consider_early"
    : advice?.recommended_action === "keep_standard_time" ? "keep_standard"
    : advice?.recommended_action === "propose_full_refund" ? "refund_proposed"
    : advice?.recommended_action === "review_refund" ? "hold_review" : "check_readiness";
  const primaryLabel = advice?.recommended_action === "consider_early_checkin" ? t("Record early-arrival plan", "记录提前入住方案")
    : advice?.recommended_action === "keep_standard_time" ? t("Record standard time", "记录常规入住时间")
    : advice?.recommended_action === "propose_full_refund" ? t("Record refund proposal", "记录退款建议")
    : advice?.recommended_action === "review_refund" ? t("Record manual review", "记录人工核实")
    : t("Record readiness check", "记录待核实");

  return <article className="native-card work-task-card" id={"operation-" + id}>
    <span className="work-task-type"><ClipboardList size={15} />{t("BOOKING OPERATIONS · SAMPLE", "订单处理 · 示例")}</span>
    <h3>{tx(copy[id].title)}</h3>
    <p className="work-meta">{tx(copy[id].meta)}</p>
    <p className="work-note">{tx(copy[id].note)}</p>
    <button className="native-primary work-review" type="button" aria-expanded={open} aria-controls={"operation-advice-" + id} onClick={toggle}>{t("Review advice", "查看建议")} <ArrowRight size={15} /></button>
    {open && <div className="work-draft work-operation-advice" id={"operation-advice-" + id}>
      {pending && <p role="status">{t("Checking sample rules…", "正在核对示例规则…")}</p>}
      {failed && <div role="alert"><p>{t("The local advice service is unavailable.", "本地建议服务暂时不可用。")}</p><button type="button" className="work-text-action" onClick={() => void loadAdvice()}>{t("Try again", "重试")}</button></div>}
      {advice && <>
        <strong>{tx(actionText[advice.recommended_action])}</strong>
        <ul className="work-operation-basis">{advice.basis.map(entry => {
          const [key, value] = entry.split("=");
          return <li key={key}>{tx(basisLabels[key] ?? [key, key])}: {key === "paid_amount_yuan" ? `¥${Number(value).toLocaleString()}` : value}{key.includes("days") ? t(" days", " 天") : ""}</li>;
        })}</ul>
        {advice.missing_checks.length > 0 && <p className="work-operation-missing">{t("Still to confirm: ", "仍需核实：")}{advice.missing_checks.map(key => tx(missingLabels[key] ?? [key, key])).join(t(", ", "、"))}</p>}
        {advice.suggested_refund_yuan !== null && <p className="work-operation-amount">{t("Proposed refund: ", "建议退款：")}¥{advice.suggested_refund_yuan.toLocaleString()}</p>}
        <div className="work-decision-actions">
          <button type="button" className="native-primary" onClick={() => onDecision(primaryCode)}>{primaryLabel}</button>
          {primaryCode !== "keep_standard" && <button type="button" className="work-text-action" onClick={() => onDecision(id === "arrival" ? "keep_standard" : "hold_review")}>{id === "arrival" ? t("Keep 14:00", "按 14:00 入住") : t("Hold for review", "暂缓并核实")}</button>}
        </div>
        <small>{t("Demo decision only · No order change, refund or guest notice", "只记录演示决定 · 未改订单、退款或通知客人")}</small>
      </>}
    </div>}
  </article>;
}
