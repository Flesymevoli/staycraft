const { chromium }=require('./qa-browser.cjs');
(async()=>{
 const b=await chromium.launch({headless:true}); const p=await b.newPage({viewport:{width:390,height:844}});
 for(const name of ['home','work','analysis','explore','mine']){
 await p.goto('http://127.0.0.1:3000/native-'+name); await p.evaluate(()=>document.fonts.ready);
 await p.screenshot({path:'qa-review-'+name+'.png',fullPage:true});
 console.log(name, await p.locator('h1,h2,h3').evaluateAll(es=>es.map(e=>({text:e.textContent,size:getComputedStyle(e).fontSize}))),await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth));
 }
 await b.close();
})();
