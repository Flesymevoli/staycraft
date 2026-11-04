"use client";
import Link from 'next/link';
import {useState} from 'react';
import {MarketPrices} from './market-prices';
import {NearbyDiscovery} from './nearby-discovery';
import {OfficialHolidayContext} from './official-holiday-context';
import './workspace-explore.css';
export function WorkspaceExplore({zh}:{zh:boolean}){
 const [start,setStart]=useState(()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai'}).format(new Date()));
 const [end,setEnd]=useState(()=>new Date(Date.now()+6*86400000).toISOString().slice(0,10));
 return <div className="workspace-explore-content market-workspace"><section className="native-card market-intro"><span className="promotion-eyebrow">MARKET INTELLIGENCE</span><h2>{zh?'理解你的市场位置':'Understand your market position'}</h2><p>{zh?'查询真实酒店报价，发现周边线索；系统会在决策总览中综合经营数据展开分析。':'Explore real hotel quotes and local context. The decision workbench combines them with your business data.'}</p><Link href="/app">{zh?'查看主动诊断 →':'Open decision workbench →'}</Link></section><MarketPrices zh={zh}/><section className="native-card"><div className="promotion-fields"><label>{zh?'关注日期':'From'}<input type="date" value={start} onChange={e=>setStart(e.target.value)}/></label><label>{zh?'截至日期':'Through'}<input type="date" value={end} min={start} onChange={e=>setEnd(e.target.value)}/></label></div><NearbyDiscovery zh={zh} start={start} end={end}/><OfficialHolidayContext zh={zh} start={start} end={end}/></section><section className="native-card"><h2>{zh?'把特色变成推广内容':'Turn features into promotion'}</h2><p>{zh?'根据民宿资料创作正式介绍或营销种草文案，编辑后自行使用。':'Create formal introductions or discovery posts from your property facts.'}</p><Link className="native-primary" href="/app/promotion">{zh?'打开文案工作室':'Open copy studio'}</Link></section></div>;
}
