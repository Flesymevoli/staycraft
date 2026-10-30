"use client";
import {holidayNotice,officialHolidayReferences} from "@/lib/official-holidays";
import "./official-holiday-context.css";

export function OfficialHolidayContext({start,end,zh,onUse}:{start:string;end:string;zh:boolean;onUse?:(reference:ReturnType<typeof officialHolidayReferences>[number])=>void}){
 const items=officialHolidayReferences(start,end,zh);
 if(!items.length)return null;
 return <div className="official-holiday-context"><h3>{zh?"官方假期参考 · 中国大陆":"Official holiday context · Mainland China"}</h3><p>{zh?"所选期间涉及以下公众假期。请核对是否适用于你的客源，不据此推断订单或涨价。":"These public holidays overlap your dates. Check their relevance to your guests; they do not establish bookings or a reason to raise prices."}</p>{items.map(item=><article key={item.start}><strong>{item.title}</strong><p>{item.start} — {item.end}</p>{onUse&&<button type="button" className="inventory-text" onClick={()=>onUse(item)}>{zh?"核对并添加线索":"Review and add reference"} →</button>}</article>)}<details><summary>{zh?"查看官方依据与覆盖范围":"Official source and coverage"}</summary><p>{zh?`依据国务院办公厅2026年节假日安排，发布于${holidayNotice.published}，核对于${holidayNotice.checkedOn}。仅覆盖已核实的2026年放假日期，不计算补班日、不外推其他年份。`:`State Council 2026 public holiday notice, published ${holidayNotice.published}, checked ${holidayNotice.checkedOn}. Covers verified 2026 holiday periods only; excludes substitute working days and other years.`}</p><a href={holidayNotice.url} target="_blank" rel="noopener noreferrer">{zh?"北京市政府转载的国务院通知":"State Council notice on the Beijing government website"} ↗</a></details></div>;
}
