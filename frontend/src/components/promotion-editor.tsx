"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

export function PromotionEditor({ language, channel, context }: {language: "en" | "zh";channel: string;context: string}) {
  const [content, setContent] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [busy, setBusy] = useState<"loading" | "generating" | "saving" | null>("loading");
  const [saved, setSaved] = useState(false);
  const [source, setSource] = useState("");
  const [error, setError] = useState(false);
  const t = (en: string, cn: string) => language === "zh" ? cn : en;
  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({language, channel, context});
    fetch("/api/local/promotion-draft?" + query, {signal: controller.signal}).then(async response => {
      if (!response.ok) throw new Error();
      const data = await response.json() as {content: string};
      setContent(data.content); setSaved(Boolean(data.content)); setEditorOpen(Boolean(data.content)); setBusy(null);
    }).catch(() => { if (!controller.signal.aborted) { setBusy(null); setError(true); } });
    return () => controller.abort();
  }, [language, channel, context]);
  async function generate() {
    setBusy("generating"); setError(false); setSaved(false);
    try {
      const response = await fetch("/api/local/promotion-generate", {method: "POST", headers: {"Content-Type":"application/json"},body:JSON.stringify({language, channel, context})});
      if (!response.ok) throw new Error();
      const result = await response.json() as {content: string;engine: string};
      setContent(result.content); setSource(result.engine); setEditorOpen(true);
    } catch { setError(true); }
    finally { setBusy(null); }
  }
  async function save() {
    setBusy("saving"); setError(false);
    try {
      const response = await fetch("/api/local/promotion-draft", {method: "PUT", headers: {"Content-Type":"application/json"},body:JSON.stringify({language, channel, context, content:content.trim()})});
      if (!response.ok) throw new Error();
      setSaved(true);
    } catch { setError(true); }
    finally { setBusy(null); }
  }
  return <>
    <button type="button" className="native-primary" disabled={Boolean(busy)} onClick={() => void generate()}>{busy === "generating" ? t("Generating…", "正在生成…") : t("Generate sample content", "生成示例文案")} <ArrowRight size={15}/></button>
    {busy === "loading" && <p className="explore-note" role="status">{t("Loading saved draft…", "正在读取已保存草稿…")}</p>}
    {error && <p className="explore-note" role="alert">{t("Draft service unavailable. Your current text is kept; try again.", "草稿服务暂不可用，当前文字已保留，请重试。")}</p>}
    {editorOpen && <div className="explore-promotion-editor">
      {source && <p>{source === "model_v1" ? t("AI draft · Review before use", "AI 草稿 · 请先审核") : t("Rules-based sample draft", "规则示例文案")}</p>}
      <label htmlFor="promotion-copy">{t("Edit your content", "编辑推广文案")}</label>
      <textarea id="promotion-copy" rows={9} maxLength={4000} disabled={Boolean(busy)} value={content} onChange={event => { setContent(event.target.value); setSaved(false); }}/>
      <button type="button" className="native-primary" disabled={!content.trim() || Boolean(busy)} onClick={() => void save()}>{busy === "saving" ? t("Saving…", "正在保存…") : t("Save draft", "保存草稿")}</button>
      {saved && <p role="status">{t("Draft saved on this computer. Not published.", "草稿已保存到本机，未发布。")}</p>}
    </div>}
  </>;
}
