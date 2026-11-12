// Turns deterministic signals into at most three operator opportunities.
// The model never decides kind, severity or numbers here; it only cites them.
import type {DetectorSignal,Opportunity,OpportunityAction} from './types';
import type {CompetitorAnchor,LocalEvent,WeatherDay} from '../signals/types';
import {channelLabel} from './labels';

export type OpportunityBundle={weather?:WeatherDay[];events?:LocalEvent[];anchors?:CompetitorAnchor[]};
export type OpportunityInput={signals:DetectorSignal[];bundle?:OpportunityBundle;now?:Date};
export type RenderedOpportunity={title:string;claim:string;coverage?:string};
type Attachments={weather:WeatherDay[];events:LocalEvent[];anchors:CompetitorAnchor[]};
type Level=DetectorSignal['severity'];

const RANK:Record<Level,number>={high:3,medium:2,low:1};
const KIND:Record<DetectorSignal['kind'],'risk'|'opportunity'>={booking_pace:'opportunity',gap_window:'opportunity',cancellation_rate:'risk',channel_mix:'risk',price_volume_divergence:'risk'};
const DAY=86400000;

export function localized(zh:string,en:string,useZh:boolean){return useZh?zh:en;}

const dayCount=(window:{start:string;end:string})=>{const span=Date.parse(window.end+'T00:00:00Z')-Date.parse(window.start+'T00:00:00Z');return Number.isFinite(span)&&span>=0?Math.round(span/DAY)+1:0;};
const pctText=(value:number)=>`${Math.round(value*10)/10}%`;
const moneyText=(value:number)=>`${Math.round(value*100)/100}`;
const signed=(value:number)=>`${value>=0?'+':''}${Math.round(value*10)/10}`;
const maxLevel=(basis:DetectorSignal[]):Level=>basis.reduce((level,signal)=>RANK[signal.severity]>RANK[level]?signal.severity:level,basis[0].severity);
const minLevel=(basis:DetectorSignal[]):Level=>basis.reduce((level,signal)=>RANK[signal.confidence]<RANK[level]?signal.confidence:level,basis[0].confidence);

function attach(window:{start:string;end:string},bundle?:OpportunityBundle):Attachments{
 return {
  weather:(bundle?.weather??[]).filter(day=>day.date>=window.start&&day.date<=window.end),
  events:(bundle?.events??[]).filter(event=>event.start<=window.end&&event.end>=window.start),
  anchors:(bundle?.anchors??[]).filter(anchor=>anchor.stayDate>=window.start&&anchor.stayDate<=window.end)
 };
}

function coverageText(basis:DetectorSignal[],attached:Attachments,zh:boolean):string{
 const window=basis[0].window,days=dayCount(window),confidence=minLevel(basis);
 const parts:string[]=[];
 if(attached.anchors.length)parts.push(zh?`同行报价 ${attached.anchors.length} 条`:`${attached.anchors.length} competitor quote(s)`);
 if(attached.events.length)parts.push(zh?`本地活动 ${attached.events.length} 条`:`${attached.events.length} local event(s)`);
 if(attached.weather.length)parts.push(zh?`天气 ${attached.weather.length} 天`:`${attached.weather.length} weather day(s)`);
 return zh
  ?`依据覆盖 ${window.start}—${window.end}（${days} 天），可信程度${{high:"较高",medium:"中等",low:"有限"}[confidence]}${parts.length?`，包含${parts.join("、")}`:""}。`
  :`Evidence covers ${window.start}—${window.end} (${days} days), with ${confidence} confidence${parts.length?`, including ${parts.join(", ")}`:""}.`;
}

