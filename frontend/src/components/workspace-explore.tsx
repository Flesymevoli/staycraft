"use client";
import Link from 'next/link';
import {useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {MarketPrices} from './market-prices';
import './workspace-explore.css';
function validDate(value:string|null){return value&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value?value:undefined}
export function WorkspaceExplore({zh}:{zh:boolean}){
 const params=useSearchParams();
 const queryStart=validDate(params.get('start')),queryEnd=validDate(params.get('end'));
 const [today]=useState(()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai'}).format(new Date()));
 const initialStart=queryStart&&queryStart>=today?queryStart:undefined;
 const initialEnd=initialStart?new Date(Date.parse(queryEnd&&queryEnd>=initialStart?queryEnd:initialStart)+86400000).toISOString().slice(0,10):undefined;
 return <div className="workspace-explore-content market-workspace">
  <MarketPrices key={`${initialStart}:${initialEnd}`} zh={zh} initialStart={initialStart} initialEnd={initialEnd}/>
  <div className="market-promotion-link"><span>{zh?'把值得关注的客源与民宿特色，整理成推广方案。':'Turn relevant audiences and property strengths into a promotion plan.'}</span><Link href="/app/promotion">{zh?'查看推广方案 →':'Open promotion plans →'}</Link></div>
 </div>;
}
