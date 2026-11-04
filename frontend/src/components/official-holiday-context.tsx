"use client";
import {officialHolidayReferences} from "@/lib/official-holidays";
import "./official-holiday-context.css";

export function OfficialHolidayContext({start,end,zh}:{start:string;end:string;zh:boolean}){
 const items=officialHolidayReferences(start,end,zh);
 if(!items.length)return null;
 return <div className="official-holiday-context"><h3>{zh?"公众假期":"Public holidays"}</h3>{items.map(item=><article key={item.start}><strong>{item.title}</strong><p>{item.start} — {item.end}</p></article>)}</div>;
}
