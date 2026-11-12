// Exercise the complete opt-in runner with a closed, in-memory network.
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const runner=require('./qa-desktop-ai-live.cjs');
const USER='11111111-1111-4111-8111-111111111111',PROPERTY='33333333-3333-4333-8333-333333333333';
const TOKEN='fixture.access.signature',REFRESH='fixture-refresh-never-export',PASSWORD='fixture-password-never-export';
const json=value=>new Response(JSON.stringify(value),{headers:{'Content-Type':'application/json'}});
const answer=content=>({choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(content)}}]});
const original={fetch:global.fetch,argv:process.argv,paid:process.env.RUN_PAID_MODEL_TEST};
(async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'staycraft-ai-live-selftest-'));
 const credentials=path.join(dir,'credentials.json'),budget=path.join(dir,'budget.json'),output=path.join(dir,'results');
 await fs.writeFile(credentials,JSON.stringify({email:'fixture@example.invalid',password:PASSWORD}));
 await fs.writeFile(budget,JSON.stringify({version:1,grantId:'offline-selftest-only',limit:12,attempts:[]}));
 const api=await runner.loadBusiness(),f=runner.fixtures('2026-11-12'),copies=[];
 for(const s of f.scenarios)copies.push((await api.composePromotion(s.facts,s.brief,s.name,{model:false,evidence:{source:s.source}})).content);
 copies[1]=`给出发留一点弹性\n\n${f.scenarios[1].source.title}显示多云，12°C 至 19°C，出发前仍要看看最新预报。把${f.name}的阅读角放进行程，天气若有变化，也不妨给自己留一点翻书的时间。\n\n计划在 ${f.scenarios[1].brief.start} 来住，私信日期和人数，一起核对临河大床房。`;
 let promotions=0,analysis=0,gateway=0,auth=0;
 global.fetch=async(resource,init={})=>{
  const url=new URL(resource instanceof Request?resource.url:String(resource));
  if(url.pathname==='/auth/v1/token'){
   auth++;assert.equal(url.searchParams.get('grant_type'),'password');
   return json({access_token:TOKEN,refresh_token:REFRESH,expires_in:3600,token_type:'bearer',user:{id:USER,email:'fixture@example.invalid',role:'authenticated',is_anonymous:false}});
  }
  if(url.pathname==='/auth/v1/user'){auth++;return json({id:USER,email:'fixture@example.invalid',role:'authenticated',is_anonymous:false})}
  if(url.pathname==='/rest/v1/properties'){auth++;assert.equal(init.method||'GET','GET');return json([{id:PROPERTY}])}
  assert.equal(url.href,'https://staycraft.online/desktop-api/v1/ai','all other network is blocked');gateway++;
  const input=JSON.parse(init.body);assert.equal(input.propertyId,PROPERTY);assert.equal(new Headers(init.headers).get('authorization'),'Bearer '+TOKEN);
  assert(!init.body.includes(TOKEN)&&!init.body.includes(REFRESH)&&!init.body.includes(PASSWORD));
  let completion;
  if(input.purpose==='promotion'){promotions++;const context=JSON.parse(input.body.messages[1].content).writingContext;completion=answer({content:copies[context.selectedSource?.kind==='weather'?1:context.selectedSource?0:2]})}
  else if(input.purpose==='plan')completion=answer({title:'从阅读角开始',audience:'计划双人小住的旅客',angle:'临河大床房适合双人安排，阅读角可以作为小住线索。',factIds:['property','room_0','notes']});
  else if(input.purpose==='analysis'){
   if(analysis++===0)completion={choices:[{finish_reason:'tool_calls',message:{role:'assistant',content:null,tool_calls:[{id:'call-revenue',type:'function',function:{name:'get_revenue',arguments:JSON.stringify({start:f.shift(-7),end:f.shift(-1)})}}]}}]};
   else completion=answer({summary:'先核对目标日期的空房安排。',findings:[{title:'关注空房日期',severity:'medium',conclusion:'本期已订12间夜，空余23间夜。',action:'核对目标日期的房源展示。',reason:'已记录订单尚未覆盖全部房量。',evidenceIds:['e1'],uncertainty:'未取得市场报价，不判断需求趋势。'}]});
  }else if(input.purpose==='report'){
   const data=JSON.parse(input.body.messages[1].content),evidence=data.evidence.find(e=>e.kind==='revenue'),amount=evidence.data.totals.completed.amountCny;
   completion=answer({title:'先核对本期房费构成',summary:`本期完成房费${amount}元，先检查已记录住宿的构成。`,sections:[{title:'完成住宿收入',paragraphs:[`本期完成房费${amount}元，先核对住宿构成。`],evidenceIds:[evidence.id],claims:[{evidenceId:evidence.id,path:'totals.completed.amountCny',value:amount}]}],recommendations:[{title:'核对完成住宿',body:'结合已有房费记录检查住宿构成。',priority:'high',evidenceIds:[evidence.id]}],uncertainties:['未取得周边市场报价。']});
  }else if(input.purpose==='review')completion=answer({approved:true,issues:[]});
  else throw Error('unmocked_purpose');
  return json({version:1,userId:USER,propertyId:PROPERTY,purpose:input.purpose,provider:'course',fallback:false,completion});
 };
 process.env.RUN_PAID_MODEL_TEST='1';process.argv=[process.argv[0],'qa-desktop-ai-live.cjs','--live','--credentials',credentials,'--budget-file',budget,'--output-dir',output,'--reference-day','2026-11-12'];
 await runner.main();
 assert.equal(promotions,3);assert.equal(analysis,2);assert.equal(gateway,8);assert(auth>1);
 const saved=runner.readBudget(budget);assert.equal(saved.attempts.length,gateway);assert(saved.attempts.every(v=>v.status==='returned'));
 const runs=await fs.readdir(output);assert.equal(runs.length,1);
 const folder=path.join(output,runs[0]),summary=JSON.parse(await fs.readFile(path.join(folder,'results.json'),'utf8'));
 assert.equal(summary.allPassed,true);assert.equal(summary.outcomes.length,6);assert.equal(summary.businessWrites,0);
 for(const name of await fs.readdir(folder)){const text=await fs.readFile(path.join(folder,name),'utf8');for(const secret of [TOKEN,REFRESH,PASSWORD])assert(!text.includes(secret),'no fixture credential in output')}
 // Mirror the real partial grant: seven spent calls, then one selected promotion,
 // two diagnosis calls and report/review must consume exactly the five remaining.
 const retryBudget=path.join(dir,'retry-budget.json'),retryOutput=path.join(dir,'retry-results');
 await fs.writeFile(retryBudget,JSON.stringify({version:1,grantId:'offline-partial-grant',limit:12,attempts:[]}));
 for(const stage of ['promotion','promotion','promotion','plan','analysis','report','report'])await runner.reserveAttempt(retryBudget,stage,stage);
 promotions=0;analysis=0;gateway=0;
 process.argv=[process.argv[0],'qa-desktop-ai-live.cjs','--live','--credentials',credentials,'--budget-file',retryBudget,'--output-dir',retryOutput,'--reference-day','2026-11-12','--stages','promotion,analysis,report','--promotion-scenario','weather'];
 await runner.main();
 assert.equal(promotions,1);assert.equal(analysis,2);assert.equal(gateway,5);assert.equal(runner.readBudget(retryBudget).attempts.length,12);
 await assert.rejects(runner.reserveAttempt(retryBudget,'report','review'),/approved_request_limit/);
 const retryRun=(await fs.readdir(retryOutput))[0],retrySummary=JSON.parse(await fs.readFile(path.join(retryOutput,retryRun,'results.json'),'utf8'));
 assert.equal(retrySummary.allPassed,true);assert.equal(retrySummary.outcomes.length,3);
 console.log('Live-runner mock self-test passed: complete initial flow and selective 7-to-12 retry; no network escape or credential output.');
})().catch(error=>{console.error(error.stack);process.exitCode=1}).finally(()=>{global.fetch=original.fetch;process.argv=original.argv;if(original.paid===undefined)delete process.env.RUN_PAID_MODEL_TEST;else process.env.RUN_PAID_MODEL_TEST=original.paid});
