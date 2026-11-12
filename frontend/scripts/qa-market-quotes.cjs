// Market quotes: deterministic aggregation, comparability gates and CSV validation. Pure node.
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

const { buildMarketSample, ownPosition, describeSample, percentile } = load('market/sample');
const { previewQuoteCsv, QUOTE_HEADER } = load('market/import');
const { demoQuotes, demoQuoteWindow } = load('market/demo-quotes');
let checks = 0;
const check = (value, message) => { assert.ok(value, message); checks += 1; };
const eq = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks += 1; };

// --- percentile ---
eq(percentile([], 0.5), null, 'empty percentile is null');
eq(percentile([100], 0.5), 100, 'single value percentile');
eq(percentile([100, 200], 0.5), 150, 'median interpolates two values');
eq(percentile([1, 2, 3, 4, 5], 0.25), 2, 'quartile on odd list');

// --- sample fixtures ---
const today = '2026-11-10';
const window = { start: '2026-11-13', end: '2026-11-15' };
let quoteId = 0;
const quote = (over = {}) => ({ id: 'q' + ++quoteId, source: 'manual', sourceName: 'Hotel ' + quoteId, capturedAt: '2026-11-10T10:00:00Z', stayDate: '2026-11-13', nights: 1, adults: 2, priceCny: 500, priceType: 'starting', status: 'available', roomClass: '大床', ...over });

let sample = buildMarketSample({ quotes: [], window, observedAt: '2026-11-10T12:00:00Z' });
eq(sample.stats, { n: 0, medianCny: null, p25Cny: null, p75Cny: null }, 'no quotes gives empty stats');
eq(sample.comparability, 'none', 'no quotes cannot compare');
check(sample.unknowns.some(text => text.includes('没有可计入统计')), 'empty sample explains the gap');
eq(sample.coverage.kind, 'none', 'empty sample coverage none');

sample = buildMarketSample({ quotes: [quote({ priceCny: 400 }), quote({ priceCny: 600 }), quote({ priceCny: 500 })], window, observedAt: '2026-11-10T12:00:00Z' });
eq(sample.stats, { n: 3, medianCny: 500, p25Cny: 450, p75Cny: 550 }, 'median and quartiles use counted prices');
eq(sample.comparability, 'strict', 'three quotes with one room class are strict');
check(!sample.unknowns.some(text => text.includes('样本不足')), 'enough sample does not warn about sample size');

sample = buildMarketSample({ quotes: [quote({ roomClass: '大床' }), quote({ roomClass: '双床' }), quote({ roomClass: '大床' })], window, observedAt: '2026-11-10T12:00:00Z' });
eq(sample.comparability, 'loose', 'mixed room classes are loose');
check(sample.unknowns.some(text => text.includes('房型')), 'loose comparability is disclosed');

sample = buildMarketSample({ quotes: [quote(), quote({ roomClass: undefined })], window, observedAt: '2026-11-10T12:00:00Z' });
eq(sample.comparability, 'none', 'two quotes cannot form a range');
check(sample.unknowns.some(text => text.includes('只有 2 条')), 'thin sample states the count');

// --- exclusions ---
sample = buildMarketSample({ quotes: [
  quote({ priceCny: 500 }),
  quote({ priceCny: 300, status: 'stale', dataAgeMinutes: 20 }),
  quote({ priceCny: 900, priceType: 'display' }),
  quote({ priceCny: null, status: 'no_saleable' }),
  quote({ priceCny: null, status: 'source_error' }),
  quote({ stayDate: '2026-11-20', priceCny: 700 }),
], window, observedAt: '2026-11-10T12:00:00Z' });
eq(sample.stats.n, 1, 'stale, display, no_saleable, error and out-of-window quotes are not counted');
eq(sample.stats.medianCny, 500, 'only the available quote sets the median');
eq(sample.delayed, 1, 'stale quote is counted as delayed');
check(sample.unknowns.some(text => text.includes('1 条样本延迟')), 'delay is disclosed');
check(sample.unknowns.some(text => text.includes('展示价')), 'display-only quote is disclosed');
check(sample.unknowns.some(text => text.includes('无可售')), 'no_saleable is disclosed');
check(sample.unknowns.some(text => text.includes('来源异常')), 'source failure is disclosed');

// --- invalid window ---
sample = buildMarketSample({ quotes: [quote()], window: { start: '2026-11-15', end: '2026-11-13' } });
eq(sample.coverage.kind, 'none', 'inverted window has no coverage');
check(sample.unknowns.includes('查询窗口无效'), 'inverted window is rejected');

