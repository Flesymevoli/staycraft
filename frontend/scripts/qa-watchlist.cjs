// Watchlist rules and the RollingGo adapter: HTTP shape, caching, tolerant mapping.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const libDir = path.join(root, 'src', 'lib');
const cache = {};
function load(relative) {
  if (cache[relative]) return cache[relative];
  const file = path.resolve(libDir, relative + '.ts');
  const directory = path.dirname(file);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  const localRequire = id => (id.startsWith('.') ? load(path.relative(libDir, path.resolve(directory, id))) : require(id));
  new Function('exports', 'require', 'module', '__filename', '__dirname', code)(module.exports, localRequire, module, file, directory);
  cache[relative] = module.exports;
  return cache[relative];
}

const watchlist = load('market/watchlist');
const rollinggo = load('market/rollinggo');
let checks = 0;
const check = (value, message) => { assert.ok(value, message); checks += 1; };
const eq = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks += 1; };

// --- watchlist rules ---
const now = '2026-11-10T00:00:00.000Z';
const base = watchlist.demoWatchlist(now);
eq(base.length, 5, 'demo watchlist holds five hotels');
eq(watchlist.activeWatches(base).length, 5, 'all demo rows start active');
eq(watchlist.missingForRefresh(base), false, 'a full set needs no refresh');
check(base.every(watch => watch.hotelId === null && watch.source === 'manual'), 'demo hotels use manual source so no live id is implied');

const candidates = [
  { hotelId: 11, name: 'A 酒店', star: 4, roomClass: '大床' },
  { hotelId: 12, name: 'B 酒店', star: 5, roomClass: '双床' },
  { hotelId: 13, name: 'C 酒店', star: 4, roomClass: '大床' },
];
eq(watchlist.pickCandidates(candidates, base, 5, '大床').map(item => item.hotelId), [11, 13, 12], 'same room class and lower star rank first');
eq(watchlist.pickCandidates(candidates, [...base, { id: 'x', hotelId: 11, name: 'A 酒店', status: 'active', source: 'rollinggo', addedAt: now }], 5, '大床').map(item => item.hotelId), [13, 12], 'active hotel is never re-added');
eq(watchlist.pickCandidates(candidates, base, 2).length, 2, 'picker respects the requested count');

const replacedAll = watchlist.replaceAll(base, candidates, now);
eq(watchlist.activeWatches(replacedAll).length, 3, 'replace all keeps only the new set active');
eq(replacedAll.filter(watch => watch.status === 'retired').length, 5, 'previous set is retired, not deleted');
check(replacedAll.filter(watch => watch.status === 'retired').every(watch => watch.retiredAt === now), 'retirement is timestamped');

const target = base[2];
const replacedOne = watchlist.replaceOne(base, target, candidates[0], now);
eq(watchlist.activeWatches(replacedOne).length, 5, 'single replacement keeps the set size');
check(replacedOne.find(watch => watch.id === target.id).status === 'retired', 'the replaced row is retired');
check(replacedOne.find(watch => watch.hotelId === 11) !== undefined, 'the new hotel is active');
const stillActive = replacedOne.filter(watch => watch.status === 'active');
check(stillActive.length === 5, 'single replacement keeps the set size');
check(base.filter(watch => watch.id !== target.id).every(original => stillActive.some(watch => watch.id === original.id)), 'the other four keep their continuity');

const removed = watchlist.removeWatch(base, base[0], now);
eq(watchlist.activeWatches(removed).length, 4, 'removal leaves four active');
eq(watchlist.missingForRefresh(removed), true, 'a short set asks for a refresh');

