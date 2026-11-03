import {PriceMonitorControl} from "@/components/price-monitor-control";
import {readFile} from "node:fs/promises";
import path from "node:path";
import Link from "next/link";
import {headers} from "next/headers";
import {notFound} from "next/navigation";
import {compareObservations,type Observation} from "@/lib/competitor-observations";
import "@/components/native-home.css";
import "@/components/native-explore.css";
import "@/components/explore-observation.css";
export const dynamic="force-dynamic";
export default async function Observations(){
 const hostname=(await headers()).get("host")?.split(":")[0];
 if(!["localhost","127.0.0.1"].includes(hostname||"")||process.env.VERCEL||process.env.STAYCRAFT_HOSTED)notFound();
 let history:Observation[]=[];
 try{history=JSON.parse(await readFile(path.join(process.cwd(),".price-monitor/history.json"),"utf8"));}catch(e){if((e as NodeJS.ErrnoException).code!=="ENOENT")throw e;}
 const sorted=[...history].sort((a,b)=>Date.parse(b.capturedAt)-Date.parse(a.capturedAt));
 const latest=sorted.filter((o,i)=>sorted.findIndex(v=>v.hotelId===o.hotelId&&v.stayDate===o.stayDate&&(v.authScope||"anonymous")===(o.authScope||"anonymous"))===i);
 const labels={observed:"已获取参考价",missing:"未获取",conflicting:"报价冲突",not_accepting:"页面提示不接受预订",login_required:"价格需要登录"};
 return <div className="native-shell"><main className="native-page observation-page"><header className="native-header"><span>探索 · 采集实验</span><Link href="/native-explore">返回原型</Link></header><h1 className="ob-title">真实参考价观察</h1><p className="ob-muted">浏览器公开日历的历史快照，不是实时房型报价。可在本机发起公开页面试采，尚未启用定时监测。</p>
 <PriceMonitorControl/>
 {!latest.length&&<p>还没有采集记录。</p>}
 {latest.map(o=>{const previous=sorted.find(v=>v.hotelId===o.hotelId&&v.stayDate===o.stayDate&&(v.authScope||"anonymous")===(o.authScope||"anonymous")&&Date.parse(v.capturedAt)<Date.parse(o.capturedAt));const change=compareObservations(o,previous);const lastGood=sorted.find(v=>v.hotelId===o.hotelId&&v.stayDate===o.stayDate&&(v.authScope||"anonymous")===(o.authScope||"anonymous")&&v.status==="observed"&&v.amount!==null);return <article className="native-card ob-review" key={o.hotelId+o.stayDate+(o.authScope||"anonymous")}><h2>{o.hotelName}</h2><p className="ob-muted">{o.authScope?.startsWith("member:")?"会员会话参考价（可能含账号优惠）":"未登录参考价"}</p><p>{o.stayDate} 入住 · 1 晚 · 1 间 · 2 成人</p><p className="ob-title">{o.amount===null?"—":`¥${o.amount}`} <small className="ob-tag">{labels[o.status]}</small></p><p className="ob-muted">{o.amount===null&&lastGood?`上次成功参考价 ¥${lastGood.amount}，采集于 ${new Date(lastGood.capturedAt).toLocaleString("zh-CN",{timeZone:"Asia/Shanghai"})}；本次未取得新价格。`:change===null?"暂无同口径历史可比":change===0?"与上一条同口径观察一致":`较上一条 ${change>0?"+":""}${change} 元`}</p><p className="ob-muted">采集于 {new Date(o.capturedAt).toLocaleString("zh-CN",{timeZone:"Asia/Shanghai"})}（北京时间）</p><a className="ob-link" href={o.sourceUrl} target="_blank" rel="noreferrer">查看携程来源 ↗</a><details><summary>查看观察记录</summary>{sorted.filter(v=>v.hotelId===o.hotelId&&v.stayDate===o.stayDate&&(v.authScope||"anonymous")===(o.authScope||"anonymous")).map((v,i)=><p className="ob-muted" key={i}>{v.capturedAt} · {v.amount===null?"—":`¥${v.amount}`} · {labels[v.status]}</p>)}</details></article>})}
 <p className="ob-muted">价格缺失不代表满房。未取得套餐、税费与具体房型条件，暂不用于判断本店房价位置。</p></main></div>;
}
