"use client";

import { useRef, useState } from "react";
import { ArrowRight, ClipboardList } from "lucide-react";
import type { OperationMeta, Operations } from "./local-operations";

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
  order_id: ["Order", "订单"],
  standard_checkin: ["Standard check-in", "常规入住"],
  requested_checkin: ["Requested arrival", "申请入住"],
  days_before_arrival: ["Days before arrival", "距入住天数"],
  full_refund_min_days: ["Full-refund threshold", "全额退款门槛"],
  paid_amount_yuan: ["Paid", "已付"],
};

const missingLabels: Record<string, [string, string]> = {
  standard_checkin: ["Confirmed standard check-in time", "已确认的常规入住时间"],
  refund_policy: ["Refund policy", "退款规则"],
  order_status: ["Current order status", "当前订单状态"],
  cleaning_ready: ["Cleaning completion", "清洁完成确认"],
  room_available: ["Room availability", "房间可用确认"],
  payment_confirmation: ["Payment confirmation", "付款确认"],
};

export function WorkOperationDemo({ id, language, onDecision, operation: initialOperation, source }: {
  id: OperationId;
  language: Language;
  onDecision: (decision: string, result?: Operations) => void;
  operation: OperationMeta;
  source: Operations["source"];
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const [advice, setAdvice] = useState<Advice | null>(null);
  const [fingerprint, setFingerprint] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [stale, setStale] = useState(false);
  const [latestOperation, setLatestOperation] = useState<OperationMeta | null>(null);
  const operation = latestOperation ?? initialOperation;
  const requestId = useRef<{ decision: string; fingerprint: string; id: string } | null>(null);
  const zh = language === "zh";
  const t = (en: string, cn: string) => zh ? cn : en;
  const tx = (pair: readonly [string, string]) => pair[zh ? 1 : 0];

  async function loadAdvice() {
    setPending(true);
    setFailed(false);
    setStale(false); setSaveError(false); setAdvice(null);
    try {
      const response = await fetch(source === "prototype" ? "/api/demo/operation-advice" : "/api/local/operation-advice", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }),
      });
      if (!response.ok) throw new Error("Advice unavailable");
      const payload = await response.json();
      const result = (source === "prototype" ? payload : payload.advice) as Advice;
      if (result.external_status !== "not_started" || result.kind !== (id === "arrival" ? "early_checkin" : "refund")) throw new Error("Invalid advice");
      setAdvice(result);
      setFingerprint(source === "prototype" ? "" : payload.fingerprint);
      if (source !== "prototype") setLatestOperation(payload.operation as OperationMeta);
    } catch {
      setFailed(true);
      setAdvice(null);
    } finally {
      setPending(false);
    }
  }

  function toggle() {
    setOpen(!open);
    if (!open && !pending) void loadAdvice();
  }

  async function save(decision: string) {
    if (source === "prototype") { onDecision(decision); return; }
    setSaving(true); setSaveError(false);
    if (!requestId.current || requestId.current.decision !== decision || requestId.current.fingerprint !== fingerprint) requestId.current = { decision, fingerprint, id: crypto.randomUUID() };
    try {
      const response = await fetch("/api/local/operation-decision", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, decision, fingerprint, request_id: requestId.current.id }) });
      if (response.status === 409) { setStale(true); setAdvice(null); window.dispatchEvent(new Event("staycraft-operations-updated")); return; }
      if (!response.ok) throw new Error();
      onDecision(decision, await response.json() as Operations);
    } catch { setSaveError(true); }
    finally { setSaving(false); }
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
    <p className="work-meta">{t("Room", "房间")} {operation.room} · {operation.guest} · {operation.arrival_on}</p>
    <p className="work-note">{id === "arrival" ? t(`Requested ${operation.requested_time} · Standard: ${operation.standard_time ?? "not confirmed"}`, `希望 ${operation.requested_time} 入住 · 常规时间：${operation.standard_time ?? "待确认"}`) : t(`Requested ${operation.requested_on} · ${operation.paid_amount_yuan === null ? "Payment unconfirmed" : `¥${operation.paid_amount_yuan.toLocaleString()} paid`}`, `${operation.requested_on} 申请 · ${operation.paid_amount_yuan === null ? "付款待确认" : `已付 ¥${operation.paid_amount_yuan.toLocaleString()}`}`)}</p>
    <button className="native-primary work-review" type="button" disabled={saving} aria-expanded={open} aria-controls={"operation-advice-" + id} onClick={toggle}>{t("Review advice", "查看建议")} <ArrowRight size={15} /></button>
    {open && <div className="work-draft work-operation-advice" id={"operation-advice-" + id}>
      {pending && <p role="status">{t("Checking sample rules…", "正在核对示例规则…")}</p>}
      {failed && <div role="alert"><p>{t("The local advice service is unavailable.", "本地建议服务暂时不可用。")}</p><button type="button" className="work-text-action" onClick={() => void loadAdvice()}>{t("Try again", "重试")}</button></div>}
      {stale && <div role="alert"><p>{t("The basis or saved plan changed. Review the latest advice before saving.", "依据或已保存方案发生变化，请重新查看后再保存。")}</p><button type="button" className="work-text-action" onClick={() => void loadAdvice()}>{t("Review again", "重新查看")}</button></div>}
      {advice && <>
        <strong>{tx(actionText[advice.recommended_action])}</strong>
        <ul className="work-operation-basis">{advice.basis.map(entry => {
          const [key, value] = entry.split("=");
          return <li key={key}>{tx(basisLabels[key] ?? [key, key])}: {key === "paid_amount_yuan" ? `¥${Number(value).toLocaleString()}` : value}{key.includes("days") ? t(" days", " 天") : ""}</li>;
        })}</ul>
        {advice.missing_checks.length > 0 && <p className="work-operation-missing">{t("Still to confirm: ", "仍需核实：")}{advice.missing_checks.map(key => tx(missingLabels[key] ?? [key, key])).join(t(", ", "、"))}</p>}
        {advice.suggested_refund_yuan !== null && <p className="work-operation-amount">{t("Proposed refund: ", "建议退款：")}¥{advice.suggested_refund_yuan.toLocaleString()}</p>}
        <div className="work-decision-actions">
          <button type="button" className="native-primary" disabled={saving} onClick={() => void save(primaryCode)}>{saving ? t("Saving…", "正在保存…") : primaryLabel}</button>
          {primaryCode !== "keep_standard" && <button type="button" disabled={saving} className="work-text-action" onClick={() => void save(id === "arrival" ? "keep_standard" : "hold_review")}>{id === "arrival" ? t("Keep standard time", "按常规时间入住") : t("Hold for review", "暂缓并核实")}</button>}
        </div>
        <small>{t("Demo decision only · No order change, refund or guest notice", "只记录演示决定 · 未改订单、退款或通知客人")}</small>
        {saveError && <p role="alert">{t("Not saved. Please retry; this request remains pending.", "保存失败，请重试；该事项仍待处理。")}</p>}
      </>}
    </div>}
  </article>;
}
