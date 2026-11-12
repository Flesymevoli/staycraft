// One controlled live probe against RollingGo: list candidates, then pull real room rates for a
// few of them and print the provider keys so the tolerant mapper can be corrected.
// Reads the key from frontend/.env.local; never prints it. No retries, no booking tools.
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

// Load the private env file without echoing values.
const envFile = path.join(root, '.env.local');
for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match) process.env[match[1]] = match[2].replace(/^["']|["']$/g, '').trim();
}
if (!process.env.ROLLINGGO_API_KEY) throw new Error('ROLLINGGO_API_KEY missing');

const { searchCandidates, hotelQuotes, rawTool } = load('market/rollinggo');
const DAY = 86400000;
const shift = (day, offset) => new Date(Date.parse(day + 'T00:00:00Z') + offset * DAY).toISOString().slice(0, 10);
const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai' }).format(new Date());
const place = '江苏省苏州市太仓市娄江新城';
const start = shift(today, 3), end = shift(start, 1);
const report = { place, start, end };

(async () => {
  const candidates = await searchCandidates({ place, start, nights: 1, size: 6 });
  report.candidates = candidates.map(item => ({ hotelId: item.hotelId, name: item.name, star: item.star, priceCny: item.priceCny, conditions: item.conditions }));
  console.log('CANDIDATES ' + JSON.stringify(report.candidates));
  assert(candidates.length > 0, 'live search returned no candidates');

  const picked = candidates.filter(item => item.hotelId !== null).slice(0, 3);
  report.details = [];
  for (const candidate of picked) {
    const payload = await rawTool('getHotelDetail', {
      hotelId: candidate.hotelId,
      dateParam: { checkInDate: start, checkOutDate: end },
      occupancyParam: { adultCount: 2, roomCount: 1 },
      localeParam: { countryCode: 'CN', currency: 'CNY' },
    });
    const topKeys = payload && typeof payload === 'object' ? Object.keys(payload) : [];
    const nested = payload && typeof payload === 'object' && payload.data && typeof payload.data === 'object' ? Object.keys(payload.data) : [];
    // Show shape only (keys + a couple of scalars), never a full provider dump.
    const sample = {};
    const shallow = payload && typeof payload === 'object' ? payload : {};
    for (const key of topKeys.slice(0, 12)) {
      const value = shallow[key];
      sample[key] = Array.isArray(value) ? `array(${value.length})` : typeof value === 'object' && value !== null ? `object(${Object.keys(value).slice(0, 8).join(',')})` : value;
    }
    let quotes = null, error = null;
    try { quotes = await hotelQuotes({ hotelId: candidate.hotelId, name: candidate.name, start, end }); } catch (caught) { error = caught instanceof Error ? caught.message : String(caught); }
    const plans = payload && typeof payload === 'object' ? payload.roomRatePlans : null;
    const planSample = Array.isArray(plans) && plans[0] && typeof plans[0] === 'object'
      ? Object.fromEntries(Object.entries(plans[0]).slice(0, 24).map(([key, value]) => [key, Array.isArray(value) ? `array(${value.length})` : value !== null && typeof value === 'object' ? `object(${Object.keys(value).slice(0, 8).join(',')})` : value]))
      : null;
    report.details.push({ hotelId: candidate.hotelId, name: candidate.name, topKeys, nestedKeys: nested, sample, planSample, quotes: quotes ? quotes.slice(0, 2) : null, error });
    console.log('DETAIL ' + JSON.stringify(report.details.at(-1)));
  }

  const parsed = report.details.filter(item => item.quotes && item.quotes.length > 0).length;
  report.parsedDetails = parsed;
  report.ok = parsed > 0;
  if (!report.ok) console.error('No provider detail payload could be mapped; inspect the keys above.');
  console.log('SUMMARY ' + JSON.stringify({ candidates: candidates.length, parsedDetails: parsed, ok: report.ok }));
  fs.writeFileSync(path.resolve(root, '..', 'tmp', 'live-market-probe.json'), JSON.stringify(report, null, 2));
  if (!report.ok) process.exitCode = 1;
})().catch(error => {
  console.error('PROBE FAILED ' + (error instanceof Error ? error.message : String(error)));
  process.exitCode = 1;
});
