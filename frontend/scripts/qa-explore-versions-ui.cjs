const {chromium}=require('./qa-browser.cjs'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch();try{
 const page=await browser.newPage({viewport:{width:390,height:844}});page.on('dialog',d=>d.accept());const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/workspace/discovery',r=>r.fulfill({json:{places:[],location:'测试地区'}}));
 await page.route('**/api/workspace/decision',r=>{const b=r.request().postDataJSON();return r.fulfill({json:{engine:'model_v1',sourceRevision:null,draft:{kind:'action',id:'11111111-1111-4111-8111-111111111111',createdAt:new Date().toISOString(),engine:'model_v1',brief:{language:'zh',channel:'wechat',goal:'rooms',start:b.start,end:b.end,sourceIds:[]},content:'先安排剩余客房\n问题：已订4/5间夜，剩余1间夜。\n建议：先核对到店与清洁，不整体降价。\n原因：占用80%，余房有限。\n需核实：实际房态。',basis:[]}}})});
 await page.goto('http://127.0.0.1:3114/login');await page.getByRole('button',{name:/体验演示|Try StayCraft/}).click();await page.waitForURL('**/app');await page.goto('http://127.0.0.1:3114/app/explore');
 const block=page.locator('#promotion-opportunity');await block.getByRole('button',{name:'正式版',exact:true}).waitFor();
 assert.equal(await block.getByRole('button',{name:'正式版',exact:true}).getAttribute('aria-pressed'),'true');
 assert(!/推广目标|推广渠道|民宿小住|周边出游/.test(await block.innerText()));
 await page.getByText('AI 分析',{exact:true}).waitFor();assert.equal(await page.getByText('暂维持现价',{exact:true}).count(),0);
 const formalRequest=page.waitForRequest(r=>r.url().endsWith('/promotion/generate')&&r.method()==='POST');await block.getByRole('button',{name:'生成文案',exact:true}).click();assert.equal((await formalRequest).postDataJSON().channel,'wechat');
 const editor=page.locator('#workspace-promotion-copy');await editor.waitFor();await page.waitForFunction(()=>document.querySelector('#workspace-promotion-copy')?.value.length>0);
 assert(!(await editor.inputValue()).includes('#'));
 await page.getByRole('button',{name:'保存草稿',exact:true}).click();await page.getByText('已保存到当前账号，未发布。',{exact:true}).waitFor();
 await block.getByRole('button',{name:'引流版',exact:true}).click();
 const marketingRequest=page.waitForRequest(r=>r.url().endsWith('/promotion/generate')&&r.method()==='POST');await block.getByRole('button',{name:'生成文案',exact:true}).click();const body=(await marketingRequest).postDataJSON();assert.equal(body.channel,'xiaohongshu');assert.equal(body.goal,'rooms');
 await page.waitForFunction(()=>/^(谁懂啊|挖到宝|藏不住了|终于找到)/.test(document.querySelector('#workspace-promotion-copy')?.value||''));
 const content=await editor.inputValue();assert((content.match(/#[^\s#]+/g)||[]).length>=6);
 await page.getByRole('button',{name:'保存草稿',exact:true}).click();await page.getByText('已保存到当前账号，未发布。',{exact:true}).waitFor();
 for(const width of [320,360,375,390,430,768]){await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));const boxes=await page.locator('.market-dates input').evaluateAll(nodes=>nodes.map(n=>({input:n.getBoundingClientRect().toJSON(),label:n.parentElement.getBoundingClientRect().toJSON(),card:n.closest('.native-card').getBoundingClientRect().toJSON()})));for(const b of boxes){assert(b.input.width<=b.label.width+1);assert(b.input.left>=b.card.left&&b.input.right<=b.card.right);}}
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'qa-explore-versions.png',fullPage:true});assert.deepEqual(errors,[]);
 console.log('PASS formal/discovery controls, no goal/channel selection, rule-template styles, save both versions, generated advice labels and three widths. Mock advice; isolated promotion writes only.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
