// Opt-in writing acceptance: fictional inputs, at most three HTTP requests, no database.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),ts=require('typescript');
const preview=process.argv.includes('--preview');
if(!preview)assert.equal(process.env.RUN_PAID_MODEL_TEST,'1','Explicit approval is required: RUN_PAID_MODEL_TEST=1');
const cache=new Map();
function load(file){
 const filename=path.resolve(__dirname,'../src/lib',file+'.ts');
 if(cache.has(filename))return cache.get(filename).exports;
 const mod={exports:{}};cache.set(filename,mod);
 new Function('exports','require',ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(mod.exports,id=>id.startsWith('.')?load(path.relative(path.resolve(__dirname,'../src/lib'),path.resolve(path.dirname(filename),id))):require(id));
 return mod.exports;
}
const {composePromotion}=load('promotion');
const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai'}).format(new Date());
const shift=days=>new Date(Date.parse(today+'T00:00:00Z')+days*86400000).toISOString().slice(0,10);
const brief={language:'zh',channel:'wechat',goal:'rooms',start:shift(3),end:shift(4),sourceIds:[]};
const name='桥边书舍（虚构演练）';
const facts=[{id:'property',text:'民宿名称：'+name},{id:'location',text:'位置：苏州市太仓市浏河镇'},
 {id:'room_0',text:'房型：临河大床房，最多入住 2 人。'},
 {id:'notes',text:'民宿说明：一楼设有阅读角与临河木窗。独立测试账号；本次订单为虚构演练数据。'}];
const event={id:'10000000-0000-4000-8000-000000000001',title:'街角纸艺展（虚构演练）',summary:'在镇文化中心举办，仅作模型验收的虚构活动。',url:'https://example.com/test-event',start:shift(2),end:shift(6),checkedOn:today};
const weather={id:'20000000-0000-4000-8000-000000000002',title:`太仓 ${shift(3)} 天气预报`,summary:'虚构演练预报：多云，最低 12°C，最高 19°C；预报可能变化。',url:'https://example.com/test-weather',start:shift(3),end:shift(3),checkedOn:today};
const scenarios=[
 {id:'local-event',name,facts,brief:{...brief,sourceIds:[event.id]},source:event},
 {id:'weather',name,facts,brief:{...brief,end:brief.start,sourceIds:[weather.id]},source:weather},
 {id:'sparse-property',name:'巷里小住（虚构演练）',facts:[{id:'property',text:'民宿名称：巷里小住（虚构演练）'},{id:'location',text:'位置：另一座城市'},{id:'room_0',text:'房型：庭院大床房，最多入住 2 人。'}],brief:{...brief,end:brief.start}},
];
(async()=>{
 if(!preview)require('@next/env').loadEnvConfig(path.resolve(__dirname,'..'),false,{info(){},error(){}});
 let totalRequests=0;
 const results=[];
 for(const scenario of scenarios){
  let requests=0,generated=null,httpStatus=null,finishReason=null,usage=null;
  const started=performance.now();
  const result=await composePromotion(scenario.facts,scenario.brief,scenario.name,{model:!preview,evidence:{source:scenario.source},diagnosisReason:'演练内部经营指标显示目标日期仍有空房，请据此组织邀请；不要向客人披露内部指标。',fetcher:async(url,init)=>{
   if(requests>=1||totalRequests>=3)throw Error('approved_request_limit');
   requests++;totalRequests++;
   const response=await fetch(url,init);
   httpStatus=response.status;
   try{
    const value=await response.clone().json();
    generated=typeof value.choices?.[0]?.message?.content==='string'?value.choices[0].message.content:null;
    finishReason=typeof value.choices?.[0]?.finish_reason==='string'?value.choices[0].finish_reason:null;
    usage=value.usage?Object.fromEntries(['prompt_tokens','completion_tokens','total_tokens'].filter(key=>Number.isFinite(value.usage[key])).map(key=>[key,value.usage[key]])):null;
   }catch{}
   return response;
  }});
  const outcome={scenario:scenario.id,latencyMs:Math.round(performance.now()-started),requests,httpStatus,finishReason,usage,...result,generated};
  results.push(outcome);
  console.log(JSON.stringify({scenario:outcome.scenario,requests,httpStatus,latencyMs:outcome.latencyMs,engine:outcome.engine,fallback:outcome.fallback}));
 }
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'staycraft-promotion-writing-'+(preview?'preview-':'live-')));
 const report=path.join(folder,'results.json');
 fs.writeFileSync(report,JSON.stringify({fictionalInputs:true,databaseWrites:0,preview,totalRequests,scenarios,results},null,2));
 console.log(JSON.stringify({preview,totalRequests,report,results:results.map(({scenario,latencyMs,requests,engine,fallback})=>({scenario,latencyMs,requests,engine,fallback}))}));
 if(!preview&&results.some(result=>result.engine!=='model_v1'||result.fallback))process.exitCode=1;
})().catch(()=>{console.error('Writing acceptance did not finish. Provider configuration and credentials were not logged.');process.exitCode=1});
