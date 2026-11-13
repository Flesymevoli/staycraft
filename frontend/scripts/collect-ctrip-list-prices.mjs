import {launchPriceBrowser} from './price-monitor-browser.mjs';
import {mkdir,open,unlink,writeFile,readFile,rename} from 'node:fs/promises';
import path from 'node:path';
import {captureBarrier} from '../src/lib/competitor-observations.ts';
import {monitorDates} from './price-monitor-dates.mjs';
import {root} from './price-monitor-store.mjs';

const [listUrl,output,star]=process.argv.slice(2);
const url=new URL(listUrl);
if(url.origin!=='https://hotels.ctrip.com'||url.pathname!=='/hotels/list'||!output
 ||process.env.STAYCRAFT_HOSTED||process.env.CF_PAGES||process.env.VERCEL)throw Error('local_list_collection_only');
const requestedCity=!url.searchParams.has('cityId')?url.searchParams.get('cityName')?.trim():null;
if(requestedCity&&requestedCity.length>40)throw Error('city_not_found');
// Start from an actual result page, then use the site's destination picker.
// The user never needs to know Ctrip's internal numeric city identifiers.
if(requestedCity){url.searchParams.set('cityId','1');url.searchParams.delete('cityName');url.searchParams.delete('destName');}

const day=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai'}).format(new Date());
const start=url.searchParams.get('checkin');
const dates=star&&start&&start>=day&&/^\d{4}-\d{2}-\d{2}$/.test(start)&&Number.isFinite(Date.parse(start))
 ?monitorDates(null,new Date(Date.parse(start)-86400000).toISOString().slice(0,10)):monitorDates(null,day);
const checkout=date=>new Date(Date.parse(date)+86400000).toISOString().slice(0,10);
const displayDate=date=>`${Number(date.slice(5,7))}月${Number(date.slice(8))}日`;
const report={source:'ctrip_search_list',kind:'display_starting_price',currency:'CNY',dates,days:[],status:'running'};
const file=path.resolve(output);
await mkdir(path.dirname(file),{recursive:true});
await mkdir(root,{recursive:true});
const lockPath=path.join(root,'collector.lock');
const lock=await open(lockPath,'wx');
let context,page,cancelled=false;
const cancellation=setInterval(async()=>{try{await readFile(path.join(root,'cancel.request'));cancelled=true;await context?.close().catch(()=>{});}catch{}},500);
const deadline=setTimeout(()=>{cancelled=true;void context?.close().catch(()=>{});},8*60000);
async function publishProgress(stage,date){
 if(cancelled)throw Error('collection_cancelled');
 report.stage=stage;
 const value={stage,phase:stage==='launch-browser'?'starting':'running',currentDate:date,completedDates:report.days.length,totalDates:dates.length,observed:report.days.reduce((n,d)=>n+d.rows.filter(r=>r.priceCny!==null).length,0)};
 const target=path.join(root,'progress.json'),temporary=target+'.tmp';await writeFile(temporary,JSON.stringify(value));await rename(temporary,target);
}


async function checkAccess(page,status){
 if([401,403,429].includes(status))throw Error('access_restricted');
 const barrier=captureBarrier(page.url(),await page.locator('body').innerText({timeout:8000}));
 if(barrier)throw Error(barrier);
}

async function selectCity(page,city){
 const destination=page.getByPlaceholder('目的地',{exact:true});
 await destination.waitFor({timeout:12000});
 const normalize=value=>value.trim().replace(/市$/,'');
 if(normalize(await destination.inputValue())===normalize(city))return;
 await destination.fill(city);
 const escaped=normalize(city).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const cityLabel=new RegExp('^'+escaped+'市?$');
 // Suggestions highlight the city substring inside hotel and landmark names.
 // Match the complete label container so those highlights aren't city options.
 const choice=page.getByText(cityLabel).filter({visible:true}).locator('..').filter({hasText:cityLabel});
 try{await choice.first().waitFor({timeout:10000});}catch{await checkAccess(page);throw Error('city_not_found');}
 if(await choice.count()!==1)throw Error('city_not_found');
 await choice.click();
 if(normalize(await destination.inputValue())!==normalize(city))throw Error('city_not_found');
 await page.getByText('搜索',{exact:true}).filter({visible:true}).click();
 try{await page.waitForURL(current=>normalize(current.searchParams.get('cityName')||current.searchParams.get('destName')||'')===normalize(city),{timeout:15000});}
 catch{await checkAccess(page);throw Error('city_not_found');}
 await page.locator('.hotelName').first().waitFor({timeout:12000});
}

