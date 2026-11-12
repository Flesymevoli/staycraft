// Fictional competitor quotes for the isolated demo. Deterministic and date-relative so the
// market page always has a same-window sample; never scraped, never presented as real.
import type {Quote} from './types';

const DAY = 86400000;
const shift = (day: string, offset: number) => new Date(Date.parse(day + 'T00:00:00Z') + offset * DAY).toISOString().slice(0, 10);
const shanghaiToday = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai' }).format(new Date());

const NAMES = ['湖畔雅居', '水巷人家', '古桥客栈', '云栖小院', '沙溪别院', '青石民宿', '临水阁', '听雨轩'];
const CLASSES: Array<'大床' | '双床'> = ['大床', '大床', '双床', '双床', '大床', '双床', '大床', '双床'];
// Base starting price per competitor, then a per-date and per-room-class adjustment.
const BASE = [520, 560, 480, 640, 700, 540, 610, 580];

export function demoQuotes(today = shanghaiToday(), observedAt = new Date().toISOString()): Quote[] {
  const stayDates = [shift(today, 3), shift(today, 4), shift(today, 5)];
  const quotes: Quote[] = [];
  NAMES.forEach((name, index) => {
    for (const [dateIndex, stayDate] of stayDates.entries()) {
      for (const [classIndex, roomClass] of CLASSES.entries()) {
        if (classIndex !== index % 2) continue;
        const status: Quote['status'] = index === 6 ? 'no_saleable' : index === 7 ? 'source_error' : index < 2 ? 'stale' : 'available';
        const price = status === 'no_saleable' || status === 'source_error' ? null : BASE[index] + dateIndex * 18 + (roomClass === '双床' ? 40 : 0);
        quotes.push({
          id: `demo-quote-${index}-${dateIndex}`,
          source: 'manual',
          sourceName: name,
          capturedAt: observedAt,
          stayDate,
          nights: 1,
          adults: 2,
          roomType: roomClass === '大床' ? '大床房' : '双床房',
          roomClass,
          priceCny: price,
          priceType: 'starting',
          refundable: index % 3 !== 0,
          breakfast: index % 2 === 0,
          taxesIncluded: index % 4 === 0,
          status,
          dataAgeMinutes: status === 'stale' ? 18 + index : undefined,
          saleableRoomTypes: status === 'no_saleable' ? 0 : 2 + (index % 3),
          totalRoomTypes: 4,
          note: status === 'source_error' ? '采集时页面未加载完成，未取得价格' : undefined,
        });
      }
    }
  });
  return quotes;
}

export const demoQuoteWindow = (today = shanghaiToday()) => ({ start: shift(today, 3), end: shift(today, 5) });
