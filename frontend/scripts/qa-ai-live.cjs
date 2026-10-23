// Opt-in paid smoke with fixed fictional inputs only. Never in release:check.
const fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),assert=require('node:assert/strict'),{parseEnv}=require('node:util');
if(process.env.RUN_PAID_MODEL_TEST!=='1')throw new Error('Requires explicit RUN_PAID_MODEL_TEST=1. Fixed fictional data only.');
const envFile=process.env.STAYCRAFT_MODEL_ENV||path.resolve('../backend/.env');
const config=parseEnv(fs.readFileSync(envFile,'utf8'));
for(const name of ['MODEL_BASE_URL','MODEL_NAME','MODEL_API_KEY']){if(!config[name])throw new Error('Missing test provider configuration');process.env[name]=config[name]}
if(new URL(process.env.MODEL_BASE_URL).protocol!=='https:')throw new Error('HTTPS required');
const cache={};function load(name){if(cache[name])return cache[name];const mod={exports:{}};new Function('exports','require',ts.transpileModule(fs.readFileSync('src/lib/'+name+'.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2023}}).outputText)(mod.exports,id=>load(id.replace('./','')));return cache[name]=mod.exports}
(async()=>{
 const {planReply}=load('reply-automation');const result=await planReply('早上吃饭从什么时候开始供应',{breakfast:'07:30–10:00',checkin:'15:00'},{model:true});assert.equal(result.engine,'model_v1','Provider classification did not produce a valid model result');assert.equal(result.key,'breakfast');assert.equal(result.reason,'ready');console.log('PASS live classification with one fixed fictional breakfast question. No cloud/user data.');
 const {groundedInsights,prioritiseInsights}=load('business-assistant');const data={active_rooms:2,capacity_room_nights:14,booked_room_nights:2,available_room_nights:12,inactive_booked_room_nights:1,booked_order_room_nights:2,amount_cents:10001,daily:Array.from({length:7},(_,i)=>({date:'2026-10-'+(23+i),booked:i?0:2,capacity:2,available:i?2:0}))};
 const items=groundedInsights(data,'week',true);const ranked=await prioritiseInsights(items,{model:true});assert.equal(ranked.engine,'model_v1','Provider ranking did not produce a valid model result');assert.equal(ranked.fallback,false);assert.equal(ranked.items[0].id,'inactive');console.log('PASS live priority ranking with fixed fictional aggregates, existing IDs only and risk preserved. No cloud/user data.');
})().catch(error=>{console.error(error.message);process.exitCode=1});
