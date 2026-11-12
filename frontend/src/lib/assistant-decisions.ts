import type {BookingMetrics} from "@/components/booking-metrics";
import type {Insight} from "./business-assistant";
import type {DecisionAgentRun} from "./decision-agent-types";
import {comparePlanProgress,type PlanProgress} from "./decisions/action-plan";
import type {LocalEvent} from "./signals/types";
import {countableQuote,hotelKey,marketDay} from "./market/quote-identity";
import type {Quote} from "./market/types";
import type {DecisionQuestionId} from "./assistant-suggestions";

type Order = {status: string; external_channel: string | null};
export type DecisionInputs = {
 metrics: BookingMetrics;
 today: string;
 orders?: Order[];
 events?: LocalEvent[];
 quotes?: Quote[];
 previous?: DecisionAgentRun | null;
 planRun?: DecisionAgentRun | null;
 followUp?: DecisionAgentRun | null;
 planProgress?: PlanProgress | null;
};
export type DecisionAnswer = Insight & {ready: boolean; source: string};
export const shanghaiDay = (date: Date) => new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Shanghai"}).format(date);
export const offsetDay = (date: string, days: number) => new Date(Date.parse(date) + days * 86400000).toISOString().slice(0,10);

export function evaluateDecision(id: DecisionQuestionId, input: DecisionInputs, zh: boolean): DecisionAnswer {
 const t = (en: string, cn: string) => zh ? cn : en;
 const {metrics, today} = input;
 const range = new URLSearchParams({start:metrics.period_start,end:metrics.period_end});
 const dataHref = "/app/analysis?" + range;
 const promotionHref = "/app/promotion?" + range;
 const marketHref = "/app/explore?" + range;
 const metricsSource = t("Recorded orders and room inventory", "已记录订单及房量") + (metrics.as_of ? " · " + metrics.as_of : "");
 const result = (title:string,evidence:string,action:string,href=dataHref,source=metricsSource,ready=true) =>
  ({id,title,evidence,action,href,source,ready});
 const open = metrics.daily.filter(day => day.date >= today && Number.isFinite(day.available) && day.available > 0)
  .sort((a,b) => b.available-a.available || a.date.localeCompare(b.date));
 const dates = (days: typeof open) => days.slice(0,3).map(day =>
  t(`${day.date}: ${day.available} rooms open`,`${day.date} 有 ${day.available} 间空房`)).join(t("; ","；"));

 switch(id){
  case "vacancy":
   if(!open.length) return result(t("No dates to prioritise yet","暂时没有可优先推广的日期"),
    t("The selected period has no upcoming dates with recorded vacancies.","所选周期没有记录到可售空房的未来日期。"),
    t("Select upcoming dates and check room availability.","选择未来日期并核对房量和订单。"),dataHref,metricsSource,false);
   return result(t("Promote the dates with the most availability first","优先推广空房最多的日期"),dates(open),
    t("Start with the first date and feature that specific stay date in your promotion.","先从排在首位的日期着手，在文案里写清可入住日期。"),promotionHref);
  case "pace": {
   const previous = input.previous;
   const sameLead = previous && Number.isFinite(Date.parse(previous.generatedAt)) && previous.status!=="unavailable"
    && shanghaiDay(new Date(previous.generatedAt)) === offsetDay(today,-7)
    && previous.period.start === offsetDay(metrics.period_start,-7)
    && previous.period.end === offsetDay(metrics.period_end,-7)
    && previous.metrics.bookedPct != null && metrics.booked_pct != null
    && metrics.capacity_room_nights>0 && previous.metrics.capacityRoomNights === metrics.capacity_room_nights
    && metrics.daily.length===7 && previous.dailyMetrics?.length===7
    && metrics.daily.every(day=>day.capacity>0&&previous.dailyMetrics?.some(old=>old.date===offsetDay(day.date,-7)&&old.capacity===day.capacity));
   if(metrics.period_days!==7 || metrics.period_start<today || metrics.historical_inventory_unknown || !sameLead)
    return result(t("Same-lead-time comparison unavailable","缺少同提前量的预订对比"),
     t("A seven-day upcoming stay window and last week's equivalent snapshot at the same lead time and capacity are needed.","需要选一段未来 7 天，并有上周提前天数、入住星期和房量相同的预订快照。"),
     t("Save comparable diagnoses weekly so booking progress can be compared.","每周保留同口径诊断，积累可比的进单记录。"),dataHref,metricsSource,false);
   const current = metrics.booked_pct!;
   const prior = previous.metrics.bookedPct!;
   const delta = Math.round((current-prior)*10)/10;
   return result(delta<0?t("Booking progress is behind last week","进单比上周慢"):delta>0?t("Booking progress is ahead of last week","进单比上周快"):t("Booking progress is level with last week","进单进度与上周持平"),
    t(`At the same lead time, ${current}% is booked versus ${prior}% last week (${delta} percentage points).`,`同一提前量下，本期已订 ${current}%，上周为 ${prior}%，相差 ${delta} 个百分点。`),
    delta<0?t("Check which dates and room types account for the shortfall before changing rates.","先找出落后的日期和房型，再考虑是否调整房价。"):t("Review individual dates before making changes across the whole week.","先看各日的预订分布，再决定是否调整整周策略。"),
    dataHref,metricsSource+" · "+previous.generatedAt);
  }
  case "channels": {
   const orders = input.orders?.filter(row => row.status === "confirmed");
   const known = orders?.filter(row => row.external_channel?.trim()) ?? [];
   if(!orders || known.length<5 || known.length!==orders.length)
    return result(t("More channel data is needed","渠道数据还不足以判断"),
     t("At least five active recorded orders with source channels are needed, without gaps or truncation.","至少需要 5 条有效订单，并为周期内纳入统计的订单补齐来源渠道。"),
     t("Import or complete orders with their source channel and status.","导入或补齐带来源渠道、订单状态的订单。"),dataHref,metricsSource,false);
   const counts = new Map<string,number>();
   for(const order of known){
    const channel = order.external_channel!.trim().toLowerCase();
    counts.set(channel,(counts.get(channel)??0)+1);
   }
   const [channel,count] = [...counts].sort((a,b)=>b[1]-a[1] || a[0].localeCompare(b[0]))[0];
   const share = Math.round(count/known.length*1000)/10;
   return result(share>=70?t("One channel supplies most recorded orders","记录中的订单集中在一个渠道"):t("Recorded orders are spread across channels","记录中的订单分布在多个渠道"),
    t(`${channel} contributed ${count} of ${known.length} recorded orders (${share}%). This covers imported and recorded channels.`,`${channel} 占已记录订单的 ${count}/${known.length} 单（${share}%），范围限于已记录的渠道。`),
    share>=70?t("Check whether other channels are missing from the import, then compare fees and cancellations before shifting effort.","先检查其他渠道是否漏导，再比较佣金和取消情况，决定是否分散推广。"):t("Review channel fees and cancellations before changing your channel mix.","调整渠道投入前，先比较佣金和取消情况。"));
  }
  case "events": {
   const event = input.events?.filter(event => event.verified && typeof event.distanceKm==="number")
    .map(event => ({event,days:open.filter(day=>day.date>=event.start && day.date<=event.end)}))
    .filter(match=>match.days.length)
    .sort((a,b)=>b.days[0].available-a.days[0].available || a.days[0].date.localeCompare(b.days[0].date))[0];
   if(!event)return result(t("No verified overlap with available rooms","暂未找到与空房重合的已核实活动"),
    t("A dated, sourced event within the property radius and open rooms on the same stay dates are needed.","需要民宿周边有日期、来源的已核实活动，以及同日可售房量。"),
    t("Check your property address, activity dates and room availability.","检查民宿地址、活动日期与可售房量。"),promotionHref,metricsSource,false);
   return result(t("Keep rooms ready for the overlapping dates","优先备好活动同期的空房"),
    `${event.event.title} · ${event.event.distanceKm} km · ${dates(event.days)}`,
    t("Check that the rooms can be booked and consider activity-related copy. Wait for booking pickup or comparable prices before raising rates.","确认这些房间能正常预订，可用活动做文案线索。等实际进单或可比报价提供依据后，再考虑涨价。"),
    promotionHref,`${metricsSource} · ${event.event.sourceUrl} · ${event.event.observedAt}`);
  }
  case "positioning": {
   const quotes = (input.quotes??[]).filter(quote=>quote && typeof quote.id==="string" && typeof quote.sourceName==="string"
    && Number.isFinite(Date.parse(quote.capturedAt)) && marketDay(quote.stayDate)
    && quote.stayDate>=today && quote.stayDate>=metrics.period_start && quote.stayDate<=metrics.period_end
    && quote.nights===1 && countableQuote(quote));
   const first = quotes.sort((a,b)=>a.stayDate.localeCompare(b.stayDate))[0];
   const context = first ? quotes.filter(quote=>quote.stayDate===first.stayDate && quote.adults===first.adults
    && quote.priceType===first.priceType && quote.source===first.source) : [];
   const source = first?.id.startsWith("demo-quote-") ? t("Fictional demo","虚构演示")
    : first?.source==="platform" ? t("Collected platform snapshot","平台采集快照") : t("Saved quote snapshot","已保存报价快照");
   return result(t("Comparable rates are missing","现有报价不足以判断房价高低"),
    first?t(`${first.stayDate}: ${new Set(context.map(hotelKey)).size} properties have recorded price references. Offer conditions are not matched to yours.`,`${first.stayDate} 有 ${new Set(context.map(hotelKey)).size} 家住宿的参考报价，尚未与本店匹配房型及条款。`)
     :t("There is no usable quote snapshot for upcoming dates in this period.","所选周期的未来日期暂无可用报价快照。"),
    t("Compare the same date, room class, guest count, breakfast, refund and tax terms before changing rates.","先对齐入住日、房型、人数、早餐、取消和含税口径，再判断要不要调价。"),
    marketHref,first?`${source} · ${first.capturedAt}`:metricsSource,false);
  }
  case "progress": {
   const plan = input.planRun?.actionPlan;
   const followUp = input.followUp;
   const planRun = input.planRun;
   const comparable = followUp && planRun && followUp.period.start===planRun.period.start && followUp.period.end===planRun.period.end;
   const progress = input.planProgress??(plan && comparable ? comparePlanProgress({plan,latestSignals:followUp.signals,latestAt:followUp.generatedAt}) : null);
   if(!progress || progress.state==="insufficient")return result(t("No comparable follow-up yet","暂时无法判断行动后的变化"),
    t("A saved baseline and enough data for the original dates are needed.","需要已保存的指标基线，以及原计划日期内的经营数据。"),
    t("Open the action plan to check its follow-up date and data.","打开行动计划，查看复盘日期和指标数据。"),"/app",metricsSource,false);
   return result(progress.state==="improved"?t("The tracked metric improved","跟踪指标已有改善"):t("The tracked metric has not improved","跟踪指标暂未改善"),
    zh?progress.detail:`${plan!.metricBaseline.name}: ${plan!.metricBaseline.value} → ${progress.value??followUp?.signals?.find(signal=>signal.metric.name===plan!.metricBaseline.name && signal.metric.value!==null)?.metric.value}`,
    t("Use the change to review the action plan. Other factors may also have contributed.","用这次变化复盘行动计划，同时留意同期的其他经营变化。"),
    "/app",`${t("Action plan dates","行动计划日期")} · ${plan!.metricBaseline.window?.start} — ${plan!.metricBaseline.window?.end}`);
  }
 }
}
