import {marketDay} from './market/quote-identity';

export type OrderRateSummary = {
  date: string; count: number; average: number | null; min: number | null; max: number | null;
  byType: Record<string, {average: number; count: number}>;
};
export type OrderRateResult = {status: 'ready'; summary: OrderRateSummary} | {status: 'unavailable'; date: string};
export type RateBooking = {id: string; type_id: string | null; arrival: string; departure: string; total: number | string; status: string; external_id: string | null; external_snapshot?: {status?: string; currency?: string} | null};

// One imported order is one room. Spread a multi-night total evenly across its
// occupied nights; the checkout day is excluded. Never average whole-stay totals.
export function summarizeOrderRates(bookings: RateBooking[], date: string): OrderRateSummary {
  const result: OrderRateSummary = {date, count: 0, average: null, min: null, max: null, byType: {}};
  if (!marketDay(date)) return result;
  const seen = new Set<string>(), prices: number[] = [];
  const groups = new Map<string, number[]>();
  for (const booking of bookings) {
    if (!booking.id || seen.has(booking.id) || !booking.external_id || booking.status !== 'confirmed' || booking.external_snapshot?.status === 'cancelled' || booking.external_snapshot?.currency !== 'CNY') continue;
    if (!marketDay(booking.arrival) || !marketDay(booking.departure) || booking.arrival > date || booking.departure <= date) continue;
    const nights = (Date.parse(booking.departure) - Date.parse(booking.arrival)) / 86400000;
    const total = Number(booking.total);
    if (!Number.isInteger(nights) || nights < 1 || nights > 30 || !Number.isFinite(total) || total <= 0) continue;
    seen.add(booking.id);
    const rate = total / nights;
    prices.push(rate);
    if (booking.type_id) groups.set(booking.type_id, [...(groups.get(booking.type_id) ?? []), rate]);
  }
  const mean = (values: number[]) => values.reduce((sum, price) => sum + price, 0) / values.length;
  if (prices.length) {
    result.count = prices.length; result.average = mean(prices);
    result.min = Math.min(...prices); result.max = Math.max(...prices);
  }
  for (const [id, values] of groups) result.byType[id] = {average: mean(values), count: values.length};
  return result;
}
