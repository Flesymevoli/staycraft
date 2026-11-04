const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),ts=require('typescript'),Module=require('node:module');
const cache=new Map();
function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file).exports;const mod=new Module(file);cache.set(file,mod);mod.require=name=>name.startsWith('.')?load(path.resolve(path.dirname(file),name)+'.ts'):require(name);mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);return mod.exports;}
const {composePromotion}=load('src/lib/promotion.ts'),{modelSuggestions}=load('src/lib/business-assistant.ts');
const live=process.argv.includes('--live');
if(live)require('@next/env').loadEnvConfig(process.cwd(),false,{info(){},error(){}});else Object.assign(process.env,{MODEL_BASE_URL:'https://model.example/v1',MODEL_API_KEY:'mock-only',MODEL_NAME:'mock-only'});
const facts=[{id:'property',text:'民宿名称：测试小院（虚构）'},{id:'location',text:'位置：太仓沙溪古镇周边'},{id:'room_0',text:'房型：花园大床房，最多入住 2 人。'},{id:'guestNotes',text:'客人须知：全屋禁烟。'},{id:'breakfast',text:'早餐时间：07:00–09:00'},{id:'checkin',text:'入住时间：14:00'}];
const formal='测试小院（虚构）位于太仓沙溪古镇周边，提供可容纳2人入住的花园大床房。\n\n民宿实行全屋禁烟。入住时间为14:00，早餐时间为07:00–09:00，可据此安排入住行程。';
const discovery='谁懂啊，短途小住可以这样安排✨\n\n先把测试小院（虚构）放进下一次的小住清单。\n📍位置在太仓沙溪古镇周边。\n\n可以看看花园大床房，最多入住2人。\n全屋禁烟，14:00入住，早餐时间07:00–09:00。\n\n想给日常留一点空白，不妨先收藏，等下一次出发。\n\n#民宿小住 #周末去哪儿 #短途旅行 #住宿推荐 #旅行灵感 #太仓';
const period={start:'2026-11-05',end:'2026-11-05'};
const operating={period,occupancy:{booked:4,capacity:5,available:1,bookedPct:80,historicalInventoryUnknown:false,activeRooms:5,inactiveBooked:0},rates:{min:520,max:760},daily:[{date:period.start,available:1,booked:4,bookedPct:80}],coverage:{partialChannelCoverage:true,lastImportAt:null,channels:['DEMO']},market:{start:period.start,end:'2026-11-06',low:156,high:345,ownLow:520,ownHigh:760,count:5,checkedAt:new Date().toISOString(),location:'公开测试区域'}};
const suggestions=[{title:'先安排剩余客房的到店准备',problem:'本期已订4/5间夜，占用率80%，只剩1间夜。',action:'核对所选日期的到店安排和清洁进度，先不整体降价。',reason:'已订4间夜，剩余房量只有1间夜。',check:'订单导入是否完整、剩余客房是否可售。'},{title:'突出本店与周边房型的差异',problem:'本店挂牌价¥520起，周边酒店起价¥156起。',action:'对照同日期房型、早餐和退改条件，把实际卖点写入房源介绍。',reason:'本店挂牌低端¥520高于本次周边起价上端¥345。',check:'是否为相近房型与服务条件。'}];
function response(value){return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify(value)}}]});}
(async()=>{
 for(const channel of ['wechat','xiaohongshu']){
  if(process.argv.includes('--marketing-only')&&channel==='wechat')continue;
  let sent;
  const brief={language:'zh',channel,goal:'rooms',...period,sourceIds:[]};
  const options=live?{model:true}:{model:true,fetcher:async(_url,init)=>{sent=JSON.parse(init.body);return response({content:channel==='wechat'?formal:discovery})}};
  const result=await composePromotion(facts,brief,'测试小院（虚构）',options);
  if(!live){assert.equal(result.engine,'model_v1');assert(!JSON.parse(sent.messages[1].content).brief.goal);}
  if(channel==='wechat')assert(!/[#✨📍]/u.test(result.content));else{assert(result.content.split('\n')[0].length<=60);assert((result.content.match(/#[^\s#]+/g)||[]).length>=6);}
  console.log(JSON.stringify({version:channel==='wechat'?'正式版':'引流版',engine:result.engine,content:result.content}));
 }
 if(!live){const rejected=await composePromotion(facts,{language:'zh',channel:'wechat',goal:'rooms',...period,sourceIds:[]},'测试小院（虚构）',{model:true,fetcher:async()=>response({content:formal+' 配备投影仪。'})});assert.equal(rejected.engine,'rules_v1');const repaired=await composePromotion(facts,{language:'zh',channel:'xiaohongshu',goal:'rooms',...period,sourceIds:[]},'测试小院（虚构）',{model:true,fetcher:async()=>Response.json({choices:[{finish_reason:'stop',message:{content:'{"content":"'+(discovery+'\n房间外就是小院子，环境安静。').replaceAll('"','\\"')+'"}'}}]})});assert.equal(repaired.engine,'model_v1');assert(repaired.content.includes('小院子'));assert(!repaired.content.includes('content'));assert(!repaired.content.includes('\\n'));}
 if(process.argv.includes('--marketing-only'))return;
 const result=await modelSuggestions(operating,true,live?{}:{fetcher:async()=>response({suggestions})});assert.equal(result.length,2);console.log(JSON.stringify({operating:result}));
 if(!live){await assert.rejects(modelSuggestions(operating,true,{fetcher:async()=>response({suggestions:[{...suggestions[0],problem:'占用率99%，只剩1间夜。'},suggestions[1]]})}),/percentage/);}
 console.log(live?'Completed three bounded real-model calls with fictional facts; no business writes.':'PASS both styles, model/rules distinction, unsupported amenity rejection, grounded suggestions and percentage validation. Mock model only.');
})().catch(e=>{console.error(e);process.exitCode=1});
