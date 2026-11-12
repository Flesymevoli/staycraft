const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript'),assert=require('node:assert/strict');
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const file=path.resolve(__dirname,'../src/components/diagnosis-overview.tsx'),mod=new Module(file);
mod.require=name=>name==='next/link'?{default:({children,...props})=>React.createElement('a',props,children)}:require(name);
mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);
const {DiagnosisOverview}=mod.exports;
const run={id:'fixture',summary:'旧调查摘要',findings:[{id:'f1',action:'旧报告建议',reason:'旧记录依据',nextAction:{target:'data',period:{start:'2026-11-07',end:'2026-11-08'}}}],report:{title:'经营报告',summary:'空房集中在周中，应优先改善对应日期的展示。无需整体降价。',sections:[{paragraphs:['周中剩余房量集中，周末已有预订。渠道的房型说明不够完整。']}],recommendations:[{title:'后续观察',body:'留意新增订单',priority:'low'},{title:'完善周中房型展示',body:'空房集中在对应日期，先解释房型与包含服务。',priority:'high',findingId:'f1'},{title:'按日期复核报价条件',body:'酒店起价未匹配房型，不宜据此整体降价。',priority:'medium'}]}};
const render=r=>renderToStaticMarkup(React.createElement(DiagnosisOverview,{run:r,zh:true}));
let html=render(run);for(const value of ['核心判断','关键依据','优先决策','空房集中在周中','渠道的房型说明不够完整','完善周中房型展示','按日期复核报价条件','/app/analysis?start='])assert(html.includes(value));assert(!html.includes('旧调查摘要'));assert(!html.includes('后续观察'));assert(html.indexOf('完善周中房型展示')<html.indexOf('按日期复核报价条件'));assert(!html.includes('<details'));
const before=JSON.stringify(run);render(run);assert.equal(JSON.stringify(run),before);
html=render({...run,report:undefined,phase:'writing_failed'});assert(html.includes('旧调查摘要'));
html=render({...run,report:{...run.report,recommendations:[],sections:[]}});assert(html.includes('旧报告建议'));assert(html.includes('旧记录依据'));
console.log('PASS: complete-report judgment/evidence/top-two priorities visible, source immutable, incomplete summary and legacy recommendation fallbacks');

