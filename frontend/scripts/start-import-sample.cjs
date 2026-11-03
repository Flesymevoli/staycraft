// Separate, loopback-only in-memory preview. Never loaded by the deployed app.
const {spawn}=require('node:child_process');
const path=require('node:path');
if(process.env.VERCEL==='1'||process.env.STAYCRAFT_HOSTED==='1')throw new Error('Local sample cannot run on hosted deployments');
process.chdir(path.resolve(__dirname,'..'));
const child=spawn(process.execPath,['--require',path.join(__dirname,'qa-workspace-fixture.cjs'),'node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3114'],{
  env:{...process.env,STAYCRAFT_SAMPLE_LIVE_AMAP:'1',STAYCRAFT_QA_IMPORT_DB:'1',STAYCRAFT_SAMPLE_RICH:'1',STAYCRAFT_OPERATOR_SAMPLE:'1',STAYCRAFT_QA_AUTH_FIXTURES:'1',HOMESTAY_LOCAL_DATA:'0',FORMAL_AUTO_REPLY_ENABLED:'1',FORMAL_MODEL_ENABLED:'0',MODEL_ENABLED:'0'},stdio:'inherit',windowsHide:true,
});
console.log('StayCraft CSV导入隔离演示：http://127.0.0.1:3114/login');
console.log('登录：demo@example.invalid / staycraft-demo（仅本机演示凭据，不是真实账号）');
console.log('经营数据仅在内存；已允许高德只读周边查询，不连接正式经营库或AI服务。');
const stop=()=>child.kill();process.on('SIGINT',stop);process.on('SIGTERM',stop);
child.on('error',error=>{console.error(error);process.exitCode=1});
child.on('exit',code=>{process.exitCode=code??0});
