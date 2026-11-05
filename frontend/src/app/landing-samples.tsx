import { useState, type CSSProperties, type ReactNode } from "react";

type Props = { zh: boolean };
const week = [
  [1, 1, 0], [2, 0, 1], [0, 1, 1], [2, 1, 1], [2, 2, 1], [3, 2, 2], [1, 1, 2],
];
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const nights = week.map(sum);
const channels = [0, 1, 2].map(i => sum(week.map(day => day[i])));
const totalNights = sum(nights);
const quotes = [[300, 360, 400], [340, 420, 460], [280, 320, 380]];
// All three nightly quote sets are ordered from low to high.
const medians = quotes.map(day => day[1]);

function ChartFigure({ children, label }: { children: ReactNode; label: string }) {
  return <figure className="sample-panel" aria-label={label}>{children}</figure>;
}

export function DataSample({ zh }: Props) {
  const names = zh ? ["携程", "美团", "直订"] : ["Ctrip", "Meituan", "Direct"];
  const days = zh ? ["周一","周二","周三","周四","周五","周六","周日"] : ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  return <ChartFigure label={zh ? "预订与渠道演示图" : "Illustrative bookings by channel"}>
    <figcaption>{zh ? "演示数据 · 11 月 2–8 日" : "Sample data · Nov 2–8"}<strong>{zh ? "一周预订分布" : "A week of bookings"}</strong></figcaption>
    <p className="sample-stat"><b>{totalNights}</b> {zh ? "已订间夜" : "booked room nights"}</p>
    <ol className="week-plot">{week.map((values,i) =>
      <li key={i} aria-label={days[i] + " · " + nights[i] + (zh ? " 间夜，" : " room nights, ") + names.map((name,j) => name + " " + values[j]).join(", ")}>
        <div className="week-column" style={{height: `${nights[i] / Math.max(...nights) * 86}%`}}>
          <b>{nights[i]}</b><div className="week-stack" style={{"--bar-index": i} as CSSProperties}>{values.map((n,j) => n > 0 && <i key={j} data-channel={j} style={{flexGrow:n}}/>)}</div>
        </div><small>{days[i]}</small>
      </li>)}</ol>
    <div className="sample-composition"><h3>{zh ? "渠道贡献" : "Room nights by channel"}</h3>
      <div className="share-track" aria-hidden="true">{channels.map((n,i) => <i key={i} data-channel={i} style={{flexGrow:n}}/>)}</div>
      <ul className="channel-key">{names.map((name,i) => <li key={name}><i data-channel={i}/>{name} <b>{channels[i]}</b></li>)}</ul>
    </div>
  </ChartFigure>;
}

export function MarketSample({ zh }: Props) {
  const [selected,setSelected] = useState(1);
  const dates = zh ? ["周五", "周六", "周日"] : ["Fri", "Sat", "Sun"];
  const stays = zh ? ["河畔小院", "青瓦客舍", "桥边民宿"] : ["River Courtyard", "Tiled Guesthouse", "Bridge House"];
  const pricePosition = (price: number) => (price - 240) / (480 - 240);
  const points = medians.map((value,i) => [20 + i * 130, 68 - pricePosition(value) * 65]);
  return <ChartFigure label={zh ? "同日住宿报价演示图" : "Illustrative nightly quotes"}>
    <figcaption>{zh ? "虚构报价 · 同房型 · 每晚人民币" : "Sample quotes · Same room type · CNY per night"}<strong>{zh ? "周边住宿报价" : "Nearby room rates"}</strong></figcaption>
    <div className="market-summary"><div><h3>{zh ? "当日样本中位数" : "Daily sample median"}</h3><p aria-live="polite" className="sample-stat"><b>¥{medians[selected]}</b></p></div>
      <div className="median-trend"><svg viewBox="0 0 300 78" role="img" aria-label={dates.map((day,i)=>day+" ¥"+medians[i]).join(", ")}>
        <path className="median-line" d={"M"+points.map(p=>p.join(" ")).join(" L")} />
        {points.map(([x,y],i)=><circle key={i} cx={x} cy={y} r={i===selected ? 7 : 4} className={i===selected ? "selected" : ""}/>)}</svg>
        <div>{dates.map((day,i)=><span key={day}>{day} · {medians[i]}</span>)}</div></div>
    </div>
    <div className="quote-controls" role="group" aria-label={zh ? "选择入住日期" : "Choose stay date"}>
      {dates.map((day,i)=><button type="button" key={i} aria-pressed={selected===i} onClick={()=>setSelected(i)}>{day} {11}.{6+i}</button>)}</div>
    <ul className="quote-plot">{quotes[selected].map((price,i)=><li key={i}>
      <span>{stays[i]}</span><div className="quote-track" aria-hidden="true"><i style={{"--fraction":pricePosition(price)} as CSSProperties}/></div><b>¥{price}</b>
    </li>)}</ul>
    <p className="sample-footnote">{zh ? "三家民宿 · 标尺 ¥240–480 · 入住一晚" : "Three stays · Scale ¥240–480 · One night"}</p>
  </ChartFigure>;
}

export function DecisionSample({ zh }: Props) {
  return <figure className="sample-panel decision-sample"><figcaption>{zh ? "经营报告摘录 · 演示数据" : "Sample operating report"}<strong>{zh ? "先看周一和周三" : "Start with Monday and Wednesday"}</strong></figcaption>
    <p>{zh ? "这两天各订了 2 间夜，周六有 7 间夜。先核对平日的可订房间，再为喜欢安静小院的客人准备一份邀请。" : "Monday and Wednesday have 2 booked room nights each, compared with 7 on Saturday. Check weekday availability before preparing a courtyard stay invitation."}</p>
    <div className="draft-preview"><h3>{zh ? "平日推广草稿" : "Weekday promotion draft"}</h3><blockquote>{zh ? "把平日留给河边的小院。沿河散个步，回来在树荫下喝杯茶。" : "Spend a weekday by the water. Follow the canal, then settle into the courtyard for tea in the shade."}</blockquote></div>
  </figure>;
}
