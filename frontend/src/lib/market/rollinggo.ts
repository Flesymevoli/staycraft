// RollingGo Hotel MCP client used only for competitor sampling. Two read-only tools:
// searchHotels (candidates) and getHotelDetail (real room rates/plans). Never booking tools.
import type {Quote} from './types';

const ENDPOINT = 'https://mcp.rollinggo.cn/mcp';
export const MARKET_TTL_MS = 60 * 60 * 1000;
const cache = new Map<string, { at: number; value: unknown }>();
export const clearMarketCache = () => cache.clear();
export const marketCacheSize = () => cache.size;

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export type Candidate = { hotelId: number | null; name: string; address: string; star: number | null; priceCny: number | null; conditions: string; tags?: string[] };

const numberAt = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) ? value : null);
const textAt = (value: unknown): string => (typeof value === 'string' ? value : '');
const record = (value: unknown): Record<string, unknown> | null => (value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null);

async function callTool(name: string, args: unknown, options: { fetcher?: Fetcher; signal?: AbortSignal } = {}): Promise<unknown> {
  const cacheKey = `${name}:${JSON.stringify(args)}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < MARKET_TTL_MS) return hit.value;
  const key = process.env.ROLLINGGO_API_KEY;
  if (!key) throw new Error('market_not_configured');
  const fetcher = options.fetcher ?? fetch;
  const timeout = AbortSignal.timeout(25000);
  const response = await fetcher(ENDPOINT, {
    method: 'POST',
    redirect: 'manual',
    cache: 'no-store',
    signal: options.signal ? AbortSignal.any([options.signal, timeout]) : timeout,
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }),
  });
  if (!response.ok) throw new Error(`market_http_${response.status}`);
  const raw = await response.text();
  if (raw.length > 1500000) throw new Error('market_response_too_large');
  const envelope = JSON.parse(raw.trim().startsWith('{') ? raw : raw.split('\n').find(line => line.startsWith('data:'))?.slice(5) || '{}');
  const result = record(envelope)?.result as Record<string, unknown> | undefined;
  if (result?.isError) throw new Error('market_tool_error');
  let payload: unknown = result?.structuredContent;
  if (!payload) {
    const content = Array.isArray(result?.content) ? (result?.content as Array<Record<string, unknown>>) : [];
    const text = content.find(item => item.type === 'text')?.text;
    payload = JSON.parse(typeof text === 'string' ? text : '{}');
  }
  cache.set(cacheKey, { at: Date.now(), value: payload });
  return payload;
}

// Exposed only so the one-off live probe can inspect a provider payload before the tolerant
// mapping in hotelQuotes is trusted for production shapes.
export const rawTool = callTool;

export async function searchCandidates(input: { place: string; start: string; nights: number; adults?: number; size?: number; distanceInMeter?: number; starRatings?: [number, number]; requiredTags?: string[]; maxPricePerNight?: number; fetcher?: Fetcher; signal?: AbortSignal }): Promise<Candidate[]> {
  const size = Math.max(1, Math.min(20, input.size ?? 10));
  const filterOptions = {
    ...(input.distanceInMeter ? { distanceInMeter: input.distanceInMeter } : {}),
    ...(input.starRatings ? { starRatings: input.starRatings } : {}),
  };
  const hotelTags = {
    ...(input.requiredTags?.length ? { requiredTags: input.requiredTags } : {}),
    ...(input.maxPricePerNight ? { maxPricePerNight: input.maxPricePerNight } : {}),
  };
  const payload = await callTool('searchHotels', {
    originQuery: `查询${input.place}附近酒店公开报价`,
    place: input.place,
    placeType: '详细地址',
    checkInParam: { checkInDate: input.start, stayNights: Math.max(1, Math.min(28, input.nights)), adultCount: input.adults ?? 2 },
    ...(Object.keys(filterOptions).length ? { filterOptions } : {}),
    ...(Object.keys(hotelTags).length ? { hotelTags } : {}),
    size,
  }, { fetcher: input.fetcher, signal: input.signal });
  const list = record(payload)?.hotelInformationList;
  if (!Array.isArray(list)) throw new Error('market_shape_invalid');
  return list.slice(0, size).map(item => {
    const hotel = record(item) ?? {};
    const price = record(hotel.price) ?? {};
    const lowest = numberAt(price.lowestPrice);
    return {
      hotelId: typeof hotel.hotelId === 'number' ? hotel.hotelId : null,
      name: textAt(hotel.name),
      address: textAt(hotel.address),
      star: numberAt(hotel.star) ?? numberAt(hotel.starRating),
      priceCny: price.hasPrice === true && lowest !== null ? lowest : null,
      conditions: textAt(price.message) || '暂无可售报价',
      tags: Array.isArray(hotel.tags) ? hotel.tags.map(tag => textAt(tag)).filter(Boolean).slice(0, 8) : undefined,
    };
  }).filter(candidate => candidate.name.length > 0);
}

// Detail payloads are provider-shaped; read defensively and fail loudly instead of guessing.
function roomsOf(payload: unknown): Array<Record<string, unknown>> {
  const root = record(payload);
  const nested = record(root?.data) ?? root;
  for (const value of [nested?.roomRatePlans, nested?.roomList, nested?.roomInformationList, nested?.rooms]) {
    if (Array.isArray(value)) return value.map(item => record(item) ?? {}).filter(item => Object.keys(item).length > 0);
  }
  return [];
}
const priceOf = (room: Record<string, unknown>): number | null => {
  for (const value of [room.averagePrice, room.price, room.priceCny, room.priceAmount, room.totalPrice, room.amount, room.priceCent]) {
    const number = numberAt(value);
    if (number !== null) return room.priceCent === value ? Math.round(number) / 100 : number;
  }
  return null;
};
const booleanOf = (value: unknown): boolean | undefined => (typeof value === 'boolean' ? value : undefined);
const inferClass = (text: string): string | undefined => (/大床|king|double/i.test(text) ? '大床' : /双床|twin|2-bed|two.?bed/i.test(text) ? '双床' : undefined);

export async function hotelQuotes(input: { hotelId: number | null; name: string; start: string; end: string; adults?: number; fetcher?: Fetcher; signal?: AbortSignal; observedAt?: string }): Promise<Quote[]> {
  const payload = await callTool('getHotelDetail', {
    ...(input.hotelId !== null ? { hotelId: input.hotelId } : { name: input.name }),
    dateParam: { checkInDate: input.start, checkOutDate: input.end },
    occupancyParam: { adultCount: input.adults ?? 2, roomCount: 1 },
    localeParam: { countryCode: 'CN', currency: 'CNY' },
  }, { fetcher: input.fetcher, signal: input.signal });
  const observedAt = input.observedAt ?? new Date().toISOString();
  const plans = roomsOf(payload);
  if (plans.length === 0) throw new Error('market_detail_shape_unknown');
  const saleableCount = plans.filter(plan => priceOf(plan) !== null).length;
  return plans.map((plan, index): Quote => {
    const priceCny = priceOf(plan);
    const text = [textAt(plan.roomName), textAt(plan.ratePlanName), textAt(plan.bedTypeDescription)].join(' ');
    const roomClass = textAt(plan.roomClass) || inferClass(text);
    const mealType = textAt(plan.mealTypeStr);
    const cancelPolicy = textAt(plan.cancelPolicy);
    return {
      id: `${input.hotelId ?? input.name}:${index}:${input.start}`,
      planId: textAt(plan.ratePlanId) || undefined,
      source: 'rollinggo',
      sourceName: input.name,
      capturedAt: observedAt,
      stayDate: input.start,
      nights: Math.max(1, Math.round((Date.parse(input.end) - Date.parse(input.start)) / 86400000)),
      adults: input.adults ?? 2,
      roomType: textAt(plan.roomName) || textAt(plan.roomType) || undefined,
      roomClass: roomClass || undefined,
      priceCny,
      priceType: 'plan',
      refundable: typeof plan.cancelable === 'boolean' ? plan.cancelable : /免费取消/.test(cancelPolicy),
      breakfast: mealType ? (/不含|无早|no breakfast/i.test(mealType) ? false : /早餐|breakfast/i.test(mealType)) : (numberAt(plan.mealAmount) ?? 0) > 0,
      taxesIncluded: booleanOf(plan.taxesIncluded),
      status: priceCny === null ? 'no_saleable' : 'available',
      saleableRoomTypes: saleableCount,
      totalRoomTypes: plans.length,
      note: plan.isOnRequest === true ? '需酒店确认' : undefined,
    };
  });
}
