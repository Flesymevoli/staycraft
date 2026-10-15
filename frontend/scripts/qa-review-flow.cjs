const {chromium}=require('C:/Users/86299/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const b=await chromium.launch({headless:true}); const p=await b.newPage({viewport:{width:390,height:844}});
 await p.goto('http://127.0.0.1:'+(process.env.QA_PORT||'3000')+'/native-home');
 await p.locator('a[href="/native-work#operation-arrival"]').click();
 await p.locator('#operation-arrival').getByRole('button',{name:'Review advice'}).click();
 await p.locator('#operation-arrival').getByRole('button',{name:'Record readiness check'}).click();
 await p.getByRole('navigation').getByRole('link',{name:'Home',exact:true}).click();
 if(await p.locator('a[href="/native-work#operation-arrival"]').count()) throw Error('Stale home task');
 await p.locator('a[href="/native-work#operation-refund"]').waitFor();
 await p.evaluate(()=>sessionStorage.setItem('homestay-demo:language',JSON.stringify('zh')));
 for(const width of [360,430]){
 await p.setViewportSize({width,height:844});
 for(const name of ['home','work','analysis','explore','mine']){
 await p.goto('http://127.0.0.1:'+(process.env.QA_PORT||'3000')+'/native-'+name);
 await p.locator('.native-language').filter({hasText:'EN'}).waitFor();
 if(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth)) throw Error(name+' overflow '+width);
 }
 }
 await b.close(); console.log('Home-to-work decision sync and five Chinese pages at 360/430px passed');
})();
