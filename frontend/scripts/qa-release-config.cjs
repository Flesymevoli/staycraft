const {spawnSync}=require('node:child_process');
const assert=require('node:assert/strict');
// Load the same config through Next's TypeScript loader; no server or database.
const load="require('next/dist/server/config').default('phase-production-server',process.cwd()).then(()=>console.log('CONFIG_OK')).catch(e=>{console.error(e.message);process.exitCode=1})";
const clean={...process.env,STAYCRAFT_HOSTED:'1',VERCEL:'0',HOMESTAY_LOCAL_DATA:'0',STAYCRAFT_OPERATOR_SAMPLE:'0',STAYCRAFT_QA_AUTH_FIXTURES:'0',STAYCRAFT_QA_FORMAL_STAYS:'0',NEXT_PUBLIC_SUPABASE_URL:'https://fixture.supabase.co',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture_only'};
const run=extra=>spawnSync(process.execPath,['-e',load],{env:{...clean,...extra},encoding:'utf8',windowsHide:true});
assert.equal(run({}).status,0);
for(const env of [
 {HOMESTAY_LOCAL_DATA:'1'}, {STAYCRAFT_OPERATOR_SAMPLE:'1'},
 {STAYCRAFT_QA_AUTH_FIXTURES:'1'}, {STAYCRAFT_QA_FORMAL_STAYS:'1'},
 {NEXT_PUBLIC_SUPABASE_URL:'http://localhost:54321'},
 {NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'sb_secret_rejected'},
])assert.notEqual(run(env).status,0,Object.keys(env)[0]);
console.log('PASS hosted configuration: valid public config accepted; local data, all fixture flags, insecure URL and secret keys rejected.');
