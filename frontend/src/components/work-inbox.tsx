"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

type Thread = {
  id: string; guest: string; room: string;
  messages: { id: string; sender: "guest" | "owner"; body_en: string; body_zh: string; created_at: string }[];
  draft_state: "idle" | "processing" | "ready" | "failed";
  decision: { draft: string | null; engine: "model_v1" | "rules_v1"; reason_code: string; citations: {key: string;value: string}[] } | null;
};

export function WorkInbox({ language, autoReply }: { language: "en" | "zh"; autoReply: boolean }) {
  const zh = language === "zh";
  const t = useCallback((en: string, cn: string) => zh ? cn : en, [zh]);
  const [items, setItems] = useState<Thread[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [draft, setDraft] = useState("");
  const [reload, setReload] = useState(0);
  const [notice, setNotice] = useState("");
  const requestId = useRef<string | null>(null);
  const update = useCallback((item: Thread) => setItems(previous => previous.map(old => old.id === item.id ? item : old)), []);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/local/conversations", { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error();
      const body = await response.json() as { items: Thread[] };
      setItems(body.items); setLoading(false); setError(false);
    }).catch(() => { if (!controller.signal.aborted) { setLoading(false); setError(true); } });
    return () => controller.abort();
  }, [reload]);

  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function load() {
      setBusy(true); setError(false); setSaveError(false); setDraft(""); setNotice(""); requestId.current = null;
      try {
        const response = await fetch("/api/local/conversation-draft", { method: "POST", signal: controller.signal,
          headers: { "Content-Type": "application/json" }, body: JSON.stringify({ thread_id: active, language, auto_reply_enabled: autoReply }) });
        if (!response.ok) throw new Error();
        let item = await response.json() as Thread;
        const joinedExisting = item.draft_state === "processing";
        for (let attempts = 0; item.draft_state === "processing" && attempts < 30; attempts++) {
          await new Promise<void>(resolve => { timer = setTimeout(resolve, 1000); controller.signal.addEventListener("abort", () => { if (timer) clearTimeout(timer); resolve(); }, { once: true }); });
          if (controller.signal.aborted) return;
          const poll = await fetch("/api/local/conversation?thread_id=" + encodeURIComponent(active!), {signal: controller.signal});
          if (!poll.ok) throw new Error();
          item = await poll.json() as Thread;
        }
        if (controller.signal.aborted) return;
        if (joinedExisting && item.draft_state === "ready") {
          // The in-flight draft may have been requested in another language.
          // The server reuses a matching fingerprint; only changed inputs generate again.
          const resolved = await fetch("/api/local/conversation-draft", { method: "POST", signal: controller.signal,
            headers: { "Content-Type": "application/json" }, body: JSON.stringify({ thread_id: active, language, auto_reply_enabled: autoReply }) });
          if (!resolved.ok) throw new Error();
          item = await resolved.json() as Thread;
        }
        update(item);
        if (item.draft_state === "processing" || item.draft_state === "failed") throw new Error();
        setDraft(item.messages.some(message => message.sender === "owner") ? "" : item.decision?.draft ?? "");
      } catch { if (!controller.signal.aborted) setError(true); }
      finally { if (!controller.signal.aborted) setBusy(false); }
    }
    void load();
    return () => { controller.abort(); if (timer) clearTimeout(timer); };
  }, [active, language, autoReply, reload, update, t]);

  async function save() {
    if (!active || !draft.trim() || saving || busy) return;
    setSaving(true); setError(false); setSaveError(false);
    requestId.current ??= crypto.randomUUID();
    try {
      const response = await fetch("/api/local/conversation-reply", { method: "POST", headers: {"Content-Type":"application/json"},
        body: JSON.stringify({thread_id: active, request_id: requestId.current, body: draft.trim()}) });
      if (!response.ok) throw new Error();
      update(await response.json() as Thread); setDraft(""); requestId.current = null;
      setNotice(t("Demo reply saved on this computer. No external message sent.", "演示回复已保存到本机，未发送外部消息。"));
    } catch { setError(true); setSaveError(true); }
    finally { setSaving(false); }
  }

  return <section className="work-conversations">
    <div className="work-section-head"><h2>{t("Guest messages", "客人消息")}</h2><span>{t(`${items.length} conversations`, `${items.length} 条对话`)}</span></div>
    <div className="native-card work-inbox">
      {loading && <p className="work-inbox-feedback" role="status">{t("Loading conversations…", "正在读取会话…")}</p>}
      {!loading && !error && !items.length && <p className="work-inbox-feedback">{t("No guest messages yet.", "暂无客人消息。")}</p>}
      {items.filter(item => active === null || item.id === active).map(item => {
        const latest = item.messages[item.messages.length - 1];
        const ownerReplied = item.messages.some(message => message.sender === "owner");
        const title = item.id === "breakfast" ? t("Breakfast time", "早餐时间") : t("Airport transfer recommendation", "机场接送推荐");
        return <article className="work-conversation-card" key={item.id}>
          {active === null ? <button type="button" className="work-inbox-row" onClick={() => setActive(item.id)}>
            <span className={`work-avatar work-avatar-${item.id}`}>{item.guest[0]}</span><span className="work-inbox-copy">
              <span className="work-inbox-name"><strong>{item.guest}</strong><time>{new Date(latest.created_at).toLocaleTimeString("en-GB", {hour: "2-digit", minute:"2-digit",timeZone:"Asia/Shanghai"})}</time></span>
              <span className="work-inbox-preview">{latest[zh ? "body_zh" : "body_en"]}</span>
              <span className="work-inbox-meta"><span>{t("Room", "房间")} {item.room} · {title}</span><span className="work-replied-badge">{ownerReplied ? t("Demo replied", "演示已回复") : item.decision?.draft ? t("Draft to review", "草稿待审核") : t("Needs review", "待处理")}</span></span>
            </span>
          </button> : <>
            <header className="work-chat-header"><button type="button" className="work-chat-back" aria-label={t("Back to messages", "返回消息列表")} onClick={() => { setActive(null); setError(false); setNotice(""); }}><ArrowLeft size={20}/></button><span className={`work-avatar work-avatar-${item.id}`}>{item.guest[0]}</span><div><strong>{item.guest} · {item.room}</strong><small>{title} · {t("Sample", "示例")}</small></div></header>
            <div className="work-thread">
              {item.messages.filter(message => message.sender === "guest").map(message => <div className="work-message" key={message.id}><small>{t("Guest", "客人")}</small><p>{message[zh ? "body_zh" : "body_en"]}</p></div>)}
              {busy && <p className="work-basis" role="status">{t("Checking facts and preparing a draft…", "正在核对资料并准备草稿…")}</p>}
              {!busy && item.decision && <>
                {item.decision.draft ? <div className="work-message work-message-ai"><small>{item.decision.engine === "model_v1" ? t("AI draft · Review required", "AI 草稿 · 待审核") : t("Suggested reply · Review required", "建议回复 · 待审核")}</small><p>{item.decision.draft}</p></div> : <p className="work-basis">{item.decision.reason_code === "missing_fact" ? t("No confirmed fact. Update the details in Mine first.", "暂无已确认依据，请先在「我的」补充资料。") : t("This request needs your arrangement and confirmation.", "这条请求需要你核实安排后确认。")}</p>}
                {item.decision.reason_code === "model_unavailable" && <p className="work-basis">{t("AI unavailable. Showing a rules fallback.", "AI 暂不可用，以上为规则备用回复。")}</p>}
                {item.decision.citations.length > 0 && <p className="work-basis">{t("Based on: ", "回复依据：")}{item.decision.citations.map(fact => fact.value).join(" · ")}</p>}
                {item.decision.reason_code === "missing_fact" && <Link className="native-soft-link" href="/native-mine">{t("Open Mine", "打开我的")} <ArrowRight size={15}/></Link>}
              </>}
              {item.messages.filter(message => message.sender === "owner").map(message => <div className="work-message work-message-owner" key={message.id}><small>{t("You · Demo reply", "你 · 演示回复")}</small><p>{message.body_en}</p></div>)}
              <form onSubmit={event => { event.preventDefault(); void save(); }}><label htmlFor={`followup-${item.id}`}>{t("Add your reply", "补充你的回复")}</label><textarea id={`followup-${item.id}`} value={draft} rows={3} disabled={busy || saving} onChange={event => { setDraft(event.target.value); requestId.current = null; }} placeholder={t("Review the draft or add your reply…", "审核草稿或补充你的回复……")}/><button type="submit" className="native-primary" disabled={!draft.trim() || busy || saving}>{saving ? t("Saving…", "正在保存…") : t("Reply in demo", "演示回复")} <ArrowRight size={15}/></button></form>
              {notice && <p className="work-basis" role="status">{notice}</p>}
            </div>
          </>}
        </article>;
      })}
      {error && <p className="work-inbox-feedback" role="alert">{t("Conversation service unavailable. Your text has been kept.", "会话服务暂不可用，已保留输入内容。 ")}<button type="button" onClick={() => { if (saveError) void save(); else setReload(value => value + 1); }}>{t("Retry", "重试")}</button></p>}
    </div>
  </section>;
}
