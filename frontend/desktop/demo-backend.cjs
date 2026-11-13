const path=require('node:path');
// Separate utility process, in-memory business store, no outgoing network.
function initialize(){
 if(process.env.STAYCRAFT_DESKTOP_DEMO!=='1'||process.env.HOSTNAME!=='127.0.0.1'||!path.isAbsolute(process.env.STAYCRAFT_DEMO_SUPPORT||''))throw Error('local_demo_only');
 const original=globalThis.fetch;
 globalThis.fetch=(input,init)=>{const url=new URL(input instanceof Request?input.url:String(input));if(url.protocol!=='http:'||url.hostname!=='127.0.0.1')throw Error('demo_network_disabled');return original(input,init)};
 Object.assign(process.env,{STAYCRAFT_DESKTOP_GUIDED_DEMO:'1',STAYCRAFT_QA_AUTH_FIXTURES:'1',STAYCRAFT_QA_FORMAL_STAYS:'1',STAYCRAFT_QA_IMPORT_DB:'1',STAYCRAFT_QA_DESKTOP_SYNC:'1',STAYCRAFT_QA_DESKTOP_JOURNEY:'1',STAYCRAFT_OPERATOR_SAMPLE:'0',STAYCRAFT_SAMPLE_RICH:'1',STAYCRAFT_SAMPLE_LIVE_MODEL:'0',STAYCRAFT_SAMPLE_LIVE_AMAP:'0',MODEL_ENABLED:'0',FORMAL_MODEL_ENABLED:'0'});
 process.argv.push('127.0.0.1');
 require(path.join(process.env.STAYCRAFT_DEMO_SUPPORT,'qa-workspace-fixture.cjs'));
}
module.exports={initialize};
