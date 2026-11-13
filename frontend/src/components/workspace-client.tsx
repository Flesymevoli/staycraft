"use client";

import { useTransition } from "react";
import Link from "next/link";
import {useOperatorLanguage} from "./operator-language";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import "./native-home.css";
import "./workspace.css";
import { PropertyProfileEditor } from "./property-profile-editor";
import { HomeSchedulePreview, RoomPreviewBoard, RoomPreviewDetail, RoomTypesPreview } from "./room-preview";
import {WorkspaceBookings} from "./workspace-bookings";
import {BookingImport} from "./booking-import";
import {WorkspaceConversation} from "./cloud-conversations";
import {WorkspaceAssistant} from "./workspace-assistant";
import {OperationActivity} from "./operation-activity";
import {WorkBookingInsight} from "./booking-insight";
import {WorkspaceAnalysis} from "./workspace-analysis";
import {OperatorSampleContext} from "./operator-sample-context";
import {WorkspaceExplore} from "./workspace-explore";
import "./workspace-theme.css";

export type WorkspaceSection = "home" | "work" | "analysis" | "explore" | "mine" | "promotion";
export type WorkspaceConnection = { status: "unavailable" | "unassigned" } | { status: "linked"; propertyName: string;propertyId:string };
const sections = [
  { id: "home", en: "Home", zh: "首页", href: "/app", icon: "home-inactive", active: "home" },
  { id: "work", en: "Work", zh: "工作", href: "/app/work", icon: "work", active: "work-active" },
  { id: "analysis", en: "Analysis", zh: "分析", href: "/app/analysis", icon: "analysis", active: "analysis-active" },
  { id: "explore", en: "Explore", zh: "探索", href: "/app/explore", icon: "explore", active: "explore-active" },
  { id: "mine", en: "Mine", zh: "我的", href: "/app/mine", icon: "mine", active: "mine-active" },
] as const;

export function LegacyWorkspaceClient({ section, userId, roomId, bookingId, bookingHistory=false, threadId, email, connection, sample=false, signOutAction }: {
  section: WorkspaceSection; userId: string; roomId?: string; bookingId?:string; bookingHistory?:boolean; threadId?:string; email: string; connection: WorkspaceConnection; sample?:boolean; signOutAction: () => Promise<void>;
}) {
  // Account pages do not use the prototype's shared sessionStorage or local APIs.
  const {language, setLanguage} = useOperatorLanguage();
  const zh = language === "zh";
  const [refreshing, startRefresh] = useTransition();
  const router = useRouter();
  const t = (en: string, cn: string) => zh ? cn : en;
  const current = sections.find(item => item.id === section)!;
  const compactHeading = section !== "home" && !roomId && !bookingId && !threadId && !bookingHistory;


  return <OperatorSampleContext value={sample}><div className="native-shell workspace-shell">
    <main className={`native-page workspace-page workspace-${section}${section === "home" ? " native-home-page" : ""}`}>
      <header className="native-header"><div className="workspace-header-label"><span className="native-kicker">{t(current.en.toUpperCase(), current.zh)}</span>{sample&&<details className="workspace-sample" aria-label={t("Fictional sample environment","虚构演示环境")}><summary>{t("Demo", "演示")}</summary><aside>{t("Fictional local sample · edits reset on restart · no cloud or AI requests","本机虚构演示 · 修改重启即还原 · 不连接云端或 AI")}</aside></details>}</div><button className="native-language" type="button" onClick={() => setLanguage(zh ? "en" : "zh")}>{zh ? "EN" : "中文"}</button></header>
      <h1 className={compactHeading?"workspace-sr-heading":undefined}>{bookingHistory?t("Booking history","历史订单"):bookingId?t("Booking details","订单详情"):threadId?t("Guest conversation","客人会话"):roomId ? roomId==="new"?t("Add room","添加客房"):t("Room details","客房详情") : section === "home" ? t("Welcome.", "你好。") : section === "mine" && connection.status === "linked" ? connection.propertyName : t(current.en, current.zh)}</h1>
      {!compactHeading&&<p className="workspace-intro">{bookingId||threadId||bookingHistory?"":roomId?t("Your room, at a glance.","查看和维护这间客房的信息。"):section === "home" ? t("A little clarity for your day.", "让经营的每一天，更清晰。") : section === "mine" ? t("The information your workspace works from.", "从你的民宿资料开始。") : section === "analysis" ? t("Select a metric to view its details below", "点选指标，在下方查看详情") : section === "work" ? t("Rooms, bookings and daily operations.", "客房、订单与日常运营。") : t("Discover opportunities around your stay.", "发现民宿周边的经营机会。")}</p>}

      {!roomId && connection.status === "unavailable" && <div className="workspace-notice" role="status"><span>{t("Property details are unavailable. Please try again.", "暂时无法读取民宿资料，请稍后重试。")}</span><button type="button" disabled={refreshing} onClick={() => startRefresh(() => router.refresh())}><RefreshCw size={15} aria-hidden="true" />{refreshing ? t("Retrying…", "正在重试…") : t("Retry", "重试")}</button></div>}

      {roomId && <RoomPreviewDetail scope={userId} roomId={roomId} zh={zh}/>}
      {section === "home" && !roomId && <>
        <WorkspaceAssistant zh={zh}/><HomeSchedulePreview zh={zh} scope={userId}/>
        <OperationActivity zh={zh} compact/>
      </>}
      {bookingHistory&&<WorkspaceBookings zh={zh} history/>}{bookingId&&<WorkspaceBookings zh={zh} bookingId={bookingId}/>}{threadId&&<WorkspaceConversation zh={zh} threadId={threadId}/>}
      {section === "work" && !roomId && !bookingId && !threadId && !bookingHistory && <><BookingImport key={userId} zh={zh}/><RoomPreviewBoard scope={userId} zh={zh}/><WorkspaceBookings pendingOnly zh={zh}/><WorkBookingInsight scope={userId} zh={zh}/><div id="operation-activity"><OperationActivity zh={zh}/></div></>}
      {section === "analysis" && <WorkspaceAnalysis key={userId} scope={userId} zh={zh}/>}
      {section === "explore" && <WorkspaceExplore key={userId} zh={zh}/>}
      {section === "mine" && <>
        <PropertyProfileEditor zh={zh} /><section className="workspace-section"><h2>{t("Data source","数据来源")}</h2><p>{t("Import one UTF-8 CSV template in Work. Channel coverage may be incomplete; room types must match your saved settings. The app does not synchronise OTA orders live.","在工作页导入固定 UTF-8 CSV 模板。渠道可能不完整，房型须匹配已保存设置；不是 OTA 实时同步。")}</p><a className="inventory-text" href="/api/workspace/booking-import">{t("Download booking template","下载订单模板")}</a></section>
        <RoomTypesPreview scope={userId} zh={zh}/>
        <section className="workspace-account"><h2>{t("Account", "账号")}</h2><p>{email}</p><form action={signOutAction}><button className="workspace-signout" type="submit">{t("Sign out", "退出登录")}</button></form></section>
      </>}
    </main>
    <nav className="native-tabbar" aria-label={t("Main navigation", "主导航")}>{sections.map(item => <Link key={item.id} href={item.href} className={item.id === section ? "is-active" : ""} aria-current={item.id === section ? "page" : undefined}><Image src={`/figma-icons/${item.id === section ? item.active : item.icon}.svg`} width={24} height={24} alt="" /><span>{t(item.en, item.zh)}</span></Link>)}</nav>
  </div></OperatorSampleContext>;
}
