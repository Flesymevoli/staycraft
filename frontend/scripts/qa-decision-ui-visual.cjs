// Visual check for the decision UI at phone/tablet/desktop widths. Renders the real
// components to static markup, then screenshots them in Chromium. Writes only to tmp/.
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const shots = path.resolve(root, '..', 'tmp', 'decision-ui');
fs.mkdirSync(shots, { recursive: true });

function load(file) {
  const mod = new Module(file);
  mod.require = name => (name.endsWith('.css') ? {} : require(name));
  mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText, file);
  return mod.exports;
}

const { OpportunityCard } = load(path.join(root, 'src/components/opportunity-card.tsx'));
const { EvidencePanel } = load(path.join(root, 'src/components/evidence-panel.tsx'));
const { ActionPlanPanel } = load(path.join(root, 'src/components/action-plan-panel.tsx'));
const css = ['opportunity-card', 'evidence-panel', 'action-plan-panel'].map(name => fs.readFileSync(path.join(root, 'src/components', name + '.css'), 'utf8')).join('\n');

const window_ = { start: '2026-11-19', end: '2026-11-21' };
const signal = { id: 's1', kind: 'gap_window', window: window_, metric: { name: '连续空房间夜', unit: 'room_nights', value: 9 }, baseline: { kind: 'capacity_ratio', value: null, samples: 4 }, threshold: { op: 'gt', value: 3 }, severity: 'high', confidence: 'medium', evidenceIds: ['metrics:2026-11-19'], unknowns: [] };
const missing = { id: 's2', kind: 'cancellation_rate', window: window_, metric: { name: '取消率', unit: 'pct', value: null }, baseline: { kind: 'prior_period', value: null, samples: 0 }, threshold: { op: 'gt', value: 20 }, severity: 'low', confidence: 'low', evidenceIds: ['bookings'], unknowns: ['no prior window'] };

const opportunity = {
  id: 'opp-1', kind: 'opportunity', title: '11-19 至 11-21 连续三晚空房集中',
  window: window_, claim: '这三晚仍有 9 个间夜未订，先把房源展示与价目核对清楚，再决定是否做定向推广。',
  basis: [signal], actions: [{ title: '核对这三晚的房源展示与价目', target: 'data' }, { title: '对空房日期做一次定向推广测试', target: 'promotion' }],
  coverage: '内部指标覆盖 11-19 至 11-21；未获取市场报价', unknowns: ['未取得同档竞品报价'],
};
const sources = [
  { id: 'weather', authority: 'public', observedAt: '2026-11-10T12:00:00.000Z', coverage: { from: '2026-11-10', to: '2026-11-25', kind: 'complete' }, confidence: 'high' },
  { id: 'events', authority: 'manual', observedAt: '2026-11-10T12:00:00.000Z', coverage: { from: '2026-11-10', to: '2026-11-25', kind: 'partial' }, confidence: 'low', note: '活动日期为人工维护，未与主办方核实' },
  { id: 'competitor', authority: 'manual', observedAt: '2026-11-10T12:00:00.000Z', coverage: { from: '2026-11-18', to: '2026-11-20', kind: 'partial' }, confidence: 'medium' },
];
const plan = {
  id: 'plan-abc', runId: 'run-1', opportunityId: 'opp-1', createdAt: '2026-11-10T10:00:00.000Z',
  items: [{ id: 'item-1', title: '核对这三晚的房源展示与价目', status: 'done' }, { id: 'item-2', title: '对空房日期做一次定向推广测试', status: 'planned' }],
  followUpAt: '2026-11-11', metricBaseline: { name: '连续空房间夜', value: 9, direction: 'lower_better' },
};

const markup = [
  renderToStaticMarkup(React.createElement(OpportunityCard, { opportunity, zh: true, onPrimaryAction: () => {} })),
  renderToStaticMarkup(React.createElement(EvidencePanel, { sources, signals: [signal, missing], zh: true })),
  renderToStaticMarkup(React.createElement(ActionPlanPanel, { plan, zh: true, onToggleItem: () => {} })),
].join('\n');

const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>html,body{margin:0;background:#fafafb;color:#18181b;font-family:system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:720px;margin:0 auto;padding:16px;display:grid;gap:16px}aside{font:12px/1.6 ui-monospace,monospace;color:#62626c}</style>
<style>${css}</style></head><body><main>${markup}</main></body></html>`;

(async () => {
  const browser = await chromium.launch();
  const results = [];
  try {
    for (const width of [320, 390, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      await page.setContent(html, { waitUntil: 'load' });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      const tinyTargets = await page.evaluate(() => [...document.querySelectorAll('button')].filter(button => button.getBoundingClientRect().height < 44).length);
      const text = await page.evaluate(() => document.body.innerText);
      const file = path.join(shots, `decision-ui-${width}.png`);
      await page.screenshot({ path: file, fullPage: true });
      results.push({ width, overflow, tinyTargets, hasClaim: text.includes('连续三晚空房集中'), hasNotAvailable: text.includes('未获取'), hasPlan: text.includes('行动计划'), hasFollowUp: text.includes('2026-11-11'), file: path.basename(file) });
      await page.close();
    }
  } finally {
    await browser.close();
  }
  const failed = results.filter(item => item.overflow > 1 || item.tinyTargets > 0 || !item.hasClaim || !item.hasNotAvailable || !item.hasPlan || !item.hasFollowUp);
  console.log(JSON.stringify({ shots: results, failed: failed.length, directory: shots }, null, 2));
  if (failed.length) process.exitCode = 1;
})();