// --- own position ---
const banded = buildMarketSample({ quotes: [quote({ priceCny: 400 }), quote({ priceCny: 500 }), quote({ priceCny: 600 }), quote({ priceCny: 700 })], window, observedAt: '2026-11-10T12:00:00Z' });
// P25 = 475, P75 = 625.
const below = ownPosition(banded, { min: 420, max: 460 });
check(below && below.positionPct === 0, 'own rate below the band clamps to 0');
const above = ownPosition(banded, { min: 700, max: 760 });
check(above && above.positionPct === 100, 'own rate above the band clamps to 100');
const inside = ownPosition(banded, { min: 560, max: 580 });
check(inside && inside.positionPct === 63 && inside.aboveMedian === true, 'own rate above the middle reports its share and above median');
const atMedian = ownPosition(banded, { min: 540, max: 560 });
check(atMedian && atMedian.aboveMedian === false, 'own rate exactly at the median is not reported as above it');
eq(ownPosition(banded, null), null, 'no own rates means no position');
eq(ownPosition(banded, { min: 0, max: 0 }), null, 'invalid own rates mean no position');
eq(ownPosition(sample, { min: 500, max: 600 }), null, 'thin sample blocks position');

// --- description ---
check(describeSample(banded).includes('中位数 ¥550'), 'description states median');
check(describeSample(banded).includes('房型档位一致'), 'strict sample says classes match');
eq(describeSample(buildMarketSample({ quotes: [], window })).startsWith('窗口内没有'), true, 'empty description is honest');

// --- demo quotes ---
const quotes = demoQuotes(today, '2026-11-10T12:00:00Z');
eq(quotes.length, 24, 'demo quotes cover 8 properties x 3 stay dates');
eq(demoQuoteWindow(today), { start: '2026-11-13', end: '2026-11-15' }, 'demo window starts in three days');
check(quotes.every(item => item.stayDate >= '2026-11-13' && item.stayDate <= '2026-11-15'), 'demo quotes stay inside the window');
eq(quotes.filter(item => item.status === 'available').length, 12, 'demo has twelve available quotes');
eq(quotes.filter(item => item.status === 'stale').length, 6, 'demo has two delayed properties');
check(quotes.filter(item => item.status === 'stale').every(item => typeof item.dataAgeMinutes === 'number'), 'delayed quotes carry an age');
check(quotes.filter(item => item.status === 'no_saleable' || item.status === 'source_error').every(item => item.priceCny === null), 'unavailable quotes carry no price');
const demoSample = buildMarketSample({ quotes, window: demoQuoteWindow(today) });
eq(demoSample.stats.n, 12, 'demo sample counts only available quotes');
check(demoSample.stats.medianCny > 400 && demoSample.stats.medianCny < 900, 'demo median is plausible');

// --- CSV import ---
const row = (over = {}) => ['manual', '湖畔雅居', '2026-11-10T10:00:00Z', '2026-11-13', '1', '2', '大床房', '大床', '520', 'starting', 'true', 'false', 'false', 'available', '3', '4', '', ''].map((value, index) => (over[index] !== undefined ? over[index] : value)).join(',');
let preview = previewQuoteCsv('wrong,header\n1,2');
check(preview.errors[0].message.includes('表头须为'), 'wrong header is rejected');

preview = previewQuoteCsv(QUOTE_HEADER + '\n' + row());
eq(preview.counts.valid, 1, 'valid row is accepted');
eq(preview.rows[0].quote.priceCny, 520, 'price is parsed');
eq(preview.rows[0].quote.refundable, true, 'boolean is parsed');
check(preview.rows[0].quote.id.includes('湖畔雅居'), 'stable id includes source name');

preview = previewQuoteCsv(QUOTE_HEADER + '\n' + row({ 3: '2026-02-30' }));
eq(preview.counts.invalid, 1, 'impossible date is rejected');

preview = previewQuoteCsv(QUOTE_HEADER + '\n' + row({ 8: '' }));
eq(preview.counts.invalid, 1, 'available quote without price is rejected');
check(preview.rows[0].error.includes('必须给出价格'), 'missing price error is specific');

preview = previewQuoteCsv(QUOTE_HEADER + '\n' + row({ 13: 'no_saleable' }));
eq(preview.counts.invalid, 1, 'no_saleable with a price is rejected');

preview = previewQuoteCsv(QUOTE_HEADER + '\n' + row({ 10: 'maybe' }));
eq(preview.counts.invalid, 1, 'unknown boolean is rejected');

preview = previewQuoteCsv(QUOTE_HEADER + '\n' + row({ 15: 'http://example.com/a' }));
eq(preview.counts.invalid, 1, 'non-https source url is rejected');

preview = previewQuoteCsv(QUOTE_HEADER + '\n' + row() + '\n' + row());
eq(preview.counts.valid, 1, 'duplicate row is not counted twice');
eq(preview.counts.duplicate, 1, 'duplicate row is reported');

preview = previewQuoteCsv(QUOTE_HEADER + '\n' + row().replace(',', '，'));
check(preview.counts.invalid + preview.counts.valid <= 1, 'row-level parse never throws');
const badColumn = row().split(',').slice(0, 5).join(',');
preview = previewQuoteCsv(QUOTE_HEADER + '\n' + badColumn);
eq(preview.counts.invalid, 1, 'wrong column count is rejected');
check(preview.errors[0].message.includes('列数'), 'column error names the problem');

console.log(JSON.stringify({ passed: checks, cases: ['percentile', 'median/quartiles', 'comparability gates', 'source exclusions', 'own position', 'description', 'demo quotes', 'csv validation'] }, null, 2));
