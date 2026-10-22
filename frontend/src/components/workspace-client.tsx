"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight, ChartNoAxesCombined, Compass, MessageCircle, RefreshCw } from "lucide-react";
import "./native-home.css";
import "./workspace.css";
import { PropertyProfileEditor } from "./property-profile-editor";
import { HomeSchedulePreview, RoomPreviewBoard, RoomPreviewDetail, RoomTypesPreview } from "./room-preview";
import {WorkspaceBookings} from "./workspace-bookings";
import { useRoomPreview } from "./room-preview-store";
import {OperatorSampleContext} from "./operator-sample-context";

export type WorkspaceSection = "home" | "work" | "analysis" | "explore" | "mine";
export type WorkspaceConnection = { status: "unavailable" | "unassigned" } | { status: "linked"; propertyName: string;propertyId:string };
const sections = [
  { id: "home", en: "Home", zh: "首页", href: "/app", icon: "home-inactive", active: "home" },
  { id: "work", en: "Work", zh: "工作", href: "/app/work", icon: "work", active: "work-active" },
  { id: "analysis", en: "Analysis", zh: "分析", href: "/app/analysis", icon: "analysis", active: "analysis-active" },
  { id: "explore", en: "Explore", zh: "探索", href: "/app/explore", icon: "explore", active: "explore-active" },
  { id: "mine", en: "Mine", zh: "我的", href: "/app/mine", icon: "mine", active: "mine-active" },
] as const;

export function WorkspaceClient({ section, userId, roomId, email, connection, sample=false, signOutAction }: {
  section: WorkspaceSection; userId: string; roomId?: string; email: string; connection: WorkspaceConnection; sample?:boolean; signOutAction: () => Promise<void>;
}) {
  // Account pages do not use the prototype's shared sessionStorage or local APIs.
  const [zh, setZh] = useState(true);
  const roomPreview=useRoomPreview(userId);
  const roomCount=roomPreview.ready&&!roomPreview.unavailable?roomPreview.data.inventory.rooms.filter(room=>room.active).length:null;
  const [refreshing, startRefresh] = useTransition();
  const router = useRouter();
  const t = (en: string, cn: string) => zh ? cn : en;
  const current = sections.find(item => item.id === section)!;
  const toMine = <Link className="native-primary" href="/app/mine">{t("Set up property", "设置民宿资料")}<ArrowRight size={16} aria-hidden="true" /></Link>;
  const summaryLabels = section === "home" ? [t("Rooms", "客房"), t("Occupancy", "入住率")] : [t("Occupancy", "入住率"), t("Booking pace", "预订进度")];
  const metrics = <div className="workspace-metrics">{summaryLabels.map((label,index) => <div className="workspace-metric" key={label}><span>{label}</span><strong>{section==="home" && index===0 && roomCount!==null?roomCount:"—"}</strong><small>{section==="home" && index===0 && roomCount!==null?t("Saved active rooms","已保存 · 已启用客房"):t("Not connected yet", "尚未接入")}</small></div>)}</div>;

  return <OperatorSampleContext value={sample}><div className="native-shell workspace-shell">
    <main className={`native-page workspace-page${section === "home" ? " native-home-page" : ""}`}>
      <header className="native-header"><span className="native-kicker">{t(current.en.toUpperCase(), current.zh)}</span><button className="native-language" type="button" onClick={() => setZh(!zh)}>{zh ? "EN" : "中文"}</button></header>
      {sample&&<aside className="workspace-notice" aria-label={t("Fictional sample environment","虚构演示环境")}>{t("Fictional local sample · edits reset on restart · no cloud or AI requests","本机虚构演示 · 修改重启即还原 · 不连接云端或 AI")}</aside>}
      <h1>{roomId ? roomId==="new"?t("Add room","添加客房"):t("Room details","客房详情") : section === "home" ? t("Welcome.", "你好。") : section === "mine" && connection.status === "linked" ? connection.propertyName : t(current.en, current.zh)}</h1>
      <p className="workspace-intro">{roomId?t("Your room, at a glance.","查看和维护这间客房的信息。"):section === "home" ? t("A little clarity for your day.", "让经营的每一天，更清晰。") : section === "mine" ? t("The information your workspace works from.", "从你的民宿资料开始。") : t("Your property, in focus.", "关注你的民宿经营。")}</p>

      {!roomId && connection.status === "unavailable" && <div className="workspace-notice" role="status"><span>{t("Property details are unavailable. Please try again.", "暂时无法读取民宿资料，请稍后重试。")}</span><button type="button" disabled={refreshing} onClick={() => startRefresh(() => router.refresh())}><RefreshCw size={15} aria-hidden="true" />{refreshing ? t("Retrying…", "正在重试…") : t("Retry", "重试")}</button></div>}

      {roomId && <RoomPreviewDetail scope={userId} roomId={roomId} zh={zh}/>}
      {section === "home" && !roomId && <>
        <HomeSchedulePreview zh={zh}/>
        <section className="workspace-section"><h2>{t("Your stay at a glance", "经营一览")}</h2>{metrics}</section>
      </>}
      {section === "work" && !roomId && <><RoomPreviewBoard scope={userId} zh={zh}/><WorkspaceBookings zh={zh} propertyId={!sample&&connection.status==="linked"?connection.propertyId:undefined}/><section className="workspace-empty"><span className="workspace-symbol"><MessageCircle size={28} strokeWidth={1.4} aria-hidden="true" /></span><h2>{t("Ready for your first conversation.", "等待第一条客人消息。")}</h2><p>{t("Guest conversations and requests will appear here once connected. AI needs confirmed property information before it can help with replies.", "接入消息后，客人咨询和待办会出现在这里。AI 需要已确认的民宿资料，才能辅助回复。")}</p>{toMine}</section></>}
      {section === "analysis" && <>{metrics}<section className="workspace-empty"><span className="workspace-symbol"><ChartNoAxesCombined size={28} strokeWidth={1.4} aria-hidden="true" /></span><h2>{t("Your story starts with data.", "有了数据，才能看清经营。")}</h2><p>{t("Connect bookings to see trends, a plain-language summary and suggestions grounded in your property.", "接入订单后，这里会展示经营趋势、文字总结和有依据的建议。")}</p></section></>}
      {section === "explore" && <section className="workspace-empty"><span className="workspace-symbol"><Compass size={28} strokeWidth={1.4} aria-hidden="true" /></span><h2>{t("Discover what is around you.", "从民宿所在的位置开始。")}</h2><p>{t("Local demand and opportunities need a property location and reliable sources. There are no connected signals yet.", "周边需求和推广机会需要民宿位置及可靠的信息来源，目前尚未接入相关数据。")}</p>{toMine}</section>}
      {section === "mine" && <>
        <PropertyProfileEditor zh={zh} />
        <RoomTypesPreview scope={userId} zh={zh}/>
        <section className="workspace-account"><h2>{t("Account", "账号")}</h2><p>{email}</p><form action={signOutAction}><button className="workspace-signout" type="submit">{t("Sign out", "退出登录")}</button></form></section>
      </>}
    </main>
    <nav className="native-tabbar" aria-label={t("Main navigation", "主导航")}>{sections.map(item => <Link key={item.id} href={item.href} className={item.id === section ? "is-active" : ""} aria-current={item.id === section ? "page" : undefined}><Image src={`/figma-icons/${item.id === section ? item.active : item.icon}.svg`} width={24} height={24} alt="" /><span>{t(item.en, item.zh)}</span></Link>)}</nav>
  </div></OperatorSampleContext>;
}
