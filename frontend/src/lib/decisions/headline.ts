// One deterministic headline per diagnosis: what to do today, why, and what is missing.
// The model never produces this line, so a failed or disabled model cannot change it.
import type {DetectorSignal,Opportunity} from './types';
import type {SourceRef} from '../signals/types';
import {channelLabel} from './labels';
import {hasSupportedOpportunityBasis,selectPriorityOpportunities} from './opportunity';

export type Headline = {
  conclusion: string;
  reason: string;
  kpis: Array<{ label: string; value: string }>;
  gaps: string[];
  window?: { start: string; end: string };
  source: DetectorSignal['kind'] | 'none';
};

const pct = (value: number) => `${Math.round(value * 10) / 10}%`;
const nightsBetween = (start: string, end: string) => Math.max(1, Math.round((Date.parse(end) - Date.parse(start)) / 86400000) + 1);
const sourceLabel = (id: string, zh: boolean) => (id === 'weather' ? (zh ? '天气' : 'weather') : id === 'events' ? (zh ? '本地活动' : 'events') : id === 'competitor' ? (zh ? '周边报价' : 'competitor rates') : id);

// Detector unknowns are written in Chinese; the English headline must not leak them.
const GAP_EN: Array<[RegExp, string]> = [
  [/同 weekday 历史/, 'Same-weekday history is not yet sufficient to confirm booking pace'],
  [/可售房量来自导入房态/, 'Sellable rooms come from imported inventory and may lag behind channels'],
  [/缺少可售房量数据/, 'Some dates lack sellable-room data, so open-room continuity may be cut short'],
];
function localizeGap(text: string, zh: boolean): string {
  if (zh || !/[\u4e00-\u9fff]/.test(text)) return text;
  for (const [pattern, replacement] of GAP_EN) if (pattern.test(text)) return replacement;
  return 'Data for this check is incomplete';
}

function collectGaps(sources: SourceRef[], signals: DetectorSignal[], zh: boolean): string[] {
  const gaps: string[] = [];
  for (const source of sources) {
    if (source.coverage.kind === 'none') gaps.push(zh ? `${sourceLabel(source.id, zh)}未获取` : `${sourceLabel(source.id, zh)} unavailable`);
    else if (source.coverage.kind === 'partial') gaps.push(zh ? `${sourceLabel(source.id, zh)}仅部分` : `${sourceLabel(source.id, zh)} partial`);
  }
  for (const unknown of signals.flatMap(signal => signal.unknowns || []).slice(0, 3)) gaps.push(localizeGap(unknown, zh));
  return [...new Set(gaps)].slice(0, 4);
}

