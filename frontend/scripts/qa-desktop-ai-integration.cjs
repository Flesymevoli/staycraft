// Real client transport -> real Worker -> isolated auth/model network fixtures.
const assert=require('node:assert/strict'),path=require('node:path'),Module=require('node:module'),fs=require('node:fs');
const {build}=require('esbuild');
const root=path.resolve(__dirname,'..');
const USER='11111111-1111-4111-8111-111111111111',OTHER='22222222-2222-4222-8222-222222222222';
const PROPERTY='33333333-3333-4333-8333-333333333333',OTHER_PROPERTY='44444444-4444-4444-8444-444444444444';
const TOKEN='fixture.access.signature',OTHER_TOKEN='other.access.signature',KEY='private-model-fixture',REFRESH='refresh-must-never-leave';
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}});
const completion=content=>({choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(content)}}],usage:{prompt_tokens:20,completion_tokens:30,total_tokens:50}});
const tool=(name,args)=>({choices:[{finish_reason:'tool_calls',message:{role:'assistant',content:null,tool_calls:[{id:'call-'+name,type:'function',function:{name,arguments:JSON.stringify(args)}}]}}]});
const envNames=['STAYCRAFT_DESKTOP_RUNTIME','STAYCRAFT_HOSTED','STAYCRAFT_OPERATOR_SAMPLE','STAYCRAFT_QA_AUTH_FIXTURES','MODEL_ENABLED','FORMAL_MODEL_ENABLED','MODEL_BASE_URL','MODEL_API_KEY','MODEL_NAME','DEEPSEEK_API_KEY','DEMO_LOGIN_EMAIL','STAYCRAFT_DESKTOP_AI_TEST','STAYCRAFT_DESKTOP_AI_TEST_ORIGIN'];
const oldEnv=Object.fromEntries(envNames.map(k=>[k,process.env[k]])),oldFetch=global.fetch;
let checks=0;const check=(ok,message)=>{assert.ok(ok,message);checks++};
async function load(){
 const compiled=await build({stdin:{contents:[
  "export {handleAiRequest} from './desktop-api/ai';",
  "export {desktopModelTransport} from './src/lib/desktop-model';",
  "export {modelChat} from './src/lib/model-provider';",
  "export {runDecisionAgent} from './src/lib/decision-agent';",
  "export {writeAgentReport} from './src/lib/agent-report-writer';",
  "export {composePromotion} from './src/lib/promotion';",
  "export {composePromotionPlan} from './src/lib/promotion-plan';",
  "export {prioritiseInsights,modelSuggestions,adviceFacts} from './src/lib/business-assistant';",
 ].join('\n'),resolveDir:root,loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false,logLevel:'silent',plugins:[{name:'empty-server-only',setup(b){b.onResolve({filter:/^server-only$/},()=>({path:'server-only',namespace:'empty'}));b.onLoad({filter:/.*/,namespace:'empty'},()=>({contents:'',loader:'js'}))}}]});
 const mod=new Module(path.join(__dirname,'ai-integration-memory.cjs'));mod.filename=path.join(__dirname,'ai-integration-memory.cjs');mod.paths=Module._nodeModulePaths(root);mod._compile(compiled.outputFiles[0].text,mod.filename);return mod.exports;
}
function account(userId=USER,propertyId=PROPERTY){
 const state={userId,sessionId:userId,verifiedId:userId,token:userId===USER?TOKEN:OTHER_TOKEN,refreshes:0,expires_at:Math.floor(Date.now()/1000)+3600};
 return {state,scope:{user:{id:userId,email:'fixture@example.invalid'},propertyId,supabase:{auth:{
  getSession:async()=>({data:{session:{user:{id:state.sessionId},access_token:state.token,refresh_token:REFRESH,expires_at:state.expires_at}},error:null}),
  refreshSession:async()=>{state.refreshes++;state.expires_at=Math.floor(Date.now()/1000)+3600;return {data:{session:{user:{id:state.sessionId},access_token:state.token,refresh_token:REFRESH,expires_at:state.expires_at}},error:null}},
  getUser:async()=>({data:{user:{id:state.verifiedId}},error:null}),
 }}}};
}
function harness(api,answers,options={}){
 const requests=[],modelCalls=[],statuses=[],limits=[];
 const env={AI_ENABLED:'1',SUPABASE_URL:'https://integration-fixture.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture',MODEL_BASE_URL:'https://model.example.test/v1',MODEL_API_KEY:KEY,MODEL_NAME:'server-model',
  AUTH_RATE_LIMITER:{limit:async({key})=>{limits.push(key);return {success:true}}},AI_RATE_LIMITER:{limit:async({key})=>{limits.push(key);return {success:!options.limited}}},AI_GLOBAL_RATE_LIMITER:{limit:async()=>({success:true})}};
 global.fetch=async(url,init)=>{
  check(String(url)==='https://staycraft.online/desktop-api/v1/ai','client only calls fixed gateway');
  const input=JSON.parse(init.body),headers=new Headers(init.headers);requests.push(input);
  check(!('model' in input.body),'client never chooses model');
  check(!init.body.includes(KEY)&&!init.body.includes(REFRESH),'model secret and refresh token never enter client payload');
  check(!headers.has('cookie')&&!headers.has('api-key')&&!headers.has('apikey'),'client sends no cookies/provider/database credential');
  const token=headers.get('authorization')?.replace('Bearer ','');check([TOKEN,OTHER_TOKEN].includes(token),'client sends only current access JWT');
  const requester=token===OTHER_TOKEN?OTHER:USER;
  const fetcher=async(resource,upstream={})=>{
   const target=new URL(resource instanceof Request?resource.url:String(resource)),sent=new Headers(upstream.headers);
   check(upstream.redirect==='manual','Worker rejects redirects');
   if(target.origin===env.SUPABASE_URL){
    check((upstream.method||'GET')==='GET','all auth/property access is read-only');
    check(sent.get('authorization')==='Bearer '+token,'RLS uses same request token');
    if(target.pathname==='/auth/v1/user')return json({id:requester,email:'fixture@example.invalid',role:'authenticated',is_anonymous:false});
    if(target.pathname==='/rest/v1/properties'){
     check(target.searchParams.get('owner_user_id')==='eq.'+requester,'server verifies correct account ownership');
     const own=requester===USER?PROPERTY:OTHER_PROPERTY;
     return json(!options.foreign&&target.searchParams.get('id')==='eq.'+own?[{id:own}]:[]);
    }
    throw Error('Unexpected auth/database capability');
   }
   check(target.href==='https://model.example.test/v1/chat/completions','server model endpoint is fixed');
   check(sent.get('authorization')==='Bearer '+KEY&&!sent.has('cookie'),'only server model credential reaches provider');
   const payload=JSON.parse(upstream.body);modelCalls.push({purpose:input.purpose,payload,userId:requester});
   check(!upstream.body.includes(TOKEN)&&!upstream.body.includes(OTHER_TOKEN)&&!upstream.body.includes(REFRESH),'user credentials never enter model context');
   check(payload.model==='server-model','model chosen by Worker binding');
   const reply=typeof answers==='function'?await answers(input,payload):answers.shift();
   if(!reply)throw Error('Missing mock answer');
   return reply instanceof Response?reply:json(reply);
  };
  const result=await api.handleAiRequest(new Request(String(url),{method:init.method,headers:init.headers,body:init.body,signal:init.signal}),env,{fetcher,timeoutMs:2000});
  statuses.push(result.status);
  if(options.afterResponse)options.afterResponse(input);
  return result;
 };
 return {requests,modelCalls,statuses,limits};
}
const period={start:'2026-11-12',end:'2026-11-18'},inventory={activeRooms:5,dirtyRooms:1,types:[{name:'Double',price:500,capacity:2,activeRooms:5}]};
function metrics(p=period){const days=(Date.parse(p.end)-Date.parse(p.start))/86400000+1;return {period_start:p.start,period_end:p.end,booked_pct:20,booked_room_nights:days,booked_order_room_nights:days,capacity_room_nights:5*days,available_room_nights:4*days,amount_cents:days*50000,active_rooms:5,rate_min:500,rate_max:500,daily:Array.from({length:days},(_,i)=>({date:new Date(Date.parse(p.start)+i*86400000).toISOString().slice(0,10),booked:1,capacity:5,available:4,booked_pct:20,amount_cents:50000}))}}
async function main(){
 for(const key of envNames)delete process.env[key];process.env.STAYCRAFT_DESKTOP_RUNTIME='1';
 const api=await load(),owner=account(),transport=api.desktopModelTransport(owner.scope);check(typeof transport==='function','standalone client creates transport with no model keys');
 let h=harness(api,[tool('get_metrics',{start:'2026-11-05',end:'2026-11-11'}),tool('query_market',{start:'2026-11-12',end:'2026-11-13'}),completion({summary:'本期仍有空余房量。',findings:[{title:'关注空房',severity:'medium',conclusion:'本期已订7间夜，空余28间夜。',action:'核对空房日期的房源展示。',reason:'已记录订单尚未覆盖全部房量。',evidenceIds:['e1'],uncertainty:'供应商起价不能代表市场需求。'}]})]);
 const run=await api.runDecisionAgent({period,initialMetrics:metrics(),initialInventory:inventory,modelEnabled:true,modelTransport:transport,marketEnabled:true,now:()=>Date.parse('2026-11-12T04:00:00Z'),readMetrics:async p=>metrics(p),readInventory:async()=>inventory,
  readBookings:async()=>({count:0,truncated:false,orders:[]}),readRevenue:async()=>({}),queryMarket:async p=>({...p,count:2,currency:'CNY',low:200,high:300,hotels:[{name:'A',price:200,currency:'CNY',conditions:'1晚总价'},{name:'B',price:300,currency:'CNY',conditions:'1晚总价'}]})});
 check(run.engine==='model_v1'&&h.statuses.join()==='200,200,200','real diagnosis passes strict Worker across three rounds');
 check(h.requests[0].body.tools.length===5,'all five real read-only tool schemas accepted');
 check(h.requests[2].body.messages.some(m=>m.role==='tool'&&m.content.includes('e4')),'real subsequent messages preserve returned evidence');
 check(h.requests.every(r=>r.purpose==='analysis'),'diagnosis purpose preserved');
 const e={id:'e1',kind:'revenue',title:'完成住宿房费',source:'isolated fixture',capturedAt:'2026-11-12T01:00:00Z',period,facts:['模拟经营数据']};
 const reportRun={...run,id:PROPERTY,period,phase:'investigated',report:undefined,evidence:[e],snapshots:[{evidence:e,data:{totals:{completed:{amountCny:1200,roomNights:4,averageRateCny:300}},comparison:{available:false}}}],steps:[],findings:[]};
 const goodReport={title:'先核对本期房费构成',summary:'本期完成房费1200元，先检查已记录住宿的构成。',sections:[{title:'完成收入与成交结构',paragraphs:['本期完成房费1200元，对应4间夜，平均成交房价300元。'],evidenceIds:['e1'],claims:[{evidenceId:'e1',path:'totals.completed.amountCny',value:1200},{evidenceId:'e1',path:'totals.completed.roomNights',value:4},{evidenceId:'e1',path:'totals.completed.averageRateCny',value:300}]}],recommendations:[{title:'核对完成住宿',body:'结合已有房费记录核对住宿构成。',priority:'high',evidenceIds:['e1']}],uncertainties:['缺少历史记录，不判断增长趋势。']};
 h=harness(api,[completion(goodReport),completion({approved:false,issues:['Fixture requests one revision.']}),completion(goodReport),completion({approved:true,issues:[]})]);
 const report=await api.writeAgentReport(reportRun,{modelTransport:transport,language:'zh'});
 check(report.phase==='complete'&&report.engine==='model_v1','real report and semantic review complete through Worker');
 check(h.requests.map(r=>r.purpose).join()==='report,review,report,review','report correction uses separate purpose scopes');
 check(h.requests[2].body.messages.some(m=>m.role==='assistant'),'report retry accepts prior draft conversation');
 const existingDraft=JSON.stringify(goodReport),retained={...reportRun,reportDraft:existingDraft};
 h=harness(api,[new Response('private upstream detail',{status:429,headers:{'Retry-After':'900000'}})]);
 const rateLimitedWrite=await api.writeAgentReport(retained,{modelTransport:transport,language:'zh'});
 check(rateLimitedWrite.errorCode==='model_rate_limited'&&rateLimitedWrite.phase==='writing_failed'&&h.modelCalls.length===1,'upstream 429 during writing stops automatic second request');
 check(rateLimitedWrite.reportDraft===existingDraft&&rateLimitedWrite.snapshots===retained.snapshots&&!rateLimitedWrite.report,'writing rate limit preserves draft and immutable evidence without marking complete');
 h=harness(api,[completion(goodReport),new Response('private upstream detail',{status:429})]);
 const rateLimitedReview=await api.writeAgentReport(reportRun,{modelTransport:transport,language:'zh'});
 check(rateLimitedReview.errorCode==='model_rate_limited'&&rateLimitedReview.phase==='writing_failed'&&h.modelCalls.length===2&&h.requests.map(r=>r.purpose).join()==='report,review','review rate limit stops another paid rewrite');
 check(rateLimitedReview.reportDraft===existingDraft&&rateLimitedReview.snapshots===reportRun.snapshots&&!rateLimitedReview.report,'unreviewed draft is retained without becoming an approved report');
 const name='桥边书舍（虚构）',brief={language:'zh',channel:'wechat',goal:'rooms',start:'2026-11-14',end:'2026-11-14',sourceIds:[]};
 const facts=[{id:'property',text:'民宿名称：'+name},{id:'location',text:'位置：苏州市太仓市浏河镇'},{id:'room_0',text:'房型：临河大床房，最多入住 2 人。'},{id:'notes',text:'民宿说明：一楼设有阅读角与临河木窗。'}];
 const literary='把这一页读慢一点\n\n在桥边书舍（虚构），不妨把阅读角留给一段不看时钟的时间。翻过几页书，再聊聊还没说完的话，让行程也有一点留白。\n\n若计划在 2026-11-14 来小住，私信告诉我们入住日期和人数，一起确认临河大床房与价格。';
 h=harness(api,[completion({content:literary})]);const draft=await api.composePromotion(facts,brief,name,{model:true,modelTransport:transport});
 check(draft.engine==='model_v1'&&draft.content===literary&&h.requests[0].purpose==='promotion','real creative copy passes existing facts/style validation');
 const planAnswer={title:'从阅读角开始',audience:'计划双人小住的旅客',angle:'临河大床房适合双人安排，阅读角可以作为小住线索。',factIds:['property','room_0','notes']};
 h=harness(api,[completion(planAnswer)]);const plan=await api.composePromotionPlan(facts,brief,'zh',{model:true,modelTransport:transport});
 check(plan.engine==='model_v1'&&h.requests[0].purpose==='plan','real promotion plan payload accepted');
 const items=[{id:'rooms',title:'核对空房',evidence:'记录有空房',action:'检查房态',href:'/app/work'},{id:'cleaning',title:'核对清洁',evidence:'有待清洁客房',action:'检查清洁安排',href:'/app/work'}];
 h=harness(api,[completion({priorities:['cleaning','rooms']})]);const ranking=await api.prioritiseInsights(items,{model:true,modelTransport:transport});
 check(ranking.engine==='model_v1'&&ranking.items[0].id==='cleaning'&&h.requests[0].purpose==='priorities','real assistant ranking accepted');
 const suggestions=[{title:'核对空房日期',problem:'本期还有28个可售间夜。',action:'检查目标日期的房源展示。',reason:'当前已订7个间夜。',check:'核对已导入订单是否完整。'},{title:'核对客房准备',problem:'当前启用5间客房。',action:'检查当前清洁与到店安排。',reason:'启用房量为5间。',check:'确认现场客房状态。'}];
 h=harness(api,[completion({suggestions})]);const advice=await api.modelSuggestions(api.adviceFacts(metrics(),period,null),true,{modelTransport:transport});
 check(advice.length===2&&h.requests[0].purpose==='priorities','real operating suggestion payload accepted');
 // A role/property mismatch must prevent spending even when a valid token exists.
 h=harness(api,[],{foreign:true});const blocked=await api.composePromotion(facts,brief,name,{model:true,modelTransport:transport});
 check(blocked.engine==='rules_v1'&&blocked.fallback&&h.statuses[0]===403&&h.modelCalls.length===0,'foreign property produces honest rules fallback without model calls');
 h=harness(api,[],{limited:true});const limited=await api.composePromotion(facts,brief,name,{model:true,modelTransport:transport});
 check(limited.fallback&&h.statuses[0]===429&&h.modelCalls.length===0,'server rate limit stops spending and preserves fallback');
 owner.state.sessionId=OTHER;h=harness(api,[]);await assert.rejects(api.modelChat({max_tokens:10,messages:[{role:'user',content:'fixture'}]},{transport,purpose:'promotion'}));
 check(h.requests.length===0,'local account switch stops before gateway');owner.state.sessionId=USER;
 owner.state.expires_at=1;h=harness(api,[completion({content:literary})]);await api.composePromotion(facts,brief,name,{model:true,modelTransport:transport});check(owner.state.refreshes===1,'near-expiry session refreshes only at client');
 h=harness(api,[completion({ok:true})],{afterResponse:()=>{owner.state.sessionId=OTHER}});await assert.rejects(api.modelChat({max_tokens:10,messages:[{role:'user',content:'fixture'}]},{transport,purpose:'promotion'}));
 check(h.modelCalls.length===1,'account change after response discards result without another model call');owner.state.sessionId=USER;
 const second=account(OTHER,OTHER_PROPERTY),secondTransport=api.desktopModelTransport(second.scope);
 h=harness(api,async input=>completion({propertyId:input.propertyId}));
 const both=await Promise.all([api.modelChat({max_tokens:30,messages:[{role:'user',content:'owner-one'}]},{transport,purpose:'promotion'}),api.modelChat({max_tokens:30,messages:[{role:'user',content:'owner-two'}]},{transport:secondTransport,purpose:'promotion'})]);
 const bodies=await Promise.all(both.map(r=>r.response.json()));
 check(JSON.parse(bodies[0].choices[0].message.content).propertyId===PROPERTY&&JSON.parse(bodies[1].choices[0].message.content).propertyId===OTHER_PROPERTY,'concurrent requests preserve response scopes');
 check(h.limits.includes('desktop-ai:user:'+USER)&&h.limits.includes('desktop-ai:user:'+OTHER),'concurrent users have separate limit keys');
 const source=fs.readFileSync(path.join(root,'desktop/build-runtime.cjs'),'utf8');
 check(source.includes("['src','public','package.json'")&&source.includes("STAYCRAFT_DESKTOP_RUNTIME_BUILD:'1'"),'existing runtime builder copies entire source and builds server dependencies');
 check(fs.readFileSync(path.join(root,'desktop/runtime.cjs'),'utf8').includes("STAYCRAFT_DESKTOP_RUNTIME:'1'"),'existing runtime launches with transport selection flag');
 console.log(`Desktop AI integration QA passed: ${checks} assertions; actual business functions, client transport and Worker; all auth/model network mocked.`);
}
const keepAlive=setInterval(()=>{},1000);
main().catch(error=>{console.error(error.stack);process.exitCode=1}).finally(()=>{clearInterval(keepAlive);global.fetch=oldFetch;for(const key of envNames){if(oldEnv[key]===undefined)delete process.env[key];else process.env[key]=oldEnv[key]}});
