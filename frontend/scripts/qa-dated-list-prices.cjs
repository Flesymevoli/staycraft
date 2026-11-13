const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../src/lib');
function load(file){const mod=new Module(file);mod.require=name=>name.startsWith('.')?load(path.resolve(path.dirname(file),name)+'.ts'):require(name);mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);return mod.exports;}
const {prepareCtripBatch}=load(path.join(root,'market/desktop-sync.ts'));
const {buildMarketSample}=load(path.join(root,'market/sample.ts'));
const {dailyMedian}=load(path.join(root,'market/presentation.ts'));
const {countableQuote}=load(path.join(root,'market/quote-identity.ts'));
const {marketAnchors}=load(path.join(root,'signals/market-anchors.ts'));
const {marketInventoryAdvice}=load(path.join(root,'market/rate-advice.ts'));
const window={start:'2026-11-13',end:'2026-11-19'};
const raw=Array.from({length:35},(_,n)=>({kind:'display_starting_price',hotelName:'样本酒店'+n%5,stayDate:'2026-11-'+(13+Math.floor(n/5)),capturedAt:'2026-11-13T06:26:04.769Z',adults:1,rooms:1,children:0,nights:1,amount:100+n%5*100,currency:'CNY'}));
const batch=prepareCtripBatch(window.start,window.end,raw);assert(batch);const quotes=batch.quotes;
const sample=buildMarketSample({quotes,window});assert.equal(sample.stats.n,35);assert.equal(sample.stats.medianCny,300);assert.equal(sample.comparability,'loose');assert.match(sample.unknowns.join(),/1 位成人/);
for(let n=13;n<=19;n++)assert.equal(dailyMedian(quotes,'2026-11-'+n),300);
for(const change of [{hotelId:undefined},{note:'generic display'},{stayDate:'invalid'},{nights:2},{adults:0},{status:'stale'},{sourceUrl:undefined},{priceCny:0}])assert.equal(countableQuote({...quotes[0],...change}),false);
assert.equal(buildMarketSample({quotes:quotes.map(q=>({...q,roomClass:'大床'})),window}).comparability,'loose');
const scope={quotes,capturedAt:batch.capturedAt,location:'测试民宿地址',capturedLocation:'测试民宿地址',window};
assert.equal(marketAnchors(scope).anchors.length,35);assert.match(marketAnchors(scope).anchors[0].source.note,/1 位成人.*列表起价/);
assert.equal(marketAnchors({...scope,location:'另一个地址'}).anchors.length,0);
const day=buildMarketSample({quotes,window:{start:window.start,end:window.start}});
const advice=marketInventoryAdvice({sample:day,ownRates:{min:400,max:500,average:450},inventory:{date:window.start,capacity:5,booked:2,available:3},zh:true});assert.match(advice.basis,/周边均价 ¥300/);assert.match(advice.action,/核对/);assert.doesNotMatch(advice.title,/样本不足/);
console.log('PASS dated list prices: 35 observations, seven daily medians, qualified reference stats/advice/anchors, marketing exclusion and location isolation.');

