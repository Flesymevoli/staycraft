const {spawn}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
process.chdir(path.resolve(__dirname,'..'));
const checks=[
 ['qa-business-analysis.cjs'],['qa-revenue-insights.cjs'],['qa-release-config.cjs'],
 ['qa-workspace.cjs'],['qa-property-profile.cjs'],['qa-room-cloud.cjs'],['qa-booking-metrics.cjs'],
 ['qa-booking-details.cjs'],['qa-room-actions.cjs'],['qa-room-scroll.cjs'],
 ['qa-formal-stays.cjs'],['qa-cancellation-review.cjs','approve'],['qa-cancellation-review.cjs','reject'],
 ['qa-booking-next-steps.cjs'],['qa-revenue-preview.cjs'],['qa-ui-parity.cjs'],
 ['qa-recovery.cjs'],['qa-hosted.cjs'],
];
const report={started:new Date().toISOString(),scope:'Isolated fixtures and hosted smoke; no live account writes or public deployment.',results:[]};
const reportPath=path.resolve('qa-release-report.json');
fs.writeFileSync(reportPath,JSON.stringify(report,null,2));
async function run(args){
 console.log(`\nRelease check: ${args.join(' ')}`);
 const start=Date.now();
 const code=await new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,[path.join('scripts',args[0]),...args.slice(1)],{
   stdio:'inherit',windowsHide:true,
   env:{...process.env,VERCEL:'0',STAYCRAFT_HOSTED:'0',STAYCRAFT_OPERATOR_SAMPLE:'0',STAYCRAFT_QA_AUTH_FIXTURES:'0',STAYCRAFT_QA_FORMAL_STAYS:'0',
    NEXT_PUBLIC_SUPABASE_URL:'https://husrpqalpjjswpvrkxet.supabase.co',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_release_fixture_only'},
  });
  child.once('error',reject);child.once('exit',resolve);
 });
 report.results.push({check:args.join(' '),passed:code===0,durationMs:Date.now()-start});
 fs.writeFileSync(reportPath,JSON.stringify(report,null,2));
 if(code!==0)throw new Error(`Release check failed: ${args.join(' ')}`);
}
(async()=>{for(const args of checks)await run(args);report.finished=new Date().toISOString();report.passed=true;fs.writeFileSync(reportPath,JSON.stringify(report,null,2));console.log(`\nPASS ${checks.length} release checks. Report: ${reportPath}`)})().catch(error=>{console.error(error.message);process.exitCode=1});
