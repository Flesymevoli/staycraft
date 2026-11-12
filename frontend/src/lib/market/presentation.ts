import type {Quote} from './types';
import {hotelKey, countableQuote, marketDay} from './quote-identity';
import {percentile} from './sample';
export {hotelKey, countableQuote} from './quote-identity';

// Both ends are stay dates, inclusive; a seven-day window has seven columns even with gaps.
export function marketDates(start: string, end: string): string[] {
  if (!marketDay(start) || !marketDay(end) || end < start) return [];
  const count = (Date.parse(end) - Date.parse(start)) / 86400000 + 1;
  if (count > 28) return [];
  return Array.from({length: count}, (_, index) => new Date(Date.parse(start) + index * 86400000).toISOString().slice(0, 10));
}

export function marketRows(quotes: Quote[]) {
  const rows = new Map<string, {key: string; name: string; sourceUrl?: string; cells: Record<string, Quote>}>();
  for (const quote of quotes) {
    const key = hotelKey(quote);
    const row = rows.get(key) || {key, name: quote.sourceName, sourceUrl: quote.sourceUrl, cells: {}};
    const current = row.cells[quote.stayDate];
    if (!current || Date.parse(quote.capturedAt) > Date.parse(current.capturedAt)) row.cells[quote.stayDate] = quote;
    rows.set(key, row);
  }
  return [...rows.values()];
}

export function dailyMedian(quotes: Quote[], date: string): number | null {
  const values = marketRows(quotes).map(row => row.cells[date]).filter(quote => quote && countableQuote(quote));
  if (values.length < 3) return null;
  return percentile(values.map(quote => quote.priceCny as number).sort((a, b) => a - b), 0.5);
}
