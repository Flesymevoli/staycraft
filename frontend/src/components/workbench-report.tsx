"use client";
import Link from 'next/link';
import type {DecisionAgentRun} from '@/lib/decision-agent-types';
import type {BookingMetrics} from './booking-metrics';
export function WorkbenchReport({run,metrics,zh}:{run:DecisionAgentRun|null;metrics:BookingMetrics|null;zh:boolean}){
 const revenue=run?.snapshots?.find(s=>s.evidence.kind==='revenue');
 const totals=revenue?.data.totals as {completed?:{amountCents:number;roomNights:number;averageRateCny:number|null}}|undefined;
 const money=(v:number|null|undefined)=>v==null?'—':'¥'+v.toLocaleString(zh?'zh-CN':'en-GB',{maximumFractionDigits:2});
 return <section className="wb-income-overview" aria-label={zh?'收入概况':'Revenue overview'}><div><span>{zh?'已完成住宿客房收入':'Completed room revenue'}</span><strong>{money(totals?.completed?.amountCents==null?null:totals.completed.amountCents/100)}</strong><small>{revenue?.evidence.period?`${revenue.evidence.period.start} — ${revenue.evidence.period.end}`:zh?'正在调查收入周期':'Investigating revenue period'}</small></div><div><span>{zh?'已售间夜':'Sold room nights'}</span><strong>{totals?.completed?.roomNights??'—'}</strong><small>{zh?'已完成住宿':'Completed stays'}</small></div><div><span>{zh?'平均成交房价':'Achieved room rate'}</span><strong>{money(totals?.completed?.averageRateCny)}</strong><small>{zh?'同一收入周期':'Same revenue period'}</small></div><div><span>{zh?'未来已订金额':'Future booked value'}</span><strong>{money((run?.metrics.amountCents??metrics?.amount_cents)==null?null:(run?.metrics.amountCents??metrics?.amount_cents??0)/100)}</strong><Link href="/app/analysis">{zh?'核对经营数据':'View business data'} →</Link></div></section>;
}
