// Deterministic detectors: every number comes from the imported metrics/orders.
// A value that cannot be computed stays null; zero is never used as a placeholder.
import type {DetectorKind,DetectorSignal} from './types';
import type {DecisionAgentRun} from '../decision-agent-types';

export type DateWindow={start:string;end:string};
export type DailyMetric={date:string;booked:number;capacity:number|null;available:number|null;bookedPct:number|null;amountCents:number|null};
export type OrderSummary={arrival:string;status:string;totalCny?:number|null;source?:string|null};
export type DetectorInput={daily?:DailyMetric[];orders?:OrderSummary[];today:string;horizonDays?:number;window?:DateWindow;previousWindow?:DateWindow;paceBaseline?:DecisionAgentRun|null};

// One tuning surface for QA and later experiments.
export const THRESHOLDS={
 bookingPace:{horizonDays:14,horizonMin:7,horizonMax:14,dropPct:30,highDropPct:45},
 cancellationRate:{increasePp:10,ratePct:20,highRatePct:30,highIncreasePp:20,minOrders:5,highOrders:15},
 channelMix:{sharePct:70,shiftPp:25,highSharePct:85,highShiftPp:40,minOrders:5,highOrders:15},
 priceVolume:{changePct:5},
 gapWindow:{minNights:3,highNights:6}
} as const;

type Unit=DetectorSignal['metric']['unit'];
type BaselineKind=DetectorSignal['baseline']['kind'];
type Op=DetectorSignal['threshold']['op'];
type Level=DetectorSignal['severity'];
type Draft={kind:DetectorKind;window:DateWindow;suffix?:string;metricName:string;unit:Unit;value:number|null;baselineKind:BaselineKind;baselineValue:number|null;samples:number;threshold:{op:Op;value:number};severity:Level;confidence:Level;evidenceIds:string[];unknowns:string[]};

const DAY=86400000,DATE=/^\d{4}-\d{2}-\d{2}$/;
const parse=(date:string)=>Date.parse(date+'T00:00:00Z');
const iso=(time:number)=>new Date(time).toISOString().slice(0,10);
const addDays=(date:string,days:number)=>iso(parse(date)+days*DAY);
const validDate=(date:unknown):date is string=>typeof date==='string'&&DATE.test(date)&&Number.isFinite(parse(date))&&iso(parse(date))===date;
const validWindow=(window:DateWindow)=>validDate(window.start)&&validDate(window.end)&&window.start<=window.end;
const datesBetween=(start:string,end:string)=>{const out:string[]=[];if(!validDate(start)||!validDate(end))return out;for(let time=parse(start),last=parse(end);time<=last;time+=DAY)out.push(iso(time));return out;};
const round1=(n:number)=>Math.round(n*10)/10;
const round2=(n:number)=>Math.round(n*100)/100;
const unique=(values:string[])=>[...new Set(values)].sort();
const metricId=(date:string)=>`metrics:${date}`;
const bookingId=(window:DateWindow)=>`bookings:${window.start}:${window.end}`;
const evidenceOr=(fallback:string[],ids:string[])=>ids.length>0?ids:fallback;
const canceled=(status:string)=>/cancel|取消/i.test(status);
const sourceName=(order:OrderSummary)=>typeof order.source==='string'&&order.source.trim()?order.source.trim():null;

function makeSignal(input:Draft):DetectorSignal{
 return {id:`${input.kind}:${input.window.start}:${input.window.end}${input.suffix?':'+input.suffix:''}`,kind:input.kind,window:{...input.window},metric:{name:input.metricName,unit:input.unit,value:input.value},baseline:{kind:input.baselineKind,value:input.baselineValue,samples:input.samples},threshold:input.threshold,severity:input.severity,confidence:input.confidence,evidenceIds:unique(input.evidenceIds),unknowns:[...new Set(input.unknowns)]};
}

function horizonOf(value:number|undefined):number{
 const pace=THRESHOLDS.bookingPace;
 return value===undefined||!Number.isFinite(value)?pace.horizonDays:Math.min(pace.horizonMax,Math.max(pace.horizonMin,Math.trunc(value)));
}

