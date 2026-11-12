const fs=require('fs'),path=require('path'),Module=require('module'),ts=require('typescript'),assert=require('assert/strict');
function load(file){const mod=new Module(file);mod.require=name=>name.startsWith('.')?load(path.resolve(path.dirname(file),name)+'.ts'):require(name);mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);return mod.exports;}
const {composePromotionPlan,validPromotionPlan,promotionFinding,promotionTarget,validPromotionDiagnosis}=load(path.resolve('src/lib/promotion-plan.ts'));
const {validPromotion}=load(path.resolve('src/lib/promotion.ts'));
Object.assign(process.env,{MODEL_BASE_URL:'https://test.invalid',MODEL_API_KEY:'mock-only',MODEL_NAME:'mock'});
const period={start:'2026-11-10',end:'2026-11-11'},facts=[{id:'property',text:'测试小院'},{id:'location',text:'沙溪古镇'}];
const json={title:'古镇小住计划',audience:'考虑短途出行的双人客群',angle:'介绍区位与房型',factIds:['property','location']};
const respond=value=>async()=>Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify(value)}}]});
const diagnosis={runId:'11111111-1111-4111-8111-111111111111',findingId:'finding-1'};
const finding={id:'finding-1',conclusion:'两天仍有空房',action:'规划推广',evidenceIds:['e1'],nextAction:{kind:'plan_promotion',target:'promotion',period,evidenceIds:['e1']}};
const run={period,findings:[finding],evidence:[{id:'e1'}],dailyMetrics:[{date:period.start,available:2},{date:period.end,available:1}]};
(async()=>{
 const plan=await composePromotionPlan(facts,period,'zh',{model:true,diagnosis,fetcher:respond(json)});assert.equal(plan.engine,'model_v1');assert(validPromotionPlan({...plan,angle:'介绍区位\n和房型'}));
 assert.equal(plan.publishTiming,'根据目标入住日期安排，发布前核对房态');
 assert.equal((await composePromotionPlan(facts,period,'en',{model:true,fetcher:respond(json)})).publishTiming,'Plan around the stay dates and check availability before posting');
 for(const publishTiming of ['建议在2026年10月中旬通过微信公众号发布推文，提前一个月吸引周末短途客。','入住前一周准备内容','Publish on October 15, 2026','根据目标入住日期安排，发布前核对房态']){
  await assert.rejects(()=>composePromotionPlan(facts,period,'zh',{model:true,fetcher:respond({...json,publishTiming})}),/promotion_plan_unavailable/,'model-authored timing must not be silently replaced and labeled successful');
 }
 for(const bad of [{...json,factIds:['invented']},{...json,extra:'bad'},{...json,title:'每晚99元'}])await assert.rejects(()=>composePromotionPlan(facts,period,'zh',{model:true,fetcher:respond(bad)}));
 const fullBrief={...period,language:'zh',channel:'wechat',goal:'rooms',sourceIds:[]};
 const summary=await composePromotionPlan(facts,fullBrief,'zh',{model:false});assert.equal(summary.engine,'rules_v1');assert(validPromotionPlan(summary));
 const room={id:'room_0',text:'房型：庭院双床房，最多入住 2 人。'};
 const audience=await composePromotionPlan([...facts,room],fullBrief,'zh',{model:false});
 assert.equal(audience.audience,'计划双人短途出游的客人');
 assert.match(audience.angle,/庭院双床房/);
 assert(audience.factIds.includes(room.id));assert(validPromotionPlan(audience));
 const sourceFact={id:'source_0',text:'测试摄影展\n测试展馆'};
 const sourcePlan=await composePromotionPlan([...facts,room,sourceFact],fullBrief,'zh',{model:false,diagnosis});
 assert(sourcePlan.angle.includes('测试摄影展'));assert(sourcePlan.factIds.includes('source_0'));assert.deepEqual(sourcePlan.diagnosis,diagnosis);assert(validPromotionPlan(sourcePlan));
 assert(validPromotionPlan(await composePromotionPlan(facts,fullBrief,'zh',{model:true,fetcher:respond(json)})));
 assert.equal(promotionFinding(run,'finding-1','2026-11-05'),finding);
 const selected={id:'opp:selected',claim:'第二个机会的说明',window:period,actions:[{target:'promotion'}]};
 const opportunityRun={...run,opportunities:[{...selected,id:'opp:first',claim:'第一个机会的说明'},selected]};
 const opportunityRef={runId:diagnosis.runId,opportunityId:selected.id};
 assert(validPromotionDiagnosis(opportunityRef));
 assert(validPromotionPlan({...plan,diagnosis:opportunityRef}));
 assert.deepEqual(promotionTarget(opportunityRun,opportunityRef,'2026-11-05'),{period,reason:selected.claim});
 assert.throws(()=>promotionTarget(opportunityRun,{...opportunityRef,opportunityId:'opp:missing'},'2026-11-05'));
 for(const invalid of [null,{...run,dailyMetrics:[{date:period.start,available:2}]},{...run,dailyMetrics:[{date:period.start,available:2},{date:period.end,available:0}]},{...run,findings:[{...finding,nextAction:undefined}]},{...run,evidence:[]}])assert.throws(()=>promotionFinding(invalid,'finding-1','2026-11-05'));
 assert.throws(()=>promotionFinding(run,'finding-1','2026-11-12'));
 const draft={id:diagnosis.runId,brief:{language:'zh',channel:'wechat',goal:'rooms',...period,sourceIds:[]},content:'古镇小住计划',engine:'model_v1',createdAt:new Date().toISOString(),basis:[]};
 assert(validPromotion({sources:[],drafts:[draft]}));assert(validPromotion({sources:[],drafts:[{...draft,plan}]}));assert(!validPromotion({sources:[],drafts:[{...draft,plan:{...plan,end:'2026-11-12'}}]}));
 console.log('PASS promotion plan: model output validation, code-owned publishing guidance, rejection of fabricated/past model schedules, fact references, multiline edits, explicit summary, diagnosis date/evidence/vacancy guards, legacy and plan draft compatibility. No live calls.');
})().catch(e=>{console.error(e);process.exitCode=1});
