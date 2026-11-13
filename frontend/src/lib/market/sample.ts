// Deterministic reference statistics; unmatched quotes do not imply equivalent room types.
import type {MarketSample, OwnPosition, Quote} from './types';
import {countableQuote, hotelKey, marketDay, isDatedListQuote} from './quote-identity';

const DAY = 86400000;
const isDay = marketDay;
const isPrice = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= 1000000;

export function listedRateSummary(values: (number | null)[]) {
  const rates = values.filter(isPrice);
  return rates.length ? {min: Math.min(...rates), max: Math.max(...rates), average: rates.reduce((sum, price) => sum + price, 0) / rates.length} : null;
}

export function marketAverage(sample: MarketSample): number | null {
  const quotes = sample.quotes.filter(quote => quote.stayDate >= sample.window.start && quote.stayDate <= sample.window.end && countableQuote(quote));
  return quotes.length ? quotes.reduce((sum, quote) => sum + quote.priceCny!, 0) / quotes.length : null;
}

export function percentile(sorted: number[], ratio: number): number | null {
  if (sorted.length === 0) return null;
  if (sorted.length === 1) return sorted[0];
  const index = (sorted.length - 1) * ratio;
  const low = Math.floor(index), high = Math.ceil(index);
  return low === high ? sorted[low] : sorted[low] + (sorted[high] - sorted[low]) * (index - low);
}

export function buildMarketSample(input: { quotes: Quote[]; window: { start: string; end: string }; observedAt?: string }): MarketSample {
  const window = input.window;
  const observedAt = input.observedAt || new Date().toISOString();
  const unknowns: string[] = [];
  const validWindow = isDay(window?.start) && isDay(window?.end) && window.start <= window.end;
  if (!validWindow) {
    return { window, quotes: [], comparability: 'none', stats: { n: 0, medianCny: null, p25Cny: null, p75Cny: null }, observedAt, coverage: { from: observedAt.slice(0, 10), to: observedAt.slice(0, 10), kind: 'none' }, delayed: 0, unknowns: ['查询窗口无效'] };
  }
  const inWindow = (input.quotes || []).filter(quote => isDay(quote?.stayDate) && quote.stayDate >= window.start && quote.stayDate <= window.end);
  const usable = inWindow.filter(quote => (quote.status === 'available' || quote.status === 'stale') && isPrice(quote.priceCny));
  const counted = usable.filter(countableQuote);
  const hotels = new Set(counted.map(hotelKey)).size;
  const delayed = usable.filter(quote => quote.status === 'stale').length;
  const displayOnly = inWindow.filter(quote => quote.status === 'available' && quote.priceType === 'display' && !isDatedListQuote(quote)).length;
  const datedList = counted.filter(isDatedListQuote);
  const noSaleable = inWindow.filter(quote => quote.status === 'no_saleable').length;
  const failed = inWindow.filter(quote => quote.status === 'source_error' || quote.status === 'missing' || quote.status === 'unknown').length;

  const prices = counted.map(quote => quote.priceCny as number).sort((left, right) => left - right);
  const n = prices.length;
  const stats = { n, medianCny: n ? percentile(prices, 0.5) : null, p25Cny: n ? percentile(prices, 0.25) : null, p75Cny: n ? percentile(prices, 0.75) : null };

  const classes = new Set(counted.map(quote => (quote.roomClass || '').trim()).filter(Boolean));
  const hasCalendar = counted.some(quote => quote.priceType === 'calendar');
  const conditions = new Set(counted.map(quote => `${quote.adults}:${quote.nights}`));
  const comparability: MarketSample['comparability'] = hotels < 3 ? 'none' : !hasCalendar && !datedList.length && conditions.size === 1 && classes.size === 1 && counted.every(quote => (quote.roomClass || '').trim()) ? 'strict' : 'loose';

  if (n === 0) unknowns.push('窗口内没有可计入统计的起价');
  if (n > 0 && n < 3) unknowns.push(`可计入统计的起价只有 ${n} 条，样本不足，不形成区间结论`);
  if (n >= 3 && hotels < 3) unknowns.push(`有效报价只覆盖 ${hotels} 家独立住宿，样本不足，不形成区间结论`);
  if (n >= 3 && comparability === 'loose') unknowns.push('房型/档位未完全匹配，只能描述价差，不能断言同档定位');
  if (hasCalendar) unknowns.push('含日历参考价，房型/早餐/退改未匹配，只描述价差');
  if (datedList.length) unknowns.push(`${datedList.length} 条为指定入住日的列表起价（${[...new Set(datedList.map(quote => quote.adults))].join('/')} 位成人），计入参考统计；房型、早餐和退改条件未核对，不代表成交价`);
  if (conditions.size > 1) unknowns.push('入住人数或晚数不完全一致，仅作宽泛价格参考');
  if (delayed) unknowns.push(`${delayed} 条样本延迟，已展示但不计入统计`);
  if (displayOnly) unknowns.push(`${displayOnly} 条为展示价，未计入统计`);
  if (noSaleable) unknowns.push(`${noSaleable} 家当日无可售房型`);
  if (failed) unknowns.push(`${failed} 条来源异常或缺失`);

  const dates = inWindow.map(quote => quote.stayDate).sort();
  const coveredCells = new Set(counted.map(quote => `${hotelKey(quote)}:${quote.stayDate}`)).size;
  const coverageKind: MarketSample['coverage']['kind'] = n === 0 ? 'none' : comparability === 'none' || coveredCells < new Set(inWindow.map(hotelKey)).size * windowDays(window) ? 'partial' : 'complete';
  return {
    window,
    quotes: inWindow,
    comparability,
    stats,
    observedAt,
    coverage: { from: dates[0] || window.start, to: dates.at(-1) || window.end, kind: coverageKind },
    delayed,
    unknowns,
  };
}

// Where the owner's listed prices sit inside the observed quote band. Null when a band is meaningless.
export function ownPosition(sample: MarketSample, ownRates?: { min: number; max: number } | null): OwnPosition | null {
  if (!ownRates || !isPrice(ownRates.min) || !isPrice(ownRates.max) || ownRates.max < ownRates.min) return null;
  if (sample.comparability === 'none' || sample.stats.n < 3 || sample.stats.p25Cny === null || sample.stats.p75Cny === null) return null;
  const low = sample.stats.p25Cny!, high = sample.stats.p75Cny!, span = high - low;
  const mid = (ownRates.min + ownRates.max) / 2;
  const positionPct = span <= 0 ? 50 : Math.max(0, Math.min(100, ((mid - low) / span) * 100));
  return { lowCny: ownRates.min, highCny: ownRates.max, positionPct: Math.round(positionPct), aboveMedian: mid > (sample.stats.medianCny ?? mid) };
}

export function describeSample(sample: MarketSample): string {
  if (sample.stats.n === 0) return '窗口内没有可比较的周边起价，暂不评价价格位置。';
  const band = `中位数 ¥${Math.round(sample.stats.medianCny ?? 0)}（P25–P75 ¥${Math.round(sample.stats.p25Cny ?? 0)}–¥${Math.round(sample.stats.p75Cny ?? 0)}）`;
  if (sample.comparability === 'none') return `${sample.stats.n} 条有效起价，独立住宿样本不足，只展示报价，不形成区间结论。`;
  return `${sample.stats.n} 条同窗口起价，${band}${sample.comparability === 'strict' ? '；房型档位一致' : '；房型档位未完全匹配，只能描述价差'}。`;
}

export const windowDays = (window: { start: string; end: string }) => Math.max(1, Math.round((Date.parse(window.end) - Date.parse(window.start)) / DAY) + 1);
