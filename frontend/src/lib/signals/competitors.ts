// Manually captured competitor quotes: one stay date, one quote. No average, no range, no trend.
import type {CompetitorAnchor,Coverage,SourceRef} from './types';

export type AnchorsInput={entries:unknown[];observedAt:string};
export type AnchorsResult={anchors:CompetitorAnchor[];source:SourceRef};
export type AnchorSummary={observed:number;conflicting:number;missing:number;note:string};

const ISO_DATE=/^\d{4}-\d{2}-\d{2}$/;
const KINDS=['independent_homestay','comparable_stay'] as const;
type AnchorKind=(typeof KINDS)[number];
type Group={name:string;stayDate:string;kind:AnchorKind;roomType?:string;meal?:string;cancellation?:string;sourceType:'manual'|'screenshot';sourceUrl?:string;capturedAt:string;id?:string;amounts:number[];missing:boolean;invalid:boolean};

function isDay(value:unknown):value is string{return typeof value==='string'&&ISO_DATE.test(value)&&new Date(`${value}T00:00:00Z`).toISOString().slice(0,10)===value}
function isHttps(value:unknown):value is string{
 try{const url=new URL(String(value));return url.protocol==='https:'&&url.hostname.length>0}catch{return false}
}
function text(value:unknown,max:number):string|undefined{return typeof value==='string'&&value.trim()?value.trim().slice(0,max):undefined}
function positiveAmount(value:unknown):number|'missing'|'invalid'{
 if(value===null||value===undefined)return 'missing';
 return typeof value==='number'&&Number.isInteger(value)&&value>0&&value<=1000000?value:'invalid';
}

export function normalizeAnchors(input:AnchorsInput):AnchorsResult{
 if(!input||!Array.isArray(input.entries))throw new Error('anchor_entries_required');
 const observedAt=typeof input.observedAt==='string'&&Number.isFinite(Date.parse(input.observedAt))?input.observedAt:new Date().toISOString(),
  groups=new Map<string,Group>();
 for(const raw of input.entries){
  if(!raw||typeof raw!=='object')continue;
  const record=raw as Record<string,unknown>,name=text(record.name,120),stayDate=record.stayDate;
  // A quote without a named property and a stay date is not an anchor.
  if(!name||!isDay(stayDate))continue;
  const key=`${name}\u0000${stayDate}`,existing=groups.get(key),
   kind=typeof record.kind==='string'&&(KINDS as readonly string[]).includes(record.kind)?record.kind as AnchorKind:'comparable_stay',
   group=existing||{name,stayDate,kind,roomType:text(record.roomType,80),meal:text(record.meal,80),cancellation:text(record.cancellation,80),sourceType:record.sourceType==='screenshot'?'screenshot':'manual',sourceUrl:isHttps(record.sourceUrl)?record.sourceUrl:undefined,capturedAt:typeof record.capturedAt==='string'&&Number.isFinite(Date.parse(record.capturedAt))?record.capturedAt:observedAt,id:text(record.id,80),amounts:[],missing:false,invalid:false},
   amount=positiveAmount(record.amountCny);
  if(amount==='missing')group.missing=true;
  else if(amount==='invalid')group.invalid=true;
  else group.amounts.push(amount);
  if(!existing)groups.set(key,group);
 }
 const ids=new Set<string>(),
  anchors=[...groups.values()].map((group,index):CompetitorAnchor=>{
   const unique=[...new Set(group.amounts)];
   let status:CompetitorAnchor['status'],amountCny:number|null=null;
   if(unique.length>1)status='conflicting';
   else if(unique.length===1&&!group.missing&&!group.invalid){status='observed';amountCny=unique[0]}
   else if(unique.length===0&&!group.invalid)status='missing';
   else status='unverified';
   let id=group.id||`anchor-${index+1}`;
   if(ids.has(id))id=`${id}-${index+1}`;
   ids.add(id);
   const anchorSource:SourceRef={id:'competitor',authority:'manual',observedAt,coverage:{from:group.stayDate,to:group.stayDate,kind:'partial'},confidence:status==='observed'?'medium':'low',note:'人工录入单店单日报价；仅作锚点，不能代表市场均价或区间。'};
   return {id,name:group.name,kind:group.kind,stayDate:group.stayDate,amountCny,roomType:group.roomType,meal:group.meal,cancellation:group.cancellation,sourceType:group.sourceType,sourceUrl:group.sourceUrl,capturedAt:group.capturedAt,status,source:anchorSource};
  });
 const dates=anchors.map(anchor=>anchor.stayDate).sort(),
  coverage:Coverage={from:dates[0]??observedAt.slice(0,10),to:dates.at(-1)??observedAt.slice(0,10),kind:anchors.length?'partial':'none'},
  observed=anchors.filter(anchor=>anchor.status==='observed').length,
  conflicting=anchors.filter(anchor=>anchor.status==='conflicting').length;
 return {anchors,source:{id:'competitor',authority:'manual',observedAt,coverage,confidence:observed>=2&&conflicting===0?'medium':'low',note:'人工锚点样本，按店/日逐条记录；不计算均价、区间或趋势。'}};
}

export function summarizeAnchors(anchors:CompetitorAnchor[]):AnchorSummary{
 if(!Array.isArray(anchors)||anchors.length===0)return {observed:0,conflicting:0,missing:0,note:'暂无人工锚点；样本不足，不能形成区间，也不做跨日期聚合。'};
 const observed=anchors.filter(anchor=>anchor.status==='observed').length,
  conflicting=anchors.filter(anchor=>anchor.status==='conflicting').length,
  missing=anchors.filter(anchor=>anchor.status==='missing').length,
  unverified=anchors.filter(anchor=>anchor.status==='unverified').length,
  extra=unverified>0?`另有 ${unverified} 条无法判定。`:'';
 const note=observed<2
  ?`已观察 ${observed} 条单店单日报价；样本不足，不能形成区间，也不做均价或跨日期聚合。${extra}`
  :`已按店/日记录 ${observed} 条单一报价；冲突 ${conflicting} 条、缺价 ${missing} 条；不做均价、区间或跨日期聚合。${extra}`;
 return {observed,conflicting,missing,note};
}
