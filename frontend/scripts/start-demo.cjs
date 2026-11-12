// Starts the isolated Demo server: regenerates today's demo CSV, serves the in-memory
// sample on loopback, and prints the exact URL and demo credentials. Never touches the
// production database. `--model` additionally enables the real model (needs full access
// on Windows and will spend model calls on each diagnosis).
const { spawn } = require('node:child_process');
const path = require('node:path');

const cwd = path.resolve(__dirname, '..');
const port = Number(process.env.DEMO_PORT || 3114);
const withModel = process.argv.includes('--model');
if (process.env.VERCEL === '1' || process.env.STAYCRAFT_HOSTED === '1') throw new Error('Local demo cannot run on hosted deployments');

require(path.join(cwd, 'scripts', 'demo-data', 'generate-demo-orders.cjs'));

const nextBin = path.join(cwd, 'node_modules', 'next', 'dist', 'bin', 'next');
const child = spawn(process.execPath, ['--require', path.join(cwd, 'scripts', 'qa-workspace-fixture.cjs'), nextBin, 'start', '--hostname', '127.0.0.1', '--port', String(port)], {
  cwd,
  stdio: 'inherit',
  windowsHide: true,
  env: {
    ...process.env,
    STAYCRAFT_SAMPLE_RICH: '1',
    STAYCRAFT_OPERATOR_SAMPLE: '1',
    STAYCRAFT_QA_AUTH_FIXTURES: '1',
    STAYCRAFT_QA_IMPORT_DB: '1',
    STAYCRAFT_SAMPLE_LIVE_AMAP: process.env.DEMO_LIVE_AMAP === '1' ? '1' : '0',
    STAYCRAFT_SAMPLE_LIVE_MODEL: withModel ? '1' : '0',
    MODEL_ENABLED: withModel ? '1' : '0',
    FORMAL_MODEL_ENABLED: withModel ? '1' : '0',
    FORMAL_AUTO_REPLY_ENABLED: '0',
    HOMESTAY_LOCAL_DATA: '0',
  },
});

console.log('');
console.log('StayCraft 隔离演示：http://127.0.0.1:' + port + '/login');
console.log('登录：demo@example.invalid / staycraft-demo（仅本机演示凭据，不是真实账号）');
console.log('经营数据只在内存；' + (withModel ? '已开启真实模型（会产生模型调用）。' : '模型关闭：诊断走规则摘要 + 确定性信号。'));
console.log('外部地图/竞价：' + (process.env.DEMO_LIVE_AMAP === '1' ? '已开启（会访问高德/RollingGo）' : '关闭（天气/报价显示未获取）'));
console.log('退出：Ctrl+C');
console.log('');

const stop = () => child.kill();
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
child.on('error', error => { console.error(error); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 0; });
