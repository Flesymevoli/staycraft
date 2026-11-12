// Reads the local Ctrip collector history and shows what the market sample would look like.
// Read-only: no browser, no network, no writes.
const fs = require('node:fs');
const path = require('node:path');
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

const { observationsToQuotes } = load('market/ctrip');
const { buildMarketSample, describeSample } = load('market/sample');
const { diffQuotes } = load('market/sampler');

const historyFile = path.join(root, '.price-monitor', 'history.json');
if (!fs.existsSync(historyFile)) { console.log('NO_HISTORY'); process.exit(0); }
const history = JSON.parse(fs.readFileSync(historyFile, 'utf8'));

// Group by capture time, newest first.
const byCapture = new Map();
for (const observation of history) {
  const key = observation.capturedAt;
  if (!byCapture.has(key)) byCapture.set(key, []);
  byCapture.get(key).push(observation);
}
const captures = [...byCapture.entries()].sort((left, right) => (left[0] < right[0] ? 1 : -1));
const [latestAt, latest] = captures[0];
const dates = [...new Set(latest.map(observation => observation.stayDate))].sort();
const window = { start: dates[0], end: dates[dates.length - 1] };

// One sample per stay date is more honest for monitoring; here we show the aggregated view too.
const quotes = observationsToQuotes(latest);
const sample = buildMarketSample({ quotes, window });
const perDate = dates.map(date => {
  const forDate = quotes.filter(quote => quote.stayDate === date);
  const prices = forDate.filter(quote => quote.priceCny !== null).map(quote => quote.priceCny).sort((a, b) => a - b);
  return { date, hotels: forDate.map(quote => ({ name: quote.sourceName, priceCny: quote.priceCny, status: quote.status })), median: prices.length ? prices[Math.floor(prices.length / 2)] : null };
});

let changes = [];
if (captures[1]) changes = diffQuotes(observationsToQuotes(captures[1][1]), quotes);

console.log(JSON.stringify({
  latestAt,
  window,
  hotels: [...new Set(latest.map(observation => observation.hotelName))],
  perDate,
  sample: { n: sample.stats.n, medianCny: sample.stats.medianCny, p25Cny: sample.stats.p25Cny, p75Cny: sample.stats.p75Cny, comparability: sample.comparability, unknowns: sample.unknowns },
  description: describeSample(sample),
  changes,
  capturesAvailable: captures.length,
}, null, 2));
