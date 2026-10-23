const {chromium}=require('./qa-browser.cjs');
(async()=>{
const b=await chromium.launch({headless:true}); const p=await b.newPage({viewport:{width:390,height:844}});
await p.goto('http://127.0.0.1:3000/native-analysis');
await p.getByRole('button',{name:/Satisfaction/}).click();
const d=p.locator('.analysis-rating-disclosure');
if(await d.getAttribute('open')!==null) throw Error('Not collapsed');
await d.locator('summary').click();
if(await p.locator('.analysis-rating-row:visible').count()!==5) throw Error('Missing breakdown');
await d.locator('summary').focus(); await p.keyboard.press('Enter');
if(await d.getAttribute('open')!==null) throw Error('Keyboard collapse failed');
await p.getByRole('button',{name:'中文',exact:true}).click();
await p.getByText('5 星 32 条 · 4 星 8 条',{exact:true}).waitFor();
await p.locator('#satisfaction-detail').scrollIntoViewIfNeeded();
await p.screenshot({path:'qa-rating-compact.png'});
await b.close(); console.log('Collapsed default, expansion, keyboard and Chinese verified');
})();
