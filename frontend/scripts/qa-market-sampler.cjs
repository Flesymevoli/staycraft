// Watchlist sampling (one night at a time) and change detection. Pure node, injected fetcher.
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

const { sampleWatchlist, diffQuotes, eachDay } = load('market/sampler');
let checks = 0;
const check = (value, message) => { assert.ok(value, message); checks += 1; };
const eq = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks += 1; };

eq(eachDay('2026-11-13', '2026-11-15'), ['2026-11-13', '2026-11-14', '2026-11-15'], 'window days are inclusive');
eq(eachDay('2026-11-13', '2026-12-30').length, 31, 'day expansion is bounded');

const watch = (name, status = 'active') => ({ id: 'w-' + name, hotelId: name.length, name, status });
const quote = (over = {}) => ({ id: 'q', source: 'rollinggo', sourceName: 'A', capturedAt: '2026-11-10T00:00:00Z', stayDate: '2026-11-13', nights: 1, adults: 2, priceCny: 200, priceType: 'plan', status: 'available', roomClass: '大床', planId: 'p1', ...over });

(async () => {
  // --- one date at a time, per active hotel ---
  let calls = [];
  let outcome = await sampleWatchlist({
    watches: [watch('甲'), watch('乙'), watch('丙', 'retired')],
    start: '2026-11-13', end: '2026-11-14',
    fetchQuotes: async (item, stayDate) => { calls.push(`${item.name}:${stayDate}`); return [quote({ sourceName: item.name, stayDate, priceCny: item.name === '甲' ? 200 : 260 })]; },
  });
  eq(calls.length, 4, 'two dates x two active hotels; retired hotels are skipped');
  eq(outcome.sampledDates, ['2026-11-13', '2026-11-14'], 'every night is sampled separately');
  eq(outcome.quotes.length, 4, 'each night contributes its own quote');
  eq(outcome.sample.stats.n, 4, 'sample aggregates the per-night quotes');
  eq(outcome.errors, [], 'no errors on success');
  check(outcome.quotes.every(item => item.nights === 1), 'quotes are one-night quotes, never averaged across nights');

  // --- a failing hotel does not abort the rest ---
  calls = [];
  outcome = await sampleWatchlist({
    watches: [watch('甲'), watch('坏'), watch('乙')], start: '2026-11-13', end: '2026-11-13',
    fetchQuotes: async (item, stayDate) => { calls.push(item.name); if (item.name === '坏') throw new Error('provider_timeout'); return [quote({ sourceName: item.name, stayDate })]; },
  });
  eq(calls.length, 3, 'a failing hotel is still attempted once');
  eq(outcome.errors.length, 1, 'failure is reported, not swallowed');
  check(outcome.errors[0].includes('坏') && outcome.errors[0].includes('provider_timeout'), 'failure names the hotel and reason');
  eq(outcome.quotes.length, 2, 'the other hotels still contribute');

  // --- change detection ---
  const before = [quote({ priceCny: 200 }), quote({ priceCny: 300, roomType: '大床房' }), quote({ priceCny: null, status: 'no_saleable', planId: 'p3' }), quote({ priceCny: 500, planId: 'p4' })];
  const after = [
    quote({ priceCny: 150 }),                                   // drop 25%
    quote({ priceCny: 320, roomType: '大床房' }),                // rise ~6.7% but < 50 CNY
    quote({ priceCny: 180, status: 'available', planId: 'p3' }), // reopened
    // p4 missing entirely -> sold out
  ];
  let changes = diffQuotes(before, after);
  const kinds = changes.map(change => change.kind).sort();
  eq(kinds, ['drop', 'reopened', 'sold_out'], 'small absolute+percent changes are not reported');
  const drop = changes.find(change => change.kind === 'drop');
  check(drop && drop.previousCny === 200 && drop.currentCny === 150 && drop.label.includes('25%'), 'drop reports both prices and the percentage');
  check(changes.find(change => change.kind === 'sold_out').label.includes('未再取得报价'), 'a hotel missing from the new sample is reported as sold out');

  // thresholds are OR-ed (either the amount or the percentage triggers), matching the "do not spam" rule
  changes = diffQuotes([quote({ priceCny: 200 })], [quote({ priceCny: 176 })]);
  eq(changes.length, 1, 'a 12% drop is reported even when the absolute change is small');
  changes = diffQuotes([quote({ priceCny: 200 })], [quote({ priceCny: 194 })]);
  eq(changes.length, 0, 'a 3% drop of 6 CNY is ignored');
  changes = diffQuotes([quote({ priceCny: 200 })], [quote({ priceCny: 140 })], { minCny: 100, minPercent: 0.5 });
  eq(changes.length, 0, 'both thresholds can be raised together');

  // identity uses planId, so a different plan is not compared against another plan
  changes = diffQuotes([quote({ planId: 'p1', priceCny: 200 })], [quote({ planId: 'p2', priceCny: 500 })]);
  eq(changes.map(change => change.kind), ['new', 'sold_out'], 'different plan ids are separate series');

  // new quote appears
  changes = diffQuotes([], [quote({ priceCny: 210, planId: 'fresh' })]);
  eq(changes.map(change => change.kind), ['new'], 'first observation is new, not a rise');

  console.log(JSON.stringify({ passed: checks, cases: ['day expansion', 'per-night sampling', 'failure isolation', 'thresholds', 'drop/rise/reopened/sold_out/new', 'plan identity'] }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
