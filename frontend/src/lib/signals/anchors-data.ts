// Manually verified competitor anchors, kept as demo data until an entry UI exists.
// Each row is ONE stay date and ONE observed quote. Not a range, average or trend.
// Names, prices and dates are fictional demo values shaped like an owner's own notes;
// they are not scraped and carry no claim about room type, meals or cancellation terms.
export type AnchorEntry = {
  name: string;
  kind?: 'independent_homestay' | 'comparable_stay';
  stayDate: string;
  amountCny: number | null;
  roomType?: string;
  sourceType?: 'manual' | 'screenshot';
  sourceUrl?: string;
  capturedAt?: string;
  id?: string;
};

// Stay dates are fixed to the demo window (11-18..11-20) so the data does not drift.
export const DEMO_ANCHOR_ENTRIES: AnchorEntry[] = [
  { id: 'anchor-1', name: '西畔·山间民宿（西湖景区）', kind: 'comparable_stay', stayDate: '2026-11-18', amountCny: 688, roomType: '大床房', sourceType: 'manual', sourceUrl: 'https://hotels.ctrip.com', capturedAt: '2026-11-10' },
  { id: 'anchor-2', name: '河坊小院（清河坊）', kind: 'comparable_stay', stayDate: '2026-11-18', amountCny: 520, roomType: '双床房', sourceType: 'manual', sourceUrl: 'https://hotels.ctrip.com', capturedAt: '2026-11-10' },
  { id: 'anchor-3', name: '云栖·轻居（之江路）', kind: 'comparable_stay', stayDate: '2026-11-19', amountCny: 610, roomType: '大床房', sourceType: 'manual', sourceUrl: 'https://hotels.meituan.com', capturedAt: '2026-11-10' },
  { id: 'anchor-4', name: '龙井·慢屋（龙井村）', kind: 'comparable_stay', stayDate: '2026-11-20', amountCny: 720, roomType: '大床房', sourceType: 'manual', sourceUrl: 'https://hotels.ctrip.com', capturedAt: '2026-11-10' },
  { id: 'anchor-5', name: '运河·木宿（拱宸桥）', kind: 'comparable_stay', stayDate: '2026-11-20', amountCny: 560, roomType: '双床房', sourceType: 'manual', sourceUrl: 'https://hotels.meituan.com', capturedAt: '2026-11-10' },
];

export function demoAnchorEntries(): AnchorEntry[] {
  return DEMO_ANCHOR_ENTRIES.map(entry => ({ ...entry }));
}
