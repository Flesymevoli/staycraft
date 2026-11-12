// One competitor quote for one stay date. Sourced from manual capture today,
// interchangeable with a crawler or platform feed later by changing only `source`.
export type QuoteSource = 'manual' | 'rollinggo' | 'platform';
export type QuoteStatus = 'available' | 'stale' | 'no_saleable' | 'source_error' | 'missing' | 'unknown';
// starting: provider lowest starting rate; plan: a specific room-rate plan; calendar: a date
// reference price from a public calendar (no room type/meal/refund terms); display: marketing price.
export type PriceType = 'starting' | 'plan' | 'calendar' | 'display';

export type Quote = {
  id: string;
  hotelId?: string;
  priceChange?: {amount: number; previousPrice: number; previousCapturedAt: string};
  planId?: string;
  source: QuoteSource;
  sourceName: string;
  sourceUrl?: string;
  capturedAt: string;
  stayDate: string;
  nights: number;
  adults: number;
  roomType?: string;
  roomClass?: string;
  priceCny: number | null;
  priceType: PriceType;
  refundable?: boolean;
  breakfast?: boolean;
  taxesIncluded?: boolean;
  status: QuoteStatus;
  dataAgeMinutes?: number;
  saleableRoomTypes?: number;
  totalRoomTypes?: number;
  note?: string;
};

export type MarketSample = {
  window: { start: string; end: string };
  quotes: Quote[];
  // strict: matched room class and enough samples; loose: enough samples but classes differ;
  // none: too few comparable quotes to say anything about a range.
  comparability: 'strict' | 'loose' | 'none';
  stats: { n: number; medianCny: number | null; p25Cny: number | null; p75Cny: number | null };
  observedAt: string;
  coverage: { from: string; to: string; kind: 'complete' | 'partial' | 'none' };
  delayed: number;
  unknowns: string[];
};

export type OwnPosition = { lowCny: number; highCny: number; positionPct: number; aboveMedian: boolean };
