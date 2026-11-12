import {readFileSync} from 'node:fs';
import path from 'node:path';

export function readListDisplayPrices(day: string) {
 try {
  const raw: unknown = JSON.parse(readFileSync(path.join(process.cwd(), '.price-monitor', 'list-prices.json'), 'utf8'));
  const snapshot = raw as {source?: string; kind?: string; days?: unknown[]};
  if (snapshot?.source !== 'ctrip_search_list' || snapshot.kind !== 'display_starting_price' || !Array.isArray(snapshot.days)) return null;
  const entry = snapshot.days.find(item => (item as {date?: string} | null)?.date === day) as {
   capturedAt?: string; occupancy?: string; advertisedCount?: number; rows?: unknown[];
  } | undefined;
  if (!entry?.capturedAt || !Number.isFinite(Date.parse(entry.capturedAt)) || entry.occupancy !== '1间, 1成人, 0儿童' || !Array.isArray(entry.rows)) return null;
  const prices = new Map<string, number>();
  for (const item of entry.rows) {
   const row = item as {name?: string; priceCny?: number} | null;
   if (typeof row?.name !== 'string' || !row.name.trim() || row.name.length > 200 ||
       typeof row.priceCny !== 'number' || !Number.isFinite(row.priceCny) || row.priceCny <= 0 || row.priceCny > 1000000) continue;
   prices.set(row.name.trim(), row.priceCny);
  }
  return {capturedAt: entry.capturedAt, rows: Array.from(prices, ([name, priceCny]) => ({name, priceCny})),
   advertisedCount: Number.isInteger(entry.advertisedCount) && entry.advertisedCount! > 0 ? entry.advertisedCount : undefined};
 } catch {
  return null;
 }
}
