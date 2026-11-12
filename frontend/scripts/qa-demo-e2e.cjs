// Demo-journey E2E on the isolated loopback server: login → diagnosis → opportunity
// card → save plan → check progress → CSV import (baseline + update). No production data.
const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const { chromium } = require('playwright');

const cwd = path.resolve(__dirname, '..');
const base = 'http://127.0.0.1:3114';
const shots = path.resolve(cwd, '..', 'tmp', 'decision-ui');
fs.mkdirSync(shots, { recursive: true });
const results = [];
const check = (name, condition, detail) => {
  results.push({ name, pass: Boolean(condition), detail: detail === undefined ? undefined : String(detail) });
  if (!condition) throw new Error('FAILED: ' + name + (detail === undefined ? '' : ' — ' + detail));
};

async function waitServer(deadlineMs = 60000) {
  const started = Date.now();
  while (Date.now() - started < deadlineMs) {
    try {
      const response = await fetch(base + '/login');
      if (response.ok) return true;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error('isolated server did not become ready');
}

(async () => {
  // The QA agent store persists across runs; start the isolated journey from a clean slate.
  fs.rmSync(path.join(cwd, '..', 'tmp', 'sample-agent-runs-v2.json'), { force: true });
  // Regenerate the demo export for today, then serve the non-rich sample so room nights stay free.
  const demoGen = require(path.join(cwd, 'scripts', 'demo-data', 'generate-demo-orders.cjs'));
  const nextBin = path.join(cwd, 'node_modules', 'next', 'dist', 'bin', 'next');
  const server = spawn(process.execPath, ['--require', path.join(cwd, 'scripts', 'qa-workspace-fixture.cjs'), nextBin, 'start', '--hostname', '127.0.0.1', '--port', '3114'], {
    cwd,
    stdio: 'ignore',
    windowsHide: true,
    env: { ...process.env, STAYCRAFT_SAMPLE_RICH: '0', STAYCRAFT_SAMPLE_LIVE_AMAP: '1', STAYCRAFT_QA_IMPORT_DB: '1', STAYCRAFT_OPERATOR_SAMPLE: '1', STAYCRAFT_QA_AUTH_FIXTURES: '1', HOMESTAY_LOCAL_DATA: '0', FORMAL_MODEL_ENABLED: '0', MODEL_ENABLED: '0', FORMAL_AUTO_REPLY_ENABLED: '0' },
  });
  let browser;
  try {
    await waitServer();
    browser = await chromium.launch();
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));

    // 1. login through the real form
    await page.goto(base + '/login');
    await page.locator('input[name=email]').fill('demo@example.invalid');
    await page.locator('input[name=password]').fill('staycraft-demo');
    await page.locator('.auth-submit').click();
    await page.waitForURL(base + '/app', { timeout: 30000 });
    check('login reaches the workbench', true);

    // 2. diagnosis run (model disabled: rules path plus deterministic detectors)
    await page.goto(base + '/app');
    await page.locator('.wb-diagnosis-head').waitFor({ timeout: 30000 });
    await page.locator('.wb-agent-summary').waitFor({ timeout: 120000 });
    const runState = await page.evaluate(async () => {
      const response = await fetch('/api/workspace/agent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ language: 'zh' }) });
      const body = await response.json();
      return { status: response.status, hasRun: Boolean(body.run), opportunities: body.run?.opportunities?.length ?? 0, signals: body.run?.signals?.length ?? 0, sources: body.run?.signalSources?.length ?? 0, hasSourcesField: Array.isArray(body.run?.signalSources), limitations: body.run?.limitations ?? [] };
    });
    check('diagnosis run succeeds', runState.status === 200 && runState.hasRun, JSON.stringify(runState));
    check('deterministic signals were produced', runState.signals > 0, runState.signals);
    check('opportunities were produced', runState.opportunities > 0, runState.opportunities);
    // Either the bundle records sources, or the run explicitly explains why surroundings are missing.
    check('signal coverage is reported or explained', runState.hasSourcesField || runState.limitations.some(text => /周边|坐标|信号|surroundings|coordinate|signal/i.test(text)), JSON.stringify({sources:runState.sources,limitations:runState.limitations}));

    // 3. the card, evidence panel and plan panel render from that run
    await page.reload();
    await page.locator('.wb-agent-summary').waitFor({ timeout: 120000 });
    await page.locator('.oc-card').first().waitFor({ timeout: 20000 });
    check('homepage shows an opportunity card', await page.locator('.oc-card').count() > 0);
    await page.locator('.hl-card').first().waitFor({ timeout: 20000 });
    const headlineText = await page.locator('.hl-card').innerText();
    check('homepage shows one deterministic headline', /空房|预订|取消|渠道/.test(headlineText), headlineText.slice(0, 60));
    check('headline states it is rule-generated', headlineText.includes('确定性规则'), headlineText.slice(-40));
    check('homepage shows the evidence panel', await page.locator('.ep-panel').count() > 0);
    check('homepage shows the action-plan slot', await page.locator('.wb-plan-slot').count() > 0);
    const bodyText = await page.locator('.wb-plan-slot').innerText();
    check('plan starts unsaved', bodyText.includes('尚未保存行动计划'), bodyText.slice(0, 60));

    // 4. save the plan, then reload to prove it persisted in the run
    await page.locator('.wb-opportunity-row').getByRole('button', { name: '保存行动计划', exact: true }).first().click();
    await page.locator('.ap-panel .ap-item').first().waitFor({ timeout: 20000 });
    check('plan shows items after saving', await page.locator('.ap-panel .ap-item').count() > 0);
    await page.reload();
    await page.locator('.ap-panel .ap-item').first().waitFor({ timeout: 120000 });
    check('saved plan survives reload', await page.locator('.ap-panel .ap-item').count() > 0);

    // 5. complete an item, then check progress (no newer run: data insufficient)
    const toggle = page.locator('.ap-toggle').first();
    await toggle.click();
    await page.waitForTimeout(800);
    check('plan item can be marked done', (await page.locator('.ap-item-done').count()) > 0);
    await page.locator('.wb-plan-slot').getByRole('button', { name: '回看进展', exact: true }).click();
    await page.locator('.wb-plan-progress .wb-inline-note').waitFor({ timeout: 20000 });
    const progressText = await page.locator('.wb-plan-progress .wb-inline-note').innerText();
    check('progress reports a state', /数据不足|已改善|暂未改善/.test(progressText), progressText);
    check('progress without a newer run is not a success claim', progressText.includes('数据不足'), progressText);
    await page.screenshot({ path: path.join(shots, 'demo-journey-home.png'), fullPage: true });

    // 5b. promotion linkage: the saved diagnosis must open the plan panel without a model call
    const history = await (await context.request.get(base + '/api/workspace/agent?view=history')).json();
    const runId = history.history?.[0]?.id;
    check('history exposes the diagnosis run id', Boolean(runId), JSON.stringify(history).slice(0, 120));
    await page.goto(`${base}/app/promotion?runId=${runId}`);
    await page.locator('.promotion-plan-panel').waitFor({ timeout: 30000 });
    check('promotion page loads the diagnosis-linked plan panel', await page.locator('.promotion-plan-panel').count() > 0);
    const panelText = await page.locator('.promotion-plan-panel').innerText();
    check('promotion panel binds to the diagnosis or explains the fallback', /来自经营诊断|日常推广/.test(panelText), panelText.slice(0, 80));
    const generate = page.getByRole('button', { name: '生成推广草稿', exact: true });
    if (await generate.count()) {
      await generate.first().click();
      await page.locator('#workspace-promotion-copy').waitFor({ timeout: 20000 });
      const copy = await page.locator('#workspace-promotion-copy').inputValue();
      check('promotion copy comes from the library, not the model', copy.length > 20, copy.slice(0, 40));
    } else {
      check('promotion copy generator hidden without selected facts', true);
    }
    await page.screenshot({ path: path.join(shots, 'demo-journey-promotion.png'), fullPage: true });

    // 5c. market page: same-date competitor rates come from the quote sample, not a hotel list
    await page.goto(base + '/app/explore');
    await page.locator('.mo-panel').waitFor({ timeout: 30000 });
    await page.waitForTimeout(1200);
    const marketText = await page.locator('.mo-panel').innerText();
    check('market panel renders a same-date sample', /起价中位数|暂无样本|还没有可比较/.test(marketText), marketText.slice(0, 80));
    check('market panel never fabricates a price range from a thin sample', !/起价中位数/.test(marketText) || marketText.includes('P25'), marketText.slice(0, 80));
    await page.screenshot({ path: path.join(shots, 'demo-journey-market.png'), fullPage: true });

    // 6. CSV import: baseline then update, through the real isolated API
    const api = async (url, body, method = 'POST') => {
      const response = await context.request.fetch(base + url, { method, data: body, headers: { Origin: base, 'Content-Type': 'application/json' } });
      let data = null;
      try { data = await response.json(); } catch {}
      return { status: response.status(), data };
    };
    const readCsv = name => fs.readFileSync(path.join(cwd, 'scripts', 'demo-data', name), 'utf8');
    const baseline = readCsv('orders-baseline.csv');
    const stateBefore = await context.request.get(base + '/api/workspace/booking-import?view=state');
    const stateBeforeBody = await stateBefore.json().catch(() => null);
    let preview = await api('/api/workspace/booking-import', { csv: baseline, commit: false });
    check('baseline preview succeeds', preview.status === 200, JSON.stringify({ status: preview.status, body: preview.data, batches: stateBeforeBody?.batches?.length, tasks: stateBeforeBody?.tasks?.length }));
    check('baseline has no invalid rows', preview.data?.rows?.every(row => row.action !== 'invalid'), JSON.stringify(preview.data?.rows?.filter(row => row.action === 'invalid')));
    const baselineCommit = await api('/api/workspace/booking-import', { csv: baseline, commit: true, revision: preview.data.revision });
    check('baseline import commits', baselineCommit.status === 200, baselineCommit.status);

    const update = readCsv('orders-update.csv');
    preview = await api('/api/workspace/booking-import', { csv: update, commit: false });
    check('update preview succeeds', preview.status === 200, preview.status);
    const actions = (preview.data?.rows || []).map(row => row.action);
    const count = action => actions.filter(value => value === action).length;
    check('update sees changed rows', count('updated') >= 1, JSON.stringify(actions));
    check('update sees the cancellation', count('cancelled') >= 1, JSON.stringify(actions));
    check('update sees new rows', count('new') >= 1, JSON.stringify(actions));
    check('update sees duplicates for unchanged rows', count('duplicate') >= 1, JSON.stringify(actions));
    const updateCommit = await api('/api/workspace/booking-import', { csv: update, commit: true, revision: preview.data.revision });
    check('update import commits', updateCommit.status === 200, updateCommit.status);

    // 7. the booked state reflects the update: the moved booking now starts on the moved date
    const bookings = await (await context.request.get(base + '/api/workspace/bookings')).json();
    const moved = (bookings.bookings || []).find(booking => booking.external_id === demoGen.movedExternalId);
    check('moved booking keeps one record', Boolean(moved), JSON.stringify({ expected: demoGen.movedExternalId, total: bookings.bookings?.length }));
    check('moved booking moved to the new date', moved?.arrival === demoGen.movedArrival, JSON.stringify({ actual: moved?.arrival, expected: demoGen.movedArrival }));
    const cancelled = (bookings.bookings || []).find(booking => booking.external_id === demoGen.cancelledExternalId);
    check('cancelled booking status updated', cancelled?.status === 'cancelled', cancelled?.status);

    check('no page errors during the journey', pageErrors.length === 0, pageErrors.join(' | '));
    console.log(JSON.stringify({ base, passed: results.filter(item => item.pass).length, failed: results.filter(item => !item.pass).length, results, shots }, null, 2));
  } finally {
    await browser?.close().catch(() => {});
    server.kill();
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
})().catch(error => {
  console.error(JSON.stringify({ failedAt: error.message, results }, null, 2));
  process.exitCode = 1;
});
