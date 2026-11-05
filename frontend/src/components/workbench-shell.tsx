"use client";
import {useEffect,useState,useTransition} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
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
import type {WorkspaceSection,WorkspaceConnection} from "./workspace-client";
import "./native-home.css";
import "./workspace.css";
import "./workspace-theme.css";
import "./workbench.css";
import "./workbench-surfaces.css";
import "./workbench-motion.css";

const sections=[
 {id:"home",en:"Workbench",zh:"工作台",shortEn:"Home",shortZh:"工作台",href:"/app",Icon:LayoutDashboard},
 {id:"analysis",en:"Business data",zh:"经营数据",shortEn:"Data",shortZh:"经营数据",href:"/app/analysis",Icon:BarChart3},
 {id:"explore",en:"Market research",zh:"市场调研",shortEn:"Market",shortZh:"市场",href:"/app/explore",Icon:Compass},
 {id:"promotion",en:"Promotion plans",zh:"推广方案",shortEn:"Promotion",shortZh:"推广",href:"/app/promotion",Icon:Megaphone},
 {id:"mine",en:"My property",zh:"我的",shortEn:"Mine",shortZh:"我的",href:"/app/mine",Icon:UserRound},
] as const;

export function WorkbenchShell({section,userId,roomId,bookingId,bookingHistory=false,threadId,email,connection,sample=false,signOutAction}:{section:WorkspaceSection;userId:string;roomId?:string;bookingId?:string;bookingHistory?:boolean;threadId?:string;email:string;connection:WorkspaceConnection;sample?:boolean;signOutAction:()=>Promise<void>}){
 const {language,setLanguage}=useOperatorLanguage(),zh=language==="zh",t=(en:string,cn:string)=>zh?cn:en;
 const [refreshing,startRefresh]=useTransition(),router=useRouter();
 const [mineTab,setMineTab]=useState<"profile"|"rooms"|"account">("profile");
 useEffect(()=>{const sync=()=>{if(window.location.hash==='#room-types')setMineTab('rooms')};const timer=setTimeout(sync,0);window.addEventListener('hashchange',sync);return()=>{clearTimeout(timer);window.removeEventListener('hashchange',sync)}},[]);
 const activeSection=section==="work"?"analysis":section;
 const current=sections.find(item=>item.id===activeSection)||sections[0];
 const propertyName=connection.status==="linked"?connection.propertyName:t("Your homestay","我的民宿");
 const demoLabel=sample||/虚构|演示/.test(propertyName);
 const heading=bookingHistory?t("Booking history","订单记录"):bookingId?t("Booking details","订单详情"):threadId?t("Guest conversation","客人会话"):roomId?roomId==="new"?t("Add a room","添加客房"):t("Room details","客房详情"):section==="mine"?t("My property","我的"):t(current.en,current.zh);
 const descriptions={home:t("Know what matters. Decide what to do next.","看清经营重点，做出下一步判断。"),work:t("Keep bookings, room status and incoming data in one place.","统一管理订单、房态与导入数据。"),analysis:t("Understand the numbers behind your decisions.","从预订分布与经营指标中发现变化。"),explore:t("Read real hotel quotes in their local context.","查看真实住宿报价，补全市场参照。"),mine:t("A reliable profile makes every analysis better.","维护民宿资料，让分析有准确的起点。"),promotion:t("Turn property details into copy worth reading.","把真实民宿特色，写成值得读的文案。")};
 const detail=Boolean(roomId||bookingId||threadId||bookingHistory);
 const navLink=(item:typeof sections[number],compact=false)=><Link key={item.id} href={item.href} className={item.id===activeSection?"is-active":""} aria-current={item.id===activeSection?"page":undefined}><item.Icon aria-hidden="true" size={compact?21:20} strokeWidth={1.7}/><span>{compact?t(item.shortEn,item.shortZh):t(item.en,item.zh)}</span></Link>;
 return <OperatorSampleContext value={sample}><div className="native-shell workspace-shell workbench-shell">
  <a className="workbench-skip" href="#workspace-main">{t("Skip to content","跳到主要内容")}</a>
  <aside className="workbench-sidebar" aria-label={t("Workspace navigation","工作台导航")}>
   <Link href="/app" className="workbench-brand" aria-label="StayCraft"><Image src="/brand/staycraft-violet-yellow.png" width={210} height={70} alt="StayCraft" priority unoptimized/></Link>
   <nav className="workbench-primary-nav" aria-label={t("Main navigation","主导航")}>{sections.map(item=>navLink(item))}</nav>
   <div className="workbench-sidebar-bottom"><Link href="/app/mine" className="workbench-user"><span><UserRound size={18}/></span><div><strong>{propertyName}</strong><small>{email}</small></div></Link></div>
  </aside>
  <main id="workspace-main" className={`native-page workspace-page workbench-page workspace-${section}`}>
   <div className="workbench-content">
    <header className="workbench-topbar"><div className="workbench-property-heading"><strong>{propertyName}</strong>{demoLabel&&<span className="workbench-demo-label" title={t("Fictional operating data","虚构经营数据")}>{t("Demo","演示")}</span>}</div><div className="workbench-top-actions"><button type="button" className="native-language" aria-label={t("Change language","切换语言")} onClick={()=>setLanguage(zh?"en":"zh")}>{zh?"EN":"中文"}</button><Link href="/app/mine" className="workbench-mobile-avatar" aria-label={t("Property and account","民宿资料与账号")}><UserRound size={20}/></Link></div></header>
    <div className="workbench-page-heading"><div><h1>{heading}</h1><p className="workbench-page-description">{detail?t("Review the details and keep records up to date.","查看详情，保持经营记录准确。"):descriptions[section]}</p></div></div>
    {!roomId&&connection.status==="unavailable"&&<div className="workspace-notice" role="status"><span>{t("Property details unavailable. Please retry.","暂时无法读取民宿资料，请重试。")}</span><button type="button" disabled={refreshing} onClick={()=>startRefresh(()=>router.refresh())}><RefreshCw size={15}/>{refreshing?t("Retrying…","正在重试…"):t("Retry","重试")}</button></div>}
    <div className="workbench-body">
     {roomId&&<RoomPreviewDetail scope={userId} roomId={roomId} zh={zh}/>}
     {section==="home"&&!roomId&&<WorkbenchDashboard zh={zh} scope={userId}/>}
     {bookingHistory&&<WorkspaceBookings zh={zh} history/>}{bookingId&&<WorkspaceBookings zh={zh} bookingId={bookingId}/>}{threadId&&<WorkspaceConversation zh={zh} threadId={threadId}/>}
     {(section==="work"||section==="analysis")&&!detail&&<BusinessDataWorkspace key={`${userId}:${section}`} scope={userId} zh={zh} initialTab={section==="work"?"orders":"overview"}/>}
     {section==="explore"&&<WorkspaceExplore key={userId} zh={zh}/>}
     {section==="promotion"&&<PromotionWorkspace key={userId} zh={zh}/>}
     {section==="mine"&&<div className="mine-workspace">
      <div className="wb-segmented" role="group" aria-label={t('Property settings','民宿设置分类')}>{([{id:'profile',label:t('Property','民宿资料')},{id:'rooms',label:t('Rooms & rates','房型与价格')},{id:'account',label:t('Account','账户设置')}] as const).map(item=><button key={item.id} type="button" aria-pressed={mineTab===item.id} onClick={()=>setMineTab(item.id)}>{item.label}</button>)}</div>
      {mineTab==='profile'&&<PropertyProfileEditor zh={zh}/>}
      {mineTab==='rooms'&&<div className="mine-rooms"><RoomTypesPreview scope={userId} zh={zh}/><RoomPreviewBoard scope={userId} zh={zh}/></div>}
      {mineTab==='account'&&<section className="workspace-account workbench-info-panel"><h2>{t('Account settings','账户设置')}</h2><dl className="mine-account-details"><div><dt>{t('Signed-in email','登录邮箱')}</dt><dd>{email}</dd></div><div><dt>{t('Property','关联民宿')}</dt><dd>{propertyName}</dd></div></dl><label className="mine-language">{t('Interface language','界面语言')}<select value={language} onChange={e=>setLanguage(e.target.value as 'zh'|'en')}><option value="zh">中文</option><option value="en">English</option></select></label><form action={signOutAction}><button className="workspace-signout" type="submit"><LogOut size={16}/>{t('Sign out','退出登录')}</button></form></section>}
     </div>}
    </div>
    <footer className="workbench-footer"><span>StayCraft</span><small>{t("Clearer signals. Better decisions.","看清信息，让经营更有方向。")}</small></footer>
   </div>
  </main>
  <nav className="workbench-mobile-nav" aria-label={t("Mobile navigation","移动导航")}>{sections.map(item=>navLink(item,true))}</nav>
 </div></OperatorSampleContext>;
}
