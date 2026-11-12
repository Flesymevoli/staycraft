// Pure Node rendering of the real workbench component; not browser or visual QA.
// Income data, the assistant and Next navigation are stubbed. No network or writes.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const ts=require('typescript'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const root=path.resolve(__dirname,'..'),cache=new Map();
function load(file){
 const target=path.extname(file)?file:['.ts','.tsx'].map(ext=>file+ext).find(candidate=>fs.existsSync(candidate));
 if(!target)throw Error('Fixture module not found: '+file);
 if(cache.has(target))return cache.get(target).exports;
 const mod=new Module(target);cache.set(target,mod);
 mod.require=name=>{
  if(name.endsWith('.css'))return {};
  if(name==='next/link')return ({href,children,...props})=>React.createElement('a',{href,...props},children);
  if(name==='./revenue-overview')return {useRevenueOverview:()=>({revenue:null,status:'ready',retry(){}})};
  if(name==='./workbench-report')return {IncomeOverview:()=>null};
  if(name==='./workspace-assistant')return {WorkspaceAssistant:()=>null};
  if(name.startsWith('@/'))return load(path.resolve(root,'src',name.slice(2)));
  if(name.startsWith('.'))return load(path.resolve(path.dirname(target),name));
  return require(name);
 };
 mod._compile(ts.transpileModule(fs.readFileSync(target,'utf8'),{compilerOptions:{
  module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,
 }}).outputText,target);
 return mod.exports;
}
const {GeminiWorkbenchHome}=load(path.join(root,'src/components/gemini-workbench-home.tsx'));
const {buildOpportunities,renderOpportunityText}=load(path.join(root,'src/lib/decisions/opportunity.ts'));
let checks=0;
const check=(condition,message)=>{assert.ok(condition,message);checks++;};
const eq=(actual,expected,message)=>{assert.deepEqual(actual,expected,message);checks++;};
const past={start:'2026-11-01',end:'2026-11-14'};
const signal=(kind,window,value,severity='high')=>({
 id:`${kind}:${window.start}:${window.end}${kind==='channel_mix'?':ctrip':''}`,kind,window,
 metric:{name:kind==='gap_window'?'consecutive_open_nights':kind==='channel_mix'?'top_channel_share':'cancellation_rate',unit:kind==='gap_window'?'count':'pct',value},
 baseline:{kind:kind==='gap_window'?'capacity_ratio':'prior_period',value:kind==='cancellation_rate'?5:null,samples:20},
 threshold:{op:'gt',value:kind==='gap_window'?2:20},severity,confidence:'high',evidenceIds:['orders'],unknowns:[],
});
const cancellation=signal('cancellation_rate',past,40),channel=signal('channel_mix',past,90);
const earlyGap=signal('gap_window',{start:'2026-11-15',end:'2026-11-17'},3,'medium');
const laterGap=signal('gap_window',{start:'2026-11-20',end:'2026-11-25'},6);
const fromSignal=entry=>buildOpportunities({signals:[entry]})[0];
const riskCard=fromSignal(cancellation),channelCard=fromSignal(channel),gapCard=fromSignal(laterGap);
const run={
 id:'11111111-1111-4111-8111-111111111111',period:{start:'2026-11-15',end:'2026-11-21'},
 metrics:{bookedPct:30,bookedRoomNights:21,capacityRoomNights:70,availableRoomNights:49,amountCents:1050000,activeRooms:10},
 dailyMetrics:[],findings:[],evidence:[],signalSources:[],signals:[earlyGap,channel,cancellation,laterGap],
 // Deliberately resemble a stored run: unsorted and containing two gap windows.
 opportunities:[fromSignal(earlyGap),channelCard,riskCard,gapCard],
};
const cards=html=>[...html.matchAll(/<article class="opp-card">[\s\S]*?<\/article>/g)].map(match=>match[0]);
const titles=html=>cards(html).map(card=>/<h3>([\s\S]*?)<\/h3>/.exec(card)[1]);
const render=(current,zh)=>renderToStaticMarkup(React.createElement(GeminiWorkbenchHome,{
 scope:'local-component-fixture',run:current,metrics:null,zh,busy:false,error:'',
 onRetry(){},onSavePlan(){},onCollect(){},onReport(){},planPanel:null,
}));
const originalFetch=globalThis.fetch;
globalThis.fetch=()=>{throw Error('Network access is forbidden in component rendering QA');};
try{
 for(const zh of [true,false]){
  const html=render(run,zh);
  const folded=/<details class="more-opportunities">([\s\S]*?)<\/details>/.exec(html);
  check(folded,'remaining items render in a closed details element');
  const visible=html.slice(0,folded.index),featured=cards(visible);
  eq(featured.length,2,'overview renders exactly two priority cards');
  eq(featured.filter(card=>card.includes('pill-coral')).length,1,'first two cards include one risk');
  eq(featured.filter(card=>card.includes('pill-emerald')).length,1,'first two cards include one opportunity');
  eq(titles(visible),[renderOpportunityText(riskCard,zh).title,renderOpportunityText(gapCard,zh).title],'highest-priority risk and supported gap lead the overview');
  eq(titles(folded[1]),[renderOpportunityText(channelCard,zh).title],'remaining fold contains only the other risk');
  const allTitles=titles(html);
  eq(new Set(allTitles).size,allTitles.length,'featured and remaining cards never repeat');
  eq(allTitles.length,3,'duplicate gap windows do not fill extra slots');
  check(!allTitles.includes(renderOpportunityText(fromSignal(earlyGap),zh).title),'lower-severity same-family window is absent');
  check(zh?visible.includes('取消率值得关注'):visible.includes('Review cancellations and refund terms'),'main diagnosis matches the highest-priority risk');
  const hrefs=[...featured[1].matchAll(/href="([^"]+)"/g)].map(match=>match[1].replaceAll('&amp;','&'));
  const promotion=hrefs.find(href=>href.startsWith('/app/promotion?'));
  check(promotion,'chosen open-room opportunity has a promotion link');
  const url=new URL(promotion,'https://fixture.invalid');
  eq(url.searchParams.get('runId'),run.id,'promotion retains the original diagnosis ID');
  eq(url.searchParams.get('opportunityId'),gapCard.id,'promotion retains the chosen original opportunity ID');
  check(!/NaN|Infinity|undefined/.test(html),'rendered output contains no invalid numeric or missing values');
  check(zh?html.includes('经营决策工作台'):html.includes('Decision Workbench'),'page copy follows the selected language');
  if(!zh)check(!/[\u4e00-\u9fff]/.test(html),'English rendering contains no Chinese copy');

  const missing={...laterGap,metric:{...laterGap.metric,value:null},confidence:'low'};
  const emptyHtml=render({...run,signals:[missing],opportunities:[{...gapCard,basis:[missing]}]},zh);
  eq(cards(emptyHtml).length,0,'missing evidence does not become a priority card');
  check(!emptyHtml.includes('class="more-opportunities"'),'missing-only results have no empty remaining fold');
  check(zh?emptyHtml.includes('当前数据尚未形成可执行机会'):emptyHtml.includes('No actionable opportunities yet'),'missing-only results show the explicit empty state');
  check(zh?emptyHtml.includes('未获取'):emptyHtml.includes('Not available'),'missing detector evidence remains available for review');
 }
 console.log(JSON.stringify({passed:checks,mode:'pure Node ReactDOMServer rendering; not browser or visual acceptance',cases:[
  'real GeminiWorkbenchHome','risk plus opportunity','highest-severity family deduplication','closed remaining fold without duplicates',
  'missing-evidence empty state','Chinese and English','stable promotion references','no network',
 ]},null,2));
}finally{globalThis.fetch=originalFetch;}
