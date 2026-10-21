"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function LocalFactsEditor({ zh }: { zh: boolean }) {
  const [values, setValues] = useState({ breakfast: "", checkin: "" });
  const [state, setState] = useState<"loading" | "ready" | "saving" | "saved" | "load-error" | "save-error">("loading");
  const [reload, setReload] = useState(0);
  const t = (en: string, cn: string) => zh ? cn : en;
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/local/facts", { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error();
      const data = await response.json() as { facts: { key: string; value: string }[] };
      setValues({ breakfast: data.facts.find(f => f.key === "breakfast")?.value ?? "", checkin: data.facts.find(f => f.key === "checkin")?.value ?? "" });
      setState("ready");
    }).catch(() => { if (!controller.signal.aborted) setState("load-error"); });
    return () => controller.abort();
  }, [reload]);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setState("saving");
    try {
      const response = await fetch("/api/local/facts", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
      if (!response.ok) throw new Error();
      const data = await response.json() as { facts: { key: string; value: string }[] };
      setValues({ breakfast: data.facts.find(f => f.key === "breakfast")?.value ?? "", checkin: data.facts.find(f => f.key === "checkin")?.value ?? "" });
      setState("saved");
    } catch { setState("save-error"); }
  }
  return <section className="mine-upload local-facts" aria-labelledby="local-facts-heading">
    <h2 id="local-facts-heading">{t("Reply facts", "回复依据")}</h2>
    <p>{t("Confirm these times for new Work drafts. Saved on this computer only; other details below remain samples.", "确认后用于工作页的新回复草稿。资料保存在本机；下方其他资料仍为示例。")}</p>
    {state === "loading" ? <p role="status">{t("Loading saved facts…", "正在读取已保存资料…")}</p> : state === "load-error" ? <div role="alert"><p>{t("Local data service unavailable. Start it and retry.", "本地资料服务未开启，请启动后重试。")}</p><button type="button" className="native-primary" onClick={() => { setState("loading"); setReload(n => n + 1); }}>{t("Retry", "重试")}</button></div> : <form onSubmit={save}>
      <label htmlFor="fact-breakfast">{t("Breakfast hours", "早餐时间")}</label>
      <input id="fact-breakfast" value={values.breakfast} placeholder="07:30–10:00" maxLength={11} disabled={state === "saving"} onChange={e => { setValues({ ...values, breakfast: e.target.value }); setState("ready"); }} />
      <label htmlFor="fact-checkin">{t("Standard check-in", "常规入住时间")}</label>
      <input id="fact-checkin" value={values.checkin} placeholder="14:00" maxLength={5} disabled={state === "saving"} onChange={e => { setValues({ ...values, checkin: e.target.value }); setState("ready"); }} />
      <p>{t("Use 24-hour times. Leave a field blank to remove its fact; unanswered questions go to review.", "使用 24 小时制。留空并保存可移除依据，相关咨询将转人工。")}</p>
      <button className="native-primary" disabled={state === "saving"}>{state === "saving" ? t("Saving…", "正在保存…") : t("Confirm & save", "确认并保存")}</button>
      {state === "saved" && <p role="status">{t("Saved on this computer. New drafts will use these facts.", "已保存到本机，新草稿将使用这些资料。")}</p>}
      {state === "save-error" && <p role="alert">{t("Not saved. Check the service and times (07:30–10:00 / 14:00), then retry. Breakfast must end after it starts.", "保存失败。请检查服务及时间格式（07:30–10:00 / 14:00）后重试，早餐结束须晚于开始。")}</p>}
      <Link href="/native-work">{t("Try a question in Work →", "去工作页试一条咨询 →")}</Link>
    </form>}
  </section>;
}
