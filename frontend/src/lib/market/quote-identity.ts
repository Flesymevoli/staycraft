import type {Quote} from './types';

export function marketDay(value: unknown): value is string {
  return typeof value === 'string' && /^20\d{2}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(value)) && new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) === value;
}

export function hotelKey(quote: Quote): string {
  return `${quote.source}:${quote.hotelId || quote.sourceUrl || quote.sourceName}`;
}

export function countableQuote(quote: Quote): boolean {
  return quote.status === 'available' && quote.priceType !== 'display'
    && typeof quote.priceCny === 'number' && Number.isFinite(quote.priceCny) && quote.priceCny > 0 && quote.priceCny <= 1000000;
}
