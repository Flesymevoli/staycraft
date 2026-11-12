"use client";
import {SegmentedControl} from "./segmented-control";
import {createContext,useContext,useEffect,useState,useTransition,type ReactNode} from "react";
import Link from "next/link";
import {usePathname,useRouter} from "next/navigation";
import {BarChart3,Compass,LayoutDashboard,LogOut,Megaphone,RefreshCw,UserRound} from "lucide-react";
import Image from "next/image";
import {useOperatorLanguage} from "./operator-language";
import {PropertyProfileEditor} from "./property-profile-editor";
import {RoomPreviewBoard,RoomPreviewDetail,RoomTypesPreview} from "./room-preview";
import {WorkspaceBookings} from "./workspace-bookings";
import {WorkspaceConversation} from "./cloud-conversations";
import {BusinessDataWorkspace} from "./business-data-workspace";
import {OperatorSampleContext} from "./operator-sample-context";
import {WorkspaceExplore} from "./workspace-explore";
import {PromotionWorkspace} from "./promotion-workspace";
import {WorkbenchDashboard} from "./workbench-dashboard";
import {useDesktopSurface} from "./desktop-surface";
import {DesktopCollectionHint} from "./desktop-collection-hint";
import {DesktopSearch} from "./desktop-search";
import {DesktopFirstRun} from "./desktop-first-run";
import {DEMO_PERIOD} from "@/lib/demo-period";
import {displayLoginIdentity} from "@/lib/login-identity";
import {GeminiPropertyWorkspace} from "./gemini-property-workspace";
import {WorkbenchDrawer} from "./workbench-drawer";
import {DesktopCollection} from "./desktop-collection";
import type {WorkspaceSection,WorkspaceConnection} from "./workspace-client";
import "./native-home.css";
import "./workspace.css";
import "./workspace-theme.css";
import "./workbench.css";
import "./workbench-surfaces.css";
import "./workbench-motion.css";
import "./workbench-desktop-theme.css";


const sections=[
 {id:"home",en:"Workbench",zh:"工作台",shortEn:"Home",shortZh:"工作台",href:"/app",Icon:LayoutDashboard},
 {id:"analysis",en:"Business data",zh:"经营数据",shortEn:"Data",shortZh:"经营数据",href:"/app/analysis",Icon:BarChart3},
 {id:"explore",en:"Market research",zh:"市场调研",shortEn:"Market",shortZh:"市场",href:"/app/explore",Icon:Compass},
 {id:"promotion",en:"Promotion plans",zh:"推广方案",shortEn:"Promotion",shortZh:"推广",href:"/app/promotion",Icon:Megaphone},
 {id:"mine",en:"My property",zh:"我的民宿",shortEn:"Mine",shortZh:"我的",href:"/app/mine",Icon:UserRound},
] as const;
type WorkspaceSession={
 userId:string;
 displayName?:string;
 email:string;
 connection:WorkspaceConnection;
 sample:boolean;
 demo:boolean;
 signOutAction:()=>Promise<void>;
};
const WorkspaceSessionContext=createContext<WorkspaceSession|null>(null);