async function readCards(page){
 return page.locator('.hotelName').evaluateAll(nodes=>nodes.flatMap(title=>{
  const name=title.innerText.trim();
  if(!name)return [];
  let card=title.parentElement;
  while(card&&card.querySelectorAll('.hotelName').length===1&&!card.querySelector('.price-line'))card=card.parentElement;
  if(!card||card.querySelectorAll('.hotelName').length!==1)return [{name,priceCny:null}];
  const line=card.querySelector('.price-line');
  if(!line)return [];
  const price=line.innerText.match(/¥\s*([\d,]+(?:\.\d{1,2})?)\s*起\s*$/);
  const amount=price?Number(price[1].replaceAll(',','')):null;
  return [{name,priceCny:Number.isFinite(amount)&&amount>0?amount:null,display:line.innerText.trim(),
   displayedOffer:card.querySelector('.c-price-tag-v2')?.innerText.trim()||null}];
 }));
}

const fields=page=>page.getByPlaceholder('选择日期',{exact:true});

function calendarDay(page,date){
 const month=Number(date.slice(5,7)),day=Number(date.slice(8));
 const dateLabels=[date,`${date.slice(0,4)}年${month}月${day}日`,displayDate(date)];
 const selectors=[`[role="checkbox"][aria-label^="${dateLabels[1]}("]`,
  ...dateLabels.flatMap(label=>['data-date','title','aria-label'].map(attr=>`[${attr}="${label}"]`))];
 return page.locator(selectors.join(',')).filter({visible:true}).first();
}

async function confirmDate(page,date){
 const values=await fields(page).evaluateAll(inputs=>inputs.map(input=>input.value));
 return values[0]?.startsWith(displayDate(date))&&values[1]?.startsWith(displayDate(checkout(date)));
}

async function searchDate(page,date){
 if(await confirmDate(page,date))return;
 let stage='open-calendar';
 try{
  await page.locator('.hotelName').first().evaluate(node=>node.setAttribute('data-staycraft-previous-results',''),{},{timeout:8000});
  const checkIn=calendarDay(page,date);
  if(!await checkIn.isVisible())await fields(page).first().click({timeout:8000});
  stage='select-check-in';
  try{await checkIn.waitFor({state:'visible',timeout:2500});}catch{
   await checkAccess(page);
   if(!await checkIn.isVisible())await fields(page).first().click({timeout:5000});
  }
  await checkIn.click({timeout:7000});
  stage='select-check-out';
  if(!await confirmDate(page,date)){
   const next=calendarDay(page,checkout(date));
   if(!await next.isVisible())await fields(page).nth(1).click({timeout:5000});
   await next.click({timeout:7000});
  }
  if(!await confirmDate(page,date))throw Error('date_not_confirmed');
  stage='submit-search';
  await page.getByText('搜索',{exact:true}).filter({visible:true}).click({timeout:5000});
  stage='wait-for-search-date';
  await page.waitForURL(current=>current.searchParams.get('checkin')===date&&current.searchParams.get('checkout')===checkout(date),{timeout:18000});
  stage='wait-for-fresh-results';
  await page.waitForFunction(()=>{
   const first=document.querySelector('.hotelName');
   return first&&!first.hasAttribute('data-staycraft-previous-results');
  },undefined,{timeout:12000});
 }catch{
  await checkAccess(page);
  report.dateFailure={stage,date};
  throw Error('date_not_confirmed');
 }
}

async function selectedFilters(page){
 return page.locator('[role="checkbox"][aria-checked="true"]').evaluateAll(nodes=>nodes
  .map(node=>node.getAttribute('aria-label')?.trim())
  .filter(label=>label&&!/^\d{4}年\d+月\d+日/.test(label)).sort());
}

async function checkFilters(page,selected){
 const current=new URL(page.url());
 const filters=value=>(value||'').split(',').filter(Boolean);
 const expected=filters(url.searchParams.get('listFilters'));
 const actual=new Set(filters(current.searchParams.get('listFilters')));
 if(current.origin!==url.origin||current.pathname!==url.pathname||
  (url.searchParams.has('cityId')&&url.searchParams.get('cityId')!==current.searchParams.get('cityId'))||
  expected.some(filter=>!actual.has(filter))||JSON.stringify(await selectedFilters(page))!==JSON.stringify(selected)){
  throw Error('filters_changed');
 }
}

