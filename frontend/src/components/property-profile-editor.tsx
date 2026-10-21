"use client";

import { useEffect, useRef, useState } from "react";
import { Upload, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { blankProfile, profileFields, validateProfile, type ImportCandidate, type PropertyProfile } from "@/lib/property-profile";
import "./property-profile.css";

type Preview = { filename: string; candidates: ImportCandidate[]; conflicts: string[]; excerpt: string };
export function PropertyProfileEditor({ zh }: { zh: boolean }) {
  const t = (en: string, cn: string) => zh ? cn : en;
  const router = useRouter();
  const [profile, setProfile] = useState<PropertyProfile>({ ...blankProfile });
  const [revision, setRevision] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "unavailable" | "unassigned">("loading");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"upload" | "save" | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [saved, setSaved] = useState(false);
  const [reload, setReload] = useState(0);
  const dirty = useRef(false);
  const uploadSequence = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/workspace/profile", { cache: "no-store", signal: controller.signal }).then(async response => {
      const body = await response.json();
      if (response.status === 401) { router.replace("/login"); return; }
      if (body.error === "property_not_linked") { setState("unassigned"); return; }
      if (!response.ok) throw new Error();
      const value = body.profile === null ? { ...blankProfile } : validateProfile(body.profile);
      if (!value) throw new Error();
      if (!dirty.current) { setProfile(value); setRevision(body.revision); }
      setState("ready");
    }).catch(() => { if (!controller.signal.aborted) setState("unavailable"); });
    return () => controller.abort();
  }, [router, reload]);
  const retry = () => { setState("loading"); setError(""); setReload(value => value + 1); };
  const edit = (key: keyof PropertyProfile, value: string) => {
    dirty.current = true; setProfile(current => ({ ...current, [key]: value })); setConfirmed(false); setSaved(false); setError("");
  };
  const importFile = async (file?: File) => {
    if (!file) return;
    const seq = ++uploadSequence.current;
    setBusy("upload"); setError(""); setPreview(null); setSelected([]);
    if (file.size > 2 * 1024 * 1024) { setError("file_too_large"); setBusy(null); return; }
    try {
      const data = new FormData(); data.set("file", file);
      const response = await fetch("/api/workspace/import", { method: "POST", body: data });
      const body = await response.json(); if (seq !== uploadSequence.current) return;
      if (!response.ok) { setError(body.error ?? "upload_failed"); return; }
      setPreview(body);
    } catch { setError("upload_failed"); }
    finally { if (seq === uploadSequence.current) setBusy(null); }
  };
  const applyPreview = () => {
    if (!preview) return;
    const next = { ...profile };
    for (const candidate of preview.candidates) if (selected.includes(candidate.key)) next[candidate.key] = candidate.value;
    dirty.current = true; setProfile(next); setPreview(null); setConfirmed(false); setSaved(false);
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); if (busy || state !== "ready" || !confirmed) return;
    const checked = validateProfile(profile); if (!checked) { setError("invalid_profile"); return; }
    setBusy("save"); setError(""); setSaved(false);
    try {
      const response = await fetch("/api/workspace/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profile: checked, revision, confirmed: true }) });
      const body = await response.json();
      if (!response.ok) { setError(body.error ?? "save_failed"); return; }
      const value = validateProfile(body.profile); if (!value || typeof body.revision !== "string") throw new Error();
      setProfile(value); setRevision(body.revision); dirty.current = false; setSaved(true); setConfirmed(false); router.refresh();
    } catch { setError("save_failed"); }
    finally { setBusy(null); }
  };
  const errorText = error === "file_too_large" ? t("Choose a file smaller than 2 MB.", "请选择小于 2 MB 的文件。") :
    error === "unsupported_file" ? t("Use PDF, DOCX, TXT or CSV.", "请使用 PDF、DOCX、TXT 或 CSV 文件。") :
    error === "invalid_profile" ? t("Check the property name, room count and time formats.", "请检查民宿名称、客房数量和时间格式。") :
    error === "profile_changed" ? t("These details changed elsewhere. Your edits are still here; reload before saving again.", "资料已在其他页面更新。你的输入仍保留，请刷新核对后再保存。") :
    error === "no_readable_text" ? t("No readable text was found. Use a text document or enter the details below.", "没有读取到文字。扫描件可改用文字文档，或在下方手动填写。") :
    error === "unreadable_file" || error === "too_many_pages" ? t("This file could not be read. Use a text PDF of up to 40 pages, a DOCX, or enter the details below.", "文件无法读取。请用 40 页以内的文字型 PDF、DOCX，或在下方手动填写。") :
    error.startsWith("save") || error.startsWith("property") ? t("Could not save. Your input is still here; please try again.", "保存未成功，输入内容已保留，请稍后重试。") :
    t("Could not read the file. Your existing input has not changed.", "暂时无法解析文件，已有输入没有改变。请重试。");

  return <section className="workspace-profile" aria-label={t("Property details and upload", "民宿资料与上传")}>
    <form onSubmit={save} className="profile-form">
      <h2>{t("Property information", "民宿资料")}</h2>
      {state === "loading" && <p role="status">{t("Loading saved information…", "正在读取已保存资料…")}</p>}
      {(state === "unavailable" || state === "unassigned") && <div className="profile-connection" role="status"><p>{state === "unassigned" ? t("Link a property before saving. You can prepare and review details here first.", "关联民宿后才能保存，现在可以先填写、上传并核对资料。") : t("Saving is not available yet. You can prepare and review details here without losing them.", "资料保存暂未接通，你可以先填写、上传并核对，当前输入会保留在此页面。")}</p><button type="button" onClick={retry} className="profile-text-button" disabled={!!busy}>{t("Retry connection", "重试连接")}</button></div>}
      {profileFields.filter(field=>field.key!=="roomCount").map(field => <label className="profile-field" key={field.key}><span>{field[zh ? "zh" : "en"]}{field.key === "name" ? " *" : ""}</span>{field.key === "notes" ? <textarea aria-label={field[zh ? "zh" : "en"]} value={profile[field.key]} maxLength={field.max} disabled={!!busy} onChange={event => edit(field.key, event.target.value)} rows={4} /> : <input value={profile[field.key]} required={field.key === "name"} maxLength={field.max} disabled={!!busy}  placeholder={field.key === "breakfast" ? "07:30–10:00" : field.key === "checkin" ? "15:00" : undefined} onChange={event => edit(field.key, event.target.value)} />}</label>)}
      <label className="profile-confirm"><input type="checkbox" checked={confirmed} disabled={!!busy} onChange={event => setConfirmed(event.target.checked)} /><span>{t("I have reviewed these details and confirm they are accurate.", "我已核对以上资料，确认内容准确。")}</span></label>
      {error && <p role="alert" className="profile-error">{errorText}</p>}
      {saved && <p role="status" className="profile-saved"><Check size={16} aria-hidden="true" />{t("Confirmed details saved.", "已保存确认后的资料。")}</p>}
      <button type="submit" className="native-primary" disabled={state !== "ready" || !!busy || !confirmed}>{busy === "save" ? t("Saving…", "正在保存…") : t("Confirm and save", "确认保存")}</button>
    </form>
    <details className="profile-document"><summary>{t("Fill from a document (optional)","从文档辅助填写（可选）")}</summary>
    <div className="profile-upload">
      <h2>{t("Start with your property details", "从民宿资料开始")}</h2>
      <p>{t("Upload a document, review the suggested fields, then confirm what to save. You can also type below.", "上传资料，核对识别出的字段，再确认保存。也可以直接在下方填写。")}</p>
      <label className={`native-primary${busy ? " is-disabled" : ""}`}><Upload size={16} aria-hidden="true" />{busy === "upload" ? t("Reading file…", "正在读取…") : t("Upload property document", "上传民宿资料")}
        <input type="file" accept=".pdf,.docx,.txt,.md,.csv" disabled={!!busy} onChange={event => { void importFile(event.target.files?.[0]); event.target.value = ""; }} aria-label={t("Upload property document", "上传民宿资料")} />
      </label>
      <small>{t("PDF · DOCX · TXT · CSV · up to 2 MB. Text extraction runs locally; no external model is used.", "PDF · DOCX · TXT · CSV · 最大 2 MB。本机解析，不调用外部模型。")}</small>
    </div>
    {preview && <div className="profile-preview"><h3>{t("Review before applying", "先核对，再填入")}</h3><p>{preview.filename}</p>
      {!preview.candidates.length && <p>{t("No labelled fields were found. Check the text below and fill the form manually.", "没有识别到带名称的字段，请参考原文手动填写。")}</p>}
      {preview.conflicts.length > 0 && <p>{t("Conflicting or oversized fields were skipped. Please check them manually.", "存在冲突或过长的字段，已跳过，请手动核对。")}</p>}
      {preview.candidates.map(candidate => <label className="profile-candidate" key={candidate.key}><input type="checkbox" checked={selected.includes(candidate.key)} onChange={event => setSelected(current => event.target.checked ? [...current, candidate.key] : current.filter(key => key !== candidate.key))} /><span><strong>{profileFields.find(field => field.key === candidate.key)?.[zh ? "zh" : "en"]}</strong><span>{candidate.value}</span><small>{t("Source: ", "原文：")}{candidate.source}</small></span></label>)}
      <details><summary>{t("View extracted text", "查看提取的原文")}</summary><pre>{preview.excerpt}</pre></details>
      <div className="profile-actions"><button type="button" className="native-primary" disabled={!selected.length} onClick={applyPreview}>{t("Apply selected fields", "填入所选字段")}</button><button type="button" className="profile-text-button" onClick={() => setPreview(null)}>{t("Cancel", "取消")}</button></div>
    </div>}
    </details>
  </section>;
}