export function WorkbenchShell({children,...session}:WorkspaceSession & {children:ReactNode}){
 const {email,connection,sample,demo}=session;
 const accountIdentity=displayLoginIdentity(email);
 const desktop = useDesktopSurface();
 const router=useRouter();
 const [collectionOpen,setCollectionOpen]=useState(false);
 const {language,setLanguage}=useOperatorLanguage(),zh=language==="zh",t=(en:string,cn:string)=>zh?cn:en;
 const pathname=usePathname();
 const activeSection=pathname==="/app"||pathname.startsWith("/app/reports/")?"home":
  sections.find(item=>item.href===pathname)?.id??"analysis";
 const pageSection=pathname==="/app/work"||/^\/app\/(bookings|rooms|messages)\//.test(pathname)?"work":activeSection;
 const propertyName=connection.status==="linked"?connection.propertyName:t("Your homestay","我的民宿");
 const demoLabel=demo||/虚构|演示/.test(propertyName);
 const navLink=(item:typeof sections[number],compact=false)=>{
  const active=item.id===activeSection;
  return <Link key={item.id} href={item.href} className={active?"is-active":""} aria-current={active?"page":undefined}
   data-nav-section={item.id}>
   {active&&<span className="workbench-nav-indicator" aria-hidden="true"/>}
   <item.Icon aria-hidden="true" size={compact?21:20} strokeWidth={1.7}/>
   <span>{compact?t(item.shortEn,item.shortZh):t(item.en,item.zh)}</span>
  </Link>;
 };
 return <WorkspaceSessionContext.Provider value={session}><OperatorSampleContext value={sample}><div className="native-shell workspace-shell workbench-shell" data-desktop-theme={desktop?"soft":undefined}>
  <a className="workbench-skip" href="#workspace-main">{t("Skip to content","跳到主要内容")}</a>
  <aside className="workbench-sidebar" aria-label={t("Workspace navigation","工作台导航")}>
   <Link href="/app" className="workbench-brand" aria-label="StayCraft"><Image src="/brand/staycraft-violet-yellow.png" width={210} height={70} alt="StayCraft" priority unoptimized/></Link>
   <nav className="workbench-primary-nav" data-workbench-nav aria-label={t("Main navigation","主导航")}>{desktop?<><span className="desktop-nav-label">{t("Operations","核心经营")}</span>{sections.slice(0,4).map(item=>navLink(item))}<span className="desktop-nav-label">{t("Settings","配置与资产")}</span>{navLink(sections[4])}</>:sections.map(item=>navLink(item))}</nav>
   {desktop&&<DesktopCollectionHint key={`${session.userId}:${connection.status==="linked"?connection.propertyId:"unassigned"}`} zh={zh} onOpen={()=>setCollectionOpen(true)}/>}
   <div className="workbench-sidebar-bottom"><Link href="/app/mine" className="workbench-user"><span><UserRound size={18}/></span><div><strong>{propertyName}</strong><small>{accountIdentity}</small></div></Link></div>
  </aside>
  <main id="workspace-main" className={`native-page workspace-page workbench-page workspace-${pageSection}`}>
   <div className="workbench-content">
    <header className="workbench-topbar">{desktop&&<DesktopSearch zh={zh}/>}<div className="workbench-property-heading"><strong title={propertyName}>{propertyName}</strong>{demoLabel&&<span className="workbench-demo-label" title={t("Fictional operating data","虚构经营数据")}>{t("Demo","演示")}</span>}{demo&&<small className="workbench-demo-period">{t("Demo period","演示周期")} <time>{DEMO_PERIOD.start}</time> — <time>{DEMO_PERIOD.end}</time></small>}</div><div className="workbench-top-actions"><button type="button" className="native-language" aria-label={t("Change language","切换语言")} onClick={()=>setLanguage(zh?"en":"zh")}>{zh?"EN":"中文"}</button><Link href="/app/mine" className="workbench-mobile-avatar" aria-label={t("Property and account","民宿资料与账号")}><UserRound size={20}/>{desktop&&<span className="desktop-account-name"><strong>{t("My account","我的账户")}</strong><small title={accountIdentity}>{accountIdentity}</small></span>}</Link></div></header>
    {children}
    <footer className="workbench-footer"><span>StayCraft</span><small>{t("Clearer signals. Better decisions.","看清信息，让经营更有方向。")}</small></footer>
   </div>
  </main>
  <nav className="workbench-mobile-nav" data-workbench-nav aria-label={t("Mobile navigation","移动导航")}>{sections.map(item=>navLink(item,true))}</nav>
  {collectionOpen&&<WorkbenchDrawer title={t("Live Nearby Collection","周边报价实时采集")} onClose={()=>setCollectionOpen(false)}><DesktopCollection zh={zh} demo={demo} expanded onSync={()=>router.refresh()}/></WorkbenchDrawer>}
 </div></OperatorSampleContext></WorkspaceSessionContext.Provider>;
}


