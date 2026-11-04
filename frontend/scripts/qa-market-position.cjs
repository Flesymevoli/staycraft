const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),Module=require('node:module');
const mod=new Module('market-position-test');mod._compile(ts.transpileModule(fs.readFileSync('src/lib/market-position.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,'market-position-test.cjs');
const {marketAnalysis,marketPriceAdvice}=mod.exports;
const quote={start:'2026-11-05',end:'2026-11-06',location:'沙溪',locationPrecision:'property',checkedAt:new Date().toISOString(),ownRates:{min:520,max:760},hotels:[{id:1,price:116,currency:'CNY',conditions:'1晚总价116'},{id:2,price:223,currency:'CNY',conditions:'1晚总价223'}]};
assert.equal(marketAnalysis(quote).low,116);assert.equal(marketPriceAdvice(marketAnalysis(quote),true).conclusion,'本店挂牌价高于本次周边起价范围');
for(const input of [{...quote,end:'2026-11-07'},{...quote,locationPrecision:'district'},{...quote,hotels:[quote.hotels[0],quote.hotels[0]]},{...quote,hotels:quote.hotels.map(h=>({...h,currency:'USD'}))},{...quote,ownRates:null}])assert.equal(marketAnalysis(input),null);
assert.equal(marketPriceAdvice({...marketAnalysis(quote),ownLow:100,ownHigh:200},true).conclusion,'本店挂牌价与周边起价范围重叠');
const {chromium}=require('./qa-browser.cjs');
(async()=>{const browser=await chromium.launch();try{const page=await browser.newPage({viewport:{width:390,height:844}});
 await page.route('**/api/workspace/discovery',r=>r.fulfill({json:{places:[],location:'沙溪'}}));
 await page.route('**/api/workspace/market-prices',r=>r.fulfill({json:{...quote,...r.request().postDataJSON(),hotels:quote.hotels.map(h=>({...h,name:'测试酒店'+h.id,address:'测试地址'}))}}));
 await page.route('**/api/workspace/decision',r=>{const body=r.request().postDataJSON();return r.fulfill({json:{sourceRevision:null,draft:{id:'11111111-1111-4111-8111-111111111111',kind:'action',createdAt:new Date().toISOString(),engine:'rules_v1',brief:{language:'zh',channel:'xiaohongshu',goal:'rooms',start:body.start,end:body.end,sourceIds:[]},content:'建议调价\n暂维持现价\n尚无依据\n当前挂牌\n原依据\n\n空房日期\n测试空房结论',basis:[]}}})});
 await page.goto('http://127.0.0.1:3114/login');await page.getByRole('button',{name:/体验演示|Try StayCraft/}).click();await page.waitForURL('**/app');await page.goto('http://127.0.0.1:3114/app/explore');await page.getByRole('button',{name:'查询真实房价'}).click();await page.locator('.market-position').getByText('本店挂牌价高于本次周边起价范围').waitFor();await page.locator('.decision-price-change').getByText('本店挂牌价高于本次周边起价范围').waitFor();assert((await page.locator('.decision-price-current').innerText()).includes('116–223'));
 const saved=page.waitForResponse(r=>r.url().endsWith('/api/workspace/promotion')&&r.request().method()==='PUT');await page.getByRole('button',{name:'收藏建议',exact:true}).click();assert.equal((await saved).status(),200);await page.getByRole('button',{name:'已保存',exact:true}).waitFor();
 for(const width of [320,390,768]){await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
 await page.screenshot({path:'qa-market-position.png',fullPage:true});console.log('PASS position/range conclusions, date/currency/location isolation, AI price block, saving snapshot and three widths. Mock quotes; isolated write only.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
