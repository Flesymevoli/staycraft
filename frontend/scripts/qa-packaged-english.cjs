const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {_electron} = require('playwright');

async function check() {
  const executablePath = process.env.STAYCRAFT_QA_EXE || path.resolve('../deliverables/releases/0.1.0/StayCraft-0.1.0-win-x64/StayCraft.exe');
  const app = await _electron.launch({executablePath, env:{...process.env, STAYCRAFT_DESKTOP_TEST_DATA:fs.mkdtempSync(path.join(os.tmpdir(),'staycraft-english-'))}});
  try {
    const main = await app.firstWindow();
    await main.waitForURL(/\/login$/);
    const opened = app.waitForEvent('window');
    await main.getByRole('button',{name:'体验演示',exact:true}).click();
    const page = await opened;
    await page.waitForURL(/\/login$/);
    await page.locator('.auth-submit').click();
    await page.waitForURL(/\/app$/);
    await page.evaluate(async()=>{
      for(const action of ['import','collect']){
        const response=await fetch('/api/demo/journey',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action})});
        if(!response.ok)throw Error(action);
      }
    });
    const root = new URL('/app', page.url()).href;
    const checkEnglish = async label=>{
      try {
        await page.waitForFunction(()=>!/[\u3400-\u9fff]/u.test(document.body.innerText),null,{timeout:30000});
      } catch {
        throw Error(label+': '+await page.evaluate(()=>document.body.innerText.split('\n').filter(s=>/\p{Script=Han}/u.test(s)).slice(0,8).join('\n')));
      }
    };
    await page.goto(root+'/promotion');
    await page.getByRole('button',{name:'探索周边',exact:true}).click();
    await page.getByRole('button',{name:'选用线索',exact:true}).first().click();
    await page.getByRole('button',{name:'生成推广文案',exact:true}).click();
    const field=page.locator('#workspace-promotion-copy');
    await page.waitForFunction(()=>document.querySelector('#workspace-promotion-copy')?.value.length>80);
    const source=(await field.inputValue())+'\n\n雨天可以在一楼喝杯热茶。入住日期 2026-11-19，每晚 ¥389。';
    await field.fill(source);
    await page.getByRole('button',{name:'保存草稿',exact:true}).click();
    await page.locator('.gemini-promo-status.saved').waitFor();
    let generations=0;
    page.on('request',request=>{
      if(request.method()==='POST'&&/\/api\/workspace\/(promotion\/generate|agent\/translation)$/.test(new URL(request.url()).pathname))generations++;
    });
    await page.locator('.native-language').click();
    await page.waitForFunction(()=>{const v=document.querySelector('#workspace-promotion-copy')?.value;return v&&/tea/i.test(v)&&!/[\u3400-\u9fff]/u.test(v)});
    const english=await field.inputValue();
    for (const fact of ['2026-11-19','¥389','Taicang Library']) assert(english.includes(fact),fact);
    await checkEnglish('Promotion');
    await page.locator('.native-language').click();
    assert.equal(await field.inputValue(),source);
    await page.locator('.native-language').click();
    await page.waitForFunction(text=>document.querySelector('#workspace-promotion-copy')?.value===text,english);
    await page.reload();
    await page.waitForFunction(text=>document.querySelector('#workspace-promotion-copy')?.value===text,english);
    for(const section of ['', '/explore','/analysis','/mine','/work']){
      await page.goto(root+section);
      await page.locator('.workbench-content').waitFor();
      if(section==='/explore')await page.locator('.gm-quote.is-counted').first().waitFor();
      if(section==='/mine')await page.locator('.property-room-main').first().waitFor();
      await checkEnglish(section||'Home');
      if(section==='/mine'){
        await page.getByRole('button',{name:/edit property profile/i}).click();
        await page.getByRole('button',{name:'Edit details',exact:true}).click();
        const name=page.locator('.profile-field input').first();
        await name.blur();
        await page.waitForFunction(()=>document.querySelector('.profile-field input')?.value==='Houlang Guesthouse');
        await name.focus();
        assert.equal(await name.inputValue(),'后浪小筑');
        await name.blur();
        assert.equal(await name.inputValue(),'Houlang Guesthouse');
        await page.keyboard.press('Escape');
      }
      if(section==='/analysis'){
        await page.getByRole('button',{name:'Bookings & import',exact:true}).click();
        await page.getByText('View reservation orders',{exact:true}).click();
        await checkEnglish('Bookings');
        await page.getByRole('button',{name:'Room inventory',exact:true}).click();
        await page.getByText('Garden Double',{exact:true}).first().waitFor();
        await checkEnglish('Room inventory');
      }
    }
    assert.equal(generations,0);
    console.log('PASS packaged English UI, saved edited draft, custom offline translation, dates and prices, exact Chinese round trip, reload, import and rooms.');
  } finally {await app.close();}
}
check().catch(error=>{console.error(error);process.exitCode=1});
