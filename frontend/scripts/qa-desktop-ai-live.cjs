// Opt-in acceptance only. Default preview does not read credentials or use network.
// The parent operator owns the approval and must create the shared budget file.
const fs=require('node:fs'),fsp=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),Module=require('node:module');
const {build}=require('esbuild');
const root=path.resolve(__dirname,'..'),ENDPOINT='https://staycraft.online/desktop-api/v1/ai';
const STAGE_CAPS={promotion:4,plan:1,analysis:3,report:4};
const safeCode=error=>error instanceof Error&&/^[a-z][a-z_0-9]{2,80}$/.test(error.message)?error.message:'acceptance_failed';
function parseArgs(args){
 const out={live:false};
 for(let i=0;i<args.length;i++){
  const flag=args[i];
  if(flag==='--live')out.live=true;
  else if(flag==='--preview')out.preview=true;
  else if(['--credentials','--budget-file','--output-dir','--reference-day','--stages','--promotion-scenario','--diagnosis-file'].includes(flag)&&args[i+1]&&!args[i+1].startsWith('--'))out[flag.slice(2)]=args[++i];
  else throw Error('invalid_arguments');
 }
 if(out.live&&out.preview)throw Error('conflicting_modes');
 out.stages=out.stages?out.stages.split(','):Object.keys(STAGE_CAPS);
 if(!out.stages.length||new Set(out.stages).size!==out.stages.length||out.stages.some(stage=>!Object.hasOwn(STAGE_CAPS,stage)))throw Error('invalid_stages');
 if(out['promotion-scenario']&&!['local-event','weather','sparse-property'].includes(out['promotion-scenario']))throw Error('invalid_promotion_scenario');
 return out;
}
function readBudget(file){
 let value;try{value=JSON.parse(fs.readFileSync(file,'utf8'))}catch{throw Error('budget_unavailable')}
 if(value?.version!==1||typeof value.grantId!=='string'||!value.grantId.trim()||!Number.isInteger(value.limit)||value.limit<1||value.limit>12||!Array.isArray(value.attempts)||value.attempts.length>12
  ||value.attempts.some((v,i)=>!v||v.number!==i+1||!Object.hasOwn(STAGE_CAPS,v.stage)))throw Error('budget_invalid');
 return value;
}
async function withBudget(file,operation){
 let lock;try{lock=await fsp.open(file+'.lock','wx')}catch{throw Error('budget_locked')}
 try{
  const value=readBudget(file),result=operation(value);
  // Hold the exclusive lock and fsync before allowing fetch. Interrupted writes
  // fail JSON validation on the next run, rather than recreating a fresh budget.
  const output=await fsp.open(file,'r+');
  try{await output.truncate(0);await output.writeFile(JSON.stringify(value,null,2));await output.sync()}finally{await output.close()}
  return result;
 }finally{await lock.close();await fsp.unlink(file+'.lock')}
}
async function reserveAttempt(file,stage,purpose){
 return withBudget(file,value=>{
  if(!Object.hasOwn(STAGE_CAPS,stage)||!(stage===purpose||stage==='report'&&purpose==='review'))throw Error('unexpected_model_purpose');
  if(value.attempts.length>=value.limit)throw Error('approved_request_limit');
  if(value.attempts.filter(v=>v.stage===stage).length>=STAGE_CAPS[stage])throw Error('stage_request_limit');
  const item={number:value.attempts.length+1,stage,purpose,startedAt:new Date().toISOString(),status:'reserved'};
  value.attempts.push(item);return {...item};
 });
}
async function finishAttempt(file,number,values){return withBudget(file,value=>{const item=value.attempts.find(v=>v.number===number);if(!item)throw Error('budget_invalid');Object.assign(item,values)})}
function inside(parent,child){const relative=path.relative(path.resolve(parent),path.resolve(child));return relative!==''&&!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative)}
function isTemporary(file){
 const roots=[os.tmpdir(),...(process.platform==='win32'?[path.join(os.homedir(),'AppData','Local','Temp')]:[])];
 return roots.some(parent=>inside(parent,file));
}
function checkedTemporaryDirectory(folder){
 const resolved=path.resolve(folder);if(!path.isAbsolute(folder)||!isTemporary(resolved))throw Error('output_must_be_temporary_directory');return resolved;
}
async function loadBusiness(){
 const compiled=await build({stdin:{contents:[
  "export {desktopModelTransport} from './src/lib/desktop-model';",
  "export {runDecisionAgent} from './src/lib/decision-agent';",
  "export {writeAgentReport} from './src/lib/agent-report-writer';",
  "export {aggregateRevenue} from './src/lib/agent-revenue';",
  "export {composePromotion} from './src/lib/promotion';",
  "export {composePromotionPlan} from './src/lib/promotion-plan';",
  "export {buildPromotionWritingContext} from './src/lib/promotion-writing-context';",
  "export {validatePromotionCopy} from './src/lib/promotion-copy-validation';",
 ].join('\n'),resolveDir:root,loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false,logLevel:'silent',plugins:[{name:'empty-server-only',setup(b){b.onResolve({filter:/^server-only$/},()=>({path:'server-only',namespace:'empty'}));b.onLoad({filter:/.*/,namespace:'empty'},()=>({contents:'',loader:'js'}))}}]});
 const mod=new Module(path.join(__dirname,'ai-live-memory.cjs'));mod.filename=path.join(__dirname,'ai-live-memory.cjs');mod.paths=Module._nodeModulePaths(root);mod._compile(compiled.outputFiles[0].text,mod.filename);return mod.exports;
}
function fixtures(today){
 const shift=(days,from=today)=>new Date(Date.parse(from+'T00:00:00Z')+days*86400000).toISOString().slice(0,10);
 const period={start:today,end:shift(6)},brief={language:'zh',channel:'wechat',goal:'rooms',start:shift(3),end:shift(4),sourceIds:[]};
 const name='桥边书舍（虚构演练）',facts=[{id:'property',text:'民宿名称：'+name},{id:'location',text:'位置：苏州市太仓市浏河镇'},
  {id:'room_0',text:'房型：临河大床房，最多入住 2 人。'},{id:'notes',text:'民宿说明：一楼设有阅读角与临河木窗。独立测试账号；本次订单为虚构演练数据。'}];
 const event={id:'10000000-0000-4000-8000-000000000001',title:'街角纸艺展（虚构演练）',summary:'在镇文化中心举办，仅作模型验收的虚构活动。',url:'https://example.com/test-event',start:shift(2),end:shift(6),checkedOn:today};
 const weather={id:'20000000-0000-4000-8000-000000000002',title:`太仓 ${shift(3)} 天气预报`,summary:'虚构演练预报：多云，最低 12°C，最高 19°C；预报可能变化。',url:'https://example.com/test-weather',start:shift(3),end:shift(3),checkedOn:today};
 const scenarios=[{id:'local-event',name,facts,brief:{...brief,sourceIds:[event.id]},source:event},
  {id:'weather',name,facts,brief:{...brief,end:brief.start,sourceIds:[weather.id]},source:weather},
  {id:'sparse-property',name:'巷里小住（虚构演练）',facts:[{id:'property',text:'民宿名称：巷里小住（虚构演练）'},{id:'location',text:'位置：另一座城市'},{id:'room_0',text:'房型：庭院大床房，最多入住 2 人。'}],brief:{...brief,end:brief.start}}];
 const inventory={activeRooms:5,dirtyRooms:1,types:[{name:'标准大床房（虚构）',price:300,capacity:2,activeRooms:3},{name:'家庭房（虚构）',price:500,capacity:4,activeRooms:2}]};
 const rows=[];
 // Entirely synthetic identity-free bookings: last fortnight and coming week.
 for(let d=-14;d<=6;d++){
  const count=d<0?(d<-7?1:2):(d===3||d===4?1:2);
  for(let room=0;room<count;room++)rows.push({id:`fictional-${d}-${room}`,arrival:shift(d),departure:shift(d+1),type_name:room===0?'标准大床房（虚构）':'家庭房（虚构）',status:'confirmed',total:room===0?300:500,external_channel:'虚构导入',stay_state:d<0?'completed':'pending'});
 }
 const metrics=selected=>{
  const days=(Date.parse(selected.end)-Date.parse(selected.start))/86400000+1;
  const daily=Array.from({length:days},(_,i)=>{const date=shift(i,selected.start),bookings=rows.filter(r=>r.arrival<=date&&r.departure>date),booked=bookings.length;return {date,booked,capacity:5,available:5-booked,booked_pct:booked/5*100,amount_cents:bookings.reduce((n,r)=>n+r.total*100,0)}});
  const booked=daily.reduce((n,d)=>n+d.booked,0),capacity=days*5;
  return {period_start:selected.start,period_end:selected.end,booked_pct:Math.round(booked/capacity*10000)/100,booked_room_nights:booked,booked_order_room_nights:booked,capacity_room_nights:capacity,available_room_nights:capacity-booked,amount_cents:daily.reduce((n,d)=>n+d.amount_cents,0),active_rooms:5,rate_min:300,rate_max:500,daily};
 };
 return {today,period,brief,name,facts,scenarios,inventory,rows,metrics,shift};
}
async function main(){
 const args=parseArgs(process.argv.slice(2));
 const today=args['reference-day']||new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai'}).format(new Date());
 if(!/^20\d{2}-\d{2}-\d{2}$/.test(today)||new Date(today).toISOString().slice(0,10)!==today)throw Error('invalid_reference_day');
 if(!args.live){console.log(JSON.stringify({preview:true,networkRequests:0,credentialsRead:false,referenceDay:today,stageCaps:STAGE_CAPS,selectedStages:args.stages,promotionScenario:args['promotion-scenario']||'all-three-initial-scenarios',plannedInitialMaximum:11,approvalMaximum:12,promotionRetry:'one additional selected scenario, using the same remaining budget',requiredLiveFlags:['--live','--credentials <private JSON with email/password>','--budget-file <existing shared budget JSON>','--output-dir <absolute temporary directory>'],requiredEnvironment:'RUN_PAID_MODEL_TEST=1'},null,2));return}
 if(process.env.RUN_PAID_MODEL_TEST!=='1')throw Error('explicit_paid_approval_required');
 if(!args.credentials||!args['budget-file']||!args['output-dir'])throw Error('missing_live_arguments');
 const output=checkedTemporaryDirectory(args['output-dir']),budgetFile=path.resolve(args['budget-file']);
 if(!isTemporary(budgetFile))throw Error('budget_must_be_temporary_file');
 const budget=readBudget(budgetFile);if(budget.attempts.length>=budget.limit)throw Error('approved_request_limit');
 if(args.stages.includes('promotion')&&budget.attempts.filter(v=>v.stage==='promotion').length>=3&&!args['promotion-scenario'])throw Error('promotion_retry_requires_scenario');
 if(args.stages.includes('report')&&!args.stages.includes('analysis')&&!args['diagnosis-file'])throw Error('report_requires_diagnosis_file');
 let credentials;try{credentials=JSON.parse(fs.readFileSync(path.resolve(args.credentials),'utf8'))}catch{throw Error('credentials_unavailable')}
 if(!credentials||Object.keys(credentials).sort().join()!=='email,password'||typeof credentials.email!=='string'||!/^\S+@\S+\.\S+$/.test(credentials.email)||credentials.email.length>254||typeof credentials.password!=='string'||!credentials.password||credentials.password.length>1024)throw Error('invalid_credentials_file');
 const config=JSON.parse(fs.readFileSync(path.join(root,'desktop-api/wrangler.jsonc'),'utf8'));
 const project=config.vars?.SUPABASE_URL,publishable=config.vars?.SUPABASE_PUBLISHABLE_KEY;
 if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(project)||!/^sb_publishable_/.test(publishable))throw Error('invalid_public_configuration');
 for(const key of ['STAYCRAFT_HOSTED','STAYCRAFT_OPERATOR_SAMPLE','STAYCRAFT_QA_AUTH_FIXTURES','MODEL_API_KEY','MODEL_BASE_URL','MODEL_NAME','DEEPSEEK_API_KEY','DEMO_LOGIN_EMAIL','STAYCRAFT_DESKTOP_AI_TEST','STAYCRAFT_DESKTOP_AI_TEST_ORIGIN'])delete process.env[key];
 process.env.STAYCRAFT_DESKTOP_RUNTIME='1';
 const api=await loadBusiness(),originalFetch=global.fetch,records=[],outcomes=[];
 let stage='promotion',scenario='login',folder;
 await fsp.mkdir(output,{recursive:true});folder=await fsp.mkdtemp(path.join(output,'run-'));
 const save=async(name,value)=>fsp.writeFile(path.join(folder,name),JSON.stringify(value,null,2),{flag:'wx'});
 global.fetch=async(resource,init={})=>{
  const url=new URL(resource instanceof Request?resource.url:String(resource));
  if(url.href!==ENDPOINT)throw Error('unapproved_network_request');
  const body=JSON.parse(init.body);
  const attempt=await reserveAttempt(budgetFile,stage,body.purpose),started=performance.now();
  const entry={number:attempt.number,stage,scenario,purpose:body.purpose,startedAt:attempt.startedAt};records.push(entry);
  // Reservation is durable BEFORE fetch. Failure, cancellation or interruption still consumes it.
  try{
   const response=await originalFetch(resource,init);entry.httpStatus=response.status;
   let payload;try{payload=await response.clone().json()}catch{}
   entry.latencyMs=Math.round(performance.now()-started);
   if(payload?.completion){entry.provider=payload.provider;entry.fallback=payload.fallback;entry.completion=payload.completion}
   else entry.error=typeof payload?.error==='string'&&/^[a-z_0-9]{3,80}$/.test(payload.error)?payload.error:'invalid_gateway_response';
   await save(`response-${String(entry.number).padStart(2,'0')}-${body.purpose}.json`,entry);
   await finishAttempt(budgetFile,attempt.number,{status:'returned',httpStatus:response.status,latencyMs:entry.latencyMs});return response;
  }catch(error){
   entry.latencyMs=Math.round(performance.now()-started);entry.error=safeCode(error);
   await finishAttempt(budgetFile,attempt.number,{status:'failed',latencyMs:entry.latencyMs,error:entry.error});
   await save(`failure-${String(entry.number).padStart(2,'0')}-${body.purpose}.json`,entry);throw Error(entry.error);
  }
 };
 const authFetch=async(resource,init={})=>{
  const target=new URL(resource instanceof Request?resource.url:String(resource)),method=(init.method||'GET').toUpperCase();
  const permitted=target.origin===project&&(method==='GET'&&['/auth/v1/user','/rest/v1/properties'].includes(target.pathname)||method==='POST'&&target.pathname==='/auth/v1/token'&&['password','refresh_token'].includes(target.searchParams.get('grant_type')));
  if(!permitted)throw Error('unapproved_database_operation');
  return originalFetch(resource,{...init,redirect:'error',cache:'no-store',signal:AbortSignal.any([...(init.signal?[init.signal]:[]),AbortSignal.timeout(15000)])});
 };
 let resultPath;
 try{
  const {createClient}=require('@supabase/supabase-js');
  const supabase=createClient(project,publishable,{global:{fetch:authFetch},auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,skipAutoInitialize:true}});
  const login=await supabase.auth.signInWithPassword({email:credentials.email,password:credentials.password});credentials=null;
  if(login.error||!login.data.user||login.data.user.is_anonymous)throw Error('test_account_login_failed');
  const verified=await supabase.auth.getUser();if(verified.error||verified.data.user?.id!==login.data.user.id)throw Error('test_account_verification_failed');
  const property=await supabase.from('properties').select('id').eq('owner_user_id',verified.data.user.id).maybeSingle();
  if(property.error||!property.data?.id)throw Error('existing_test_property_required');
  const transport=api.desktopModelTransport({supabase,user:verified.data.user,propertyId:property.data.id});if(!transport)throw Error('desktop_transport_unavailable');
  const f=fixtures(today);await save('fictional-inputs.json',{today,scenarios:f.scenarios,inventory:f.inventory,bookings:f.rows,metrics:f.metrics(f.period)});
  const outcome=async(id,work)=>{
   scenario=id;const started=performance.now(),before=records.length;
   let result;try{result=await work()}catch(error){result={passed:false,error:safeCode(error)}}
   const row={scenario:id,stage,latencyMs:Math.round(performance.now()-started),requests:records.length-before,...result};outcomes.push(row);
   await save('outcome-'+id+'.json',row);console.log(JSON.stringify({scenario:id,stage,requests:row.requests,latencyMs:row.latencyMs,passed:row.passed,engine:row.engine,error:row.error}));return row;
  };
  const selectedScenarios=args.stages.includes('promotion')?f.scenarios.filter(item=>!args['promotion-scenario']||item.id===args['promotion-scenario']):[];
  for(const item of selectedScenarios){await outcome(item.id,async()=>{
   const before=records.length,result=await api.composePromotion(item.facts,item.brief,item.name,{model:true,modelTransport:transport,evidence:{source:item.source},diagnosisReason:'虚构经营资料显示目标日期仍有空房；不向客人披露内部指标。'});
   const raw=records.slice(before).at(-1)?.completion?.choices?.[0];let validation={passed:false,error:'no_model_output'};
   if(raw?.finish_reason==='stop'&&typeof raw.message?.content==='string')try{
    const parsed=JSON.parse(raw.message.content.trim().replace(/^```(?:json)?\s*/i,'').replace(/```\s*$/,''));
    if(typeof parsed.content!=='string')throw Error('invalid_copy_shape');
    api.validatePromotionCopy(parsed.content.replace(/\\n/g,'\n').replace(/\r\n/g,'\n').replace(/[ \t]+\n/g,'\n').trim(),item.brief,api.buildPromotionWritingContext(item.facts,item.brief,item.name,{source:item.source,diagnosisReason:'虚构经营资料显示目标日期仍有空房；不向客人披露内部指标。'}));validation={passed:true};
   }catch(error){validation={passed:false,error:safeCode(error)}}
   return {passed:result.engine==='model_v1'&&!result.fallback,validation,...result};
  })}
  stage='plan';if(args.stages.includes('plan'))await outcome('promotion-plan',async()=>{const result=await api.composePromotionPlan(f.facts,f.brief,'zh',{model:true,modelTransport:transport});return {passed:result.engine==='model_v1',engine:result.engine,result}});
  stage='analysis';let run;
  if(args['diagnosis-file']){
   const saved=JSON.parse(await fsp.readFile(path.resolve(args['diagnosis-file']),'utf8'));run=saved.result??saved;
   if(!Array.isArray(run?.snapshots)||run.dataMode!=='fictional_demo')throw Error('fictional_diagnosis_required');
  }
  if(args.stages.includes('analysis'))await outcome('diagnosis',async()=>{
   run=await api.runDecisionAgent({period:f.period,initialMetrics:f.metrics(f.period),initialInventory:f.inventory,modelEnabled:true,modelTransport:transport,marketEnabled:false,demo:true,referenceDay:today,
    readMetrics:async selected=>f.metrics(selected),readInventory:async()=>f.inventory,queryMarket:async()=>{throw Error('fictional_market_not_provided')},
    readRevenue:async selected=>api.aggregateRevenue(f.rows,selected,today),readBookings:async selected=>{const rows=f.rows.filter(row=>row.arrival<=selected.end&&row.departure>selected.start);return {count:rows.length,truncated:false,orders:rows.map(row=>({arrival:row.arrival,departure:row.departure,roomType:row.type_name,status:row.status,totalCny:row.total,source:row.external_channel,stayState:row.stay_state}))}}});
   return {passed:run.engine==='model_v1',engine:run.engine,result:run};
  });
  stage='report';
  if(args.stages.includes('report')){
   if(run?.snapshots?.length)await outcome('report',async()=>{const result=await api.writeAgentReport(run,{modelTransport:transport,language:'zh',attempts:2});return {passed:result.phase==='complete',engine:result.engine,phase:result.phase,error:result.errorCode,result}});
   else outcomes.push({scenario:'report',stage,passed:false,requests:0,error:'diagnosis_evidence_unavailable'});
  }
 }finally{
  global.fetch=originalFetch;
  const expected=(args.stages.includes('promotion')?(args['promotion-scenario']?1:3):0)+['plan','analysis','report'].filter(stage=>args.stages.includes(stage)).length;
  const finalBudget=readBudget(budgetFile),summary={live:true,fictionalInputs:true,businessWrites:0,referenceDay:today,selectedStages:args.stages,grantId:finalBudget.grantId,approvedMaximum:finalBudget.limit,totalGrantRequests:finalBudget.attempts.length,requestsThisRun:records.length,allPassed:outcomes.length===expected&&outcomes.every(row=>row.passed),outcomes,rawResponses:records};
  resultPath=path.join(folder,'results.json');await fsp.writeFile(resultPath,JSON.stringify(summary,null,2),{flag:'wx'});
  console.log(JSON.stringify({report:resultPath,requestsThisRun:records.length,totalGrantRequests:finalBudget.attempts.length,allPassed:summary.allPassed}));
  if(!summary.allPassed)process.exitCode=1;
 }
}
module.exports={main,loadBusiness,readBudget,reserveAttempt,finishAttempt,parseArgs,fixtures};
if(require.main===module)main().catch(error=>{console.error(safeCode(error));process.exitCode=1});
