const { chromium } = require('C:/Users/86299/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:390,height:844}});
 await page.goto('http://127.0.0.1:3000/native-analysis');
 await page.getByText('Select a metric to view its details below').waitFor();
 if(await page.locator('.analysis-metric-hint').count()!==5) throw Error('Missing hints');
 await page.getByRole('button',{name:/Demand Rising/}).click();
 await page.getByText('Sep 26 is the monthly peak').waitFor();
 if(await page.locator('.analysis-overview button[aria-pressed=true]').count()!==1) throw Error('Selection');
 await page.getByRole('button',{name:'中文',exact:true}).click();
 await page.getByText('9 月 26 日为本月高峰').waitFor();
 if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)) throw Error('Overflow');
 await page.screenshot({path:'qa-analysis-hints.png',fullPage:true});
 await browser.close();
 console.log('Metric hints, demand labels, language switch and mobile width passed');
})();
