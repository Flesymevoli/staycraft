// One deterministic headline: priority order, numbers, and what is missing. Pure node.
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

const { buildHeadline } = load('decisions/headline');
const { buildOpportunities, selectPriorityOpportunities } = load('decisions/opportunity');
const {metricLabel,metricUnit}=load('decisions/labels');
let checks = 0;
const check = (value, message) => { assert.ok(value, message); checks += 1; };
const eq = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks += 1; };

const window = { start: '2026-11-13', end: '2026-11-16' };
const gap = { id: 'gap_window:2026-11-13:2026-11-16', kind: 'gap_window', window, metric: { name: 'consecutive_open_nights', unit: 'count', value: 4 }, baseline: { kind: 'capacity_ratio', value: null, samples: 6 }, threshold: { op: 'gt', value: 3 }, severity: 'high', confidence: 'medium', evidenceIds: ['e1'], unknowns: [] };
const pace = { id: 'booking_pace:2026-11-17:2026-11-23', kind: 'booking_pace', window: { start: '2026-11-17', end: '2026-11-23' }, metric: { name: 'booked_pct', unit: 'pct', value: 38 }, baseline: { kind: 'same_weekday_history', value: 52, samples: 6 }, threshold: { op: 'lt', value: 50 }, severity: 'high', confidence: 'medium', evidenceIds: ['e2'], unknowns: [] };
const cancel = { id: 'cancellation_rate:2026-11-03:2026-11-09', kind: 'cancellation_rate', window: { start: '2026-11-03', end: '2026-11-09' }, metric: { name: 'cancellation_rate', unit: 'pct', value: 18 }, baseline: { kind: 'prior_period', value: 9, samples: 14 }, threshold: { op: 'gt', value: 10 }, severity: 'medium', confidence: 'high', evidenceIds: ['e3'], unknowns: [] };
const channel = { id: 'channel_mix:2026-10-27:2026-11-09:direct', kind: 'channel_mix', window: { start: '2026-10-27', end: '2026-11-09' }, metric: { name: 'top_channel_share', unit: 'pct', value: 100 }, baseline: { kind: 'prior_period', value: null, samples: 4 }, threshold: { op: 'gt', value: 70 }, severity: 'medium', confidence: 'low', evidenceIds: ['e4'], unknowns: [] };

eq(metricLabel('consecutive_open_nights',true),'连续可售晚数','gap label describes nights');
eq(metricUnit('consecutive_open_nights','count',true),' 晚','gap units are nights, not room-nights');
eq(metricUnit('consecutive_open_nights','count',false),' nights','English gap unit');

// Empty input yields no headline at all, never a generic suggestion.
eq(buildHeadline({ zh: true }), null, 'no signals means no headline');
eq(buildHeadline({ signals: [], zh: true }), null, 'empty signals means no headline');

// gap_window outranks booking pace.
const dailyMetrics = ['2026-11-13','2026-11-14','2026-11-15','2026-11-16'].map(date => ({date,available:3}));
let headline = buildHeadline({ signals: [pace, gap], dailyMetrics, sources: [], zh: true });
eq(headline.source, 'gap_window', 'open-room window outranks booking pace');
check(headline.conclusion.includes('2026-11-13') && headline.conclusion.includes('连续 4 晚仍有空房') && headline.conclusion.includes('短住方案'), 'conclusion names the window and the action');
check(headline.reason.includes('12 个可售间夜') && headline.reason.includes('连续 4 晚'), 'reason carries both numbers');
eq(headline.kpis.map(item => item.value), ['12', '4', '4'], 'kpis carry sellable nights, consecutive nights and window days');
eq(headline.window, window, 'headline keeps the window');
headline = buildHeadline({signals:[gap],zh:true});
eq(headline.kpis[0].value, '—', 'legacy run without daily data does not treat consecutive nights as room-nights');
headline = buildHeadline({signals:[gap],dailyMetrics:dailyMetrics.slice(1),zh:true});
eq(headline.kpis[0].value, '—', 'partial daily availability cannot support a total');
headline = buildHeadline({signals:[gap],dailyMetrics:dailyMetrics.map(row=>({...row,available:5})),zh:true});
eq(headline.kpis[0].value, '20', 'changing capacity changes available room-nights without changing consecutive nights');

