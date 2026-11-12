// Layer ②: turn the local Ctrip collector history into the standard quote CSV that the app
// imports. No browser, no network, no app imports — this file can run on any machine.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const historyFile = path.join(root, '.price-monitor', 'history.json');
const outFile = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(root, '..', 'tmp', 'ctrip-quotes.csv');
const jobFile = process.argv[3];
if (!fs.existsSync(historyFile)) { console.error('NO_HISTORY'); process.exit(1); }

const HEADER = 'source,source_name,captured_at,stay_date,nights,adults,room_type,room_class,price_cny,price_type,refundable,breakfast,taxes_included,status,saleable_room_types,total_room_types,note,source_url';
const STATUS = { observed: 'available', missing: 'missing', conflicting: 'unknown', not_accepting: 'no_saleable', login_required: 'source_error' };

const history = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
// Each hotel gets its own capturedAt, so a run is "everything captured around the newest stamp".
// Re-importing the same export must stay duplicate-safe downstream (id keys on hotel+date+stamp).
const latestAt = history.map(item => item.capturedAt).sort().at(-1);
const job = jobFile ? JSON.parse(fs.readFileSync(jobFile, 'utf8')) : null;
if (job && (!job.finishedAt || !job.startedAt || !Array.isArray(job.dates) || !Array.isArray(job.results))) {
  throw new Error('Select a finished collection job');
}
const jobHotels = job ? new Set(job.results.filter(row => !row.error).map(row => row.hotelId)) : null;
const batch = job
  ? history.filter(item => jobHotels.has(item.hotelId) && job.dates.includes(item.stayDate)
    && item.capturedAt >= job.startedAt && item.capturedAt <= job.finishedAt)
  : history.filter(item => Date.parse(item.capturedAt) >= Date.parse(latestAt) - 10 * 60 * 1000);
const csvCell = value => /[",\r\n]/.test(value) ? '"' + value.replaceAll('"', '""') + '"' : value;
const seen = new Set();
const rows = batch.filter(item => {
  const key = `${item.hotelId}:${item.stayDate}:${item.capturedAt}`;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
}).map(item => {
  const status = STATUS[item.status] || 'unknown';
  const price = status === 'available' && typeof item.amount === 'number' ? item.amount.toFixed(2) : '';
  return [
    'platform',
    item.hotelName,
    item.capturedAt,
    item.stayDate,
    String(item.nights ?? 1),
    String(item.adults ?? 2),
    '', '', // calendar reference: room type and class are never inferred
    price,
    'calendar',
    '', '', '', // refundable / breakfast / taxes unknown
    status,
    '', '',
    status === 'source_error' ? '携程需要登录才能取价' : '携程日历参考价，房型/早餐/退改未知',
    item.sourceUrl,
  ].map(csvCell).join(',');
});

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, [HEADER, ...rows].join('\n') + '\n');
console.log(JSON.stringify({ outFile, capturedAt: batch.map(item => item.capturedAt).sort().at(-1), rows: rows.length, hotels: [...new Set(batch.map(item => item.hotelName))] }, null, 2));
