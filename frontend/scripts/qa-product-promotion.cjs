const fs=require('fs'),path=require('path'),Module=require('module'),ts=require('typescript'),assert=require('assert/strict');
function load(file){const mod=new Module(file);mod.require=name=>name.startsWith('.')?load(path.resolve(path.dirname(file),name)+'.ts'):require(name);mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);return mod.exports;}
const {composePromotion,validPromotion}=load(path.resolve('src/lib/promotion.ts'));
Object.assign(process.env,{MODEL_BASE_URL:'https://test.invalid',MODEL_API_KEY:'mock-only',MODEL_NAME:'mock'});
const facts=[{id:'property',text:'民宿名称：测试小院（虚构）'},{id:'location',text:'位置：太仓沙溪古镇周边'},{id:'room_0',text:'房型：大床房，最多入住2人。'}],brief={language:'zh',channel:'wechat',goal:'rooms',start:'2026-11-04',end:'2026-11-04',sourceIds:[]};
const official='测试小院（虚构）位于太仓沙溪古镇周边，提供可容纳两位客人的大床房。可以从想去的地方开始安排短途住宿，给一段小住留一点余地。\n\n计划在 2026-11-04 入住，欢迎私信日期与人数，一起核对房型与价格。';
const marketing='把一段小住留进行程\n\n在太仓沙溪古镇周边，把测试小院（虚构）放进出行清单。大床房可入住2人，约好同行的时间，再慢慢安排这一段旅程。\n\n如果想在 2026-11-04 来住，私信告诉我们日期和人数，一起确认合适的房型。';
const respond=content=>async()=>Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify({content})}}]});
(async()=>{for(const [channel,content] of [['wechat',official],['xiaohongshu',marketing]]){const result=await composePromotion(facts,{...brief,channel},'测试小院（虚构）',{model:true,fetcher:respond(content)});assert.equal(result.engine,'model_v1');assert.equal(result.content.replace(/\s+/g,' '),content.replace(/\s+/g,' '));const saved={sources:[],drafts:[{id:'11111111-1111-4111-8111-111111111111',brief:{...brief,channel},content:result.content+'\n编辑后的内容',engine:result.engine,createdAt:new Date().toISOString(),basis:[]}]};assert(validPromotion(saved));assert(validPromotion(JSON.parse(JSON.stringify(saved))));}
 const bad=await composePromotion(facts,brief,'测试小院（虚构）',{model:true,fetcher:respond(official+' 配备泳池和投影仪。')});assert.equal(bad.engine,'rules_v1');assert(!bad.content.includes('泳池'));
 const fakeMarketing=await composePromotion(facts,{...brief,channel:'xiaohongshu'},'测试小院（虚构）',{model:true,fetcher:respond(marketing+'\n提供泳池和投影仪。')});assert(!fakeMarketing.content.includes('泳池'));assert(!fakeMarketing.content.includes('投影仪'));
 const price=await composePromotion(facts,brief,'测试小院（虚构）',{model:true,fetcher:respond(official+' 每晚199元。')});assert.equal(price.engine,'rules_v1');
 console.log('PASS two model copy modes; factual checks apply to fictional properties too; invented amenities/prices excluded; edited drafts and legacy storage roundtrip. Mock model only.');
})().catch(e=>{console.error(e);process.exitCode=1});
