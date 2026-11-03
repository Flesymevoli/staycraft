"use client";
import {useEffect,useState} from "react";
import {useRouter} from "next/navigation";
type Job={status:string;error?:string;finishedAt?:string;results?:{hotelId:string;name:string;status:string;error?:string;stage?:string}[]};
export function PriceMonitorControl({language="zh"}:{language?:"zh"|"en"}={}){
 const router=useRouter(),t=(en:string,cn:string)=>language==="zh"?cn:en;
 const [connection,setConnection]=useState({state:"not_opened",locked:false});
 const [job,setJob]=useState<Job>({status:"idle"}),[busy,setBusy]=useState(false),[notice,setNotice]=useState(""),[pollError,setPollError]=useState(false);
 useEffect(()=>{let active=true;async function load(){try{const r=await fetch("/api/local/price-monitor",{cache:"no-store"});if(!r.ok)throw Error();const next=await r.json();const c=await fetch("/api/local/price-monitor?view=connection",{cache:"no-store"});if(!c.ok)throw Error();const state=await c.json();if(active){setJob(next);setConnection(state);setPollError(false)}}catch{if(active)setPollError(true)}}void load();const timer=setInterval(()=>void load(),3000);return()=>{active=false;clearInterval(timer)}},[]);
 const labels:Record<string,string>={idle:t("Not started","尚未运行"),running:t("Collecting","正在采集"),succeeded:t("Collection complete","采集完成"),partial:t("Partly complete","部分成功"),failed:t("Collection failed","采集失败"),unavailable:t("Price unavailable","价格未获取")};
 const messages:Record<string,string>={login:t("Sign in in the dedicated window, then close it before collecting.","已请求打开专用窗口，请在那里登录；完成后关闭窗口再开始采集。"),locked:t("Close the sign-in window or wait for collection to finish.","请先关闭已有登录窗口或等待采集结束。"),window:t("Unable to open the sign-in window.","窗口暂时无法打开。"),cooldown:t("Wait five minutes after the last collection finishes.","请在上次采集结束 5 分钟后重试。"),start:t("Unable to start collection. Try again later.","暂时无法启动采集，请稍后再试。")};
 return <section className="native-card ob-review">
 <h2>{t("Update reference prices","更新参考价")}</h2>
 <p className="ob-muted">{t("Local pilot: two sample stays. Future stay dates remain fixed across runs; expired dates are replaced. Wait at least five minutes between runs. Login and verification barriers are recorded.","本机试采两家样本。同一住宿日期持续跟踪，日期过去后再补充新的观察日期；采集至少间隔 5 分钟。遇到验证或登录限制会保留异常状态。")}</p>
 <p className="ob-muted">{t("Sign in once in the dedicated window, then close it. The separate browser profile stays on this computer; it does not copy your sidebar browser session.","首次使用请在采集专用窗口登录。登录状态保存在本机独立浏览器目录，登录完成后关闭该窗口再采集；不会复制侧边浏览器的账号状态。")}</p>
 <button className="ob-link" disabled={busy||connection.locked||job.status==="running"} onClick={async()=>{setBusy(true);setNotice("");try{const r=await fetch("/api/local/price-monitor?action=login",{method:"POST"});setNotice(r.ok?"login":r.status===409?"locked":"window")}catch{setNotice("window")}finally{setBusy(false)}}}>{t("1. Sign in to Ctrip","1. 登录 / 重新登录携程")}</button>
 <p role="status" className="ob-muted">{connection.state==="failed"?t("The sign-in window could not open. Try again.","登录窗口打开失败，请重试。"):connection.locked&&["open","opening"].includes(connection.state)?t("Complete sign-in in the window, then close it to read prices.","请在专用窗口完成登录，关闭窗口后即可读取价格。"):connection.state==="closed"?t("Window closed. Read prices to check whether sign-in is valid.","登录窗口已关闭，可以读取价格。登录是否有效以实际读取结果为准。"):t("Saved sign-in can be reused. Reconnect only if Ctrip requests it.","已有登录状态可直接复用；携程要求登录时再重新登录。")}</p>
 <p role="status">{busy?t("Starting…","正在启动…"):labels[job.status]||job.status}</p>
 {job.error==="browser_unavailable"&&<p className="ob-warning" role="alert">{t("The local collection browser could not run. Previous prices are retained as history; this is not a sign-in failure.","本机采集浏览器未能运行。原价格保留为历史记录；这不代表需要重新登录。")}</p>}
 <button className="native-primary" disabled={busy||connection.locked||job.status==="running"} onClick={async()=>{setBusy(true);setNotice("");try{const r=await fetch("/api/local/price-monitor",{method:"POST"});if(!r.ok){setNotice(r.status===429?"cooldown":r.status===409?"locked":"start");return}setJob({status:"running"})}catch{setNotice("start")}finally{setBusy(false)}}}>{t("2. Read prices","2. 读取 / 重新读取价格")}</button>
 {notice&&<p role="alert">{messages[notice]}</p>}
 {pollError&&<p role="alert" className="ob-warning">{t("Unable to refresh task status. Last known status is shown.","任务状态暂时无法刷新，当前显示上次读取的状态。")}</p>}
 {job.results?.map(v=><p className="ob-muted" key={v.hotelId}>{v.name} · {labels[v.status]||v.status}{v.error?` · ${v.error==="login_required"?t("Sign-in required","携程要求登录"):v.error==="page_timeout"?v.stage==="calendar_ready"?t("Calendar did not open","日历未展开"):t("Page timed out","页面超时"):v.error==="verification_required"?t("Manual verification required","需要人工验证"):t("Read failed","读取失败")}`:""}</p>)}
 {job.finishedAt&&<button className="ob-link" onClick={()=>router.refresh()}>{t("3. Show saved results","3. 查看保存结果")}</button>}
 </section>;
}