// booking pace when there is no gap window.
headline = buildHeadline({ signals: [pace], zh: true });
eq(headline.source, 'booking_pace', 'booking pace is used when no gap window exists');
check(headline.reason.includes('38%') && headline.reason.includes('52%'), 'pace reason cites current and baseline');
eq(headline.kpis.map(item => item.value), ['38%', '52%', '-14 pp'], 'pace kpis show the gap');

// price/volume divergence gets its own headline, ahead of booking pace.
const price = { ...pace, id: 'price_volume_divergence:2026-11-17:2026-11-23:average_price', kind: 'price_volume_divergence', metric: { name: 'average_price', unit: 'cny', value: 640 }, baseline: { kind: 'prior_period', value: 600, samples: 12 } };
const nights = {...price,id:'price_volume_divergence:2026-11-17:2026-11-23:room_nights',metric:{name:'room_nights',unit:'room_nights',value:20},baseline:{kind:'prior_period',value:30,samples:12}};
headline = buildHeadline({ signals: [pace, price, nights], zh: true });
eq(headline.source, 'price_volume_divergence', 'price divergence outranks booking pace');
check(headline.conclusion.includes('背离') && headline.conclusion.includes('调价'), 'price headline names the divergence and the action');
check(headline.reason.includes('¥640') && headline.reason.includes('¥600'), 'price reason cites both averages');
check(headline.reason.includes('核对各房型') && !headline.reason.includes('需求旺盛'), 'price reason gives an evidence-led action without a demand claim');

// cancellation then channel.
headline = buildHeadline({ signals: [channel, cancel], zh: true });
eq(headline.source, 'cancellation_rate', 'cancellation outranks channel mix');
check(headline.conclusion.includes('取消率'), 'cancellation conclusion is a risk');
headline = buildHeadline({ signals: [channel], zh: true });
eq(headline.source, 'channel_mix', 'channel mix is the last deterministic fallback');
check(headline.conclusion.includes('直客'), 'channel name is localised, not a raw value');
check(headline.reason.includes('100%'), 'channel reason cites the share');

// A real priority-card selection is authoritative for both conclusion and date window.
const highRisk = {...channel, severity:'high', confidence:'high'};
const lowGap = {...gap, severity:'medium'};
const mixedSignals = [lowGap, highRisk, {...pace, metric:{...pace.metric,value:null}, unknowns:['缺少可比快照']}];
const mixedOpportunities = buildOpportunities({signals:mixedSignals});
headline = buildHeadline({signals:mixedSignals,opportunities:mixedOpportunities,dailyMetrics,zh:true});
eq(headline.source,'channel_mix','a higher-priority risk also leads the headline');
eq(headline.window,selectPriorityOpportunities(mixedOpportunities,2)[0].window,'headline and first priority card share their window');
check(headline.gaps.includes('缺少可比快照'),'other signals retain their data-gap messages');
const laterGap = {...gap,id:'gap_window:2026-11-20:2026-11-25',window:{start:'2026-11-20',end:'2026-11-25'},metric:{...gap.metric,value:6},severity:'high'};
const gapSignals = [lowGap,laterGap];
const gapOpportunities = buildOpportunities({signals:gapSignals});
headline = buildHeadline({signals:gapSignals,opportunities:gapOpportunities,zh:true});
eq(headline.window,laterGap.window,'same-family windows choose the same higher-priority gap for headline and card');
eq(buildHeadline({signals:[lowGap,highRisk],opportunities:[],zh:true}).source,'gap_window','no valid opportunity preserves the established signal fallback');
eq(buildHeadline({signals:[lowGap,highRisk],opportunities:[{...mixedOpportunities[0],basis:[]}],zh:true}).source,'gap_window','unsupported stored cards cannot override the fallback');

// Null metric values cannot support a claim.
eq(buildHeadline({ signals: [gap.metric.value === null ? gap : { ...gap, metric: { ...gap.metric, value: null } }], zh: true }), null, 'a null metric cannot produce a headline');
eq(buildHeadline({ signals: [{ ...pace, metric: { ...pace.metric, value: null } }], zh: true }), null, 'a null pace metric cannot produce a headline');

