// One controlled live-model run on the isolated server. Explicitly authorised once:
// one diagnosis tool-loop + one report writing attempt + one semantic review.
// Never retries a failed model call and never prints secrets or prompts.
const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const { chromium } = require('playwright');

const cwd = path.resolve(__dirname, '..');
const base = 'http://127.0.0.1:3114';
const output = path.resolve(cwd, '..', 'tmp', 'live-model-run.json');

async function waitServer(deadlineMs = 90000) {
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
  fs.rmSync(path.join(cwd, '..', 'tmp', 'sample-agent-runs-v2.json'), { force: true });
  require(path.join(cwd, 'scripts', 'demo-data', 'generate-demo-orders.cjs'));
  const nextBin = path.join(cwd, 'node_modules', 'next', 'dist', 'bin', 'next');
  // Live model only. AMap/RollingGo stay offline so this run spends exactly one model workflow.
  const server = spawn(process.execPath, ['--require', path.join(cwd, 'scripts', 'qa-workspace-fixture.cjs'), nextBin, 'start', '--hostname', '127.0.0.1', '--port', '3114'], {
    cwd,
    stdio: 'ignore',
    windowsHide: true,
    env: {
      ...process.env,
      STAYCRAFT_SAMPLE_RICH: '0',
      STAYCRAFT_OPERATOR_SAMPLE: '1',
      STAYCRAFT_QA_AUTH_FIXTURES: '1',
      STAYCRAFT_QA_IMPORT_DB: '1',
      STAYCRAFT_SAMPLE_LIVE_MODEL: '1',
      MODEL_ENABLED: '1',
      FORMAL_MODEL_ENABLED: '1',
      HOMESTAY_LOCAL_DATA: '0',
      FORMAL_AUTO_REPLY_ENABLED: '0',
    },
  });
  const report = { startedAt: new Date().toISOString(), env: 'isolated loopback + live model, AMap/RollingGo offline' };
  let browser;
  try {
    await waitServer();
    browser = await chromium.launch();
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));

    await page.goto(base + '/login');
    await page.locator('input[name=email]').fill('demo@example.invalid');
    await page.locator('input[name=password]').fill('staycraft-demo');
    await page.locator('.auth-submit').click();
    await page.waitForURL(base + '/app', { timeout: 60000 });
    // Leaving the workbench immediately prevents its auto-diagnosis from racing this script.
    await page.goto('about:blank');
    report.login = 'form-ok';

    const call = async (body, timeoutMs) => {
      const response = await context.request.post(base + '/api/workspace/agent', { data: body, headers: { Origin: base }, timeout: timeoutMs, failOnStatusCode: false });
      let json = null;
      try { json = await response.json(); } catch {}
      return { status: response.status(), json };
    };

    // Stage 1: investigation tool loop (one model workflow).
    const diagnosisStarted = Date.now();
    const diagnosisCall = await call({ language: 'zh' }, 240000);
    const run = diagnosisCall.json?.run || {};
    report.diagnosis = {
      httpStatus: diagnosisCall.status,
      durationMs: Date.now() - diagnosisStarted,
      cached: diagnosisCall.json?.cached,
      runId: run.id,
      status: run.status,
      engine: run.engine,
      modelProvider: run.modelProvider,
      phase: run.phase,
      findings: Array.isArray(run.findings) ? run.findings.length : null,
      evidence: Array.isArray(run.evidence) ? run.evidence.map(item => item.kind) : null,
      signals: Array.isArray(run.signals) ? run.signals.length : null,
      opportunities: Array.isArray(run.opportunities) ? run.opportunities.length : null,
      steps: Array.isArray(run.steps) ? run.steps.map(step => ({ tool: step.tool, status: step.status, phase: step.phase, finishReason: step.finishReason, usage: step.usage })) : null,
      limitations: run.limitations,
      errorCode: run.errorCode || null,
    };

    // Stage 2: report writing + semantic review for the same run (no re-investigation).
    if (run.id && run.phase === 'investigated') {
      const writingStarted = Date.now();
      const writingCall = await call({ runId: run.id, language: 'zh' }, 300000);
      const writtenRun = writingCall.json?.run || {};
      report.writing = {
        httpStatus: writingCall.status,
        durationMs: Date.now() - writingStarted,
        phase: writtenRun.phase || null,
        status: writtenRun.status || null,
        engine: writtenRun.engine || null,
        modelProvider: writtenRun.modelProvider || null,
        reportAttempts: writtenRun.reportAttempts ?? null,
        errorCode: writtenRun.errorCode || null,
        report: writtenRun.report ? {
          title: writtenRun.report.title,
          sections: writtenRun.report.sections?.length ?? null,
          recommendations: writtenRun.report.recommendations?.length ?? null,
          uncertainties: writtenRun.report.uncertainties?.length ?? null,
        } : null,
        steps: Array.isArray(writtenRun.steps) ? writtenRun.steps.filter(step => step.phase === 'writing' || /报告|report/i.test(step.label || '')).map(step => ({ label: step.label, status: step.status, finishReason: step.finishReason, usage: step.usage })) : null,
      };
    } else {
      report.writing = { skipped: true, reason: 'run did not reach the investigated phase' };
    }

    report.pageErrors = pageErrors;
    report.ok = report.diagnosis.httpStatus === 200 && report.diagnosis.engine === 'model_v1' && (report.diagnosis.findings ?? 0) > 0;
    report.summary = {
      modelReached: report.diagnosis.engine === 'model_v1',
      provider: report.diagnosis.modelProvider || report.writing.modelProvider || null,
      reportCompleted: report.writing?.phase === 'complete',
      reportFailed: report.writing?.phase === 'writing_failed',
      failureCode: report.writing?.errorCode || report.diagnosis.errorCode || null,
    };
  } catch (error) {
    report.ok = false;
    report.failure = error instanceof Error ? error.message : String(error);
  } finally {
    await browser?.close().catch(() => {});
    server.kill();
    await new Promise(resolve => setTimeout(resolve, 1000));
    fs.writeFileSync(output, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  }
  if (!report.ok) process.exitCode = 1;
})();
