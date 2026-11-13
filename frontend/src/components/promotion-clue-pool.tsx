"use client";
import {useContext,useEffect,useState} from 'react';
import {GuidedDemoContext} from './desktop-surface';
import {PromotionEvidence,PromotionOpportunities} from './promotion-evidence';
import {readEventSearchReview,type EventSearchReview} from '@/lib/signals/event-review';
import {Compass,Sun,ArrowRight,ExternalLink,RefreshCw} from 'lucide-react';
import {publicSourceUrl,type PromotionSource} from '@/lib/promotion';
import type {LocalEvent,SourceRef,WeatherDay} from '@/lib/signals/types';

function safeReview(value:unknown){try{return value===undefined?undefined:readEventSearchReview(value)}catch{return undefined}}

type Clue=Pick<PromotionSource,'title'|'url'|'summary'|'start'|'end'|'location'>;
type Pool={events:LocalEvent[];review?:EventSearchReview;location?:string;weather:WeatherDay[];weatherSource?:SourceRef;weatherNote?:string;eventsNote?:string;eventsFailed?:boolean;weatherFailed?:boolean};
const outlook=(code:number,zh:boolean)=>{const words=zh?['晴','多云','阴','雾','雨','雪','阵雨','雨雪','雷雨']:['Clear','Cloudy','Overcast','Fog','Rain','Snow','Showers','Sleet','Storm'];return words[code===0?0:code<=2?1:code===3?2:code<=48?3:code<=67?4:code<=77?5:code<=82?6:code<=86?7:8]};
export function PromotionCluePool({zh,start,end,selected,disabled,onUse}:{zh:boolean;start:string;end:string;selected:PromotionSource[];disabled:boolean;onUse:(source:Clue)=>Promise<void>}){
 const guidedDemo=useContext(GuidedDemoContext);
 const [exploreRequested,setExploreRequested]=useState(false);
 const [retry,setRetry]=useState(0),[expanded,setExpanded]=useState(false),[weatherDate,setWeatherDate]=useState('');
 const [state,setState]=useState<{key:string;pool?:Pool}>({key:''});
 const key=JSON.stringify([start,end,retry]);
 const loading=state.key!==key,pool=state.key.startsWith(JSON.stringify([start,end]).slice(0,-1)+',')?state.pool:undefined;
 const t=(cn:string,en:string)=>zh?cn:en;
 useEffect(()=>{const refresh=()=>setRetry(v=>v+1);window.addEventListener('staycraft-profile-changed',refresh);return()=>window.removeEventListener('staycraft-profile-changed',refresh)},[]);
 useEffect(()=>{
  const controller=new AbortController();
  const read=async(url:string,init?:RequestInit)=>{const response=await fetch(url,{...init,cache:'no-store',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(45000)])});const data=await response.json();if(!response.ok)throw Object.assign(Error(),{note:typeof data?.eventSource?.note==='string'?data.eventSource.note:undefined});return data};
  Promise.allSettled([read('/api/workspace/discovery',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({start,end,explore:exploreRequested})}),read(`/api/workspace/nearby?start=${encodeURIComponent(start)}&days=7`)])
   .then(([events,weather])=>{if(controller.signal.aborted)return;const local=events.status==='fulfilled'?events.value:null,forecast=weather.status==='fulfilled'?weather.value:null;setState(previous=>({key,pool:{review:safeReview(local?.review),events:Array.isArray(local?.events)?local.events.filter((event:LocalEvent)=>event.verified&&event.start<=end&&event.end>=start&&publicSourceUrl(event.sourceUrl)):events.status==='rejected'&&previous.key.startsWith(JSON.stringify([start,end]).slice(0,-1)+',')?previous.pool?.events??[]:[],location:local?.location||forecast?.centerLabel,weather:forecast?.weather?.status==='available'?forecast.weather.days.filter((day:WeatherDay)=>day.date>=start&&day.date<=end&&Number.isFinite(day.code)):[],weatherSource:forecast?.weather?.source,weatherNote:forecast?.weather?.note||forecast?.weather?.source?.note,eventsNote:local?.eventSource?.note||(events.status==='rejected'?events.reason?.note:undefined),eventsFailed:events.status==='rejected'||!!local?.error,weatherFailed:weather.status==='rejected'||forecast?.weather?.status==='unavailable'}}))});
  return()=>controller.abort();
 },[key,start,end,exploreRequested]);
 const days=pool?.weather??[],day=days.find(item=>item.date===weatherDate)??days[0];
 const source=pool?.weatherSource??day?.source,fictional=source?.authority==='internal',showWeatherLabel=fictional&&!guidedDemo;
 const temp=(v:number|null)=>typeof v==='number'&&Number.isFinite(v)?`${Math.round(v)}°C`:null;
 const weatherTitle=day?`${day.date} ${t(showWeatherLabel?'演示天气预报':'天气预报',showWeatherLabel?'demo weather forecast':'weather forecast')}`:'';
 const conditions=day?[outlook(day.code,zh),[temp(day.tempMin),temp(day.tempMax)].filter(Boolean).join('–'),typeof day.precipProb==='number'?t(`降水 ${Math.round(day.precipProb)}%`,`${Math.round(day.precipProb)}% rain`):''].filter(Boolean).join(' · '):'';
 const used=(title:string,url:string)=>selected.some(s=>s.title===title&&s.url===url);
 const weatherUrl=fictional?'https://staycraft.online/':'https://open-meteo.com/en/docs';
 return <section className="gemini-promo-card gemini-promo-pool" aria-busy={loading}>
  <header className="gemini-promo-pool-heading"><div><h2>{t('1. 周边近期活动与 7 日天气线索池','1. Local activities & 7-day weather pool')}</h2><p>{t('点击「选用线索」将自动填入右侧文案生成器','Select a clue to feed the copy studio')}</p></div><button type="button" className="gemini-promo-button" disabled={disabled||loading} onClick={()=>{setExploreRequested(true);setRetry(v=>v+1)}}><Compass size={14}/>{loading&&exploreRequested?t('正在检索…','Searching…'):t('探索周边','Explore nearby')}</button></header>
  {pool?.location&&<p className="gemini-promo-location">{pool.location}</p>}
  {loading&&<p role="status" className="gemini-promo-loading">{exploreRequested?t('正在检索周边活动，已有线索保留…','Searching nearby activities; existing clues are kept…'):t('正在读取民宿周边的活动与天气…','Reading activities and weather near your property…')}</p>}{(!loading||pool)&&<>
   <h3 className="gemini-promo-section-title">{t(`已核实活动 · ${pool?.events.length??0} 项`,`Verified activities · ${pool?.events.length??0}`)}</h3>
   {(pool?.events??[]).slice(0,expanded?undefined:1).map(event=><article className="gemini-promo-clue" key={event.id}>
    <span className="gemini-promo-icon"><Compass size={16}/></span><div className="gemini-promo-clue-text"><strong>{event.title}</strong><small>{event.start} — {event.end}{event.venue&&` · ${event.venue}`}{typeof event.distanceKm==='number'&&Number.isFinite(event.distanceKm)&&event.distanceKm>=0&&t(` · 距民宿约 ${event.distanceKm} km`,` · About ${event.distanceKm} km away`)}</small><a href={event.sourceUrl} target="_blank" rel="noopener noreferrer">{t('查看活动来源','View event source')}<ExternalLink size={12}/></a></div>
    <button type="button" className="gemini-promo-button violet" disabled={disabled||loading||used(event.title,event.sourceUrl)} onClick={()=>void onUse({title:event.title,url:event.sourceUrl,start:event.start,end:event.end,location:pool?.location,summary:[event.venue,typeof event.distanceKm==='number'&&Number.isFinite(event.distanceKm)&&event.distanceKm>=0?t(`距民宿约 ${event.distanceKm} km`,`About ${event.distanceKm} km from the property`):''].filter(Boolean).join(' · ')||event.title})}>{used(event.title,event.sourceUrl)?t('已选用','Selected'):t('选用线索','Use clue')}<ArrowRight size={14}/></button>
   </article>)}
   {!pool?.events.length&&<div className="gemini-promo-clue"><span className="gemini-promo-icon"><Compass size={16}/></span><div className="gemini-promo-clue-text"><strong>{pool?.eventsFailed?t('活动线索暂时无法读取','Activity clues are temporarily unavailable'):t('暂未获取可用活动线索','No activity clues have been retrieved')}</strong><small>{pool?.eventsNote||(pool?.eventsFailed?t('暂时无法读取周边活动，可重新读取；这不代表当地没有活动。','Activities could not be read. Retry; this does not mean there are no local events.'):t('当前来源未提供符合本店地址与日期的活动记录，这不代表当地没有活动。','Current sources supplied no matching records for this address and period; this does not mean there are no local events.'))}</small></div></div>}
   {(pool?.events.length??0)>1&&<button type="button" className="gemini-promo-link" onClick={()=>setExpanded(v=>!v)}>{expanded?t('收起活动','Show fewer'):t(`查看全部 ${pool?.events.length} 条活动`,`View all ${pool?.events.length} activities`)}</button>}
   <PromotionEvidence review={pool?.review} zh={zh}/>
   <PromotionOpportunities start={start} end={end} zh={zh}/>
   <article className="gemini-promo-clue"><span className="gemini-promo-icon"><Sun size={16}/></span><div className="gemini-promo-clue-text"><strong>{day?`${day.date} · ${conditions}`:pool?.weatherFailed?t('天气预报暂时无法读取','Forecast is temporarily unavailable'):t('所选日期暂无天气预报','No forecast for these dates')}</strong><small>{day?t(showWeatherLabel?'演示天气 · 模拟数据':'民宿所在位置的天气预报，出发前请核对最新变化',showWeatherLabel?'Simulated demo weather':'Forecast for your property; check updates before travelling'):pool?.weatherFailed?(zh&&pool.weatherNote?pool.weatherNote:t('暂时无法读取民宿天气，可重新读取；也可以先从本店特色开始。','The forecast could not be read. Retry, or start with your property details.')):t('天气会随预报范围更新；也可以不选线索，直接生成本店的小住邀请。','Forecast coverage changes. You can also draft a stay invitation from property details.')}</small>{days.length>1&&<label className="gemini-promo-weather-date">{t('预报日期','Forecast date')}<select value={day?.date} onChange={event=>setWeatherDate(event.target.value)} disabled={disabled}>{days.map(item=><option key={item.date} value={item.date}>{item.date}</option>)}</select></label>}</div>
    {day&&<button type="button" className="gemini-promo-button" disabled={disabled||used(weatherTitle,weatherUrl)} onClick={()=>void onUse({title:weatherTitle,url:weatherUrl,start:day.date,end:day.date,location:pool?.location,summary:[pool?.location,fictional?t('模拟天气','Simulated weather'):t('预报可能变化','Forecast, subject to change'),conditions].filter(Boolean).join(' · ')})}>{used(weatherTitle,weatherUrl)?t('已选用','Selected'):t('选用天气','Use weather')}<ArrowRight size={14}/></button>}
   </article>
   <button type="button" className="gemini-promo-link" disabled={disabled||loading} onClick={()=>{setExploreRequested(true);setRetry(v=>v+1)}}><RefreshCw size={13}/>{t('重新读取线索','Reload clues')}</button>
  </>}
 </section>;
}
