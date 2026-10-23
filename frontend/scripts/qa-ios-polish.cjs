const {chromium}=require('./qa-browser.cjs');
(async()=>{
const b=await chromium.launch({headless:true}); const p=await b.newPage({viewport:{width:360,height:844}});
await p.goto('http://localhost:3000/native-mine');
await p.getByRole('button',{name:'Edit Property name',exact:true}).click();
await p.getByRole('textbox',{name:'Property name',exact:true}).fill('Lake House');
if(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth)) throw Error('Editing overflow');
await p.getByRole('button',{name:'Save',exact:true}).click();
await p.getByRole('heading',{name:'Lake House',exact:true}).waitFor();
await p.getByRole('button',{name:'中文',exact:true}).click();
for(const width of [360,430]){
await p.setViewportSize({width,height:844});
for(const route of ['work','analysis','explore','mine']){
await p.goto('http://localhost:3000/native-'+route);
await p.locator('.native-language').filter({hasText:'EN'}).waitFor();
if(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth)) throw Error(route+' overflow');
}
}
await b.close();console.log('Chinese layouts at 360/430 and property editing passed');
})();
