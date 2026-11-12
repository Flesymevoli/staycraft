// Watchlist sampling: one stay date at a time (never an average across nights), then a
// deterministic diff against the previous snapshot so only real changes surface.
import type {MarketSample, Quote} from './types';
import {buildMarketSample} from './sample';

export type WatchLike = { id: string; hotelId: number | null; name: string; status: 'active' | 'retired' };

const DAY = 86400000;
const shift = (day: string, offset: number) => new Date(Date.parse(day + 'T00:00:00Z') + offset * DAY).toISOString().slice(0, 10);
export const eachDay = (start: string, end: string): string[] => {
  const days: string[] = [];
  for (let date = start; date <= end && days.length < 31; date = shift(date, 1)) days.push(date);
  return days;
};

export type SampleOutcome = { sample: MarketSample; quotes: Quote[]; errors: string[]; sampledDates: string[] };

// `fetchQuotes` is injected so tests never touch the network.
export async function sampleWatchlist(input: { watches: WatchLike[]; start: string; end: string; fetchQuotes: (watch: WatchLike, stayDate: string) => Promise<Quote[]> }): Promise<SampleOutcome> {
  const active = input.watches.filter(watch => watch.status === 'active');
  const sampledDates = eachDay(input.start, input.end);
  const quotes: Quote[] = [];
  const errors: string[] = [];
  for (const stayDate of sampledDates) {
    for (const watch of active) {
      try {
        quotes.push(...(await input.fetchQuotes(watch, stayDate)));
      } catch (error) {
        errors.push(`${watch.name} ${stayDate}: ${error instanceof Error ? error.message : 'failed'}`);
      }
    }
  }
  return { sample: buildMarketSample({ quotes, window: { start: input.start, end: input.end } }), quotes, errors, sampledDates };
}

export type ChangeKind = 'drop' | 'rise' | 'sold_out' | 'reopened' | 'new';
export type Change = { kind: ChangeKind; watchName: string; stayDate: string; planId?: string; previousCny: number | null; currentCny: number | null; label: string };

const identity = (quote: Quote) => [quote.sourceName, quote.stayDate, quote.planId || '', quote.roomClass || '', quote.roomType || ''].join('|');

// Default thresholds mirror the "do not spam" rule: 10% or 50 CNY, whichever is hit first.
export function diffQuotes(previous: Quote[], current: Quote[], options: { minPercent?: number; minCny?: number } = {}): Change[] {
  const minPercent = options.minPercent ?? 0.1;
  const minCny = options.minCny ?? 50;
  const before = new Map(previous.map(quote => [identity(quote), quote]));
  const seen = new Set<string>();
  const changes: Change[] = [];
  for (const quote of current) {
    const key = identity(quote);
    seen.add(key);
    const old = before.get(key);
    if (!old) {
      if (quote.priceCny !== null) changes.push({ kind: 'new', watchName: quote.sourceName, stayDate: quote.stayDate, planId: quote.planId, previousCny: null, currentCny: quote.priceCny, label: '新增报价' });
      continue;
    }
    if (old.priceCny === null && quote.priceCny !== null) {
      changes.push({ kind: 'reopened', watchName: quote.sourceName, stayDate: quote.stayDate, planId: quote.planId, previousCny: null, currentCny: quote.priceCny, label: '重新可订' });
      continue;
    }
    if (old.priceCny !== null && quote.priceCny === null) {
      changes.push({ kind: 'sold_out', watchName: quote.sourceName, stayDate: quote.stayDate, planId: quote.planId, previousCny: old.priceCny, currentCny: null, label: '变为无可售' });
      continue;
    }
    if (old.priceCny === null || quote.priceCny === null) continue;
    const delta = quote.priceCny - old.priceCny, percent = old.priceCny === 0 ? 0 : Math.abs(delta) / old.priceCny;
    if (Math.abs(delta) < minCny && percent < minPercent) continue;
    changes.push({ kind: delta < 0 ? 'drop' : 'rise', watchName: quote.sourceName, stayDate: quote.stayDate, planId: quote.planId, previousCny: old.priceCny, currentCny: quote.priceCny, label: `${delta < 0 ? '下降' : '上涨'} ${Math.abs(delta).toFixed(0)} 元（${Math.round(percent * 100)}%）` });
  }
  for (const [key, old] of before) {
    if (seen.has(key) || old.priceCny === null) continue;
    changes.push({ kind: 'sold_out', watchName: old.sourceName, stayDate: old.stayDate, planId: old.planId, previousCny: old.priceCny, currentCny: null, label: '本次未再取得报价' });
  }
  return changes.sort((left, right) => left.watchName.localeCompare(right.watchName) || left.stayDate.localeCompare(right.stayDate));
}
