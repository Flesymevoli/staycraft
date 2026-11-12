// Deterministic action-plan contract: no network, no writes, no build.
const ts = require('typescript');
const fs = require('fs');
const path = require('path');

function load(relative) {
  const source = fs.readFileSync(path.join(__dirname, '..', relative), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const module = { exports: {} };
  const localRequire = name => name.startsWith('.') ? load(path.relative(path.join(__dirname,'..'),path.resolve(path.dirname(path.join(__dirname,'..',relative)),name+'.ts'))) : name.startsWith('@/') ? load('src/'+name.slice(2)+'.ts') : require(name);
  new Function('exports', 'module', 'require', js)(module.exports, module, localRequire);
  return module.exports;
}

let passed = 0;
const cases = [];
function check(name, condition) {
  if (!condition) throw new Error('FAILED: ' + name);
  passed++;
  cases.push(name);
}

const { buildActionPlan, comparePlanProgress, comparePlanValue } = load('src/lib/decisions/action-plan.ts');

const opportunity = {
  id: 'opp-1',
  kind: 'opportunity',
  title: '11-19 至 11-21 空房集中',
  window: { start: '2026-11-19', end: '2026-11-21' },
  claim: '窗口内有连续空房，值得先核对展示再决定推广。',
  basis: [{ id: 'sig-1', kind: 'gap_window', window: { start: '2026-11-19', end: '2026-11-21' }, metric: { name: 'open_room_nights', unit: 'room_nights', value: 9 }, baseline: { kind: 'capacity_ratio', value: null, samples: 3 }, threshold: { op: 'gt', value: 3 }, severity: 'medium', confidence: 'medium', evidenceIds: ['metrics:2026-11-19'], unknowns: [] }],
  actions: [{ title: '核对三天空房的房源展示', target: 'data' }, { title: '对空房日期做定向推广测试', target: 'promotion' }],
  coverage: '内部指标覆盖 11-19 至 11-21',
  unknowns: [],
};

// buildActionPlan
const plan = buildActionPlan({ runId: 'abcdef12-3456-7890-abcd-ef1234567890', opportunity, now: new Date('2026-11-10T10:00:00Z') });
check('plan keeps run id', plan.runId === 'abcdef12-3456-7890-abcd-ef1234567890');
check('plan links the opportunity', plan.opportunityId === 'opp-1');
check('plan id is stable prefixed', /^plan-[a-z0-9]{12}$/.test(plan.id));
check('items mirror actions', plan.items.length === 2 && plan.items[0].title === '核对三天空房的房源展示');
check('items start planned', plan.items.every(item => item.status === 'planned'));
check('follow-up is one day later', plan.followUpAt === '2026-11-11');
check('baseline takes the first signal', plan.metricBaseline.name === 'open_room_nights' && plan.metricBaseline.value === 9);

const many = buildActionPlan({ runId: 'r', opportunity: { ...opportunity, actions: [{ title: 'a', target: 'data' }, { title: 'b', target: 'data' }, { title: 'c', target: 'data' }, { title: 'd', target: 'data' }] }, now: new Date('2026-11-10T10:00:00Z') });
check('items are capped at three', many.items.length === 3);

const empty = buildActionPlan({ runId: 'r2', opportunity: { ...opportunity, actions: [], basis: [] }, now: new Date('2026-11-10T10:00:00Z') });
check('empty actions produce no items', empty.items.length === 0);
check('missing baseline stays null', empty.metricBaseline.value === null && empty.metricBaseline.name === 'booking_pace');

// comparePlanProgress
const signal = value => [{ id: 's', kind: 'gap_window', window: opportunity.window, metric: { name: 'open_room_nights', unit: 'room_nights', value }, baseline: { kind: 'capacity_ratio', value: null, samples: 3 }, threshold: { op: 'gt', value: 3 }, severity: 'medium', confidence: 'medium', evidenceIds: ['metrics:2026-11-19'], unknowns: [] }];

const noBaselinePlan = { ...plan, metricBaseline: { name: 'booking_pace', value: null } };
check('no baseline cannot be judged', comparePlanProgress({ plan: noBaselinePlan, latestSignals: signal(2), latestAt: '2026-11-12T00:00:00Z' }).state === 'insufficient');
check('no later run cannot be judged', comparePlanProgress({ plan, latestSignals: [], latestAt: '2026-11-12T00:00:00Z' }).state === 'insufficient');
const noTime = comparePlanProgress({ plan, latestSignals: signal(3) });
check('missing run time cannot be judged', noTime.state === 'insufficient');
check('older run cannot be judged', comparePlanProgress({ plan, latestSignals: signal(3), latestAt: '2026-11-10T09:00:00Z' }).state === 'insufficient');
check('missing metric name cannot be judged', comparePlanProgress({ plan, latestSignals: [{ ...signal(3)[0], metric: { name: 'other', unit: 'pct', value: 3 } }], latestAt: '2026-11-12T00:00:00Z' }).state === 'insufficient');
check('null metric cannot be judged', comparePlanProgress({ plan, latestSignals: signal(null), latestAt: '2026-11-12T00:00:00Z' }).state === 'insufficient');

const improved = comparePlanProgress({ plan, latestSignals: signal(2), latestAt: '2026-11-12T00:00:00Z' });
check('fewer open nights reads improved', improved.state === 'improved' && /由 9 间夜 变为 2 间夜/.test(improved.detail));
const declined = comparePlanProgress({ plan, latestSignals: signal(12), latestAt: '2026-11-12T00:00:00Z' });
check('more open nights reads not improved', declined.state === 'not_improved' && /12/.test(declined.detail));
const flat = comparePlanProgress({ plan, latestSignals: signal(9.4), latestAt: '2026-11-12T00:00:00Z' });
check('sub-unit movement stays flat', flat.state === 'not_improved' && /9\.4/.test(flat.detail));
const upward = { ...plan, metricBaseline: { ...plan.metricBaseline, name: 'booked_pct', unit: 'pct', value: 40, direction: 'higher_better' } };
check('direction flips the verdict', comparePlanProgress({ plan: upward, latestSignals: [{ ...signal(60)[0], metric: { name: 'booked_pct', unit: 'pct', value: 60 } }], latestAt: '2026-11-12T00:00:00Z' }).state === 'improved');
check('a different stay window cannot be compared', comparePlanProgress({ plan, latestSignals: [{ ...signal(2)[0], window: {start:'2026-11-20',end:'2026-11-22'} }], latestAt: '2026-11-12T00:00:00Z' }).state === 'insufficient');
check('detail is always a sentence', [improved, declined, flat, noTime].every(result => typeof result.detail === 'string' && result.detail.length > 0));

const consecutivePlan = {...plan, metricBaseline: {...plan.metricBaseline,name:'consecutive_open_nights',unit:'count',value:4}};
const unchanged = comparePlanValue(consecutivePlan,4);
check('unchanged daily records include consecutive nights and no outcome claim', unchanged.state==='not_improved' && unchanged.detail.includes('连续可售晚数仍为 4 晚') && unchanged.detail.includes('与保存计划时相同') && !unchanged.detail.includes('成效'));
check('fewer open nights preserve direction with units', comparePlanValue(consecutivePlan,2).state==='improved' && comparePlanValue(consecutivePlan,2).detail.includes('由 4 晚 变为 2 晚'));
check('rates include percent unit', comparePlanValue(upward,60).detail.includes('40%') && comparePlanValue(upward,60).detail.includes('60%'));
const {readPlanFollowUp}=load('src/lib/decisions/plan-follow-up.ts');
readPlanFollowUp({rpc(){throw Error('follow-up requested too early');}},'property',consecutivePlan,{demo:false,today:'2026-11-10',signal:new AbortController().signal}).then(result=>{
  check('before follow-up day describes schedule without reading metrics',result.state==='insufficient'&&result.detail.includes('2026-11-11')&&result.detail.includes('跟进'));
  console.log(JSON.stringify({ passed, cases }, null, 2));
}).catch(error=>{console.error(error);process.exitCode=1;});
