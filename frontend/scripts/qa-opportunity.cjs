// Static-render QA for the decision UI components. Pure node: no network, no file writes.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),assert=require('node:assert/strict');
const ts=require('typescript'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const root=path.resolve(__dirname,'..');
const files={
 card:{tsx:path.resolve(root,'src/components/opportunity-card.tsx'),css:path.resolve(root,'src/components/opportunity-card.css'),prefix:'oc-'},
 evidence:{tsx:path.resolve(root,'src/components/evidence-panel.tsx'),css:path.resolve(root,'src/components/evidence-panel.css'),prefix:'ep-'},
 action:{tsx:path.resolve(root,'src/components/action-plan-panel.tsx'),css:path.resolve(root,'src/components/action-plan-panel.css'),prefix:'ap-'},
};
function load(file){
 const mod=new Module(file);
 mod.require=name=>name.endsWith('.css')?{}:name.startsWith('@/')?load(path.resolve(root,'src',name.slice(2))+'.ts'):name.startsWith('.')?load(path.resolve(path.dirname(file),name)+'.ts'):require(name);
 mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,file);
 return mod.exports;
}
let checks=0;
const check=(condition,message)=>{assert.ok(condition,message);checks+=1;};
const eq=(actual,expected,message)=>{assert.deepEqual(actual,expected,message);checks+=1;};
const render=(Component,props)=>renderToStaticMarkup(React.createElement(Component,props));
const clean=html=>{check(!/NaN|Infinity|undefined/.test(html),'render must not leak NaN/Infinity/undefined');return html;};

