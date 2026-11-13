import {verifiedProperty,WorkspaceError,workspaceFailure} from '@/lib/workspace-access';
import {validateProfile} from '@/lib/property-profile';
import {fetchWeather} from '@/lib/signals/weather';
import {propertyPoint} from '@/lib/property-location';
import {marketDay} from '@/lib/market/quote-identity';
import {isDemoWorkspace} from '@/lib/operator-sample';
import {DEMO_PERIOD,workspaceDay} from '@/lib/demo-period';
import type {SourceRef} from '@/lib/signals/types';
import {desktopSignalsEnabled,readDesktopWeather} from '@/lib/desktop-external-signals';
export const dynamic='force-dynamic';

export async function GET(request:Request){try{
 const account=await verifiedProperty();
 const {supabase,propertyId,user}=account;
 const demo=isDemoWorkspace(user.email);
 const guidedDemo=process.env.STAYCRAFT_DESKTOP_DEMO==='1'&&process.env.STAYCRAFT_DESKTOP_GUIDED_DEMO==='1';
 const url=new URL(request.url),today=workspaceDay(demo);
 const requested=url.searchParams.get('start')||today;
 const days=Number(url.searchParams.get('days')||7);
 if(!marketDay(requested)||!Number.isInteger(days)||days<1||days>7)throw new WorkspaceError('invalid_input',400);
 const start=requested<today?today:requested;
 const offset=Math.round((Date.parse(start)-Date.parse(today))/86400000);
 const {data,error}=await supabase.from('property_details').select('profile').eq('property_id',propertyId).maybeSingle();
 if(error)throw new WorkspaceError('profile_unavailable',503);
 const location=validateProfile(data?.profile)?.location||'';
 const context={center:'property',centerLabel:location};
 const headers={'Cache-Control':'private, no-store'};
 const unavailable=(note:string)=>Response.json({...context,weather:{status:'unavailable',days:[],note}},{headers});
 if(demo||guidedDemo){
  const first=guidedDemo?today:DEMO_PERIOD.start;
  const last=new Date(Date.parse(first)+6*86400000).toISOString().slice(0,10);
  const source:SourceRef={id:'weather',authority:'internal',observedAt:guidedDemo?first+'T00:00:00Z':'2026-11-11T00:00:00Z',coverage:{from:first,to:last,kind:'complete'},confidence:'low'};
  const rows=[[3,12,21,10],[61,11,21,53],[61,14,20,58],[80,16,20,90],[3,13,21,22],[3,12,19,2],[80,10,17,75]];
  const selected=rows.map(([code,tempMin,tempMax,precipProb],index)=>({
   date:new Date(Date.parse(first)+index*86400000).toISOString().slice(0,10),
   code,tempMin,tempMax,precipProb,source,
  })).filter(day=>day.date>=start).slice(0,days);
  return Response.json({...context,weather:{status:selected.length?'available':'unavailable',days:selected,source}},{headers});
 }
 if(offset>=16)return unavailable('所选日期超出天气预报范围');
 if(desktopSignalsEnabled()){
  try{
   const result=await readDesktopWeather({account,location,start,days,signal:request.signal});
   return Response.json({...context,weather:{status:result.days.length?'available':'unavailable',days:result.days,source:result.source,...(!result.days.length?{note:result.source.note||'天气源暂不可用'}:{})}},{headers});
  }catch{return unavailable('暂时无法读取民宿天气，请稍后重试')}
 }
 let point;
 try{point=await propertyPoint(location,user?.email,request.signal)}catch{return unavailable('暂时无法定位民宿，未获取天气')}
 if(!point)return unavailable('缺少可用民宿坐标，未获取天气');
 const result=await fetchWeather({...point,days:Math.min(16,offset+days),signal:request.signal});
 const end=new Date(Date.parse(start)+(days-1)*86400000).toISOString().slice(0,10);
 const selected=result.days.filter(day=>day.date>=start&&day.date<=end).slice(0,days);
 return Response.json({...context,weather:{status:selected.length?'available':'unavailable',days:selected,source:result.source,...(!selected.length?{note:'天气源暂不可用'}:{})}},{headers});
}catch(error){return workspaceFailure(error)}}
