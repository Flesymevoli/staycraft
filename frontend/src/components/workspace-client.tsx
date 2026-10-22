"use client";

import { useTransition } from "react";
import Link from "next/link";
import {useOperatorLanguage} from "./operator-language";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight, Compass, RefreshCw } from "lucide-react";
import "./native-home.css";
import "./workspace.css";
import { PropertyProfileEditor } from "./property-profile-editor";
import { HomeSchedulePreview, RoomPreviewBoard, RoomPreviewDetail, RoomTypesPreview } from "./room-preview";
import {WorkspaceBookings} from "./workspace-bookings";
import {WorkspaceInbox,WorkspaceConversation} from "./cloud-conversations";
import {HomeBookingOverview,WorkspaceAnalysis} from "./workspace-analysis";
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

export function WorkspaceClient({ section, userId, roomId, bookingId, threadId, email, connection, sample=false, signOutAction }: {
  section: WorkspaceSection; userId: string; roomId?: string; bookingId?:string; threadId?:string; email: string; connection: WorkspaceConnection; sample?:boolean; signOutAction: () => Promise<void>;
}) {
  // Account pages do not use the prototype's shared sessionStorage or local APIs.
  const {language, setLanguage} = useOperatorLanguage();
  const zh = language === "zh";
  const [refreshing, startRefresh] = useTransition();
  const router = useRouter();
  const t = (en: string, cn: string) => zh ? cn : en;
  const current = sections.find(item => item.id === section)!;
  const toMine = <Link className="native-primary" href="/app/mine">{t("Set up property", "设置民宿资料")}<ArrowRight size={16} aria-hidden="true" /></Link>;


  return <OperatorSampleContext value={sample}><div className="native-shell workspace-shell">
    <main className={`native-page workspace-page workspace-${section}${section === "home" ? " native-home-page" : ""}`}>
      <header className="native-header"><div className="workspace-header-label"><span className="native-kicker">{t(current.en.toUpperCase(), current.zh)}</span>{sample&&<details className="workspace-sample" aria-label={t("Fictional sample environment","虚构演示环境")}><summary>{t("Demo", "演示")}</summary><aside>{t("Fictional local sample · edits reset on restart · no cloud or AI requests","本机虚构演示 · 修改重启即还原 · 不连接云端或 AI")}</aside></details>}</div><button className="native-language" type="button" onClick={() => setLanguage(zh ? "en" : "zh")}>{zh ? "EN" : "中文"}</button></header>
      <h1>{bookingId?t("Booking details","订单详情"):threadId?t("Guest conversation","客人会话"):roomId ? roomId==="new"?t("Add room","添加客房"):t("Room details","客房详情") : section === "home" ? t("Welcome.", "你好。") : section === "mine" && connection.status === "linked" ? connection.propertyName : t(current.en, current.zh)}</h1>
      <p className="workspace-intro">{bookingId||threadId?"":roomId?t("Your room, at a glance.","查看和维护这间客房的信息。"):section === "home" ? t("A little clarity for your day.", "让经营的每一天，更清晰。") : section === "mine" ? t("The information your workspace works from.", "从你的民宿资料开始。") : section === "analysis" ? t("Select a metric to view its details below", "点选指标，在下方查看详情") : section === "work" ? t("Rooms, bookings and guest conversations.", "客房、订单与客人消息。") : t("Discover opportunities around your stay.", "发现民宿周边的经营机会。")}</p>

      {!roomId && connection.status === "unavailable" && <div className="workspace-notice" role="status"><span>{t("Property details are unavailable. Please try again.", "暂时无法读取民宿资料，请稍后重试。")}</span><button type="button" disabled={refreshing} onClick={() => startRefresh(() => router.refresh())}><RefreshCw size={15} aria-hidden="true" />{refreshing ? t("Retrying…", "正在重试…") : t("Retry", "重试")}</button></div>}

      {roomId && <RoomPreviewDetail scope={userId} roomId={roomId} zh={zh}/>}
      {section === "home" && !roomId && <>
        <HomeSchedulePreview zh={zh} scope={userId}/>
        <HomeBookingOverview scope={userId} zh={zh}/>
      </>}
      {bookingId&&<WorkspaceBookings zh={zh} bookingId={bookingId}/>}{threadId&&<WorkspaceConversation zh={zh} threadId={threadId}/>}
      {section === "work" && !roomId && !bookingId && !threadId && <><RoomPreviewBoard scope={userId} zh={zh}/><WorkspaceBookings zh={zh} propertyId={!sample&&connection.status==="linked"?connection.propertyId:undefined}/><WorkspaceInbox zh={zh}/></>}
      {section === "analysis" && <WorkspaceAnalysis key={userId} scope={userId} zh={zh}/>}
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