// --- RollingGo adapter ---
(async () => {
const envelope = (payload, { isError = false, sse = false } = {}) => {
  const body = JSON.stringify({ jsonrpc: '2.0', id: 1, result: isError ? { isError: true } : { structuredContent: payload } });
  return sse ? 'event: message\ndata: ' + body + '\n\n' : body;
};
const recorded = [];
const fetcher = payload => async (url, init) => {
  recorded.push({ url, init });
  return new Response(envelope(payload), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

process.env.ROLLINGGO_API_KEY = 'test-key';
rollinggo.clearMarketCache();

const searchPayload = { hotelInformationList: [
  { hotelId: 101, name: '娄江雅居', address: '太仓市娄江新城', star: 3, tags: ['当地连锁', '提供大床房'], price: { hasPrice: true, lowestPrice: 328, currency: 'CNY', message: '含税起价' } },
  { hotelId: 102, name: '暂无报价酒店', address: '太仓市城厢镇', star: 4, price: { hasPrice: false, lowestPrice: 0, currency: 'CNY', message: '当日无可售' } },
  { name: '', address: '空名字' },
] };
const candidatesFound = await rollinggo.searchCandidates({ place: '太仓市娄江新城', start: '2026-11-13', nights: 1, size: 5, distanceInMeter: 3000, fetcher: fetcher(searchPayload) });
eq(candidatesFound.length, 2, 'candidates without a name are dropped');
eq(candidatesFound[0].hotelId, 101, 'candidate keeps the hotel id');
eq(candidatesFound[0].name, '娄江雅居', 'candidate keeps the name');
eq(candidatesFound[0].priceCny, 328, 'candidate keeps the price');
eq(candidatesFound[0].conditions, '含税起价', 'candidate keeps the conditions');
eq(candidatesFound[0].tags, ['当地连锁', '提供大床房'], 'provider tags are surfaced so the UI can show what these hotels are');
eq(candidatesFound[1].priceCny, null, 'a hotel without a price is null, not zero');
const sent = JSON.parse(recorded[0].init.body);
eq(sent.params.name, 'searchHotels', 'search uses the tools/call shape');
eq(recorded[0].init.headers.Authorization, 'Bearer test-key', 'bearer auth is attached');
check(recorded[0].init.body.includes('"stayNights":1'), 'stay nights are sent');
check(recorded[0].init.body.includes('"distanceInMeter":3000'), 'radius filter is sent when provided');

// cache: the same call must not hit the network twice
const before = recorded.length;
await rollinggo.searchCandidates({ place: '太仓市娄江新城', start: '2026-11-13', nights: 1, size: 5, distanceInMeter: 3000, fetcher: fetcher(searchPayload) });
eq(recorded.length, before, 'second identical search is served from cache');
rollinggo.clearMarketCache();
eq(rollinggo.marketCacheSize(), 0, 'cache can be cleared');

// detail mapping
const detailPayload = { roomRatePlans: [
  { roomName: '高级双床房', ratePlanId: 'plan-a', ratePlanName: '高级双床房(DELUXE 2-BED ROOM)', averagePrice: 206, currency: 'CNY', mealTypeStr: '含早餐', mealAmount: 2, cancelable: true, cancelPolicy: '免费取消截止至酒店当地时间 2026-11-11 18:00:00', bedTypeDescription: '双床', isOnRequest: false },
  { roomName: '大床房', ratePlanId: 'plan-b', ratePlanName: ', ,大床|1|1.8米', averagePrice: null, mealTypeStr: '不含早餐', cancelable: false, bedTypeDescription: '1 大床', isOnRequest: true },
] };
const quotes = await rollinggo.hotelQuotes({ hotelId: 101, name: '娄江雅居', start: '2026-11-13', end: '2026-11-14', fetcher: fetcher(detailPayload), observedAt: '2026-11-10T00:00:00Z' });
eq(quotes.length, 2, 'two room plans become two quotes');
eq(quotes[0].priceCny, 206, 'averagePrice is the provider starting rate for the stay');
eq(quotes[0].priceType, 'plan', 'detail quotes are plan prices, not starting prices');
eq(quotes[0].refundable, true, 'cancelable maps to refundable');
eq(quotes[0].breakfast, true, '含早餐 maps to breakfast included');
eq(quotes[0].roomClass, '双床', 'bed type maps to room class');
eq(quotes[0].status, 'available', 'a priced plan is available');
eq(quotes[0].saleableRoomTypes, 1, 'only one plan in this fixture has a price');
eq(quotes[1].status, 'no_saleable', 'a plan without a price is no_saleable');
eq(quotes[1].roomClass, '大床', 'unsaleable plan still reports its class');
eq(quotes[0].planId, 'plan-a', 'provider rate plan id is kept as a stable identity');
eq(quotes[1].breakfast, false, '不含早餐 must not be read as breakfast included');
check(typeof quotes[1].note === 'string' && quotes[1].note.includes('确认'), 'on-request plans are flagged');
eq(quotes[0].nights, 1, 'nights come from the date range');
eq(quotes[0].source, 'rollinggo', 'source is recorded');

// unknown detail shape fails loudly
rollinggo.clearMarketCache();
await assert.rejects(() => rollinggo.hotelQuotes({ hotelId: 101, name: 'x', start: '2026-11-13', end: '2026-11-14', fetcher: fetcher({ unexpected: true }) }), /market_detail_shape_unknown/);
await assert.rejects(() => rollinggo.searchCandidates({ place: 'x', start: '2026-11-13', nights: 1, fetcher: fetcher({ nope: 1 }) }), /market_shape_invalid/);

// tool error and http error
await assert.rejects(() => rollinggo.searchCandidates({ place: 'tool-error', start: '2026-11-13', nights: 1, fetcher: async () => new Response(envelope({}, { isError: true })) }), /market_tool_error/);
await assert.rejects(() => rollinggo.searchCandidates({ place: 'http-error', start: '2026-11-13', nights: 1, fetcher: async () => new Response('nope', { status: 503 }) }), /market_http_503/);

// SSE framing is accepted
rollinggo.clearMarketCache();
const sseCandidates = await rollinggo.searchCandidates({ place: 'sse-place', start: '2026-11-13', nights: 1, fetcher: async () => new Response(envelope(searchPayload, { sse: true })) });
eq(sseCandidates.length, 2, 'SSE framed responses are parsed');

// missing key
delete process.env.ROLLINGGO_API_KEY;
rollinggo.clearMarketCache();
await assert.rejects(() => rollinggo.searchCandidates({ place: 'missing-key', start: '2026-11-13', nights: 1, fetcher: async () => new Response('{}') }), /market_not_configured/);

console.log(JSON.stringify({ passed: checks, cases: ['demo watchlist', 'candidate ranking', 'replace all', 'replace one', 'remove', 'search mapping', 'cache', 'detail mapping', 'error surfaces', 'SSE framing', 'missing key'] }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
