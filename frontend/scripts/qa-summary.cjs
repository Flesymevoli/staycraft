const {chromium}=require('./qa-browser.cjs');
(async()=>{
const b=await chromium.launch({headless:true}); const p=await b.newPage({viewport:{width:390,height:844}});
await p.goto('http://localhost:3000/native-analysis');
await p.getByRole('heading',{name:'Your business summary'}).waitFor();
if(await p.locator('.analysis-compare,.analysis-insight,.analysis-explore').count()) throw Error('Old sections remain');
await p.getByRole('button',{name:/Review breakfast feedback/}).click();
await p.locator('#satisfaction-detail').waitFor();
await p.getByRole('link',{name:/Promote weekday stays/}).click();
await p.waitForURL('**/native-explore#promotion');
await p.goto('http://localhost:3000/native-analysis');
await p.getByRole('button',{name:'中文',exact:true}).click();
await p.getByRole('heading',{name:'经营总结',exact:true}).waitFor();
await p.locator('.analysis-summary-card').scrollIntoViewIfNeeded();
await p.screenshot({path:'qa-summary.png'});
if(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth)) throw Error('Overflow');
await b.close();console.log('Preview, summary, review switch and promotion link passed');
})();