// --- static contracts: one own stylesheet, pure props, no data access ---
const styleRules=['border-radius:16px','1px solid #e1e1e7','box-shadow:none','background:#fff','#62626c','#fafafb','font-variant-numeric:tabular-nums','overflow-wrap:anywhere','@media(max-width:480px)'];
for(const [key,entry] of Object.entries(files)){
 const source=fs.readFileSync(entry.tsx,'utf8'),css=fs.readFileSync(entry.css,'utf8');
 check(fs.existsSync(entry.tsx),`${key}: component file exists`);
 check(fs.existsSync(entry.css),`${key}: stylesheet file exists`);
 check(/^"use client";/.test(source),`${key}: client directive`);
 check(source.includes(`import './${path.basename(entry.css)}';`),`${key}: imports its own stylesheet`);
 check(/import type \{/.test(source),`${key}: imports shared types with import type`);
 check(!/\bfetch\s*\(/.test(source)&&!/\buseEffect\s*\(/.test(source)&&!/\buseState\s*\(/.test(source),`${key}: pure props, no data fetching or state`);
 check(css.includes('.'+entry.prefix),`${key}: stylesheet uses ${entry.prefix} class prefix`);
 for(const rule of styleRules)check(css.includes(rule),`${key}: stylesheet declares ${rule}`);
 if(entry.prefix!=='ep-'){
  check(css.includes('#5546d9'),`${key}: emphasis accent declared`);
  check(css.includes('min-height:44px'),`${key}: clickable target >=44px`);
  check(css.includes('outline:2px solid #5546d9'),`${key}: visible focus outline`);
 }
 check(css.includes('.'+entry.prefix+'panel')||css.includes('.'+entry.prefix+'card'),`${key}: panel surface styled`);
}

const {OpportunityCard}=load(files.card.tsx),{EvidencePanel}=load(files.evidence.tsx),{ActionPlanPanel}=load(files.action.tsx);

// --- fixtures ---
const dayWindow={start:'2026-11-10',end:'2026-11-16'};
const signalPct={id:'s1',kind:'booking_pace',window:dayWindow,metric:{name:'周中预订进度',unit:'pct',value:38},baseline:{kind:'same_weekday_history',value:52,samples:6},threshold:{op:'lt',value:50},severity:'high',confidence:'medium',evidenceIds:['orders'],unknowns:[]};
const signalMissing={id:'s2',kind:'price_volume_divergence',window:dayWindow,metric:{name:'竞争民宿均价',unit:'cny',value:null},baseline:{kind:'prior_period',value:null,samples:0},threshold:{op:'outside',value:0},severity:'medium',confidence:'low',evidenceIds:['competitor'],unknowns:['quote_not_returned']};
const signalZero={id:'s3',kind:'cancellation_rate',window:dayWindow,metric:{name:'取消率',unit:'pct',value:0},baseline:{kind:'prior_period',value:0,samples:4},threshold:{op:'gt',value:5},severity:'low',confidence:'high',evidenceIds:['orders'],unknowns:[]};
const riskOpportunity={id:'o1',kind:'risk',title:'周中空房风险上升',window:{start:'2026-11-11',end:'2026-11-16'},claim:'周中可售房量高于历史同日水平，应优先改善对应日期的展示。',basis:[signalPct,signalMissing],actions:[{title:'核对经营数据',target:'data'}],coverage:'orders 覆盖 11-10 至 11-16；competitor 部分覆盖',unknowns:[]};
const bareOpportunity={...riskOpportunity,kind:'opportunity',title:'周末活动带来机会',claim:'',basis:[],actions:[],coverage:''};
const source={id:'orders',authority:'internal',observedAt:'2026-11-10T08:00:00Z',coverage:{from:'2026-11-10',to:'2026-11-16',kind:'complete'},confidence:'high',note:'来自订单导入'};
const planItems={id:'p1',runId:'r1',opportunityId:'o1',createdAt:'2026-11-10T09:00:00Z',items:[{id:'i1',title:'改善周中房型展示',dueDate:'2026-11-12',status:'planned'},{id:'i2',title:'核对渠道报价条件',dueDate:'2026-11-13',status:'done'},{id:'i3',title:'暂停整体降价方案',status:'dismissed'}],followUpAt:'2026-11-17',metricBaseline:{name:'周中预订进度',value:null}};
const valueTexts=html=>[...html.matchAll(/class="ep-signal-value(?: is-missing)?">([^<]*)<\/span>/g)].map(match=>match[1]);

// --- OpportunityCard ---
let html=clean(render(OpportunityCard,{opportunity:riskOpportunity,zh:true,onPrimaryAction(){}}));
for(const value of ['风险','窗口','2026-11-11','2026-11-16','依据 2 条','覆盖','oc-kind-risk'])check(html.includes(value),'card zh shows '+value);
check(/[\u4e00-\u9fff]/.test(html.replace(/class="[^"]*"/g,'')),'card zh renders Chinese copy');
check(html.includes('<button')&&html.includes('核对经营数据'),'card renders first action button');
html=clean(render(OpportunityCard,{opportunity:riskOpportunity,zh:false,onPrimaryAction(){}}));
for(const value of ['Risk','Window','2026-11-11','2 pieces of evidence','Coverage'])check(html.includes(value),'card en shows '+value);
check(!/[\u4e00-\u9fff]/.test(html.replace(/class="[^"]*"/g,'')),'card en has no Chinese copy');
html=clean(render(OpportunityCard,{opportunity:{...riskOpportunity,basis:[signalPct]},zh:false,onPrimaryAction(){}}));
check(html.includes('1 piece of evidence'),'card en singular evidence count');
html=clean(render(OpportunityCard,{opportunity:bareOpportunity,zh:true,onPrimaryAction(){}}));
for(const value of ['机会','暂无判断说明','暂无依据','oc-kind-opportunity'])check(html.includes(value),'card zh fallback shows '+value);
check(!html.includes('<button'),'card without actions renders no button');
check(!html.includes('依据 0 条'),'card never prints zero evidence count');
html=clean(render(OpportunityCard,{opportunity:bareOpportunity,zh:false,onPrimaryAction(){}}));
for(const value of ['Opportunity','No summary available','No evidence yet'])check(html.includes(value),'card en fallback shows '+value);
check(!html.includes('<button'),'card en without actions renders no button');

// --- EvidencePanel ---
html=clean(render(EvidencePanel,{sources:[source],signals:[signalPct,signalMissing,signalZero],zh:true}));
for(const value of ['来源','检测信号','orders','内部数据','观测时间','2026-11-10 16:00','完整','置信度','高','周中预订进度','竞争民宿均价','样本'])check(html.includes(value),'evidence zh shows '+value);
check(!html.includes('2026-11-10T08:00:00Z'),'evidence renders a stable local time, not the raw ISO string');
eq(valueTexts(html),['38%','未获取','0%'],'evidence values: null is 未获取, real zero stays 0%');
check(html.includes('class="ep-signal-value is-missing">未获取</span>'),'evidence marks missing value explicitly');
check(html.includes('class="ep-signal-value">0%</span>'),'evidence real zero percentage renders');
check(!html.includes('¥0'),'evidence never renders missing money as ¥0');
check(html.includes('class="ep-num">6</b>'),'evidence shows baseline samples');
html=clean(render(EvidencePanel,{sources:[source],signals:[signalMissing],zh:false}));
for(const value of ['Sources','Detector signals','Internal','Coverage','Confidence','Not available','Samples','High'])check(html.includes(value),'evidence en shows '+value);
check(!html.includes('0.00'),'evidence en missing value is not coerced to a number');
html=clean(render(EvidencePanel,{sources:[],signals:[],zh:true}));
check(html.includes('本次未获取外部来源，判断仅基于内部数据'),'evidence default empty state');
check(!html.includes('<ul'),'evidence empty state renders no list');
html=clean(render(EvidencePanel,{sources:[],signals:[],zh:true,emptyText:'暂无外部来源'}));
check(html.includes('暂无外部来源')&&!html.includes('本次未获取外部来源'),'evidence custom empty text replaces default');
html=clean(render(EvidencePanel,{sources:[source],zh:true}));
check(html.includes('来源')&&!html.includes('检测信号'),'evidence sources-only hides signal section');

// --- ActionPlanPanel ---
html=clean(render(ActionPlanPanel,{plan:null,zh:true}));
check(html.includes('尚未保存行动计划'),'action plan null empty state');
check(!html.includes('<button'),'action plan null renders no button');
html=clean(render(ActionPlanPanel,{plan:null,zh:false}));
check(html.includes('No action plan saved yet'),'action plan null empty state en');
html=clean(render(ActionPlanPanel,{plan:planItems,zh:true,onToggleItem(){}}));
for(const value of ['改善周中房型展示','核对渠道报价条件','暂停整体降价方案','计划中','已完成','已忽略','2026-11-12','2026-11-17','保存时的记录','未获取'])check(html.includes(value),'action plan zh shows '+value);
eq((html.match(/<button/g)||[]).length,2,'action plan renders complete/restore buttons only for planned and done items');
check(html.includes('>完成<')&&html.includes('>恢复<'),'action plan toggle labels');
html=clean(render(ActionPlanPanel,{plan:planItems,zh:true,onToggleItem(){},readOnly:true}));
check(!html.includes('<button'),'action plan readOnly renders no button');
check(html.includes('改善周中房型展示')&&html.includes('计划中'),'action plan readOnly keeps content');
html=clean(render(ActionPlanPanel,{plan:planItems,zh:true}));
check(!html.includes('<button'),'action plan without toggle handler renders no inert button');
html=clean(render(ActionPlanPanel,{plan:{...planItems,metricBaseline:{name:'周中预订进度',value:52},followUpAt:''},zh:true,onToggleItem(){}}));
check(html.includes('class="ap-num">52</b>'),'action plan shows numeric baseline');
check(html.includes('未设置'),'action plan empty follow-up falls back');
html=clean(render(ActionPlanPanel,{plan:{...planItems,items:[]},zh:true,onToggleItem(){}}));
check(html.includes('暂无待办事项'),'action plan empty items state');
html=clean(render(ActionPlanPanel,{plan:planItems,zh:false,onToggleItem(){}}));
for(const value of ['Action plan','Follow up','When saved','Not available','Complete','Restore','Planned','Done','Dismissed','Due'])check(html.includes(value),'action plan en shows '+value);

console.log(`PASS: ${checks} checks - opportunity card kind/window/claim/evidence/actions, evidence sources+signals with null not zero, action plan statuses/toggle/readOnly/followUp/baseline, bilingual and static style contracts; no network, no writes.`);