function previousOf(window:DateWindow):DateWindow{
 const size=Math.max(1,datesBetween(window.start,window.end).length),end=addDays(window.start,-1);
 return {start:addDays(end,-(size-1)),end};
}

export function detectBookingPace(input:{daily:DailyMetric[];today:string;horizonDays?:number;previous?:DecisionAgentRun|null}):DetectorSignal[]{
 const pace=THRESHOLDS.bookingPace;
 const window={start:input.today,end:addDays(input.today,horizonOf(input.horizonDays)-1)};
 const dates=datesBetween(window.start,window.end);
 const referenceDay=addDays(input.today,-7);
 const prior=input.previous;
 const priorDates=dates.map(date=>addDays(date,-7));
 const evidenceIds=dates.map(metricId);
 const insufficient=(reason:string)=>[makeSignal({kind:'booking_pace',window,metricName:'booked_pct',unit:'pct',
  value:null,baselineKind:'same_lead_snapshot',baselineValue:null,samples:0,threshold:{op:'lt',value:pace.dropPct},
  severity:'low',confidence:'low',evidenceIds,unknowns:[reason]})];
 const capturedDay=prior&&Number.isFinite(Date.parse(prior.generatedAt))
  ?new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai'}).format(new Date(prior.generatedAt)):null;
 if(!prior||prior.status==='unavailable'||capturedDay!==referenceDay||prior.period.start!==priorDates[0]||prior.period.end!==priorDates.at(-1))
  return insufficient('缺少同星期、同提前量的预订快照');
 const daily=new Map(input.daily.map(row=>[row.date,row]));
 const historical=new Map(prior.dailyMetrics?.map(row=>[row.date,row]));
 let booked=0,previousBooked=0,capacity=0;
 for(const [index,date] of dates.entries()){
  const now=daily.get(date),before=historical.get(priorDates[index]);
  if(!now||!before||!now.capacity||now.capacity!==before.capacity||
   !Number.isInteger(now.booked)||now.booked<0||now.booked>now.capacity||
   !Number.isInteger(before.booked)||before.booked<0||before.booked>now.capacity)
   return insufficient('两个周期的逐日可售房量或已订间夜不完整、不可比');
  booked+=now.booked;
  previousBooked+=before.booked;
  capacity+=now.capacity;
 }
 if(previousBooked===0)return insufficient('可比快照没有已订间夜，无法计算相对下降幅度');
 const drop=(previousBooked-booked)/previousBooked*100;
 if(drop<pace.dropPct)return [];
 const baseline=previousBooked/capacity*100;
 return [makeSignal({kind:'booking_pace',window,metricName:'booked_pct',unit:'pct',value:round1(booked/capacity*100),
  baselineKind:'same_lead_snapshot',baselineValue:round1(baseline),samples:dates.length,
  threshold:{op:'lt',value:round1(baseline*(1-pace.dropPct/100))},
  severity:drop>=pace.highDropPct?'high':'medium',confidence:'medium',
  evidenceIds:[...evidenceIds,'diagnosis:'+prior.id],unknowns:['只比较一周前的快照，后续仍可能新增订单']})];
}

