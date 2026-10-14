"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronRight, Check, X } from "lucide-react";
import { useDemoStorage } from "./demo-storage";
import "./native-home.css";
import "./native-mine.css";

type Language = "en" | "zh";
type Field = { id: string; label: [string,string]; value: [string,string]; section: number };
const initialFields: Field[] = [
  { id: "name", label: ["Property name","民宿名称"], value: ["Garden House","花园小屋"], section: 0 },
  { id: "location", label: ["Location","位置"], value: ["Lakeside village","湖畔村庄"], section: 0 },
  { id: "rooms", label: ["Number of rooms","房间数量"], value: ["10","10"], section: 0 },
  { id: "checkin", label: ["Check-in","入住时间"], value: ["2:00 PM","14:00"], section: 0 },
  { id: "checkout", label: ["Check-out","退房时间"], value: ["11:00 AM","11:00"], section: 0 },
  { id: "breakfast", label: ["Breakfast","早餐"], value: ["07:30–10:00","07:30–10:00"], section: 1 },
  { id: "parking", label: ["Parking","停车"], value: ["Free on-site","免费院内停车"], section: 1 },
  { id: "wifi", label: ["Wi-Fi","无线网络"], value: ["Available","提供"], section: 1 },
  { id: "pets", label: ["Pets","宠物"], value: ["Not allowed","不可携带"], section: 1 },
  { id: "rules", label: ["House rules","入住规则"], value: ["Quiet hours 10 PM–7 AM","安静时段 22:00–07:00"], section: 2 },
  { id: "arrival", label: ["Arrival instructions","抵达指引"], value: ["Shared before check-in","入住前发送"], section: 2 },
  { id: "questions", label: ["Common questions","常见问题"], value: ["3 saved answers","已保存 3 条回答"], section: 2 },
  { id: "style", label: ["Style","风格"], value: ["Quiet garden retreat","安静的花园休憩处"], section: 3 },
  { id: "features", label: ["Features","特色"], value: ["Garden and terrace","花园和露台"], section: 3 },
  { id: "nearby", label: ["Nearby attractions","附近景点"], value: ["Lakeside walking trail","湖畔步道"], section: 3 },
];
const headings: [string,string][] = [["Property","民宿信息"],["Facilities & services","设施与服务"],["Guest information","客人须知"],["About the property","关于民宿"]];

export function MineClient() {
  const [language,setLanguage] = useDemoStorage<Language>("language", "en");
  const [values,setValues] = useDemoStorage<Record<string,string>>("property", {});
  const [editing,setEditing] = useState<string|null>(null);
  const [draft,setDraft] = useState("");
  const [upload,setUpload] = useState<string|null>(null);
  const zh = language === "zh";
  const t = (en:string,cn:string) => zh ? cn : en;
  const valueOf = (field:Field) => values[field.id] ?? field.value[zh ? 1 : 0];
  const openEdit = (field:Field) => { setEditing(field.id); setDraft(valueOf(field)); };
  const saveEdit = (field:Field) => {
    const next = draft.trim();
    if (!next) return;
    if (field.id === "rooms" && (!Number.isInteger(Number(next)) || Number(next) < 1 || Number(next) > 999)) return;
    setValues(previous => ({ ...previous, [field.id]: next })); setEditing(null);
  };
  const tabs = [
    { label:["Home","首页"], icon:"home-inactive", href:"/native-home" },
    { label:["Work","工作"], icon:"work", href:"/native-work" },
    { label:["Analysis","分析"], icon:"analysis", href:"/native-analysis" },
    { label:["Explore","探索"], icon:"explore", href:"/native-explore" },
    { label:["Mine","我的"], icon:"mine-active", href:"/native-mine" },
  ];
  return <div className="native-shell"><div className="native-page native-mine-page">
    <header className="native-header"><span className="native-kicker">{t("MY HOMESTAY","我的民宿")}</span><button type="button" className="native-language" onClick={() => setLanguage(zh ? "en" : "zh")}>{zh ? "EN" : "中文"}</button></header>
    <div className="mine-property-image"><Image src="/images/garden-house-sample.webp" alt={t("Sample photo of a garden homestay","花园民宿示例照片")} fill sizes="(max-width: 480px) calc(100vw - 48px), 430px" priority className="mine-property-photo" /></div>
    <p className="mine-image-caption">{t("Illustrative property image","示意民宿图片")}</p>
    <h1>{values.name || t("Garden House","花园小屋")}</h1>
    <p className="mine-location">{values.location || t("Lakeside village","湖畔村庄")} · {t("Sample location","示例位置")}</p>
    <p className="mine-description">{t("The details your AI works from. Keep them clear, current and yours.","这些资料帮助 AI 理解你的民宿。请保持清楚、准确和最新。")}</p>
    {headings.map((heading,section) => <section className="mine-section" key={heading[0]}><h2>{heading[zh ? 1 : 0]}</h2><div className="mine-field-list">{initialFields.filter(field => field.section === section).map(field => <div className="mine-field" key={field.id}><span>{field.label[zh ? 1 : 0]}</span>{editing === field.id ? <form onSubmit={event => { event.preventDefault(); saveEdit(field); }}><input autoFocus value={draft} onChange={event => setDraft(event.target.value)} aria-label={field.label[zh ? 1 : 0]} type={field.id === "rooms" ? "number" : "text"} min={field.id === "rooms" ? 1 : undefined} /><button type="submit" aria-label={t("Save","保存")}><Check size={18}/></button><button type="button" onClick={() => setEditing(null)} aria-label={t("Cancel","取消")}><X size={18}/></button></form> : <><strong>{valueOf(field)}</strong><button type="button" onClick={() => openEdit(field)} aria-label={t("Edit "+field.label[0],"编辑"+field.label[1])}><ChevronRight size={18}/></button></>}</div>)}</div></section>)}
    <section className="mine-upload"><h2>{t("Keep information up to date","保持信息更新")}</h2><p>{t("Upload a property document and review each suggested change before it is saved.","上传民宿资料，并在保存前逐项审核建议的改动。")}</p><label className="native-primary">{t("Upload a file","上传文件")}<input type="file" accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg" onChange={event => setUpload(event.target.files?.[0]?.name || null)}/></label>{upload && <div className="mine-upload-preview" role="status"><strong>{upload}</strong><p>{t("Sample preview: no changes are saved automatically. Review each suggestion first.","示例预览：不会自动保存任何改动，请先逐项审核建议。")}</p><button type="button" onClick={() => setUpload(null)}>{t("Remove file","移除文件")}</button></div>}</section>
    <p className="mine-footer">{t("SAMPLE PROPERTY DETAILS · NO PLATFORM SYNC","示例民宿资料 · 未连接平台")}</p>
  </div><nav className="native-tabbar" aria-label={t("Main navigation","主导航")}>{tabs.map((tab,index) => <Link key={tab.href} href={tab.href} className={index === 4 ? "is-active" : ""} aria-current={index === 4 ? "page" : undefined}><Image src={"/figma-icons/"+tab.icon+".svg"} alt="" width={24} height={24}/><span>{tab.label[zh ? 1 : 0]}</span></Link>)}</nav></div>;
}



