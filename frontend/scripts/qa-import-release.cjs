// Current import-based release checks. Old guest-message tests belong to the retired version.
const {spawn}=require('node:child_process'),path=require('node:path'),fs=require('node:fs');
process.chdir(path.resolve(__dirname,'..'));
const port=3174,base=`http://127.0.0.1:${port}`,results=[];
function run(file,env={}){return new Promise((resolve,reject)=>{const p=spawn(process.execPath,[path.join('scripts',file)],{env:{...process.env,...env},stdio:'inherit',windowsHide:true});p.once('error',reject);p.once('exit',code=>{results.push({file,passed:code===0});code===0?resolve():reject(Error(file+' failed: '+code))})})}
(async()=>{let server;try{
 for(const f of ['qa-booking-period.cjs','qa-business-analysis.cjs','qa-business-assistant.cjs','qa-promotion.cjs','qa-explore-advice.cjs','qa-revenue-source.cjs','qa-revenue-insights.cjs','qa-release-config.cjs','qa-retired-guest.mjs','qa-booking-csv.mjs','qa-booking-import-db.cjs','qa-price-observations.mjs','qa-price-monitor-dates.mjs','qa-price-watch-export.mjs'])await run(f);
 let output='';server=spawn(process.execPath,['--require',path.resolve('scripts/qa-workspace-fixture.cjs'),'node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{env:{...process.env,STAYCRAFT_QA_AUTH_FIXTURES:'1',STAYCRAFT_OPERATOR_SAMPLE:'1',STAYCRAFT_QA_IMPORT_DB:'1',FORMAL_AUTO_REPLY_ENABLED:'0',FORMAL_MODEL_ENABLED:'0',MODEL_ENABLED:'0',HOMESTAY_LOCAL_DATA:'0'},stdio:['ignore','pipe','pipe'],windowsHide:true});
 server.stdout.on('data',c=>output+=c);server.stderr.on('data',c=>output+=c);
 await new Promise((resolve,reject)=>{const timer=setInterval(()=>{if(output.includes('Ready in')){clearInterval(timer);resolve()}},100);const limit=setTimeout(()=>{clearInterval(timer);reject(Error(output))},30000);limit.unref();server.once('exit',code=>{clearInterval(timer);clearTimeout(limit);reject(Error('Fixture server exited '+code+' '+output))})});
 await run('qa-retired-guest-http.mjs',{QA_BASE:base});
 await run('qa-import-journey.cjs');
 console.log('PASS current import release checks: isolated database and browser; no hosted writes or model calls.');
 }finally{server?.kill();fs.writeFileSync('qa-import-release-report.json',JSON.stringify({checkedAt:new Date().toISOString(),scope:'Local fixtures and PostgreSQL/WASM only; no hosted database writes, public deployment, or real model calls.',results},null,2))}
})().catch(e=>{console.error(e);process.exitCode=1});