// Cancellations by arrival date against the prior window of the same length.
export function detectCancellationRate(input:{orders:OrderSummary[];window:DateWindow;previousWindow:DateWindow}):DetectorSignal[]{
 const limits=THRESHOLDS.cancellationRate,{window,previousWindow}=input,evidence=['bookings',bookingId(window),bookingId(previousWindow)];
 const nullSignal=(unknowns:string[],samples=0)=>makeSignal({kind:'cancellation_rate',window,metricName:'cancellation_rate',unit:'pct',value:null,baselineKind:'prior_period',baselineValue:null,samples,threshold:{op:'gt',value:limits.ratePct},severity:'low',confidence:'low',evidenceIds:evidence,unknowns});
 if(!validWindow(window)||!validWindow(previousWindow))return [nullSignal(['窗口起止无效，取消率无法计算'])];
 const tally=(target:DateWindow)=>{let total=0,canceledCount=0;for(const order of input.orders){if(!validDate(order.arrival)||order.arrival<target.start||order.arrival>target.end)continue;total++;if(canceled(order.status))canceledCount++;}return {total,canceledCount};};
 const current=tally(window),previous=tally(previousWindow);
 if(current.total===0)return [nullSignal(['窗口内没有订单，取消率无法计算'])];
 if(previous.total===0)return [nullSignal(['前一等长窗口没有订单，无法比较取消率'],previous.total)];
 const rate=round1(current.canceledCount/current.total*100),previousRate=round1(previous.canceledCount/previous.total*100),shift=round1(rate-previousRate);
 if(!(shift>limits.increasePp||rate>limits.ratePct))return [];
 const confidence:Level=Math.min(current.total,previous.total)>=limits.highOrders?'high':Math.min(current.total,previous.total)>=limits.minOrders?'medium':'low';
 let severity:Level='medium';
 if(confidence!=='low'&&(rate>=limits.highRatePct||shift>=limits.highIncreasePp))severity='high';
 const unknowns=['取消按到店日期归窗，实际取消日期与取消原因未知','状态字段为导入文本，可能含拼写差异'];
 if(confidence==='low')unknowns.push(`样本量较小（本窗口 ${current.total} 单，前窗口 ${previous.total} 单），结论仅作提示`);
 return [makeSignal({kind:'cancellation_rate',window,metricName:'cancellation_rate',unit:'pct',value:rate,baselineKind:'prior_period',baselineValue:previousRate,samples:previous.total,threshold:shift>limits.increasePp?{op:'gt',value:limits.increasePp}:{op:'gt',value:limits.ratePct},severity,confidence,evidenceIds:evidence,unknowns})];
}

// One channel taking most orders, or a large shift against the prior window.
export function detectChannelMix(input:{orders:OrderSummary[];window:DateWindow;previousWindow:DateWindow}):DetectorSignal[]{
 const limits=THRESHOLDS.channelMix,{window,previousWindow}=input,evidence=['bookings',bookingId(window),bookingId(previousWindow)];
 const nullSignal=(unknowns:string[],samples=0)=>makeSignal({kind:'channel_mix',window,metricName:'top_channel_share',unit:'pct',value:null,baselineKind:'prior_period',baselineValue:null,samples,threshold:{op:'gt',value:limits.sharePct},severity:'low',confidence:'low',evidenceIds:evidence,unknowns});
 if(!validWindow(window)||!validWindow(previousWindow))return [nullSignal(['窗口起止无效，渠道结构无法计算'])];
 const tally=(target:DateWindow)=>{const counts=new Map<string,number>();let known=0,missing=0;for(const order of input.orders){if(!validDate(order.arrival)||order.arrival<target.start||order.arrival>target.end)continue;const name=sourceName(order);if(!name){missing++;continue;}counts.set(name,(counts.get(name)??0)+1);known++;}return {counts,known,missing};};
 const current=tally(window),previous=tally(previousWindow);
 if(current.known===0)return [nullSignal(['窗口内订单缺少来源(source)字段，无法计算渠道占比'],previous.known)];
 const top=[...current.counts.entries()].sort((left,right)=>right[1]-left[1]||left[0].localeCompare(right[0]))[0];
 const share=round1(top[1]/current.known*100),previousShare=previous.known>0?round1((previous.counts.get(top[0])??0)/previous.known*100):null,shift=previousShare===null?null:round1(share-previousShare);
 const concentrated=share>limits.sharePct,shifted=shift!==null&&Math.abs(shift)>limits.shiftPp;
 if(!concentrated&&!shifted)return [];
 const confidence:Level=current.known>=limits.highOrders?'high':current.known>=limits.minOrders?'medium':'low';
 let severity:Level='medium';
 if(confidence!=='low'&&((concentrated&&share>=limits.highSharePct)||(shift!==null&&Math.abs(shift)>=limits.highShiftPp)))severity='high';
 const unknowns=['来源字段为自由文本，同一渠道的不同写法可能被拆分统计'];
 if(current.missing>0)unknowns.push(`窗口内 ${current.missing} 单缺少来源字段，未计入占比`);
 if(previous.known===0)unknowns.push('前一等长窗口没有可用来源，渠道变化无法比较');
 return [makeSignal({kind:'channel_mix',window,suffix:top[0],metricName:'top_channel_share',unit:'pct',value:share,baselineKind:'prior_period',baselineValue:previousShare,samples:previous.known,threshold:concentrated?{op:'gt',value:limits.sharePct}:{op:'outside',value:limits.shiftPp},severity,confidence,evidenceIds:evidence,unknowns})];
}

