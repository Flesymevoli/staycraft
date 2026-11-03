"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {ArrowRight,ChevronLeft,ChevronRight,RefreshCw} from "lucide-react";
import type {PriceWatch} from "@/lib/competitor-observations";
import {PriceMonitorControl} from "./price-monitor-control";

export function LivePriceWatch({language}:{language:"zh"|"en"}){
 const zh=language==="zh",t=(en:string,cn:string)=>zh?cn:en;
 const [data,setData]=useState<PriceWatch|null>(null),[error,setError]=useState(false),[version,setVersion]=useState(0),[date,setDate]=useState(""),[detail,setDetail]=useState<string|null>(null);
 useEffect(()=>{
  let active=true;const controller=new AbortController();
  async function load(){try{const r=await fetch("/api/local/price-monitor?view=observations",{cache:"no-store",signal:controller.signal});if(!r.ok)throw Error();const next=await r.json();if(!Array.isArray(next.rows)||!Array.isArray(next.dates))throw Error();if(active){setData(next);setError(false)}}catch{if(active)setError(true)}}
  void load();const timer=setInterval(()=>void load(),10000);
  return()=>{active=false;controller.abort();clearInterval(timer)};
 },[version]);
 const selected=data?.dates.includes(date)?date:data?.dates[0]||"";
 const rows=data?.rows.filter(r=>r.stayDate===selected)||[];
 const row=rows.find(r=>r.hotelId===detail);
 const prices=rows.filter(r=>r.amount!==null).map(r=>r.amount!);
 const stamp=(value:string|null)=>value?new Date(value).toLocaleString(zh?"zh-CN":"en-GB",{timeZone:"Asia/Shanghai",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"}):t("No observation", "尚无记录");
 const status=(value:string)=>({observed:t("Reference captured","已获取参考价"),stale:t("Update needed","记录已过期"),page_timeout:t("Collection timed out","本次采集超时"),login_required:t("Sign-in required","需要重新登录"),verification_required:t("Verification required","需要人工验证"),conflicting:t("Conflicting prices","报价冲突"),not_accepting:t("Not accepting bookings","页面提示不接受预订"),missing:t("No price retrieved","未获取价格")}[value]||t("No price retrieved","未获取价格"));
 if(!data)return <section className="ob-overview"><h1 className="ob-title">{t("Neighbourhood prices","周边价格观察")}</h1><p role="status" className="ob-muted">{error?t("Local price records are unavailable.","本机价格记录暂时无法读取。"):t("Loading saved observations…","正在读取已保存记录…")}</p>{error&&<button className="ob-link" onClick={()=>setVersion(v=>v+1)}>{t("Try again","重试")}</button>}</section>;
 return <>
  <section className="ob-overview">
   <div className="explore-section-head"><h1 className="ob-title">{t("Neighbourhood prices","周边价格观察")}</h1><span className="ob-platform">{t("Ctrip","携程")}</span></div>
   <p className="ob-muted">{t("Saved calendar references · Local pilot","真实日历参考价 · 本机试采")}</p>
   <div className="ob-period" role="group" aria-label={t("Stay date","入住日期")}>{data.dates.map(d=><button key={d} aria-pressed={d===selected} onClick={()=>{setDate(d);setDetail(null)}}>{d.slice(5).replace("-",".")}<span>{t("1 night · 1 room · 2 adults","1 晚 · 1 间 · 2 成人")}</span></button>)}</div>
   {!data.dates.length&&<p className="ob-muted">{t("No observations yet. Open collection controls below.","还没有采集记录，可在下方打开采集设置。")}</p>}
   <div className="ob-summary"><div><span>{t("Calendar reference range","日历参考价区间")}</span><strong>{prices.length?`¥${Math.min(...prices)}`:"—"}{prices.length>1&&<><small> — </small>¥{Math.max(...prices)}</>}</strong></div><div className="ob-missing"><b>{rows.length-prices.length}</b><span>{t("unavailable","家未获取新价")}</span></div></div>
   <p className="ob-muted">{t("Collection samples, not a confirmed competitive set. References may include membership discounts; room type and conditions are not aligned.","两家为采集样本，尚未确认可替代性。参考价可能含会员优惠，房型、早餐与退改条件尚未对齐。")}</p>
   <button className="ob-link" onClick={()=>setVersion(v=>v+1)}><RefreshCw size={15}/>{t("Refresh saved records","刷新已保存记录")}</button>
   {error&&<p className="ob-warning" role="alert">{t("Update failed. Showing earlier saved records.","刷新失败，当前显示之前读取的记录。")}</p>}
   {data.status==="running"&&<p role="status" className="ob-muted">{t("Collection is running; saved records update automatically.","正在采集，保存结果会自动更新。")}</p>}
  </section>
  {row?<article className="native-card ob-review">
   <button className="ob-link" onClick={()=>setDetail(null)}><ChevronLeft size={16}/>{t("Back to stays","返回住宿列表")}</button>
   <h2>{row.hotelName}</h2><p className="ob-muted">{row.stayDate} · {t("Calendar reference, not a room offer","日历参考价，并非房型套餐报价")}</p>
   <p className="ob-title">{row.amount===null?"—":`¥${row.amount}`}</p><p>{status(row.status)}</p>
   <dl><div><dt>{t("Account context","账号口径")}</dt><dd>{row.member?t("Member session","会员会话"):t("Signed out","未登录")}</dd></div><div><dt>{t("Observed (Beijing)","采集时间（北京时间）")}</dt><dd>{stamp(row.capturedAt)}</dd></div><div><dt>{t("Room type","房型")}</dt><dd>{t("Not retrieved","尚未获取")}</dd></div><div><dt>{t("Breakfast","早餐")}</dt><dd>{t("Not retrieved","尚未获取")}</dd></div><div><dt>{t("Cancellation","退改条件")}</dt><dd>{t("Not retrieved","尚未获取")}</dd></div><div><dt>{t("Taxes & fees","税费口径")}</dt><dd>{t("Not retrieved","尚未获取")}</dd></div></dl>
   <a className="ob-link" href={row.sourceUrl} target="_blank" rel="noreferrer">{t("Open Ctrip source","查看携程来源")} ↗</a>
   <h3>{t("Observation history","观察记录")}</h3>{row.history.length?row.history.map((h,i)=><p className="ob-muted" key={i}>{stamp(h.capturedAt)} · {h.amount===null?"—":`¥${h.amount}`} · {status(h.status)}</p>):<p className="ob-muted">{t("No saved observations","暂无保存记录")}</p>}
   <p className="ob-warning">{t("Room conditions have not been verified; this price cannot establish your own rate position.","未取得同口径房型条件，暂不用于判断本店价格高低。")}</p>
  </article>:<section className="ob-nearby"><div className="explore-section-head"><h2>{t("Observed stays","正在观察的住宿")}</h2><span className="ob-tag">{t("Pilot samples","采集样本")}</span></div>
   <div className="explore-stays">{rows.map((r,i)=><article className="ob-stay" key={r.hotelId}>
    <div className="ob-real-art" aria-hidden="true"><span>0{i+1}</span><span>{t("Hangzhou · Ctrip","杭州 · 携程")}</span></div>
    <div className="ob-stay-body"><h3>{r.hotelName}</h3><div className="ob-real-price"><strong>{r.amount===null?"—":`¥${r.amount}`}</strong><span className="ob-tag">{status(r.status)}</span></div>
    <p>{r.member?t("Member calendar reference","会员日历参考价"):t("Signed-out calendar reference","未登录日历参考价")}</p><p>{t("Observed","采集于")} {stamp(r.capturedAt)}</p>
    {r.lastGood&&<p>{t("Last successful reference","上次成功参考价")} ¥{r.lastGood.amount} · {stamp(r.lastGood.capturedAt)}</p>}
    <p>{r.change===null?t("No comparable earlier record","暂无同口径历史可比"):r.change===0?t("Unchanged from previous observation","与上次同口径观察一致"):`${t("Change","较上次")} ${r.change>0?"+":""}${r.change} ${t("CNY","元")}`}</p>
    <button onClick={()=>setDetail(r.hotelId)}>{t("Source & history","来源与记录")}<ChevronRight size={15}/></button></div>
   </article>)}</div>
  </section>}
  <section className="explore-price ob-price"><div className="explore-section-head"><h2>{t("Where your rate sits","你的房价位置")}</h2><span className="ob-tag">{t("Not comparable yet","待同口径核验")}</span></div><div className="ob-pending"><p>{t("Calendar prices help discover nearby options. Compare room type, breakfast and cancellation terms before making a rate decision.","日历价用于发现周边价格线索。还需核对房型、早餐和退改条件，才能与本店房价比较。")}</p></div></section>
  <details className="ob-collection"><summary>{t("Collection & sign-in controls","采集与登录设置")}</summary><PriceMonitorControl language={language}/><Link className="ob-link" href="/native-explore/observations">{t("All saved observations","查看全部采集记录")}<ArrowRight size={15}/></Link></details>
 </>;
}
