"use client";
import {useTransition} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {Activity,ArrowUpRight,BarChart3,BedDouble,ChevronRight,Compass,LayoutDashboard,LogOut,PenLine,RefreshCw,Settings2,Sparkles} from "lucide-react";
import {useOperatorLanguage} from "./operator-language";
import {PropertyProfileEditor} from "./property-profile-editor";
import {HomeSchedulePreview,RoomPreviewBoard,RoomPreviewDetail,RoomTypesPreview} from "./room-preview";
import {WorkspaceBookings} from "./workspace-bookings";
import {BookingImport} from "./booking-import";
import {WorkspaceConversation} from "./cloud-conversations";
import {WorkUrgentTodos} from "./home-todos";
import {OperationActivity} from "./operation-activity";
import {WorkBookingInsight} from "./booking-insight";
import {WorkspaceAnalysis} from "./workspace-analysis";
import {OperatorSampleContext} from "./operator-sample-context";
import {WorkspaceExplore} from "./workspace-explore";
import {PromotionWorkspace} from "./promotion-workspace";
import {WorkbenchDashboard} from "./workbench-dashboard";
import type {WorkspaceSection,WorkspaceConnection} from "./workspace-client";
import "./native-home.css";
import "./workspace.css";
import "./workspace-theme.css";
import "./workbench.css";

const sections=[
 {id:"home",en:"Decision overview",zh:"决策总览",shortEn:"Overview",shortZh:"总览",href:"/app",Icon:LayoutDashboard},
 {id:"work",en:"Operations & data",zh:"运营数据",shortEn:"Operations",shortZh:"运营",href:"/app/work",Icon:BedDouble},
 {id:"analysis",en:"Business analytics",zh:"经营分析",shortEn:"Analytics",shortZh:"分析",href:"/app/analysis",Icon:BarChart3},
 {id:"explore",en:"Market intelligence",zh:"市场情报",shortEn:"Market",shortZh:"市场",href:"/app/explore",Icon:Compass},
 {id:"mine",en:"Property settings",zh:"民宿资料",shortEn:"Property",shortZh:"资料",href:"/app/mine",Icon:Settings2},
 {id:"promotion",en:"Promotion studio",zh:"推广文案",shortEn:"Promotion",shortZh:"推广",href:"/app/promotion",Icon:PenLine},
] as const;

