const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
const cache={};function load(name){if(cache[name])return cache[name];const m={exports:{}};new Function('exports','require',ts.transpileModule(fs.readFileSync('src/lib/'+name+'.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(m.exports,id=>load(id.replace('./','')));return cache[name]=m.exports}
const {validBrief,validPromotion,publicSourceUrl,matchingSources,composePromotion,promotionCopy}=load('promotion');
const id='10000000-0000-4000-8000-000000000001';
const brief={language:'zh',channel:'xiaohongshu',goal:'local',start:'2026-10-30',end:'2026-11-02',sourceIds:[id]};
const source={id,title:'Fictional museum',url:'https://museum.example/events',summary:'Fictional exhibition, verify times.',start:'2026-11-01',end:'2026-11-10',checkedOn:'2026-10-30'};
const {officialHolidayReferences,holidayNotice}=load('official-holidays');
(async()=>{
assert(validBrief(brief));assert(!validBrief({...brief,start:'2026-02-30'}));assert(!validBrief({...brief,sourceIds:[id,id]}));assert(!validBrief({...brief,property:'another-account'}));
assert.equal(officialHolidayReferences('2026-10-01','2026-10-01',true)[0].end,'2026-10-07');assert.equal(officialHolidayReferences('2026-09-27','2026-10-01',true).length,2);assert.equal(officialHolidayReferences('2026-01-01','2026-12-31',false).length,7);assert.equal(officialHolidayReferences('2027-01-01','2027-01-07',true).length,0);assert.equal(officialHolidayReferences('2026-02-30','2026-03-01',true).length,0);assert.equal(officialHolidayReferences('2026-10-30','2026-11-02',true).length,0);assert(publicSourceUrl(holidayNotice.url));assert.match(officialHolidayReferences('2026-10-01','2026-10-07',false)[0].summary,/does not establish/);
for(const url of ['javascript:alert(1)','http://example.org','https://localhost/a','https://127.0.0.1/a','https://[::1]/','https://user:pass@example.org/a'])assert(!publicSourceUrl(url),url);
assert(publicSourceUrl(source.url));assert.deepEqual(matchingSources([source],brief),[source]);assert.equal(matchingSources([source],{...brief,end:'2026-10-30'}).length,0);
const copy=promotionCopy(brief,'Test stay',[{id:'room_0',text:'Room A for 2 guests'},{id:'source_0',text:source.summary}],['source_0','room_0']);assert(copy.includes(source.summary));assert(copy.includes('2026-10-30'));assert(!copy.includes('discount'));assert(!copy.includes('房型：'),'marketing copy avoids field-style labels');
const draft={id,brief,content:copy,engine:'rules_v1',createdAt:'2026-10-30T00:00:00Z',basis:[{label:source.title,text:source.summary,url:source.url}]};assert(validPromotion({sources:[source],drafts:[draft]}));assert(!validPromotion({sources:[source,source],drafts:[]}));assert(!validPromotion({sources:[source],drafts:[{...draft,content:'x'.repeat(4001)}]}));assert(!validPromotion({sources:[{...source,url:'javascript:alert(1)'}],drafts:[]}));assert(!validPromotion({sources:[],drafts:[],extra:true}));
Object.assign(process.env,{MODEL_BASE_URL:'https://provider.example/v1',MODEL_NAME:'fixture',MODEL_API_KEY:'test-key',MODEL_AUTH_MODE:'api-key'});

const facts=[{id:'property',text:'民宿名称：Test stay'},{id:'source_0',text:source.summary}];
const makeResponse=(content,finish_reason='stop')=>Response.json({choices:[{finish_reason,message:{content:JSON.stringify({content})}}]});
let calls=0;
const generate=(options)=>composePromotion(facts,{...brief,channel:'wechat'},'Test stay',{evidence:{source},...options});
const result=await generate({model:true,fetcher:async(url,init)=>{
  calls++;
  assert.equal(init.redirect,'manual');
  const body=JSON.parse(init.body);
  assert.deepEqual(JSON.parse(body.messages[1].content).facts,facts);
  return makeResponse('给周末留一点空白\n\n把想看的展览排进行程，再把 Test stay 加入住宿备选。逛完展，也给自己留一点慢慢散步的时间。');
}});
assert.equal(result.engine,'model_v1');assert.equal(calls,1);
assert(result.content.includes(source.title));assert(result.content.includes(source.start));
for(const response of [new Response(null,{status:302}),makeResponse('新客首住9折'),makeResponse('截断','length')]){
  const fallback=await generate({model:true,fetcher:async()=>response});
  assert.equal(fallback.engine,'rules_v1');assert.equal(fallback.fallback,true);
  assert(fallback.content.includes(source.title));
}
assert.equal((await generate({model:false,fetcher:()=>{throw Error('disabled must not call')}})).fallback,false);
const propertyFacts=[{id:'property',text:'民宿名称：测试山居'},{id:'location',text:'位置：测试市山路 12 号'},{id:'room_0',text:'房型：山景双床房，最多入住 2 人。'},{id:'notes',text:'民宿说明：一楼设有阅读角。'}];
const propertyBrief={...brief,channel:'wechat',sourceIds:[]};
const factual=await composePromotion(propertyFacts,propertyBrief,'测试山居',{model:false,evidence:{},fetcher:()=>{throw Error('factual mode must not call a model')}});
assert.equal(factual.engine,'rules_v1');
for(const fact of ['测试山居','测试市山路 12 号','山景双床房','最多入住 2 人','一楼设有阅读角','2026-10-30','2026-11-02'])assert(factual.content.includes(fact),fact);
assert(!/优惠|赠送|免费|步行|天气|仅剩/.test(factual.content),'no invented benefits, location claims or forecast');
const changed=await composePromotion([{id:'location',text:'位置：另一座城市'},{id:'room_0',text:'房型：单人客房，最多入住 1 人。'}],{...propertyBrief,start:'2026-12-01',end:'2026-12-03'},'另一家民宿',{model:false,evidence:{}});
for(const fact of ['另一家民宿','另一座城市','单人客房','2026-12-01'])assert(changed.content.includes(fact));
assert(!changed.content.includes('测试山居'));assert(!changed.content.includes('山景双床房'));
console.log('PASS promotion: evidence copy and invalid/redirect/disabled fallbacks. Mock model only.');
})().catch(e=>{console.error(e);process.exitCode=1});