// Missing comparison baselines cannot establish a decline or divergence in saved runs.
for(const value of [null,0,NaN,Infinity]){
 const brokenPace={...pace,baseline:{...pace.baseline,value}};
 const brokenPrice={...price,baseline:{...price.baseline,value}};
 for(const zh of [true,false]){
  eq(buildHeadline({signals:[brokenPace],zh}),null,`invalid pace baseline ${value} has no conclusion`);
  eq(buildHeadline({signals:[brokenPrice,nights],zh}),null,`invalid price baseline ${value} has no conclusion`);
  eq(buildHeadline({signals:[price,{...nights,baseline:{...nights.baseline,value}}],zh}),null,`invalid nights baseline ${value} has no conclusion`);
  const fallback=buildHeadline({signals:[brokenPace,brokenPrice,nights,channel],opportunities:[],zh});
  eq(fallback.source,'channel_mix','valid current channel concentration remains available without historical comparisons');
  check(!/NaN|Infinity/.test(JSON.stringify(fallback)),'fallback never renders nonfinite numbers');
 }
}
eq(buildHeadline({signals:[price],zh:true}),null,'price without its room-night pair cannot establish divergence');
eq(buildHeadline({signals:[nights],zh:true}),null,'room-night count cannot be interpreted as a price');
eq(buildHeadline({signals:[price,{...nights,window:gap.window}],zh:true}),null,'price and volume from different windows cannot be paired');
eq(buildHeadline({signals:[nights,price],zh:true}).source,'price_volume_divergence','reversed complete price pair remains supported');
eq(buildHeadline({signals:[gap],zh:true}).source,'gap_window','an open-room gap needs no historical baseline');

// Gaps come from sources and unknowns.
headline = buildHeadline({ signals: [gap], sources: [
  { id: 'weather', authority: 'public', observedAt: '2026-11-10T00:00:00Z', coverage: { from: '2026-11-10', to: '2026-11-25', kind: 'none' }, confidence: 'low', note: 'weather_unavailable' },
  { id: 'events', authority: 'manual', observedAt: '2026-11-10T00:00:00Z', coverage: { from: '2026-11-10', to: '2026-11-25', kind: 'partial' }, confidence: 'low' },
  { id: 'competitor', authority: 'manual', observedAt: '2026-11-10T00:00:00Z', coverage: { from: '2026-11-18', to: '2026-11-20', kind: 'complete' }, confidence: 'medium' },
], zh: true });
check(headline.gaps.includes('天气未获取'), 'missing source is reported');
check(headline.gaps.includes('本地活动仅部分'), 'partial source is reported');
check(!headline.gaps.some(gapText => gapText.includes('周边报价')), 'complete source is not reported as a gap');

// Unknowns from signals are surfaced but bounded.
headline = buildHeadline({ signals: [{ ...gap, unknowns: ['u1', 'u2', 'u3', 'u4', 'u5'] }], zh: true });
check(headline.gaps.length <= 4, 'gap list stays short');

// English rendering.
headline = buildHeadline({ signals: [gap], zh: false });
check(headline.conclusion.includes('Rooms remain open for 4 consecutive nights'), 'english conclusion is generated');
check(headline.kpis[0].label === 'Sellable nights', 'english kpi label');

const saturday={date:'2026-11-14',booked:5,capacity:5,available:0};
headline=buildHeadline({dailyMetrics:[saturday],zh:true});check(headline.conclusion.includes('周六已满房'),'full Saturday gives a direct action');check(headline.reason.includes('5/5')&&headline.reason.includes('已订订单不改价'),'action retains exact capacity and existing prices');
for(const invalid of [{...saturday,booked:4,available:1},{...saturday,capacity:0,booked:0},{...saturday,booked:6}])eq(buildHeadline({dailyMetrics:[invalid],zh:true}),null,'only genuinely full valid inventory supports the full-Saturday advice');
console.log(JSON.stringify({ passed: checks, cases: ['priority order', 'gap window', 'booking pace', 'cancellation', 'channel mix', 'null metrics', 'source gaps', 'bounded unknowns', 'english'] }, null, 2));
