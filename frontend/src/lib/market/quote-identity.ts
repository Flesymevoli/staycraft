import type {Quote} from './types';

export function marketDay(value: unknown): value is string {
  return typeof value === 'string' && /^20\d{2}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(value)) && new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) === value;
}

export function hotelKey(quote: Quote): string {
  return `${quote.source}:${quote.hotelId || quote.sourceUrl || quote.sourceName}`;
}

// Only the dated list observations validated by desktop-sync qualify. Legacy
// list cards have no observed stay date and must remain excluded.
export function isDatedListQuote(quote: Quote): boolean {
  return quote.priceType === 'display' && quote.source === 'platform'
    && /^list-[a-f0-9]{24}$/.test(quote.hotelId || '')
    && quote.sourceUrl === 'https://hotels.ctrip.com/hotels/list'
    && quote.note === '携程搜索列表起价' && marketDay(quote.stayDate)
    && Number.isFinite(Date.parse(quote.capturedAt)) && quote.nights === 1
    && Number.isInteger(quote.adults) && quote.adults >= 1 && quote.adults <= 10;
}

export function countableQuote(quote: Quote): boolean {
  return quote.status === 'available' && (quote.priceType !== 'display' || isDatedListQuote(quote))
    && typeof quote.priceCny === 'number' && Number.isFinite(quote.priceCny) && quote.priceCny > 0 && quote.priceCny <= 1000000;
}
