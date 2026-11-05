"use client";
import {useEffect,useState} from 'react';
import Link from 'next/link';
import type {LocalSearchResult} from '@/lib/local-discovery';
import type {NearbyPlace} from '@/lib/amap-nearby';
import {useBookingMetrics} from './booking-metrics';
type Discovery={places?:NearbyPlace[];provider?:string;results?:LocalSearchResult[];searchedAt?:string;location?:string;start?:string;end?:string;error?:string};
export function NearbyDiscovery({zh,start,end,onUseSource,selectedUrls,disabled}:{zh:boolean;start:string;end:string;onUseSource:(source:{title:string;url:string;summary:string})=>Promise<void>;selectedUrls:string[];disabled:boolean}){
 const t=(en:string,cn:string)=>zh?cn:en;
 const [expanded,setExpanded]=useState(false);
 const {data:metrics}=useBookingMetrics(7,'nearby-opportunity',{start,end});
 const [busy,setBusy]=useState(true),[data,setData]=useState<Discovery|null>(null),[retry,setRetry]=useState(0);
 const [coordinates,setCoordinates]=useState<{latitude:number;longitude:number}|undefined>(),[locating,setLocating]=useState(false),[locationError,setLocationError]=useState('');
 function locate(){setLocationError('');if(!navigator.geolocation){setLocationError(t('Location is unavailable in this browser.','此浏览器不支持定位，可继续使用民宿地址。'));return}setLocating(true);navigator.geolocation.getCurrentPosition(p=>{setCoordinates({latitude:p.coords.latitude,longitude:p.coords.longitude});setLocating(false)},()=>{setLocationError(t('Location permission denied or timed out. You can use the property address.','未获得定位权限或定位超时，可继续使用民宿地址。'));setLocating(false)},{enableHighAccuracy:true,timeout:12000,maximumAge:60000})}
 useEffect(()=>{const controller=new AbortController();async function load(){setBusy(true);setData(null);try{const response=await fetch('/api/workspace/discovery',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({start,end,coordinates}),signal:controller.signal});const body=await response.json();if(!controller.signal.aborted)setData(response.ok?body:{...body,error:body.error||'search_unavailable'})}catch{if(!controller.signal.aborted)setData({error:'search_unavailable'})}finally{if(!controller.signal.aborted)setBusy(false)}}void load();return()=>controller.abort()},[start,end,retry,coordinates]);
 return <div className="nearby-discovery"><h2>{t('Nearby demand opportunities','周边住宿机会')}</h2>
 <p className="promotion-muted">{start} — {end}</p>
 <div className="local-search-controls"><button className="promotion-button" disabled={locating} onClick={locate}>{locating?t('Locating…','正在定位…'):t('Use my location','使用我的位置')}</button>{coordinates&&<button className="inventory-text" onClick={()=>{setCoordinates(undefined);setLocationError('')}}>{t('Use property address','使用民宿地址')}</button>}</div>
 {locationError&&<p role="status" className="promotion-muted">{locationError}</p>}
 {data?.location&&<p className="local-search-source">{t('Around','以此为中心')}：{data.location}</p>}
 {busy?<p role="status" className="promotion-muted">{t('Loading nearby places…','正在发现周边…')}</p>:data?.error==='search_not_configured'?<p role="status" className="promotion-muted">{t('Nearby services are not connected yet.','周边查询服务尚未接通。')}</p>:data?.error==='property_location_required'?<p className="promotion-muted">{t('Use your location or save a property address.','请使用当前位置，或先保存民宿地址。')} <Link href="/app/mine">{t('Property settings','前往民宿资料')} →</Link></p>:data?.error?<p role="status" className="promotion-muted">{t('Nearby places are temporarily unavailable.','暂时无法查询周边，请重试或更换位置。')} <button className="inventory-text" onClick={()=>setRetry(v=>v+1)}>{t('Retry','重试')}</button></p>:data?.provider==='amap'?<>

 {!data.places?.length&&<p className="promotion-muted">{t('No relevant demand anchors returned in this area.','本次范围内未返回符合筛选条件的客源地点。')}</p>}<div className="nearby-place-list" id="nearby-place-list">{data.places?.slice(0,expanded?undefined:3).map(p=><article key={p.id} className="native-card promotion-list-row"><div><a href={p.url} target="_blank" rel="noopener noreferrer">{p.name} ↗</a><p>{p.address}</p><small>{t('AMap · potential guest segment','高德 · 潜在客群')} {p.category}</small>{!coordinates&&<button type="button" className="inventory-text" disabled={disabled||selectedUrls.includes(p.url)} onClick={()=>void onUseSource({title:p.name,url:p.url,summary:[p.category,p.address].filter(Boolean).join(" · ")||p.name})}>{selectedUrls.includes(p.url)?t("Added","已采用"):t("Use in copy","用于文案")}</button>}</div></article>)}</div>{!!data.places&&data.places.length>3&&<button type="button" className="inventory-text nearby-expand" aria-expanded={expanded} aria-controls="nearby-place-list" onClick={()=>setExpanded(v=>!v)}>{expanded?t('Show fewer places','收起地点'):t(`View all ${data.places.length} places`,`展开全部 ${data.places.length} 个地点`)}</button>}
 {!coordinates&&metrics&&!metrics.historical_inventory_unknown&&metrics.available_room_nights>0&&<section className="native-card"><h3>{t('Dates to focus on','值得关注的推广日期')}</h3><p>{metrics.daily.filter(d=>d.available>0).slice().sort((a,b)=>b.available-a.available).slice(0,3).map(d=>`${d.date} · ${d.available}${zh?' 间空房':' rooms open'}`).join('；')}</p></section>}

 </>:<>
 <p className="local-search-source">{data?.start} — {data?.end}{data?.searchedAt&&<> · {t('Updated','更新于')} {new Date(data.searchedAt).toLocaleString(zh?'zh-CN':'en-GB')}</>}</p>
 {!data?.results?.length&&<p className="promotion-muted">{t('No relevant activities were found for these dates.','本次没有找到这些日期的相关活动。')}</p>}
 {data?.results?.map(item=><article className="native-card promotion-list-row" key={item.url}><div><a href={item.url} target="_blank" rel="noopener noreferrer">{item.title} ↗</a><p>{item.snippet}</p><small>{item.site} · {item.publishedAt?new Date(item.publishedAt).toLocaleDateString():t('Publication date unknown','发布日期未知')}</small></div></article>)}

 </>}
 </div>;
}
