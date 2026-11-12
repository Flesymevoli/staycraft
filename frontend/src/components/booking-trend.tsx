"use client";
import {useEffect,useRef,useId} from 'react';
import type {BookingMetrics} from './booking-metrics';
import {bookingChartValues,chartMaximum,type BookingMetric} from '@/lib/booking-chart';
import './booking-trend.css';

// Lieflat F2 Hairline Line: calendar floor, daily dots, hollow weekends and separated peak labels.
const CUSTOM={BG:'#ffffff',TXT:'var(--chart-ink)',MUT:'var(--chart-muted)',GRID:'var(--chart-grid)',DATA:'var(--chart-blue)',HERO:'var(--chart-teal)',PEAK:'var(--chart-ink)',WEEKEND:'var(--chart-weekend, #ffdc32)'};
export function BookingTrend({data,metric,zh,selected,onSelect}:{data:BookingMetrics;metric:BookingMetric;zh:boolean;selected:number|null;onSelect:(value:number|null)=>void}){
 const areaId=useId();
 const t=(en:string,cn:string)=>zh?cn:en,values=bookingChartValues(data,metric),max=chartMaximum(values,metric),last=Math.max(0,values.length-1),span=Math.max(1,last);
 const title=metric==='occupancy'?t('Daily booked occupancy','每日预订占用率'):metric==='booking'?t('Daily booked room nights','每日已订间夜'):metric==='amount'?t('Daily booked amount','每日预订金额'):t('Daily average booked rate','每日平均预订房价');
 const summary=metric==='occupancy'?data.booked_pct:metric==='booking'?(data.historical_inventory_unknown?data.booked_order_room_nights??null:data.booked_room_nights):metric==='amount'?(data.amount_cents===undefined?null:data.amount_cents/100):(data.average_booked_rate_cents==null?null:data.average_booked_rate_cents/100);
 const format=(value:number|null|undefined)=>value==null?'—':metric==='occupancy'?`${value}%`:metric==='booking'?`${value} ${t('nights','间夜')}`:`¥${value.toLocaleString(zh?'zh-CN':'en-GB',{maximumFractionDigits:2})}`;
 const active=selected!==null&&selected>=0&&selected<values.length?selected:null;
 const point=active===null?null:data.daily[active],value=active===null?summary:values[active];
 const graph=useRef<SVGSVGElement>(null);
 useEffect(()=>{const node=graph.current;if(!node)return;const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){node.classList.add('is-revealed');observer.disconnect()}},{threshold:.15});observer.observe(node);return()=>observer.disconnect()},[metric,data.period_start,data.period_end]);
 const x=(index:number)=>values.length===1?246:44+index*404/span,base=214,y=(v:number)=>base-v/max*164;
 const segments:string[][]=[];let segment:string[]=[];
 values.forEach((v,i)=>{if(v===null){if(segment.length)segments.push(segment);segment=[]}else segment.push(`${x(i)} ${y(v)}`)});if(segment.length)segments.push(segment);
 const peaks:number[]=[];
 for(const i of values.map((_,i)=>i).filter(i=>values[i]!==null&&values[i]!>0).sort((a,b)=>values[b]!-values[a]!)){if(peaks.every(p=>Math.abs(x(p)-x(i))>=130))peaks.push(i);if(peaks.length===2)break;}
 const choose=(event:React.PointerEvent<SVGSVGElement>)=>{const svg=event.currentTarget,matrix=svg.getScreenCTM();if(!matrix)return;const cursor=svg.createSVGPoint();cursor.x=event.clientX;cursor.y=event.clientY;const local=cursor.matrixTransform(matrix.inverse());onSelect(Math.max(0,Math.min(last,Math.round((local.x-44)/404*last))))};
 const labels=[...new Set([0,Math.floor(last/2),last])];
 return <div className="staycraft-chart"><div className="booking-analysis-readout"><div><span className="chart-readout-label">{point?.date||t('Selected period','所选期间')}</span><strong>{format(value)}</strong></div><button className="inventory-text" type="button" onClick={()=>onSelect(null)}>{t('Period summary','期间汇总')}</button></div>
 {values.every(v=>v===null)?<p className="booking-chart-empty" role="note">{metric==='occupancy'?t('Historical inventory is unknown; no occupancy chart is shown.','历史房量未知，无法绘制占用率图。'):t('No daily values are available. Average rates need recorded order nights.','暂无可绘制的每日数值，平均房价需要有订单间夜。')}</p>:<div className="booking-analysis-chart"><svg ref={graph} key={`${metric}:${data.period_start}:${data.period_end}`} viewBox="0 0 480 254" role="img" aria-label={title} onPointerDown={event=>{event.currentTarget.setPointerCapture(event.pointerId);choose(event)}} onPointerMove={event=>{if(event.buttons)choose(event)}}>
 <title>{title}</title><desc>{t('One dot per day; yellow outlined dots are weekends. Gaps represent unavailable values.','每点代表一天，黄底描边点为周末，断点表示数值缺失。')}</desc>
 {[0,max/2,max].map(n=><g key={n}><line x1="44" x2="448" y1={y(n)} y2={y(n)} stroke={CUSTOM.GRID} strokeWidth="1" strokeDasharray={n===0?undefined:'3 5'}/><text x="34" y={y(n)+4} textAnchor="end" fontSize="11" fontWeight="500" fill={CUSTOM.MUT}>{metric==='amount'||metric==='adr'?n.toLocaleString('en',{notation:'compact',maximumFractionDigits:1}):n}</text></g>)}
 {values.map((_,i)=><line key={`tick-${i}`} x1={x(i)} x2={x(i)} y1={base} y2={base+7} stroke={CUSTOM.GRID} strokeWidth="1"/>)}
 {active!==null&&<line x1={x(active)} x2={x(active)} y1="32" y2={base} stroke={CUSTOM.HERO} strokeWidth="1" strokeDasharray="3 4"/>}
 <defs><linearGradient id={areaId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--chart-blue)" stopOpacity=".2"/><stop offset="100%" stopColor="var(--chart-blue)" stopOpacity=".015"/></linearGradient></defs>
 {segments.map((points,i)=><path key={i} className="desktop-booking-area" d={`M${points[0].split(" ")[0]} ${base} L${points.join(" L")} L${points.at(-1)!.split(" ")[0]} ${base} Z`} fill={`url(#${areaId})`}/>)}
 {segments.map((points,i)=><path className="chart-data-line" key={i} d={'M'+points.join(' L')} fill="none" stroke={CUSTOM.DATA} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" pathLength="1"/>)}
 {values.map((v,i)=>{if(v===null)return null;const weekend=[0,6].includes(new Date(data.daily[i].date+'T12:00:00Z').getUTCDay()),peak=peaks.includes(i),color=active===i?CUSTOM.HERO:peak?'var(--chart-point-peak, var(--chart-ink))':CUSTOM.DATA;return <g key={data.daily[i].date}>{active===i&&<circle cx={x(i)} cy={y(v)} r="9" fill={CUSTOM.BG} stroke={CUSTOM.HERO} strokeWidth="1"/>}<circle cx={x(i)} cy={y(v)} r={active===i?4.5:peak?4:2.8} fill={weekend&&active!==i?CUSTOM.WEEKEND:color} stroke={weekend&&active!==i?CUSTOM.DATA:color} strokeWidth={weekend&&active!==i?1:1.6}><title>{`${data.daily[i].date} · ${format(v)}`}</title></circle>{peak&&active===null&&<text x={x(i)} y={y(v)-14} textAnchor={i===0?'start':i===last?'end':'middle'} fontSize="12" fontWeight="700" fill={CUSTOM.PEAK} stroke={CUSTOM.BG} strokeWidth="4" paintOrder="stroke">{format(v)}</text>}</g>})}
 {labels.map(i=><text key={i} x={x(i)} y="244" textAnchor={i===0?'start':i===last?'end':'middle'} fontSize="11" fontWeight="500" fill={CUSTOM.MUT}>{data.daily[i]?.date.slice(5)}</text>)}
 </svg><div className="booking-chart-key"><span><i className="chart-dot"/>{t('Weekday','工作日')}<i className="chart-dot is-weekend"/>{t('Weekend','周末')}</span><span>{t('Drag to explore','拖动查看')}</span></div><input type="range" aria-label={t('Select booking chart date','选择预订图表日期')} aria-valuetext={point?`${point.date} ${format(value)}`:undefined} min={0} max={last} value={active??0} onChange={e=>onSelect(Number(e.target.value))}/></div>}
 <p className="booking-chart-caption">{active!==null&&value===null?t('No order nights on this date; average rate is unavailable, not zero.','该日没有订单间夜，均价缺失，不按零元显示。'):metric==='booking'?t('Counts follow the selected booking-period basis.','间夜按所选期间的订单口径统计。'):metric==='adr'?t('A gap means no daily average; it is not a zero-price stay.','断点表示当天无订单均价，不代表零元住宿。'):metric==='amount'?t('Order value allocated by stay night; not collected revenue.','订单金额按住宿间夜分摊，不代表实收。'):t('Current recorded bookings; not a forecast of final occupancy.','当前已记录预订，不是最终入住率预测。')}</p></div>;
}
