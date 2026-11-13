// Search evidence is deliberately separate from LocalEvent and promotion sources.
export const REVIEW_REASONS={
 accepted:['已通过日期与 15 km 场地核验','Date and venue within 15 km checked'],
 invalid_source:['来源链接不符合公开 HTTPS 要求','Invalid public HTTPS source'],
 missing_title:['缺少来源标题','Missing source title'],
 duplicate_source:['重复来源链接','Duplicate source URL'],
 no_content:['未取得正文，摘要不作为活动证据','Full text unavailable; snippets are insufficient'],
 page_limit:['超过本次正文处理上限','Page processing limit reached'],
 cancelled_or_online:['正文涉及取消、延期或线上活动，需人工核对','Cancellation, postponement or online-only information needs review'],
 date_pending:['未找到明确活动日期，发布日期不作活动日期','Event date unconfirmed; publication date is not an event date'],
 evidence_unpaired:['日期、名称与场地未能可靠配对','Date, name and venue could not be reliably paired'],
 outside_window:['活动日期不在所选范围','Outside the selected dates'],
 event_limit:['超过本次活动处理上限','Event processing limit reached'],
 venue_limit:['超过本次场地定位上限','Venue lookup limit reached'],
 venue_unresolved:['场地定位未成功','Venue could not be located'],
 outside_radius:['场地距民宿超过 15 km','Venue is more than 15 km away'],
 duplicate_event:['与另一来源的活动重复','Duplicate event from another source'],
} as const;
export type ReviewReason=keyof typeof REVIEW_REASONS;
export type SearchReviewRow={title:string;url?:string;reason:ReviewReason;candidate?:boolean;events:{title:string;reason:ReviewReason}[]};
export type EventSearchReview={raw:number;pages:number;parsed:number;final:number;query:string;observedAt:string;cached:boolean;rows:SearchReviewRow[]};
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const text=(v:unknown,max:number):v is string=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
const count=(v:unknown):v is number=>Number.isSafeInteger(v)&&Number(v)>=0&&Number(v)<=500;
const reason=(v:unknown):v is ReviewReason=>typeof v==='string'&&Object.hasOwn(REVIEW_REASONS,v);
export function readEventSearchReview(value:unknown):EventSearchReview{
 if(!object(value)||!count(value.raw)||value.raw>100||!count(value.pages)||value.pages>5||value.pages>value.raw||!count(value.parsed)||!count(value.final)||value.final>value.parsed||!text(value.query,128)||!text(value.observedAt,40)||!Number.isFinite(Date.parse(value.observedAt))||typeof value.cached!=='boolean'||!Array.isArray(value.rows)||value.rows.length!==value.raw)throw Error('invalid_event_review');
 const rows=value.rows.map((row):SearchReviewRow=>{
  if(!object(row)||!text(row.title,120)||!reason(row.reason)||!Array.isArray(row.events)||row.events.length>100||row.candidate!==undefined&&typeof row.candidate!=='boolean')throw Error('invalid_event_review');
  let url:string|undefined;
  if(row.url!==undefined){if(!text(row.url,2000))throw Error('invalid_event_review');const parsed=new URL(row.url);if(parsed.protocol!=='https:'||parsed.username||parsed.password)throw Error('invalid_event_review');url=parsed.href;}
  if(row.candidate&&(!url||!['date_pending','evidence_unpaired'].includes(row.reason)||row.events.length))throw Error('invalid_event_review');
  return {title:row.title,url,reason:row.reason,candidate:row.candidate===true,events:row.events.map(event=>{if(!object(event)||!text(event.title,120)||!reason(event.reason))throw Error('invalid_event_review');return {title:event.title,reason:event.reason}})};
 });
 if(rows.reduce((sum,row)=>sum+row.events.length,0)!==value.parsed||rows.flatMap(row=>row.events).filter(event=>event.reason==='accepted').length!==value.final)throw Error('invalid_event_review');
 return {raw:value.raw,pages:value.pages,parsed:value.parsed,final:value.final,query:value.query,observedAt:value.observedAt,cached:value.cached,rows};
}