type PriceStats={nights:number;covered:number;revenue:number;observations:number;missing:number;dates:string[]};
const emptyStats=():PriceStats=>({nights:0,covered:0,revenue:0,observations:0,missing:0,dates:[]});

// Price and volume moving in opposite directions by at least 5% each.
export function detectPriceVolumeDivergence(input:{daily:DailyMetric[];window:DateWindow;previousWindow:DateWindow}):DetectorSignal[]{
 const limits=THRESHOLDS.priceVolume,{window,previousWindow}=input,map=new Map<string,DailyMetric>(input.daily.map(metric=>[metric.date,metric]));
 const stats=(target:DateWindow)=>{const result=emptyStats();for(const date of datesBetween(target.start,target.end)){const metric=map.get(date);if(!metric)continue;result.dates.push(date);result.nights+=metric.booked;if(metric.amountCents===null){if(metric.booked>0)result.missing++;continue;}result.revenue+=metric.amountCents;result.covered+=metric.booked;result.observations++;}return result;};
 const windowDates=datesBetween(window.start,window.end),allKnown=windowDates.map(metricId);
 const nullSignal=(unknowns:string[],samples=0)=>makeSignal({kind:'price_volume_divergence',window,metricName:'average_price',unit:'cny',value:null,baselineKind:'prior_period',baselineValue:null,samples,threshold:{op:'outside',value:limits.changePct},severity:'low',confidence:'low',evidenceIds:evidenceOr(['metrics'],allKnown),unknowns});
 if(!validWindow(window)||!validWindow(previousWindow))return [nullSignal(['窗口起止无效，量价无法比较'])];
 const current=stats(window),previous=stats(previousWindow);
 if(current.nights<=0)return [nullSignal(['窗口内没有已订间夜，量价无法比较'],previous.observations)];
 if(current.missing>0||current.covered<current.nights||current.revenue<=0)return [nullSignal(['窗口内有已订间夜缺少金额，均价无法确定'],current.observations)];
 if(previous.nights<=0)return [nullSignal(['前一等长窗口没有已订间夜，量价无法比较'],previous.observations)];
 if(previous.missing>0||previous.covered<previous.nights||previous.revenue<=0)return [nullSignal(['前一等长窗口有已订间夜缺少金额，均价无法确定'],previous.observations)];
 const average=current.revenue/current.covered/100,previousAverage=previous.revenue/previous.covered/100;
 const priceChange=(average-previousAverage)/previousAverage*100,nightChange=(current.nights-previous.nights)/previous.nights*100;
 if(!(priceChange*nightChange<0&&Math.abs(priceChange)>=limits.changePct&&Math.abs(nightChange)>=limits.changePct))return [];
 const confidence:Level=current.observations>=7&&previous.observations>=7?'high':'medium';
 let severity:Level='medium';
 if(Math.min(Math.abs(priceChange),Math.abs(nightChange))>=limits.changePct*2)severity='high';
 const evidence=unique([...current.dates.map(metricId),...previous.dates.map(metricId)]);
 const unknowns=['均价=窗口内订单总额/已订间夜，未扣除退款与平台佣金','间夜与金额按到店日期归窗，跨月订单可能被拆分统计'];
 const priceThreshold=priceChange>0?{op:'gt' as Op,value:round2(previousAverage*(1+limits.changePct/100))}:{op:'lt' as Op,value:round2(previousAverage*(1-limits.changePct/100))};
 const nightThreshold=nightChange>0?{op:'gt' as Op,value:Math.ceil(previous.nights*(1+limits.changePct/100))}:{op:'lt' as Op,value:Math.floor(previous.nights*(1-limits.changePct/100))};
 return [
  makeSignal({kind:'price_volume_divergence',window,suffix:'average_price',metricName:'average_price',unit:'cny',value:round2(average),baselineKind:'prior_period',baselineValue:round2(previousAverage),samples:previous.observations,threshold:priceThreshold,severity,confidence,evidenceIds:evidence,unknowns}),
  makeSignal({kind:'price_volume_divergence',window,suffix:'room_nights',metricName:'room_nights',unit:'room_nights',value:current.nights,baselineKind:'prior_period',baselineValue:previous.nights,samples:previous.observations,threshold:nightThreshold,severity,confidence,evidenceIds:evidence,unknowns})
 ];
}

