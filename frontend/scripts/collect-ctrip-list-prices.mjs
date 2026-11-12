import {chromium} from 'playwright';
import {mkdir,open,unlink,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {captureBarrier} from '../src/lib/competitor-observations.ts';
import {monitorDates} from './price-monitor-dates.mjs';
import {root} from './price-monitor-store.mjs';

const [listUrl,output]=process.argv.slice(2);
const url=new URL(listUrl);
if(url.origin!=='https://hotels.ctrip.com'||url.pathname!=='/hotels/list'||!output
 ||process.env.STAYCRAFT_HOSTED||process.env.CF_PAGES||process.env.VERCEL)throw Error('local_list_collection_only');

const day=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai'}).format(new Date());
const dates=monitorDates(null,day);
const checkout=date=>new Date(Date.parse(date)+86400000).toISOString().slice(0,10);
const displayDate=date=>`${Number(date.slice(5,7))}月${Number(date.slice(8))}日`;
const report={source:'ctrip_search_list',kind:'display_starting_price',currency:'CNY',dates,days:[],status:'running'};
const file=path.resolve(output);
await mkdir(path.dirname(file),{recursive:true});
await mkdir(root,{recursive:true});
const lockPath=path.join(root,'collector.lock');
const lock=await open(lockPath,'wx');
let context;

async function checkAccess(page,status){
 if([401,403,429].includes(status))throw Error('access_restricted');
 const barrier=captureBarrier(page.url(),await page.locator('body').innerText({timeout:8000}));
 if(barrier)throw Error(barrier);
}

async function readCards(page){
 return page.locator('.hotelName').evaluateAll(nodes=>nodes.flatMap(title=>{
  const name=title.innerText.trim();
  if(!name)return [];
  let card=title.parentElement;
  while(card&&card.querySelectorAll('.hotelName').length===1&&!card.querySelector('.price-line'))card=card.parentElement;
  if(!card||card.querySelectorAll('.hotelName').length!==1)return [];
  const line=card.querySelector('.price-line');
  if(!line)return [];
  const price=line.innerText.match(/¥\s*([\d,]+(?:\.\d{1,2})?)\s*起\s*$/);
  const amount=price?Number(price[1].replaceAll(',','')):null;
  return [{name,priceCny:Number.isFinite(amount)&&amount>0?amount:null,display:line.innerText.trim(),
   displayedOffer:card.querySelector('.c-price-tag-v2')?.innerText.trim()||null}];
 }));
}

try{
 context=await chromium.launchPersistentContext(process.env.STAYCRAFT_PRICE_PROFILE||path.join(root,'browser-profile'),{
  headless:true,locale:'zh-CN',viewport:{width:1366,height:940},
 });
 const page=context.pages()[0]||await context.newPage();
 for(const date of dates){
  url.searchParams.set('checkin',date);
  url.searchParams.set('checkout',checkout(date));
  const response=await page.goto(url.href,{waitUntil:'domcontentloaded',timeout:30000});
  await checkAccess(page,response?.status());
  await page.locator('.hotelName').first().waitFor({timeout:12000}).catch(()=>{});
  await checkAccess(page);
  const fields=await page.locator('input[placeholder="选择日期"]').evaluateAll(inputs=>inputs.map(input=>input.value));
  if(!fields[0]?.startsWith(displayDate(date))||!fields[1]?.startsWith(displayDate(checkout(date))))throw Error('date_not_confirmed');
  const text=await page.locator('body').innerText();
  const occupancy=text.match(/\d+间, \d+成人, \d+儿童/)?.[0];
  if(!occupancy)throw Error('occupancy_not_confirmed');
  const byName=new Map();
  let unchanged=0;
  for(let step=0;step<14&&unchanged<2;step++){
   const before=byName.size;
   for(const row of await readCards(page)){
    const prior=byName.get(row.name);
    if(!prior||prior.priceCny===null)byName.set(row.name,row);
    else if(row.priceCny!==null&&prior.priceCny!==row.priceCny)byName.set(row.name,{...prior,conflicting:true});
   }
   unchanged=before===byName.size?unchanged+1:0;
   if(unchanged<2){
    await page.mouse.wheel(0,4200);
    await page.waitForTimeout(1100);
    await checkAccess(page);
   }
  }
  const rows=[...byName.values()].map(row=>row.conflicting?{...row,priceCny:null}:row);
  report.days.push({date,checkout:checkout(date),capturedAt:new Date().toISOString(),sourceUrl:page.url(),occupancy,
   advertisedCount:Number(text.match(/找到\s*(\d+)\s*家/)?.[1])||null,rows});
  if(date!==dates.at(-1))await page.waitForTimeout(4000);
 }
 report.status=report.days.some(entry=>entry.rows.some(row=>row.priceCny!==null))?'complete':'no_prices';
}catch(error){
 report.status='stopped';
 report.error=error instanceof Error?error.message.split('\n')[0]:'collection_failed';
 process.exitCode=1;
}finally{
 await context?.close().catch(()=>{});
 try{await writeFile(file,JSON.stringify(report,null,2),{flag:'wx'});}
 finally{await lock.close();await unlink(lockPath);}
 console.log(JSON.stringify({status:report.status,error:report.error,days:report.days.map(entry=>({
  date:entry.date,occupancy:entry.occupancy,advertised:entry.advertisedCount,cards:entry.rows.length,
  priced:entry.rows.filter(row=>row.priceCny!==null).length,
 }))}));
}
