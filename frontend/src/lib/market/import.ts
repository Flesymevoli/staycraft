// Parses a competitor-quote CSV (one quote per row) with cell-level validation. Mirrors the
// order-import preview/commit shape: nothing is stored here, callers decide.
import type {Quote, PriceType, QuoteSource, QuoteStatus} from './types';

export const QUOTE_HEADER = 'source,source_name,captured_at,stay_date,nights,adults,room_type,room_class,price_cny,price_type,refundable,breakfast,taxes_included,status,saleable_room_types,total_room_types,note,source_url';
const COLUMNS = QUOTE_HEADER.split(',');
const SOURCES: QuoteSource[] = ['manual', 'rollinggo', 'platform'];
const STATUSES: QuoteStatus[] = ['available', 'stale', 'no_saleable', 'source_error', 'missing', 'unknown'];
const PRICE_TYPES: PriceType[] = ['starting', 'plan', 'calendar', 'display'];

export type QuoteRow = { line: number; ok: boolean; quote?: Quote; error?: string; duplicate?: boolean };
export type QuotePreview = { rows: QuoteRow[]; counts: { total: number; valid: number; invalid: number; duplicate: number }; errors: Array<{ line: number; message: string }> };

const isDay = (value: string) => /^20\d{2}-\d{2}-\d{2}$/.test(value) && new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) === value;
const isStamp = (value: string) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value));
const optionalBool = (value: string): boolean | undefined => {
  const text = value.trim().toLowerCase();
  if (!text) return undefined;
  if (['true', '1', '是', 'yes', 'y'].includes(text)) return true;
  if (['false', '0', '否', 'no', 'n'].includes(text)) return false;
  throw new Error('布尔值只能是 true/false 或留空');
};
const integer = (value: string, min: number, max: number, label: string): number | undefined => {
  const text = value.trim();
  if (!text) return undefined;
  const number = Number(text);
  if (!Number.isInteger(number) || number < min || number > max) throw new Error(`${label} 必须是 ${min}–${max} 的整数`);
  return number;
};
// Accepts plain CSV only; quoted fields with commas are not part of this template.
function split(line: string): string[] {
  return line.split(',').map(cell => cell.trim());
}

export function previewQuoteCsv(text: string): QuotePreview {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(line => line.trim().length > 0);
  const rows: QuoteRow[] = [];
  const errors: Array<{ line: number; message: string }> = [];
  const seen = new Set<string>();
  if (lines.length === 0) return { rows, counts: { total: 0, valid: 0, invalid: 0, duplicate: 0 }, errors: [{ line: 0, message: '文件为空' }] };
  const header = split(lines[0]).join(',');
  if (header !== QUOTE_HEADER) {
    return { rows, counts: { total: 0, valid: 0, invalid: 0, duplicate: 0 }, errors: [{ line: 1, message: `表头须为：${QUOTE_HEADER}` }] };
  }
  for (const [index, raw] of lines.slice(1).entries()) {
    const line = index + 2;
    const cells = split(raw);
    if (cells.length !== COLUMNS.length) {
      const message = `列数为 ${cells.length}，应为 ${COLUMNS.length}`;
      errors.push({ line, message });
      rows.push({ line, ok: false, error: message });
      continue;
    }
    const cellsByColumn = Object.fromEntries(COLUMNS.map((column, position) => [column, cells[position]]));
    try {
      const source = cellsByColumn.source as QuoteSource;
      if (!SOURCES.includes(source)) throw new Error(`来源须为 ${SOURCES.join('/')}`);
      if (!cellsByColumn.source_name) throw new Error('来源名称不能为空');
      if (!isStamp(cellsByColumn.captured_at)) throw new Error('采集时间须为带时区的 ISO 时间');
      if (!isDay(cellsByColumn.stay_date)) throw new Error('入住日须为 YYYY-MM-DD');
      const nights = integer(cellsByColumn.nights, 1, 28, '晚数') ?? 1;
      const adults = integer(cellsByColumn.adults, 1, 10, '成人数') ?? 2;
      const status = cellsByColumn.status as QuoteStatus;
      if (!STATUSES.includes(status)) throw new Error(`状态须为 ${STATUSES.join('/')}`);
      const priceType = (cellsByColumn.price_type || 'starting') as PriceType;
      if (!PRICE_TYPES.includes(priceType)) throw new Error(`价格类型须为 ${PRICE_TYPES.join('/')}`);
      const rawPrice = (cellsByColumn.price_cny || '').trim();
      let priceCny: number | null = null;
      if (rawPrice) {
        const price = Number(rawPrice);
        if (!Number.isFinite(price) || price <= 0 || price > 1000000) throw new Error('价格必须是正数，未取得请留空');
        priceCny = Math.round(price * 100) / 100;
      }
      if ((status === 'available' || status === 'stale') && priceCny === null) throw new Error('状态为可售/延迟时必须给出价格');
      if ((status === 'no_saleable' || status === 'source_error' || status === 'missing') && priceCny !== null) throw new Error('不可售或异常状态不应带价格');
      const url = (cellsByColumn.source_url || '').trim();
      if (url && !/^https:\/\//i.test(url)) throw new Error('来源链接须为 https');
      const settle = integer(cellsByColumn.saleable_room_types ?? '', 0, 9999, '可售房型数');
      const totalTypes = integer(cellsByColumn.total_room_types ?? '', 0, 9999, '总房型数');
      const quote: Quote = {
        id: `${source}:${cellsByColumn.source_name}:${cellsByColumn.stay_date}:${cellsByColumn.room_type || '-'}:${cellsByColumn.captured_at}`,
        source,
        sourceName: cellsByColumn.source_name,
        sourceUrl: url || undefined,
        capturedAt: cellsByColumn.captured_at,
        stayDate: cellsByColumn.stay_date,
        nights,
        adults,
        roomType: cellsByColumn.room_type || undefined,
        roomClass: cellsByColumn.room_class || undefined,
        priceCny,
        priceType,
        refundable: optionalBool(cellsByColumn.refundable ?? ''),
        breakfast: optionalBool(cellsByColumn.breakfast ?? ''),
        taxesIncluded: optionalBool(cellsByColumn.taxes_included ?? ''),
        status,
        dataAgeMinutes: undefined,
        saleableRoomTypes: settle,
        totalRoomTypes: totalTypes,
        note: cellsByColumn.note || undefined,
      };
      if (seen.has(quote.id)) {
        rows.push({ line, ok: true, quote, duplicate: true });
        continue;
      }
      seen.add(quote.id);
      rows.push({ line, ok: true, quote });
    } catch (error) {
      const message = error instanceof Error ? error.message : '无法解析该行';
      errors.push({ line, message });
      rows.push({ line, ok: false, error: message });
    }
  }
  const valid = rows.filter(row => row.ok && !row.duplicate).length;
  const duplicate = rows.filter(row => row.ok && row.duplicate).length;
  const invalid = rows.filter(row => !row.ok).length;
  return { rows, counts: { total: rows.length, valid, invalid, duplicate }, errors };
}

export function quotesFromPreview(preview: QuotePreview): Quote[] {
  return preview.rows.filter(row => row.ok && row.quote && !row.duplicate).map(row => row.quote as Quote);
}