async function selectFilter(page,name){
 const control=page.getByRole('checkbox',{name}).filter({visible:true}).first();
 await control.waitFor({timeout:10000});
 if(await control.getAttribute('aria-checked')==='true')return;
 const previous=page.url();
 await control.click({timeout:7000});
 await page.waitForURL(current=>current.href!==previous,{timeout:12000});
 const empty=page.getByText(/^[没沒]有找到匹配的酒店$/);
 await page.locator('.hotelName').or(empty).first().waitFor({timeout:12000});
 if(await empty.isVisible())throw Error('no_quotes');
 if(await control.getAttribute('aria-checked')!=='true')throw Error('filters_changed');
}

try{
 await publishProgress('launch-browser');
 context=await launchPriceBrowser(process.env.STAYCRAFT_PRICE_PROFILE||path.join(root,'browser-profile'),{
  headless:false,locale:'zh-CN',viewport:{width:1366,height:940},
 });
 page=context.pages()[0]||await context.newPage();
 await publishProgress('open-results');
 const response=await page.goto(url.href,{waitUntil:'domcontentloaded',timeout:30000});
 await checkAccess(page,response?.status());
 await page.locator('.hotelName').first().waitFor({timeout:12000}).catch(()=>{});
 await checkAccess(page);
 // The search controls can render before the page has attached their handlers.
 await page.waitForTimeout(1200);
 if(requestedCity){
  await publishProgress('select-city');
  await selectCity(page,requestedCity);
  const selectedCityId=new URL(page.url()).searchParams.get('cityId');
  if(!selectedCityId||!/^\d+$/.test(selectedCityId))throw Error('city_not_found');
  url.searchParams.set('cityId',selectedCityId);
 }
 const starName=star?new RegExp(`^(?:${star}钻/星|${star} out of 5 diamonds)`, 'i'):null;
 if(starName){
  await publishProgress('select-homestay');
  await selectFilter(page,/^民宿$/);
  await publishProgress('select-star');
  await selectFilter(page,starName);
  const filters=new URL(page.url()).searchParams.get('listFilters');
  if(filters)url.searchParams.set('listFilters',filters);
 }
 const selected=await selectedFilters(page);
 if(starName&&(!selected.includes('民宿')||!selected.some(label=>starName.test(label))))throw Error('filters_changed');
 for(const date of dates){
  await publishProgress('collect-date',date);
  await searchDate(page,date);
  await page.locator('.hotelName').first().waitFor({timeout:12000}).catch(()=>{});
  await checkAccess(page);
  await checkFilters(page,selected);
  if(!await confirmDate(page,date))throw Error('date_not_confirmed');
  const text=await page.locator('body').innerText();
  const occupancy=text.match(/\d+间, \d+成人, \d+儿童/)?.[0];
  if(!occupancy||!/^1间, ([1-9]|10)成人, 0儿童$/.test(occupancy))throw Error('occupancy_not_confirmed');
  const rows=[...new Map((await readCards(page)).slice(0,5).map(row=>[row.name,row])).values()];
  report.days.push({date,checkout:checkout(date),capturedAt:new Date().toISOString(),sourceUrl:page.url(),occupancy,
   advertisedCount:Number(text.match(/找到\s*(\d+)\s*家/)?.[1])||null,rows});
  await publishProgress('collect-date',date);
  if(date!==dates.at(-1))await page.waitForTimeout(4000);
 }
 report.status=report.days.some(entry=>entry.rows.some(row=>row.priceCny!==null))?'complete':'no_prices';
 delete report.stage;
}catch(error){
 // Redirects to login may happen while a selector is waiting. Report the
 // actionable barrier instead of exposing a locator timeout to the operator.
 if(page)try{await checkAccess(page);}catch(barrier){error=barrier;}
 report.status='stopped';
 report.error=cancelled?'collection_cancelled':error instanceof Error?error.message.split('\n')[0]:'collection_failed';
 process.exitCode=1;
}finally{
 clearInterval(cancellation);clearTimeout(deadline);
 await context?.close().catch(()=>{});
 try{await writeFile(file,JSON.stringify(report,null,2),{flag:'wx'});}
 finally{await lock.close();await unlink(lockPath);}
 console.log(JSON.stringify({status:report.status,error:report.error,stage:report.stage,dateFailure:report.dateFailure,days:report.days.map(entry=>({
  date:entry.date,occupancy:entry.occupancy,advertised:entry.advertisedCount,cards:entry.rows.length,
  priced:entry.rows.filter(row=>row.priceCny!==null).length,
 }))}));
}
