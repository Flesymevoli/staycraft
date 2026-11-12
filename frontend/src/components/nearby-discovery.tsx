"use client";
import {useDesktopSurface} from "./desktop-surface";
import {useEffect,useId,useState} from 'react';
import Link from 'next/link';
import {ChevronDown,ExternalLink} from 'lucide-react';
import {EVENT_CATEGORIES,type EventCategory,type LocalEvent,type SourceRef,type WeatherDay} from '@/lib/signals/types';
import {useBookingMetrics} from './booking-metrics';
import './nearby-discovery.css';

type Discovery={location?:string;start?:string;end?:string;error?:string;events?:LocalEvent[];eventSource?:SourceRef;eventRadiusKm?:number};
function sourceLink(value:string){try{const url=new URL(value);return ['https:','http:'].includes(url.protocol)?url.href:null}catch{return null}}

type Evidence = {title:string;url:string;summary:string;start?:string;end?:string;location?:string};
const weatherUrl='https://open-meteo.com/en/docs';
type WeatherPayload={weather?:{status:string;days:WeatherDay[];source?:SourceRef;note?:string};centerLabel?:string};
function NearbyPanelHeading({title,dates,location,count}:{title:string;dates:string;location?:string;count?:string}){
 return <header className="nearby-panel-heading">
  <div className="nearby-events-section-head"><h3>{title}</h3>{count&&<span>{count}</span>}</div>
  <p className="nearby-events-period">{dates}</p>
  {location&&<p className="nearby-events-location">{location}</p>}
 </header>;
}

