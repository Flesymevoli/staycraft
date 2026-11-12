// Ctrip calendar observations -> Quote bridge, plus the aggregation consequence (calendar prices
// can never form a strict band). Pure node.
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

const { observationToQuote, observationsToQuotes } = load('market/ctrip');
const { buildMarketSample } = load('market/sample');
let checks = 0;
const check = (value, message) => { assert.ok(value, message); checks += 1; };
const eq = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks += 1; };

const observation = (over = {}) => ({ hotelId: '2132616', hotelName: '杭州沐曦民宿(西湖店)', sourceUrl: 'https://hotels.ctrip.com/hotels/2132616.html', authScope: 'member:00000000-0000-4000-8000-000000000001', capturedAt: '2026-11-10T10:00:00.000Z', stayDate: '2026-11-13', amount: 388, currency: 'CNY', kind: 'calendar_reference', status: 'observed', rooms: 1, adults: 2, children: 0, nights: 1, ...over });

let quote = observationToQuote(observation());
eq(quote.source, 'platform', 'ctrip observations are a platform source');
eq(quote.priceType, 'calendar', 'calendar prices are tagged, never disguised as a plan price');
eq(quote.priceCny, 388, 'observed amount is kept');
eq(quote.status, 'available', 'observed maps to available');
eq(quote.roomType, undefined, 'calendar price never invents a room type');
eq(quote.roomClass, undefined, 'calendar price never invents a room class');
eq(quote.refundable, undefined, 'calendar price never invents refund terms');
eq(quote.breakfast, undefined, 'calendar price never invents meal terms');
check(quote.note.includes('参考价'), 'the note states it is a reference price');
eq(quote.nights, 1, 'one night per observation');

eq(observationToQuote(observation({ status: 'not_accepting', amount: null })).status, 'no_saleable', 'not accepting maps to no_saleable');
eq(observationToQuote(observation({ status: 'login_required', amount: null })).status, 'source_error', 'login required is a source error, not a price of zero');
eq(observationToQuote(observation({ status: 'conflicting', amount: null })).status, 'unknown', 'conflicting values are unknown, not averaged');
eq(observationToQuote(observation({ status: 'missing', amount: null })).priceCny, null, 'missing has no price');

// aggregation: calendar prices count as a band but can never be strict
const calendarBand = observationsToQuotes([
  observation({ amount: 388 }), observation({ hotelId:'2', hotelName:'测试乙', sourceUrl:'https://hotels.ctrip.com/hotels/2.html', stayDate: '2026-11-14', amount: 420 }), observation({ hotelId:'3', hotelName:'测试丙', sourceUrl:'https://hotels.ctrip.com/hotels/3.html', stayDate: '2026-11-15', amount: 460 }),
]);
eq(calendarBand.length, 3, 'all observations are converted');
const sample = buildMarketSample({ quotes: calendarBand, window: { start: '2026-11-13', end: '2026-11-15' }, observedAt: '2026-11-10T12:00:00Z' });
eq(sample.stats.n, 3, 'calendar prices are counted in the band');
eq(sample.comparability, 'loose', 'calendar prices can never form a strict comparable band');
check(sample.unknowns.some(text => text.includes('日历参考价')), 'the calendar caveat is disclosed');
check(sample.unknowns.some(text => text.includes('房型')), 'unmatched room condition is disclosed');

// display prices are still excluded even when they come from the same source shape
const withDisplay = [...calendarBand, { ...calendarBand[0], id: 'display', priceType: 'display', priceCny: 999 }];
eq(buildMarketSample({ quotes: withDisplay, window: { start: '2026-11-13', end: '2026-11-15' } }).stats.n, 3, 'display prices stay out of the band');

// a proper plan price mixed with a calendar price is not strict either
const mixed = [{ ...calendarBand[0] }, { id: 'plan-a', source: 'rollinggo', sourceName: 'A', sourceUrl: undefined, capturedAt: '2026-11-10T10:00:00Z', stayDate: '2026-11-13', nights: 1, adults: 2, roomType: '大床房', roomClass: '大床', priceCny: 520, priceType: 'plan', status: 'available' }, { ...calendarBand[2], priceCny: 500, id: 'plan-b', priceType: 'plan', roomClass: '大床' }];
eq(buildMarketSample({ quotes: mixed, window: { start: '2026-11-13', end: '2026-11-15' } }).comparability, 'loose', 'mixing calendar and plan prices is loose');

// guard: malformed observations are skipped, not converted into zero prices
eq(observationsToQuotes([observation(), { hotelName: 'x' }, null]).length, 1, 'malformed observations are skipped');

console.log(JSON.stringify({ passed: checks, cases: ['status mapping', 'no invented terms', 'calendar band is loose', 'display excluded', 'mixed band', 'malformed skipped'] }, null, 2));