export function WorkbenchShell({section,userId,roomId,bookingId,bookingHistory=false,threadId,email,connection,sample=false,signOutAction}:{section:WorkspaceSection;userId:string;roomId?:string;bookingId?:string;bookingHistory?:boolean;threadId?:string;email:string;connection:WorkspaceConnection;sample?:boolean;signOutAction:()=>Promise<void>}){
 const {language,setLanguage}=useOperatorLanguage(),zh=language==="zh",t=(en:string,cn:string)=>zh?cn:en;
 const [refreshing,startRefresh]=useTransition(),router=useRouter();
 const current=sections.find(item=>item.id===section)||sections[0];
 const propertyName=connection.status==="linked"?connection.propertyName:t("Your homestay","我的民宿");
 const demoLabel=sample||/虚构|演示/.test(propertyName);
 const heading=bookingHistory?t("Booking history","订单记录"):bookingId?t("Booking details","订单详情"):threadId?t("Guest conversation","客人会话"):roomId?roomId==="new"?t("Add a room","添加客房"):t("Room details","客房详情"):t(current.en,current.zh);
 const descriptions={home:t("Know what matters. Decide what to do next.","看清经营重点，做出下一步判断。"),work:t("Keep bookings, room status and incoming data in one place.","统一管理订单、房态与导入数据。"),analysis:t("Understand the numbers behind your decisions.","从预订分布与经营指标中发现变化。"),explore:t("Read real hotel quotes in their local context.","查看真实住宿报价，补全市场参照。"),mine:t("A reliable profile makes every analysis better.","维护民宿资料，让分析有准确的起点。"),promotion:t("Turn property details into copy worth reading.","把真实民宿特色，写成值得读的文案。")};
 const detail=Boolean(roomId||bookingId||threadId||bookingHistory);
 const date=new Intl.DateTimeFormat(zh?"zh-CN":"en-GB",{month:"short",day:"numeric",weekday:"short",timeZone:"Asia/Shanghai"}).format(new Date());
 const navLink=(item:typeof sections[number],compact=false)=><Link key={item.id} href={item.href} className={item.id===section?"is-active":""} aria-current={item.id===section?"page":undefined}><item.Icon size={compact?21:19} strokeWidth={1.8}/><span>{compact?t(item.shortEn,item.shortZh):t(item.en,item.zh)}</span>{!compact&&item.id===section&&<ChevronRight size={14}/>}</Link>;
 return <OperatorSampleContext value={sample}><div className="native-shell workspace-shell workbench-shell">
  <a className="workbench-skip" href="#workspace-main">{t("Skip to content","跳到主要内容")}</a>
  <aside className="workbench-sidebar" aria-label={t("Workspace navigation","工作台导航")}>
   <Link href="/app" className="workbench-brand"><span className="workbench-brand-mark"><Sparkles size={21}/></span><span><strong>StayCraft</strong><small>DECISION WORKBENCH</small></span></Link>
   <div className="workbench-property"><span className="workbench-property-icon"><BedDouble size={18}/></span><div><strong>{propertyName}</strong><small>{demoLabel?t("Fictional demo workspace","虚构演示工作区"):t("Homestay workspace","民宿经营工作区")}</small></div></div>
   <nav className="workbench-primary-nav" aria-label={t("Main navigation","主导航")}><p>{t("WORKSPACE","经营工作台")}</p>{sections.slice(0,4).map(item=>navLink(item))}</nav>
   <nav className="workbench-tools-nav" aria-label={t("Supporting tools","辅助工具")}><p>{t("TOOLS & SETTINGS","工具与设置")}</p>{sections.slice(4).map(item=>navLink(item))}</nav>
   <div className="workbench-sidebar-bottom"><div className="workbench-system-note"><span/><small>{t("Decisions stay in your hands","建议辅助判断，行动由你决定")}</small></div><Link href="/app/mine" className="workbench-user"><span>{(email||"S").slice(0,1).toUpperCase()}</span><div><strong>{t("Property owner","民宿经营者")}</strong><small>{email}</small></div><Settings2 size={16}/></Link></div>
  </aside>
  <main id="workspace-main" className={`native-page workspace-page workbench-page workspace-${section}`}>
   <div className="workbench-content">
    <header className="workbench-topbar"><div className="workbench-breadcrumb"><Link href="/app">StayCraft</Link><ChevronRight size={13}/><span>{t(current.en,current.zh)}</span></div><div className="workbench-top-actions"><span className="workbench-date">{date}</span><button type="button" className="native-language" aria-label={t("Change language","切换语言")} onClick={()=>setLanguage(zh?"en":"zh")}>{zh?"EN":"中文"}</button><Link href="/app/mine" className="workbench-mobile-avatar" aria-label={t("Property and account","民宿资料与账号")}>{(email||"S").slice(0,1).toUpperCase()}</Link></div></header>
    <div className="workbench-page-heading"><div><p className="workbench-eyebrow">{section==="home"?t("YOUR NEXT GOOD DECISION","每一次判断，都有依据"):t("STAYCRAFT WORKSPACE","STAYCRAFT 经营工作台")}</p><h1>{heading}</h1><p className="workbench-page-description">{detail?t("Review the details and keep records up to date.","查看详情，保持经营记录准确。"):descriptions[section]}</p></div>{!detail&&section!=="promotion"&&<Link href={section==="work"?"/app/bookings/history":"/app/promotion"} className="workbench-heading-link" aria-label={section==="work"?t("All bookings","全部订单"):t("Write promotion copy","创作推广文案")}>{section==="work"?<Activity size={16}/>:<PenLine size={16}/>}<span>{section==="work"?t("All bookings","全部订单"):t("Write promotion copy","创作推广文案")}</span><ArrowUpRight size={15}/></Link>}</div>
    {demoLabel&&<div className="workbench-demo-label"><span/>{t("Demo workspace · fictional operating data","演示工作区 · 虚构经营数据")}</div>}
    {!roomId&&connection.status==="unavailable"&&<div className="workspace-notice" role="status"><span>{t("Property details unavailable. Please retry.","暂时无法读取民宿资料，请重试。")}</span><button type="button" disabled={refreshing} onClick={()=>startRefresh(()=>router.refresh())}><RefreshCw size={15}/>{refreshing?t("Retrying…","正在重试…"):t("Retry","重试")}</button></div>}
    <div className="workbench-body">
     {roomId&&<RoomPreviewDetail scope={userId} roomId={roomId} zh={zh}/>}
     {section==="home"&&!roomId&&<><WorkbenchDashboard zh={zh} scope={userId}/><div className="workbench-daily-operations"><section className="workbench-day-panel"><div className="workbench-section-head"><div><span>{t("OPERATIONS","日常运营")}</span><h2>{t("Keep today running smoothly","把今天安排妥当")}</h2></div><Link href="/app/work">{t("View operations","进入运营")}<ArrowUpRight size={15}/></Link></div><HomeSchedulePreview zh={zh} scope={userId}/></section><aside className="workbench-activity-panel"><OperationActivity zh={zh} compact/></aside></div></>}
     {bookingHistory&&<WorkspaceBookings zh={zh} history/>}{bookingId&&<WorkspaceBookings zh={zh} bookingId={bookingId}/>}{threadId&&<WorkspaceConversation zh={zh} threadId={threadId}/>}
     {section==="work"&&!detail&&<><div className="workbench-operations-grid"><div className="workbench-room-column"><RoomPreviewBoard scope={userId} zh={zh}/><WorkUrgentTodos scope={userId} zh={zh}/></div><div className="workbench-import-column"><BookingImport key={userId} zh={zh}/><WorkBookingInsight scope={userId} zh={zh}/></div></div><WorkspaceBookings pendingOnly zh={zh}/><div id="operation-activity"><OperationActivity zh={zh}/></div></>}
     {section==="analysis"&&<WorkspaceAnalysis key={userId} scope={userId} zh={zh}/>}
     {section==="explore"&&<WorkspaceExplore key={userId} zh={zh}/>}
     {section==="promotion"&&<PromotionWorkspace key={userId} zh={zh}/>}
     {section==="mine"&&<div className="workbench-property-grid"><div><PropertyProfileEditor zh={zh}/><RoomTypesPreview scope={userId} zh={zh}/></div><aside><section className="workbench-info-panel"><span className="workbench-info-icon"><Activity size={20}/></span><h2>{t("Where data comes from","经营数据来源")}</h2><p>{t("Upload booking CSVs in Operations. Keep room types consistent and update snapshots for every channel you manage.","在运营数据中上传订单 CSV，保持房型名称一致，更新各个经营渠道的订单快照。")}</p><Link href="/api/workspace/booking-import" className="inventory-text">{t("Download CSV template","下载 CSV 模板")}<ArrowUpRight size={15}/></Link></section><section className="workspace-account workbench-info-panel"><h2>{t("Account","账号")}</h2><p>{email}</p><form action={signOutAction}><button className="workspace-signout" type="submit"><LogOut size={16}/>{t("Sign out","退出登录")}</button></form></section></aside></div>}
    </div>
    <footer className="workbench-footer"><span>StayCraft</span><small>{t("Clearer signals. Better decisions.","看清信息，让经营更有方向。")}</small></footer>
   </div>
  </main>
  <nav className="workbench-mobile-nav" aria-label={t("Mobile navigation","移动导航")}>{sections.slice(0,4).map(item=>navLink(item,true))}</nav>
 </div></OperatorSampleContext>;
}