function describe(basis:DetectorSignal[],attached:Attachments,zh:boolean):{title:string;claim:string;coverage:string}{
 const primary=basis[0],window=primary.window,days=dayCount(window),value=primary.metric.value,baseline=primary.baseline.value,samples=primary.baseline.samples;
 const missing=zh?primary.unknowns[0]??'缺少必要数据':'required data is missing';
 const coverage=coverageText(basis,attached,zh);
 if(primary.kind==='booking_pace'){
  if(value===null||!hasSupportedOpportunityBasis(basis))return {title:localized(`未来 ${days} 天预订进度待核对`,`Review booking pace for the next ${days} days`,zh),claim:localized(`预订进度暂无法判断：${missing}。补齐房量和上周同期预订记录后，即可比较这段入住日期的预订进展。`,`Booking pace cannot be judged yet: ${missing}. Add capacity and a same-lead-time snapshot before deciding whether pace is behind.`,zh),coverage};
  return {title:localized(`未来 ${days} 天预订偏慢，优先推广空房日期`,`Bookings for the next ${days} days trail the prior snapshot; promote open dates`,zh),claim:localized(`${window.start}—${window.end} 已订 ${pctText(value)}，上周同星期、同提前量为 ${baseline===null?'未知':pctText(baseline)}（可比 ${samples} 天）。建议围绕未订满的日期推出短住方案，并完善渠道展示。`,`${window.start}—${window.end} is ${pctText(value)} booked, compared with ${baseline===null?'an unavailable prior rate':pctText(baseline)} at the same lead time a week earlier (${samples} comparable days). Prepare a short-stay offer and refresh listings for the open dates.`,zh),coverage};
 }
 if(primary.kind==='gap_window'){
  if(value===null)return {title:localized('空房窗口暂不可判断','Open-room gap cannot be judged yet',zh),claim:localized(`空房窗口暂无法判断：${missing}。核对房量和已导入订单后，再选择推广日期。`,`Open-room gaps cannot be judged: ${missing}. Add availability data first.`,zh),coverage};
  return {title:localized(`连续 ${value} 晚仍有空房，优先安排短住推广`,`${value} consecutive nights remain open; prepare a short-stay offer`,zh),claim:localized(`${window.start}—${window.end} 连续 ${value} 晚仍可预订。建议围绕这段日期制定短住文案，同时核对渠道房态，承接新增预订。`,`${window.start}—${window.end} has availability for ${value} consecutive nights. Prepare short-stay copy for these dates and confirm channel inventory before promoting it.`,zh),coverage};
 }
 if(primary.kind==='cancellation_rate'){
  if(value===null)return {title:localized('取消率暂不可比','Cancellation rate cannot be compared yet',zh),claim:localized(`取消率暂无法判断：${missing}。先补齐窗口内订单与前窗口基线。`,`Cancellation rate cannot be judged: ${missing}. Add orders for the window and the prior-period baseline.`,zh),coverage};
  const shift=baseline===null?null:value-baseline;
  return {title:localized('取消订单值得关注，先核对退改原因','Review cancellations and refund terms',zh),claim:localized(`窗口内取消率 ${pctText(value)}${baseline===null?'':`（前窗口基线 ${pctText(baseline)}，${samples} 单）`}${shift===null?'':`，较前期变化 ${signed(shift)} 个百分点`}。建议按渠道核对取消原因和退改政策，再完善到店前沟通。`,`Cancellation rate in the window is ${pctText(value)}${baseline===null?'':` versus a prior baseline of ${pctText(baseline)} over ${samples} order(s)`}${shift===null?'':`, a change of ${signed(shift)} percentage points`}. Review cancellations by channel, check refund terms and improve pre-arrival communication.`,zh),coverage};
 }
 if(primary.kind==='channel_mix'){
  const channel=(primary.id.split(':').slice(3).join(':')||'top')||'top',channelText=channelLabel(channel,zh);
  if(value===null)return {title:localized('渠道结构暂不可比','Channel mix cannot be compared yet',zh),claim:localized(`渠道结构暂无法判断：${missing}。先补齐订单来源字段。`,`Channel mix cannot be judged: ${missing}. Add the order source field first.`,zh),coverage};
  const shift=baseline===null?null:value-baseline;
  return {title:localized(`${channelText} 占比 ${pctText(value)}，核对渠道结构`,`${channelText} accounts for ${pctText(value)}; review channel mix`,zh),claim:localized(`${channelText} 占本窗口已知来源订单 ${pctText(value)}${baseline===null?'':`（前窗口 ${pctText(baseline)}）`}${shift===null?'':`，变化 ${signed(shift)} 个百分点`}。建议先核对各渠道订单是否齐全，再比较曝光、房价与退改条件。`,`${channelText} takes ${pctText(value)} of orders with a known source${baseline===null?'':` (prior window ${pctText(baseline)})`}${shift===null?'':`, a change of ${signed(shift)} percentage points`}. Check that each channel is fully represented, then compare listing exposure, rates and refund terms.`,zh),coverage};
 }
 const price=basis.find(signal=>signal.metric.name==='average_price')??primary,nights=basis.find(signal=>signal.metric.name==='room_nights')??price;
 if(price.metric.value===null||nights.metric.value===null||price.baseline.value===null||nights.baseline.value===null||!hasSupportedOpportunityBasis(basis))return {title:localized('量价关系暂不可比','Price and volume cannot be compared yet',zh),claim:localized(`量价关系暂无法判断：${missing}。先补齐已订间夜与订单金额。`,`Price and volume cannot be judged: ${missing}. Add booked room nights and order amounts.`,zh),coverage};
 const priceChange=(price.metric.value-price.baseline.value)/price.baseline.value*100,nightChange=(nights.metric.value-nights.baseline.value)/nights.baseline.value*100;
 const note=priceChange>0?localized('建议核对高价房型的成交占比，再比较同日期同行报价，选择需要调整的房型和日期。','Review the share of higher-priced room types and comparable quotes for the same dates before choosing what to adjust.',zh):localized('建议核对新增间夜来自哪些房型和渠道，再评估优惠是否值得延续。','Identify which room types and channels contributed the additional nights before extending the offer.',zh);
 return {title:localized('预订均价与间夜走势不同，核对房型和渠道贡献','Booked rates and room nights moved apart; review room and channel mix',zh),claim:localized(`平均预订房价 ${moneyText(price.baseline.value)}→${moneyText(price.metric.value)} 元（${signed(priceChange)}%），间夜 ${nights.baseline.value}→${nights.metric.value}（${signed(nightChange)}%）。${note}`,`Average booked rate moved ${moneyText(price.baseline.value)}→${moneyText(price.metric.value)} CNY (${signed(priceChange)}%) while room nights moved ${nights.baseline.value}→${nights.metric.value} (${signed(nightChange)}%). ${note}`,zh),coverage};
}