// Consecutive nights that still have open availability inside the window.
export function detectGapWindow(input:{daily:DailyMetric[];window:DateWindow}):DetectorSignal[]{
 const limits=THRESHOLDS.gapWindow,{window}=input,windowDates=datesBetween(window.start,window.end),map=new Map<string,DailyMetric>(input.daily.map(metric=>[metric.date,metric]));
 const dayIds=windowDates.map(metricId);
 if(windowDates.length===0)return [makeSignal({kind:'gap_window',window,metricName:'consecutive_open_nights',unit:'count',value:null,baselineKind:'capacity_ratio',baselineValue:null,samples:0,threshold:{op:'gt',value:limits.minNights-1},severity:'low',confidence:'low',evidenceIds:['inventory'],unknowns:['窗口起止无效，无法判断空房窗口']})];
 const runs:{start:string;end:string;nights:number;dates:string[]}[]=[];
 let open:number|null=null;
 for(const date of windowDates){const metric=map.get(date),isOpen=!!metric&&metric.available!==null&&metric.available>0;if(isOpen){if(open!==null){const run=runs[open];run.end=date;run.nights++;run.dates.push(date);}else runs.push({start:date,end:date,nights:1,dates:[date]});open=runs.length-1;}else open=null;}
 const known=windowDates.filter(date=>{const metric=map.get(date);return !!metric&&metric.available!==null;}).length;
 if(known===0)return [makeSignal({kind:'gap_window',window,metricName:'consecutive_open_nights',unit:'count',value:null,baselineKind:'capacity_ratio',baselineValue:null,samples:0,threshold:{op:'gt',value:limits.minNights-1},severity:'low',confidence:'low',evidenceIds:evidenceOr(['inventory'],dayIds),unknowns:['窗口内缺少可售房量(available)数据，无法判断空房窗口']})];
 const signals:DetectorSignal[]=[];
 for(const run of runs){
  if(run.nights<limits.minNights)continue;
  const unknowns=['可售房量来自导入房态，可能滞后或未同步到所有渠道'];
  if(known<windowDates.length)unknowns.push(`窗口内有 ${windowDates.length-known} 天缺少可售房量数据，连续空房可能被截断`);
  signals.push(makeSignal({kind:'gap_window',window:{start:run.start,end:run.end},metricName:'consecutive_open_nights',unit:'count',value:run.nights,baselineKind:'capacity_ratio',baselineValue:null,samples:known,threshold:{op:'gt',value:limits.minNights-1},severity:run.nights>=limits.highNights?'high':'medium',confidence:known===windowDates.length?'high':'medium',evidenceIds:run.dates.map(metricId),unknowns}));
 }
 return signals;
}

// Runs every detector once. Missing windows fall back to the 14 finished days.
export function detectAll(input:DetectorInput):DetectorSignal[]{
 const daily=input.daily??[],orders=input.orders??[];
 const window=input.window??{start:addDays(input.today,-13),end:input.today};
 const previousWindow=input.previousWindow??previousOf(window);
 const future={start:input.today,end:addDays(input.today,horizonOf(input.horizonDays)-1)};
 return [
  ...detectBookingPace({daily,today:input.today,horizonDays:input.horizonDays,previous:input.paceBaseline}),
  ...detectGapWindow({daily,window:future}),
  ...detectCancellationRate({orders,window,previousWindow}),
  ...detectChannelMix({orders,window,previousWindow}),
  ...detectPriceVolumeDivergence({daily,window,previousWindow})
 ];
}