export function buildHeadline(input: { signals?: DetectorSignal[]; opportunities?: Opportunity[]; sources?: SourceRef[]; dailyMetrics?: Array<{date:string;available:number|null;booked?:number|null;capacity?:number|null}>; zh: boolean }): Headline | null {
  const allSignals = input.signals || [], zh = input.zh;
  const priority = selectPriorityOpportunities(input.opportunities || [], 1)[0];
  const signals = priority?.basis ?? allSignals;
  const first = (kind: DetectorSignal['kind'], metricName?: string) => signals.find(signal => signal.kind === kind &&
    (!metricName || signal.metric.name === metricName) && hasSupportedOpportunityBasis(signals.filter(other =>
      other.kind === kind && other.window.start === signal.window.start && other.window.end === signal.window.end)));
  const gaps = collectGaps(input.sources || [], allSignals, zh);

  const fullSaturday=input.dailyMetrics?.find(day=>new Date(day.date+'T12:00:00Z').getUTCDay()===6&&typeof day.capacity==='number'&&day.capacity>0&&day.booked===day.capacity&&day.available===0);
  if(fullSaturday){
    return {
      conclusion:zh?'周六已满房，建议上调后续可售周六的房价。':'Saturday is fully booked. Test higher rates on later Saturdays with rooms available.',
      reason:zh?`${fullSaturday.date} 已订 ${fullSaturday.booked}/${fullSaturday.capacity} 间，周六预订表现强。下一步先小幅试涨后续可售周六，观察新增订单；已订订单不改价。`:`${fullSaturday.booked}/${fullSaturday.capacity} rooms are booked for ${fullSaturday.date}. Saturday bookings are strong. Start with a small increase on later available Saturdays and watch new bookings; keep existing reservations unchanged.`,
      kpis:[{label:zh?'周六预订':'Saturday bookings',value:`${fullSaturday.booked}/${fullSaturday.capacity}`},{label:zh?'占用率':'Occupancy',value:'100%'}],
      gaps,window:{start:fullSaturday.date,end:fullSaturday.date},source:'none',
    };
  }

  const gap = first('gap_window');
  if (gap && gap.metric.value !== null) {
    const days = nightsBetween(gap.window.start, gap.window.end);
    const dates = Array.from({length:days}, (_, index) => new Date(Date.parse(gap.window.start) + index * 86400000).toISOString().slice(0,10));
    const availableByDate = new Map((input.dailyMetrics || []).map(day => [day.date, day.available]));
    const availability = dates.map(date => availableByDate.get(date));
    const value = availability.every(amount => typeof amount === 'number' && Number.isInteger(amount) && amount >= 0)
      ? availability.reduce<number>((sum, amount) => sum + amount!, 0)
      : null;
    return {
      conclusion: zh ? `${gap.window.start}–${gap.window.end} 连续 ${days} 晚仍有空房，建议优先推出短住方案。` : `Rooms remain open for ${days} consecutive nights, ${gap.window.start}–${gap.window.end}. Prioritize a short-stay offer.`,
      reason: zh ? `${value === null ? '当前记录显示' : `当前还有 ${value} 个可售间夜，`}连续 ${days} 晚未订满。先围绕这段入住日期完善房源展示，再安排推广。` : `${value === null ? 'Availability remains open' : `${value} sellable room-nights remain`} across ${days} nights. Refresh the listing for these stay dates and prepare the promotion.`,
      kpis: [{ label: zh ? '可售间夜' : 'Sellable nights', value: value === null ? '—' : String(value) }, { label: zh ? '连续晚数' : 'Consecutive nights', value: `${days}` }, { label: zh ? '窗口天数' : 'Window days', value: `${days}` }],
      gaps,
      window: gap.window,
      source: 'gap_window',
    };
  }

  const price = first('price_volume_divergence','average_price');
  if (price && price.metric.value !== null) {
    const baseline = price.baseline.value;
    const round = (value: number) => Math.round(value);
    return {
      conclusion: zh ? '预订均价与间夜量出现背离，建议核对房型结构和同行报价后再调价。' : 'Booked rates and room nights moved in opposite directions. Review room mix and comparable quotes before repricing.',
      reason: zh ? `${price.window.start}–${price.window.end} 预订均价为 ¥${round(price.metric.value)}${baseline === null ? '，前期均价尚未补齐' : `，前期为 ¥${round(baseline)}`}。先核对各房型的成交价和间夜变化，确定需要调整的日期。` : `Booked rates average ¥${round(price.metric.value)} for ${price.window.start}–${price.window.end}${baseline === null ? '; the prior average is unavailable' : `, versus ¥${round(baseline)} in the prior period`}. Compare rates and room nights by room type to identify dates worth adjusting.`,
      kpis: [{ label: zh ? '窗口均价' : 'Average price', value: `¥${round(price.metric.value)}` }, { label: zh ? '前期' : 'Prior period', value: baseline === null ? '—' : `¥${round(baseline)}` }, { label: zh ? '样本' : 'Samples', value: String(price.baseline.samples) }],
      gaps,
      window: price.window,
      source: 'price_volume_divergence',
    };
  }

  const pace = first('booking_pace');
  if (pace && pace.metric.value !== null) {
    const baseline = pace.baseline.value, shift = baseline === null ? null : Math.round((pace.metric.value - baseline) * 10) / 10;
    return {
      conclusion: zh ? '预订进度落后于上周同期，建议优先推广仍有空房的日期。' : 'Booking pace trails history; widen channel exposure and package short stays first.',
      reason: zh ? `已订 ${pct(pace.metric.value)}，上周同星期、同提前量的预订进度为 ${baseline === null ? '未知' : pct(baseline)}（可比 ${pace.baseline.samples} 天）${shift === null ? '' : `，相差 ${shift} 个百分点`}。` : `Booked ${pct(pace.metric.value)} versus a same-weekday baseline of ${baseline === null ? 'unknown' : pct(baseline)} (${pace.baseline.samples} samples)${shift === null ? '' : `, ${shift} points apart`}.`,
      kpis: [{ label: zh ? '当前预订' : 'Booked now', value: pct(pace.metric.value) }, { label: zh ? '历史基线' : 'Baseline', value: baseline === null ? '—' : pct(baseline) }, { label: zh ? '相差' : 'Gap', value: shift === null ? '—' : `${shift > 0 ? '+' : ''}${shift} pp` }],
      gaps,
      window: pace.window,
      source: 'booking_pace',
    };
  }

  const cancel = first('cancellation_rate');
  if (cancel && cancel.metric.value !== null) {
    return {
      conclusion: zh ? '取消率值得关注，建议先核对取消原因和退改政策。' : 'Review cancellations and refund terms before adjusting the offer.',
      reason: zh ? `窗口内取消率 ${pct(cancel.metric.value)}${cancel.baseline.value === null ? '' : `，前期基线 ${pct(cancel.baseline.value)}`}。` : `Cancellation rate is ${pct(cancel.metric.value)}${cancel.baseline.value === null ? '' : ` versus a prior ${pct(cancel.baseline.value)}`}.`,
      kpis: [{ label: zh ? '取消率' : 'Cancellation', value: pct(cancel.metric.value) }, { label: zh ? '前期基线' : 'Prior baseline', value: cancel.baseline.value === null ? '—' : pct(cancel.baseline.value) }, { label: zh ? '样本' : 'Samples', value: String(cancel.baseline.samples) }],
      gaps,
      window: cancel.window,
      source: 'cancellation_rate',
    };
  }

  const channel = first('channel_mix');
  if (channel && channel.metric.value !== null) {
    const name = channelLabel(channel.id.split(':').slice(3).join(':') || 'top', zh);
    return {
      conclusion: zh ? `${name} 订单占比 ${pct(channel.metric.value)}，建议核对渠道覆盖并优化曝光。` : `${name} accounts for ${pct(channel.metric.value)} of sourced orders. Review channel coverage and listing exposure.`,
      reason: zh ? `${channel.window.start}–${channel.window.end}，${name} 占已知来源订单 ${pct(channel.metric.value)}。先核对其他渠道是否完整导入，再比较各渠道表现。` : `${name} accounts for ${pct(channel.metric.value)} of orders with a known source during ${channel.window.start}–${channel.window.end}. Check that other channels are fully imported before comparing performance.`,
      kpis: [{ label: zh ? '最高占比' : 'Top share', value: pct(channel.metric.value) }, { label: zh ? '样本' : 'Samples', value: String(channel.baseline.samples) }, { label: zh ? '渠道数' : 'Channels', value: '—' }],
      gaps,
      window: channel.window,
      source: 'channel_mix',
    };
  }

  return null;
}