function chooseActions(missing:boolean,attached:Attachments,kind:DetectorSignal['kind']):OpportunityAction[]{
 if(missing)return [{title:'核对订单与房量',target:'data'}];
 if(attached.anchors.length)return [{title:'查看同日期同行报价',target:'market'},
  ...(kind==='gap_window'?[{title:'制定短住推广文案',target:'promotion' as const}]:[])];
 if(kind==='gap_window')return [{title:'制定短住推广文案',target:'promotion'}];
 if(attached.events.length||attached.weather.length)return [{title:'结合周边线索制定推广文案',target:'promotion'}];
 return [{title:'查看经营明细',target:'diagnosis'}];
}

function toOpportunity(basis:DetectorSignal[],bundle:OpportunityBundle|undefined,now:Date|undefined):Opportunity{
 const primary=basis[0],attached=attach(primary.window,bundle),missing=basis.some(signal=>signal.metric.value===null||signal.confidence==='low'),description=describe(basis,attached,true);
 const unknowns=[...new Set(basis.flatMap(signal=>signal.unknowns))];
 if(attached.anchors.length===0&&attached.events.length===0&&attached.weather.length===0)unknowns.push('外部竞品、活动与天气信号未覆盖该窗口，结论仅基于内部订单与指标');
 if(now){const today=now.toISOString().slice(0,10);if(primary.window.end<today)unknowns.push('窗口已结束，该结论仅用于复盘');}
 const opportunity:Opportunity={id:`opp:${primary.kind}:${primary.window.start}:${primary.window.end}`,kind:KIND[primary.kind],title:description.title,window:{...primary.window},claim:description.claim,basis,actions:chooseActions(missing,attached,primary.kind),coverage:description.coverage,unknowns};
 if(attached.anchors.length)opportunity.anchors=attached.anchors;
 if(attached.events.length)opportunity.events=attached.events;
 if(attached.weather.length)opportunity.weather=attached.weather;
 return opportunity;
}