export function WorkbenchPage({section,roomId,bookingId,bookingHistory=false,threadId}:{
 section:WorkspaceSection;
 roomId?:string;
 bookingId?:string;
 bookingHistory?:boolean;
 threadId?:string;
}){
 const desktop=useDesktopSurface();
 const session=useContext(WorkspaceSessionContext);
 if(!session)throw new Error("Workspace session is required");
 const {userId,email,connection,signOutAction,demo,sample,displayName}=session;
 const accountIdentity=displayLoginIdentity(email);
 const workspaceScope=`${userId}:${connection.status==="linked"?connection.propertyId:"unlinked"}`;
 const {language,setLanguage}=useOperatorLanguage(),zh=language==="zh",t=(en:string,cn:string)=>zh?cn:en;
 const router=useRouter(),[refreshing,startRefresh]=useTransition();
 const [mineTab,setMineTab]=useState<"profile"|"rooms"|"account">("profile");
 useEffect(()=>{
  const sync=()=>{if(window.location.hash==="#room-types")setMineTab("rooms")};
  const timer=setTimeout(sync,0);
  window.addEventListener("hashchange",sync);
  return()=>{clearTimeout(timer);window.removeEventListener("hashchange",sync)};
 },[]);
 const current=sections.find(item=>item.id===(section==="work"?"analysis":section))??sections[0];
 const propertyName=connection.status==="linked"?connection.propertyName:t("Your homestay","我的民宿");
 const heading=bookingHistory?t("Booking history","订单记录"):bookingId?t("Booking details","订单详情"):threadId?t("Guest conversation","客人会话"):roomId?roomId==="new"?t("Add a room","添加客房"):t("Room details","客房详情"):desktop&&!bookingHistory&&!bookingId&&!threadId&&!roomId?({home:t(`Hello, ${displayName||"host"}`,`你好，${displayName||"店主"}`),analysis:t("Business Data & Bookings","经营数据与订单核对"),work:t("Bookings & Import","订单与导入"),explore:t("Nearby Market Research","周边市场报价调研"),promotion:t("Promotion Split Studio","推广方案双栏工作台"),mine:t("My Property & Room Board","我的民宿与房态棋盘")}[section]):section==="mine"?t("My property","我的"):t(current.en,current.zh);
 const descriptions={home:t("Know what matters. Decide what to do next.","看清经营重点，做出下一步判断。"),work:t("Keep bookings, room status and incoming data in one place.","统一管理订单、房态与导入数据。"),analysis:t("Verify occupancy, room nights, allocated booking value & historical stay revenue.","按住宿日期核对占用率、间夜进度、分摊金额与历史住宿收入。"),explore:t("Compare same-date nearby hotel quotes, interquartile band & 7-day median.","比较同一入住日的周边酒店参考价、中间 50% 价带与七日中位数浮动。"),mine:t("Manage property profile, room type base rates & live housekeeping status.","维护民宿基础资料、房型挂牌价与清洁、入住状态。"),promotion:t("Pick local activities, weather and audiences; generate, edit and save your copy.","左栏挑选周边活动、天气与推荐客群线索，右栏生成、编辑并保存推广草稿。")};
 const detail=Boolean(roomId||bookingId||threadId||bookingHistory);
 return <>
    {!(desktop && section === "home" && !detail) && <div className="workbench-page-heading"><div><h1>{heading}</h1><p className="workbench-page-description">{detail?t("Review the details and keep records up to date.","查看详情，保持经营记录准确。"):descriptions[section]}</p></div>{desktop&&<div id="desktop-page-toolbar" className="desktop-page-toolbar"/>}</div>}
    {!roomId&&connection.status==="unavailable"&&<div className="workspace-notice" role="status"><span>{t("Property details unavailable. Please retry.","暂时无法读取民宿资料，请重试。")}</span><button type="button" disabled={refreshing} onClick={()=>startRefresh(()=>router.refresh())}><RefreshCw size={15}/>{refreshing?t("Retrying…","正在重试…"):t("Retry","重试")}</button></div>}
    <div className="workbench-body">
     {!demo&&!sample&&connection.status==="linked"&&<DesktopFirstRun
      key={userId+":"+connection.propertyId} scope={userId+":"+connection.propertyId}
      section={section} zh={zh} onRooms={()=>setMineTab("rooms")}/>}
     {roomId&&<RoomPreviewDetail scope={userId} roomId={roomId} zh={zh}/>}
     {section==="home"&&!roomId&&<WorkbenchDashboard key={`home:${workspaceScope}`} zh={zh} scope={workspaceScope} displayName={displayName}/>}
     {bookingHistory&&<WorkspaceBookings zh={zh} history/>}{bookingId&&<WorkspaceBookings zh={zh} bookingId={bookingId}/>}{threadId&&<WorkspaceConversation zh={zh} threadId={threadId}/>}
     {(section==="work"||section==="analysis")&&!detail&&<BusinessDataWorkspace key={`${userId}:${section}`} scope={userId} zh={zh} demo={demo} initialTab={section==="work"?"orders":"overview"}/>}
     {section==="explore"&&<WorkspaceExplore key={userId} zh={zh} demo={demo}/>}
     {section==="promotion"&&<PromotionWorkspace key={userId} zh={zh} demo={demo}/>}
     {section==="mine"&&desktop&&<GeminiPropertyWorkspace key={`property:${workspaceScope}`} scope={workspaceScope} zh={zh} readOnly={demo&&!sample} account={<section className="workspace-account workbench-info-panel"><h2>{t('Account settings','账户设置')}</h2><dl className="mine-account-details"><div><dt>{t('Account','登录账号')}</dt><dd>{accountIdentity}</dd></div><div><dt>{t('Property','关联民宿')}</dt><dd>{propertyName}</dd></div></dl><label className="mine-language">{t('Interface language','界面语言')}<select value={language} onChange={e=>setLanguage(e.target.value as 'zh'|'en')}><option value="zh">中文</option><option value="en">English</option></select></label>{!demo&&<form action={signOutAction}><button className="workspace-signout" type="submit"><LogOut size={16}/>{t('Sign out','退出登录')}</button></form>}</section>}/>}
     {section==="mine"&&!desktop&&<div className="mine-workspace">
      <SegmentedControl className="wb-segmented" label={t('Property settings','民宿设置分类')} value={mineTab} onChange={setMineTab}
       options={[{id:'profile',label:t('Property','民宿资料')},{id:'rooms',label:t('Rooms & rates','房型与价格')},{id:'account',label:t('Account','账户设置')}]}/>
      {demo&&!sample&&mineTab!=='account'&&<p>{t('The shared demo is read-only.','共享演示数据仅供查看。')}</p>}
      {mineTab==='profile'&&<div className="desktop-property-layout">{desktop&&<div className="desktop-property-rooms"><RoomPreviewBoard scope={userId} zh={zh}/></div>}<PropertyProfileEditor zh={zh} readOnly={demo&&!sample}/></div>}
      {mineTab==='rooms'&&<div className="mine-rooms"><RoomTypesPreview scope={userId} zh={zh}/><RoomPreviewBoard scope={userId} zh={zh}/></div>}
      {mineTab==='account'&&<section className="workspace-account workbench-info-panel"><h2>{t('Account settings','账户设置')}</h2><dl className="mine-account-details"><div><dt>{t('Account','登录账号')}</dt><dd>{accountIdentity}</dd></div><div><dt>{t('Property','关联民宿')}</dt><dd>{propertyName}</dd></div></dl><label className="mine-language">{t('Interface language','界面语言')}<select value={language} onChange={e=>setLanguage(e.target.value as 'zh'|'en')}><option value="zh">中文</option><option value="en">English</option></select></label>{!demo&&<form action={signOutAction}><button className="workspace-signout" type="submit"><LogOut size={16}/>{t('Sign out','退出登录')}</button></form>}</section>}
     </div>}
    </div>
 </>;
}
