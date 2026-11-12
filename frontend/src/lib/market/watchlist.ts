// Owner-selected competitor watchlist. Pure functions plus one type so the same rules can be
// tested without a database; persistence lives in the API layer.
export const WATCH_LIMIT = 5;

export type WatchSource = 'rollinggo' | 'manual';
export type Watch = {
  id: string;
  hotelId: number | null;
  name: string;
  roomClass?: string;
  source: WatchSource;
  status: 'active' | 'retired';
  addedAt: string;
  retiredAt?: string;
};

export type Candidate = { hotelId: number | null; name: string; star?: number | null; priceCny?: number | null; roomClass?: string };

const key = (candidate: { hotelId: number | null; name: string }) => (candidate.hotelId === null ? `name:${candidate.name}` : `id:${candidate.hotelId}`);
const activeKeys = (list: Watch[]) => new Set(list.filter(watch => watch.status === 'active').map(watch => (watch.hotelId === null ? `name:${watch.name}` : `id:${watch.hotelId}`)));

export const activeWatches = (list: Watch[]) => list.filter(watch => watch.status === 'active').slice(0, WATCH_LIMIT);

// Prefer same room class first, then cheaper-and-closer-to-own band; never re-add an active hotel.
export function pickCandidates(candidates: Candidate[], existing: Watch[], count = WATCH_LIMIT, preferredClass?: string): Candidate[] {
  const taken = activeKeys(existing);
  const pool = candidates.filter(candidate => !taken.has(key(candidate)));
  const rank = (candidate: Candidate) => {
    const classMatch = preferredClass && candidate.roomClass ? (candidate.roomClass === preferredClass ? 0 : 1) : 0;
    const starMatch = candidate.star === undefined || candidate.star === null ? 1 : 0;
    return classMatch + starMatch + (candidate.hotelId === null ? 2 : 0);
  };
  return [...pool].sort((left, right) => rank(left) - rank(right) || (left.name < right.name ? -1 : left.name > right.name ? 1 : 0)).slice(0, count);
}

const toWatch = (candidate: Candidate, now: string, id: string): Watch => ({
  id,
  hotelId: candidate.hotelId ?? null,
  name: candidate.name,
  roomClass: candidate.roomClass,
  source: candidate.hotelId === null ? 'manual' : 'rollinggo',
  status: 'active',
  addedAt: now,
});

// Whole set replaced: everything current is retired so the old series stays auditable.
export function replaceAll(list: Watch[], candidates: Candidate[], now = new Date().toISOString()): Watch[] {
  const retired = list.map(watch => (watch.status === 'active' ? { ...watch, status: 'retired' as const, retiredAt: now } : watch));
  return [...retired, ...candidates.slice(0, WATCH_LIMIT).map((candidate, index) => toWatch(candidate, now, `${now}-${index}`))];
}

// One for one: the rest of the active set keeps its continuity.
export function replaceOne(list: Watch[], target: Watch, candidate: Candidate, now = new Date().toISOString()): Watch[] {
  const retired = list.map(watch => (watch.id === target.id ? { ...watch, status: 'retired' as const, retiredAt: now } : watch));
  return [...retired, toWatch(candidate, now, `${now}-one`)];
}

export function removeWatch(list: Watch[], target: Watch, now = new Date().toISOString()): Watch[] {
  return list.map(watch => (watch.id === target.id ? { ...watch, status: 'retired' as const, retiredAt: now } : watch));
}

// Fictional set for the isolated demo; hotelIds stay null so nothing can be mistaken for a live id.
export function demoWatchlist(now = new Date().toISOString()): Watch[] {
  const names = ['娄江雅居 · 虚构', '西浦北苑酒店 · 虚构', '城厢商务酒店 · 虚构', '南园精品民宿 · 虚构', '娄东宾馆 · 虚构'];
  return names.map((name, index) => ({ id: `demo-watch-${index}`, hotelId: null, name, roomClass: index % 2 === 0 ? '大床' : '双床', source: 'manual' as const, status: 'active' as const, addedAt: now }));
}

export function missingForRefresh(list: Watch[]): boolean {
  const active = activeWatches(list);
  return active.length < WATCH_LIMIT;
}