function PropertyWeather({zh,start,end,onUseSource,selectedReferences,disabled}:{zh:boolean;start:string;end:string;onUseSource:(source:Evidence)=>Promise<void>;selectedReferences?:{title:string;url:string}[];disabled:boolean}){
 const t=(en:string,cn:string)=>zh?cn:en;
 const [retry,setRetry]=useState(0);
 const [evidenceDate,setEvidenceDate]=useState('');
 const requestKey=`${start}/${retry}`;
 const [state,setState]=useState<{key:string;payload?:WeatherPayload;failed?:boolean}>({key:''});
 const loading=state.key!==requestKey;
 const payload=loading?undefined:state.payload;
 const weather=payload?.weather;
 const days=weather?.status==='available'&&Array.isArray(weather.days)?weather.days.filter(day=>/^\d{4}-\d{2}-\d{2}$/.test(day.date)&&day.date>=start):[];
 const source=weather?.source||days[0]?.source;
 const dateShort=(date:string)=>date.slice(5).replace('-','/');
 const clearDates=days.filter(day=>day.code>=0&&day.code<=2&&typeof day.precipProb==='number'&&day.precipProb<=20).slice(0,2).map(day=>dateShort(day.date)).join(zh?'、':', ');
 const wetDay=days.find(day=>typeof day.precipProb==='number'&&day.precipProb>=60);
 const weatherAdvice=clearDates
  ?t('The forecast looks clear on '+clearDates+'. Prepare rooms and suggest an outdoor itinerary.',clearDates+' 预计天气较好，可提前备好客房，给客人推荐户外行程。')
  :wetDay?t('Rain is likely on '+dateShort(wetDay.date)+'. Prepare umbrellas and indoor suggestions.',dateShort(wetDay.date)+' 降水概率较高，可备好雨具和室内游玩建议。'):'';
 useEffect(()=>{
  const controller=new AbortController();
  fetch(`/api/workspace/nearby?start=${encodeURIComponent(start)}&days=7`,{signal:controller.signal,cache:'no-store'})
   .then(async response=>{const body=await response.json().catch(()=>null);if(!response.ok||!body?.weather)throw Error('weather_unavailable');if(!controller.signal.aborted)setState({key:requestKey,payload:body})})
   .catch(()=>{if(!controller.signal.aborted)setState({key:requestKey,failed:true})});
  return()=>controller.abort();
 },[start,requestKey]);
 const weatherText=(code:number)=>{const table=zh?['晴','多云','阴','雾','雨','雪','阵雨','雨雪','雷雨']:['Clear','Cloudy','Overcast','Fog','Rain','Snow','Showers','Sleet','Storm'];if(!Number.isFinite(code))return t('Unknown','未提供');const index=code===0?0:code<=2?1:code===3?2:code<=48?3:code<=67?4:code<=77?5:code<=82?6:code<=86?7:8;return table[index]};
 const temperature=(value:number|null)=>typeof value==='number'&&Number.isFinite(value)?`${Math.round(value)}°`:'—';
 const observedAt=source?.observedAt&&Number.isFinite(Date.parse(source.observedAt))?new Intl.DateTimeFormat(zh?'zh-CN':'en-GB',{timeZone:'Asia/Shanghai',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(source.observedAt)):null;
 const eligible=days.filter(day=>day.date<=end&&Number.isFinite(day.code));
 const chosen=eligible.find(day=>day.date===evidenceDate)??eligible[0];
 const demoWeather=source?.authority==='internal';
 const title=chosen?chosen.date+' '+(demoWeather?t('demo weather forecast','演示天气预报'):t('weather forecast','天气预报')):'';
 const selected=selectedReferences?.some(item=>item.title===title);
 function addForecast(){
  if(!chosen)return;
  const chance=typeof chosen.precipProb==='number'&&Number.isFinite(chosen.precipProb)?t('rain chance ','降水概率 ')+Math.round(chosen.precipProb)+'%':'';
  const summary=[payload?.centerLabel,demoWeather?t('Simulated weather','模拟天气'):t('Forecast, subject to change','预报可能变化'),weatherText(chosen.code),chance,!demoWeather&&observedAt&&t('Retrieved ','获取于 ')+observedAt+t(' China time',' 北京时间')].filter(Boolean).join(' · ');
  void onUseSource({title,url:demoWeather?'https://staycraft.online/':weatherUrl,summary,start:chosen.date,end:chosen.date,location:payload?.centerLabel});
 }
 return <section className="property-weather" aria-label={t('Weather near your property','民宿周边天气')} aria-busy={loading}>
  <NearbyPanelHeading title={t('Weather forecast','天气预报')}
   dates={days.length?`${days[0].date} — ${days[days.length-1].date}`:t(`From ${start}`,`${start} 起`)}
   location={payload?.centerLabel}/>
  {weatherAdvice&&<p className="promotion-insight">{weatherAdvice}</p>}
  {loading?<p className="property-weather-note" role="status">{t('Reading the weather outlook…','正在读取天气…')}</p>:days.length?<>
   <table className="property-weather-table"><caption className="property-weather-sr">{t('Daily forecast, temperatures and rain probability','每日天气、温度及降水概率')}</caption><thead><tr><th scope="col">{t('Date','日期')}</th><th scope="col">{t('Outlook','天气')}</th><th scope="col">{t('Low / high','最低 / 最高')}</th><th scope="col">{t('Rain chance','降水概率')}</th></tr></thead><tbody>{days.map(day=><tr key={day.date}><th scope="row">{day.date.slice(5).replace('-','/')}</th><td>{weatherText(day.code)}</td><td>{temperature(day.tempMin)} / {temperature(day.tempMax)}</td><td>{typeof day.precipProb==='number'&&Number.isFinite(day.precipProb)?`${Math.round(day.precipProb)}%`:'—'}</td></tr>)}</tbody></table>
   {chosen&&<div className="nearby-category-filters">
    <label>{t('Forecast date','预报日期')} <select value={chosen.date} disabled={disabled} onChange={event=>setEvidenceDate(event.target.value)}>{eligible.map(day=><option key={day.date} value={day.date}>{dateShort(day.date)}</option>)}</select></label>
    <button type="button" className="nearby-use-source" disabled={disabled||selected} onClick={addForecast}>{selected?t('Added','已采用'):t('Add forecast as evidence','加入天气证据')}</button>
   </div>}
   <div className="property-weather-source"><span>{demoWeather?t('Simulated weather','演示天气 · 模拟数据'):t('Source: Open-Meteo','来源：Open-Meteo')}</span>{!demoWeather&&observedAt&&<span>{t('Retrieved','获取于')} {observedAt} {t('China time','北京时间')}</span>}</div>
  </>:<div className="property-weather-empty" role="status"><p>{t('Weather is temporarily unavailable for these dates.','所选日期的天气暂不可用。')}</p><p>{t('Check the property address or try again later.','可检查民宿地址，或稍后重新读取。')}</p><button type="button" onClick={()=>setRetry(value=>value+1)}>{t('Retry weather','重试天气')}</button></div>}
  <p className="property-weather-note">{t('Forecasts are for the property address.','预报按民宿地址展示。')}</p>
 </section>;
}

export function NearbyDiscovery({zh,start,end,onUseSource,selectedUrls,selectedReferences,disabled}:{zh:boolean;start:string;end:string;onUseSource:(source:Evidence)=>Promise<void>;selectedUrls:string[];selectedReferences?:{title:string;url:string}[];disabled:boolean}){
 const desktop=useDesktopSurface();
 const t=(en:string,cn:string)=>zh?cn:en;
 const eventsId=useId();
 const [eventsExpanded,setEventsExpanded]=useState(false);
 const [category,setCategory]=useState<EventCategory|'all'|'weather'>('all');
 const {data:metrics}=useBookingMetrics(7,'nearby-opportunity',{start,end});
 const [busy,setBusy]=useState(true),[data,setData]=useState<Discovery|null>(null),[retry,setRetry]=useState(0);
 useEffect(()=>{
  const refresh=()=>{setEventsExpanded(false);setRetry(value=>value+1)};
  window.addEventListener('staycraft-profile-changed',refresh);
  return()=>window.removeEventListener('staycraft-profile-changed',refresh);
 },[]);
 useEffect(()=>{const controller=new AbortController();async function load(){setBusy(true);setData(null);try{const response=await fetch('/api/workspace/discovery',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({start,end}),signal:controller.signal});const body=await response.json();if(!controller.signal.aborted)setData(response.ok?body:{...body,error:body.error||'search_unavailable'})}catch{if(!controller.signal.aborted)setData({error:'search_unavailable'})}finally{if(!controller.signal.aborted)setBusy(false)}}void load();return()=>controller.abort()},[start,end,retry]);
 const events=data?.events||[];
 const categories=(Object.keys(EVENT_CATEGORIES) as EventCategory[]).filter(key=>events.some(event=>event.category===key));
 const activeCategory=category==='weather'||category!=='all'&&categories.includes(category)?category:'all';
 const visibleEvents=events.filter(event=>activeCategory==='all'||event.category===activeCategory)
  .sort((left,right)=>Number(right.start>=start)-Number(left.start>=start)||left.start.localeCompare(right.start));
 const dateLabel=(value:string)=>{const date=new Date(value);return Number.isFinite(date.getTime())?date.toLocaleDateString(zh?'zh-CN':'en-GB',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}):t('Date unavailable','日期未提供')};
 const eventDistance=(event:LocalEvent)=>typeof event.distanceKm==='number'&&Number.isFinite(event.distanceKm)&&event.distanceKm>=0?t(`About ${event.distanceKm} km from the property`,`距民宿约 ${event.distanceKm} km`):t('Distance unavailable','距离未提供');
 const availableDates=metrics&&!metrics.historical_inventory_unknown?metrics.daily.filter(day=>day.available>0).slice().sort((a,b)=>b.available-a.available).slice(0,3):[];
 const verifiedEvents=visibleEvents.filter(event=>event.verified);
 const focusDates=availableDates.filter(day=>day.date>=start&&day.date<=end&&verifiedEvents.some(event=>event.start<=day.date&&event.end>=day.date))
  .map(day=>day.date.slice(5).replace('-','/')).sort().join(zh?'、':', ');
 const activityAdvice=focusDates
  ?t('Focus on '+focusDates+': activities overlap with open rooms. Consider sharing a local itinerary.','重点关注 '+focusDates+'：活动期间还有空房，可以准备一条周边游玩路线做推广。')
  :verifiedEvents.length?t('Pick an activity that overlaps the stay dates and share it as a guest itinerary idea.','挑一个与入住日期重合的活动，作为客人的游玩建议。'):'';
 return <section className="nearby-discovery nearby-events" aria-busy={busy} aria-label={t('Recent activities','最近活动')}>
  <div className="nearby-events-header"><h2>{t('Recent activities','最近活动')}</h2></div>
    <div className="nearby-category-filters" role="group" aria-label={t('Filter by category','按活动分类筛选')}>
     <button type="button" aria-pressed={activeCategory==='all'} onClick={()=>{setCategory('all');setEventsExpanded(false)}}>{t('All','全部')}</button>
     {categories.map(key=><button type="button" key={key} aria-pressed={activeCategory===key} onClick={()=>{setCategory(key);setEventsExpanded(false)}}>{EVENT_CATEGORIES[key][zh?0:1]}</button>)}
     <button type="button" aria-pressed={activeCategory==='weather'} onClick={()=>setCategory('weather')}>{t('Weather','天气')}</button>
    </div>
  <div className="nearby-panel">
  {activeCategory==='weather'?<PropertyWeather key={retry} zh={zh} start={start} end={end} onUseSource={onUseSource} selectedReferences={selectedReferences} disabled={disabled}/>:<>
  <NearbyPanelHeading title={activeCategory==='all'?t('Activities during these dates','同期活动'):EVENT_CATEGORIES[activeCategory][zh?0:1]}
   dates={start===end?start:`${start} — ${end}`} location={data?.location}
   count={!busy&&visibleEvents.length?t(`${visibleEvents.length} listed`,`${visibleEvents.length} 条已收录`):undefined}/>
  {!busy&&activityAdvice&&<p className="promotion-insight">{activityAdvice}</p>}
  {data?.error==='property_location_required'&&<p className="nearby-events-note">{t('Save a property address to see local activities.','保存民宿地址后即可查看周边活动。')} <Link href="/app/mine">{t('Property settings','前往民宿资料')}</Link></p>}
  {busy?<div className="nearby-event-list" role="status" aria-label={t('Loading local activities…','正在读取周边活动…')}>
   {[0,1,2].map(row=><div className="nearby-event nearby-event-placeholder" key={row} aria-hidden="true">
    <div><span className="workspace-placeholder-bar"/><span className="workspace-placeholder-bar"/><span className="workspace-placeholder-bar"/></div>
   </div>)}
  </div>:<>
   {events.length>0?<>
    <div className="nearby-event-list" id={eventsId}>{visibleEvents.slice(0,eventsExpanded?undefined:desktop?2:3).map(event=>{const url=sourceLink(event.sourceUrl),selected=selectedReferences?selectedReferences.some(reference=>reference.url===event.sourceUrl&&reference.title===event.title):selectedUrls.includes(event.sourceUrl);return <article className="nearby-event" key={event.id}>
     <div className="nearby-event-main"><h4>{event.title}</h4><p className="nearby-event-dates">{event.start} — {event.end}</p><p className="nearby-event-venue">{event.venue||t('Venue unavailable','地点未提供')}<span aria-hidden="true"> · </span>{eventDistance(event)}</p><div className="nearby-event-source">{activeCategory==='all'&&<span className="nearby-event-category">{EVENT_CATEGORIES[event.category][zh?0:1]}</span>}{url&&<a href={url} target="_blank" rel="noopener noreferrer" aria-label={t(`Source for ${event.title}`,`${event.title}的来源`)}>{t('Source','查看来源')}<ExternalLink size={12} aria-hidden="true"/></a>}{event.observedAt&&<span>{t('Collected','采集于')} {dateLabel(event.observedAt)}</span>}</div></div>
     {url&&<button type="button" className="nearby-use-source" disabled={disabled||selected} onClick={()=>void onUseSource({title:event.title,url:event.sourceUrl,summary:[`${event.start} — ${event.end}`,event.venue,eventDistance(event)].filter(Boolean).join(' · '),start:event.start,end:event.end,location:data?.location})}>{selected?t('Added','已采用'):t('Add as evidence','加入文案证据')}</button>}
    </article>})}</div>
    {visibleEvents.length>(desktop?2:3)&&<button type="button" className="nearby-disclosure-button" aria-expanded={eventsExpanded} aria-controls={eventsId} onClick={()=>setEventsExpanded(value=>!value)}>{eventsExpanded?t('Show fewer activities','收起活动'):t(`View all ${visibleEvents.length} activities`,`展开全部 ${visibleEvents.length} 条活动`)}<ChevronDown size={15} aria-hidden="true"/></button>}
   </>:data?.error&&data.error!=='property_location_required'?<p className="nearby-events-note" role="status">{t('Could not look up activities for this address. Check the address or retry.','暂时无法按此地址查询活动，请核对地址或重试。')} <button type="button" className="nearby-disclosure-button" onClick={()=>setRetry(value=>value+1)}>{t('Retry activities','重试活动')}</button></p>:<p className="nearby-events-note" role="status">{t('The activity catalog has no matches for this address and date range.','已收录的活动中，暂无符合此地址和日期范围的结果。')}</p>}

  </>}
  </>}
  </div>
 </section>;
}
