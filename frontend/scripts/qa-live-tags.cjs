// One controlled probe: list RollingGo search tags and test filtering candidates down to homestays.
// Read-only tools only. Reads the key from frontend/.env.local and never prints it.
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

for (const line of fs.readFileSync(path.join(root, '.env.local'), 'utf8').split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match) process.env[match[1]] = match[2].replace(/^["']|["']$/g, '').trim();
}
if (!process.env.ROLLINGGO_API_KEY) throw new Error('ROLLINGGO_API_KEY missing');

const { rawTool } = load('market/rollinggo');
const DAY = 86400000;
const shift = (day, offset) => new Date(Date.parse(day + 'T00:00:00Z') + offset * DAY).toISOString().slice(0, 10);
const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai' }).format(new Date());
const start = shift(today, 3);
const place = '江苏省苏州市太仓市娄江新城';

const names = list => (Array.isArray(list) ? list : []).map(item => (typeof item === 'string' ? item : item?.name)).filter(Boolean);

(async () => {
  const tagsPayload = await rawTool('getHotelSearchTags', {});
  const all = names(tagsPayload?.tags);
  const wanted = all.filter(name => /民宿|客栈|公寓|家庭旅馆|青年旅舍|度假|别墅|旅社|宾馆/.test(name));
  console.log('TAG_COUNT ' + all.length);
  console.log('TAG_MATCH ' + JSON.stringify(wanted));
  console.log('TAG_CATEGORIES ' + JSON.stringify([...new Set((tagsPayload?.tags || []).map(item => item?.category).filter(Boolean))]));

  const run = async requiredTags => {
    const payload = await rawTool('searchHotels', {
      originQuery: '查询太仓娄江新城附近民宿公开报价',
      place,
      placeType: '详细地址',
      checkInParam: { checkInDate: start, stayNights: 1, adultCount: 2 },
      ...(requiredTags ? { hotelTags: { requiredTags } } : {}),
      size: 8,
    });
    const list = Array.isArray(payload?.hotelInformationList) ? payload.hotelInformationList : [];
    return list.map(hotel => ({ name: hotel?.name, star: hotel?.star ?? hotel?.starRating, price: hotel?.price?.lowestPrice ?? null, tags: Array.isArray(hotel?.tags) ? hotel.tags.slice(0, 6) : undefined }));
  };

  const plain = await run(null);
  console.log('PLAIN ' + JSON.stringify(plain));
  const filtered = await run(['民宿']);
  console.log('FILTER_民宿 ' + JSON.stringify(filtered));
  const filteredAlt = await run(['客栈']);
  console.log('FILTER_客栈 ' + JSON.stringify(filteredAlt));
})().catch(error => { console.error('PROBE FAILED ' + (error instanceof Error ? error.message : String(error))); process.exitCode = 1; });
