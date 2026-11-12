// Application compatibility probe: one anonymous cloud browser, one fixed hotel.
// No local browser profile, account sign-in, booking or verification bypass.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {captureBarrier,parseCalendar} from '../src/lib/competitor-observations.ts';
export async function probeCloudCalendar({token,accountId}){
 if(!token||!/^[a-f0-9]{32}$/.test(accountId||''))throw Error('configuration_missing');
 const directory=path.resolve(import.meta.dirname,'../.price-monitor');await mkdir(directory,{recursive:true});
 const report={checkedAt:new Date().toISOString(),status:'failed',stage:'connect',anonymous:true,observations:[]};
 let browser;let page;
 const watchdog=setTimeout(()=>{void browser?.close().catch(()=>{})},90000);
 try{
  browser=await chromium.connectOverCDP(`wss://api.cloudflare.com/client/v4/accounts/${accountId}/browser-run/devtools/browser?keep_alive=60000`,{headers:{Authorization:`Bearer ${token}`},timeout:25000});
  const context=browser.contexts()[0];page=context.pages()[0]||await context.newPage();
  report.stage='open_hotel';await page.goto('https://hotels.ctrip.com/hotels/2132616.html',{waitUntil:'domcontentloaded',timeout:30000});
  const text=await page.locator('body').innerText();const barrier=captureBarrier(page.url(),text);if(barrier){report.status=barrier;return report;}
  report.stage='hotel_ready';await page.getByRole('button',{name:'杭州沐曦民宿(西湖店)',exact:true}).waitFor({timeout:12000});
  report.stage='open_calendar';const fields=page.getByRole('textbox',{name:'选择日期',exact:true});const count=await fields.count();report.dateControls=count;
  if(count<2||count%2!==0){report.status='date_controls_changed';return report;}
  await fields.nth(count-2).click({timeout:5000});await page.getByRole('grid').first().waitFor({timeout:10000});
  report.stage='read_calendar';await page.getByRole('checkbox',{name:/The price is CNY/}).first().waitFor({timeout:8000}).catch(()=>{});
  const snapshot=await page.locator('body').ariaSnapshot();
  const barrier2=captureBarrier(page.url(),snapshot);if(barrier2){report.status=barrier2;return report;}
  const evidence=snapshot.split('\n').filter(line=>/checkbox "/.test(line)||line.includes('杭州沐曦民宿(西湖店)')||line.includes('1间, 2成人, 0儿童')||line.includes('登录看低价')||line.includes('本酒店目前不接受预订')).join('\n');
  report.observations=parseCalendar({hotelId:'2132616',hotelName:'杭州沐曦民宿(西湖店)',capturedAt:new Date().toISOString(),dates:['2026-11-04','2026-11-07'],snapshot:evidence,authScope:'anonymous'});
  report.status=report.observations.every(o=>o.status==='observed')?'calendar_observed':'calendar_prices_unavailable';
 }catch(error){report.status=error.name==='TimeoutError'?'timeout':'probe_failed';report.errorName=error.name;report.diagnostic=String(error.message).split(token).join('[redacted]').replace(/(?:https?|wss?):\/\/\S+/g,'[connection]').replace(/Bearer\s+\S+/gi,'Bearer [redacted]').slice(0,500);}
 finally{
  clearTimeout(watchdog);
  if(page){const barrier=captureBarrier(page.url(),await page.locator('body').innerText({timeout:3000}).catch(()=>''));if(barrier)report.status=barrier;}
  if(page)await page.screenshot({path:path.join(directory,'cloud-calendar-proof.png'),timeout:5000}).catch(()=>{});
  await browser?.close().catch(()=>{});
  await writeFile(path.join(directory,'cloud-calendar-probe.json'),JSON.stringify(report,null,2));
 }
 return report;
}