export function buildOpportunities(input:OpportunityInput):Opportunity[]{
 const signals=input.signals??[];
 if(signals.length===0)return [];
 const groups=new Map<string,DetectorSignal[]>();
 for(const signal of signals){const key=`${signal.kind}|${signal.window.start}|${signal.window.end}`;const group=groups.get(key);if(group)group.push(signal);else groups.set(key,[signal]);}
 const opportunities=[...groups.values()].map(basis=>toOpportunity(basis,input.bundle,input.now));
 return selectPriorityOpportunities(opportunities);
}

// Validate the evidence a claim requires, including older saved runs.
// Channel concentration and open-room gaps do not require a historical baseline.
export function hasSupportedOpportunityBasis(basis:readonly DetectorSignal[]):boolean{
 const primary=basis[0];
 if(!primary||basis.some(signal=>signal.kind!==primary.kind||signal.window.start!==primary.window.start||signal.window.end!==primary.window.end||
  signal.metric.value===null||!Number.isFinite(signal.metric.value)||
  (signal.baseline.value!==null&&!Number.isFinite(signal.baseline.value))))return false;
 if(primary.kind==='booking_pace')return basis.every(signal=>signal.baseline.value!==null&&signal.baseline.value>0);
 if(primary.kind==='price_volume_divergence'){
  const price=basis.find(signal=>signal.metric.name==='average_price'),nights=basis.find(signal=>signal.metric.name==='room_nights');
  return Boolean(price&&nights&&[price,nights].every(signal=>signal.metric.value!==null&&signal.metric.value>0&&signal.baseline.value!==null&&signal.baseline.value>0));
 }
 return true;
}

// Apply the same selection to new runs and stored runs shown on the overview.
// Missing-data signals stay in the run's evidence; they are not actionable cards.
export function selectPriorityOpportunities(items:readonly Opportunity[],limit=3):Opportunity[]{
 const count=Number.isFinite(limit)?Math.max(0,Math.trunc(limit)):3;
 if(count===0)return [];
 const ranked=items.filter(item=>hasSupportedOpportunityBasis(item.basis))
  .sort((left,right)=>RANK[maxLevel(right.basis)]-RANK[maxLevel(left.basis)]||left.window.start.localeCompare(right.window.start)||left.id.localeCompare(right.id));
 const families=new Set<DetectorSignal['kind']>();
 const unique=ranked.filter(item=>{const family=item.basis[0].kind;if(families.has(family))return false;families.add(family);return true;});
 const selected=new Set<Opportunity>();
 if(count>=2){
  for(const kind of ['risk','opportunity'] as const){const first=unique.find(item=>item.kind===kind);if(first)selected.add(first);}
 }
 for(const item of unique){if(selected.size>=count)break;selected.add(item);}
 // Return the original objects so saved-plan and promotion context remain intact.
 return unique.filter(item=>selected.has(item));
}

export function renderOpportunityText(opportunity:Opportunity,zh:boolean):RenderedOpportunity{
 if(opportunity.basis.length===0)return {title:opportunity.title,claim:opportunity.claim,coverage:opportunity.coverage};
 const attached={weather:opportunity.weather??[],events:opportunity.events??[],anchors:opportunity.anchors??[]};
 const description=describe(opportunity.basis,attached,zh);
 return {title:description.title||opportunity.title,claim:description.claim||opportunity.claim,coverage:description.coverage||opportunity.coverage};
}
