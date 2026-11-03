// Explicit local pilot: visible hotel UI with the locally authorized session; no bypass.
import {chromium} from "playwright";
import {mkdir,open,unlink} from "node:fs/promises";
import path from "node:path";
import {parseCalendar,captureBarrier} from "../src/lib/competitor-observations.ts";
import {root,atomicJson,saveCapture,readJson} from "./price-monitor-store.mjs";
import {monitorDates} from "./price-monitor-dates.mjs";
if(process.argv[2]!=="--collect-public-prices"||process.env.VERCEL||process.env.CF_PAGES||process.env.STAYCRAFT_HOSTED)throw Error("local_explicit_run_only");
const hotels=[{id:"2132616",name:"杭州沐曦民宿(西湖店)"},{id:"1762435",name:"杭州糖堂民宿(西湖灵隐寺店)"}];
await mkdir(root,{recursive:true});let lock;try{lock=await open(path.join(root,"collector.lock"),"wx")}catch{console.log("Another collection is running; no duplicate started.");process.exit(2)}
let browser;
let watchdog;
let last;
try{last=await readJson("job.json",null)}catch(error){await lock.close();await unlink(path.join(root,"collector.lock"));throw error}
if(last?.finishedAt&&Date.now()-Date.parse(last.finishedAt)<300000){await lock.close();await unlink(path.join(root,"collector.lock"));console.log("Please wait five minutes between runs.");process.exit(2)}
const today=new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Shanghai"}).format(new Date());
const dates=monitorDates(last?.dates,today);
const job={id:crypto.randomUUID(),startedAt:new Date().toISOString(),finishedAt:null,status:"running",dates,results:[]};
try{
 watchdog=setTimeout(()=>{void browser?.close().catch(()=>{})},240000);
 await atomicJson("job.json",job);
 const context=await chromium.launchPersistentContext(path.join(root,"browser-profile"),{headless:true,locale:"zh-CN",viewport:{width:1280,height:900}});
 browser=context;
 for(const hotel of hotels){
  const page=await context.newPage();let status="failed",error=null,stage="open_hotel";
  try{
   await page.goto(`https://hotels.ctrip.com/hotels/${hotel.id}.html`,{waitUntil:"domcontentloaded",timeout:45000});
   const landing=await page.locator("body").innerText();
   const barrier=captureBarrier(page.url(),landing);if(barrier)throw Error(barrier);
   stage="hotel_ready";
   await page.getByRole("button",{name:hotel.name,exact:true}).waitFor({timeout:20000});
   const body=await page.locator("body").innerText();
   if(captureBarrier(page.url(),body))throw Error(captureBarrier(page.url(),body));
   stage="open_calendar";
   // The header search and room section both expose a check-in/out pair.
   // Open the room section's check-in control, rather than the header search.
   const dateFields=page.getByRole("textbox",{name:"选择日期",exact:true});
   const dateCount=await dateFields.count();
   if(dateCount<2||dateCount%2!==0)throw Error("date_controls_changed");
   await dateFields.nth(dateCount-2).click({timeout:10000});
   stage="calendar_ready";
   const calendar=page.getByRole("grid").first();
   try{await calendar.waitFor({timeout:4000})}catch{
    // Initial content may render before its click handlers are ready.
    // Re-open once on the same page; never reload, bypass, or retry a barrier.
    const barrier=captureBarrier(page.url(),await page.locator("body").innerText());
    if(barrier)throw Error(barrier);
    if(!await calendar.isVisible())await dateFields.nth(dateCount-2).click({timeout:10000});
    await calendar.waitFor({timeout:15000});
   }
   // The calendar appears before its public price labels finish loading.
   await page.getByRole("checkbox",{name:/The price is CNY/}).first().waitFor({timeout:15000}).catch(()=>{});
   const snapshot=await page.locator("body").ariaSnapshot();
   const member=await page.getByRole("button",{name:/我的账户:/}).count()>0;
   const session=await readJson("session.json",null);
   if(member&&!session?.scope)throw Error("session_scope_missing");
   const evidence=snapshot.split("\n").filter(line=>/checkbox "/.test(line)||line.includes(hotel.name)||line.includes("1间, 2成人, 0儿童")||line.includes("本酒店目前不接受预订")||line.includes("登录看低价")).join("\n");
   const capture={hotelId:hotel.id,hotelName:hotel.name,capturedAt:new Date().toISOString(),dates,snapshot:evidence,authScope:member?session.scope:"anonymous"};
   stage="save_observations";
   const observations=parseCalendar(capture);await saveCapture(capture,observations);
   const successful=observations.filter(v=>v.status==="observed").length;
   status=successful===dates.length?"succeeded":successful?"partial":"unavailable";
   await page.screenshot({path:path.join(root,`${job.id}-${hotel.id}.png`)});
  }catch(e){
   await page.screenshot({path:path.join(root,`${job.id}-${hotel.id}-failed.png`)}).catch(()=>{});
   await atomicJson(`${job.id}-${hotel.id}-failure.json`,{stage,url:page.url(),detail:String(e.message).slice(0,3000),snapshot:await page.locator("body").ariaSnapshot().catch(()=>"unavailable")}).catch(()=>{});
   const failedSnapshot=await page.locator("body").ariaSnapshot().catch(()=>"");
   error=captureBarrier(page.url(),failedSnapshot)||(["login_required","verification_required"].includes(e.message)?e.message:e.name==="TimeoutError"?"page_timeout":"collection_failed");
   if(error==="login_required"||error==="verification_required")status="unavailable";}
  finally{await page.close().catch(()=>{});job.results.push({hotelId:hotel.id,name:hotel.name,status,error,...(error?{stage}:{})});await atomicJson("job.json",job);}
 }
 job.status=job.results.every(r=>r.status==="succeeded")?"succeeded":job.results.some(r=>["succeeded","partial"].includes(r.status))?"partial":"failed";
}catch(error){job.status="failed";job.error="browser_unavailable";await atomicJson(`${job.id}-startup-failure.json`,{name:error.name,code:error.code||null,detail:String(error.message).split("\n")[0].slice(0,500)}).catch(()=>{});}
finally{clearTimeout(watchdog);await browser?.close().catch(()=>{});job.finishedAt=new Date().toISOString();try{await atomicJson("job.json",job);await atomicJson(`${job.id}-job.json`,job)}finally{await lock.close();await unlink(path.join(root,"collector.lock"));}}
console.log(JSON.stringify(job));if(job.status==="failed")process.exitCode=1;
