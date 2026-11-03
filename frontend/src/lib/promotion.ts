import {bookingPeriod} from "./booking-period";

export type PromotionSource={id:string;title:string;url:string;summary:string;start:string;end:string;checkedOn:string};
export type PromotionBrief={language:"zh"|"en";channel:"xiaohongshu"|"wechat";goal:"rooms"|"local";start:string;end:string;sourceIds:string[]};
export type PromotionDraft={kind?:"action";id:string;brief:PromotionBrief;content:string;engine:"model_v1"|"rules_v1";createdAt:string;basis:{label:string;text:string;url?:string}[]};
export type PromotionState={sources:PromotionSource[];drafts:PromotionDraft[]};
export const emptyPromotion=():PromotionState=>({sources:[],drafts:[]});
const text=(v:unknown,max:number):v is string=>typeof v==="string"&&v.length<=max&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v);
const id=(v:unknown):v is string=>typeof v==="string"&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(v);
export function publicSourceUrl(value:unknown):value is string{
 if(!text(value,1000))return false;
 try{const url=new URL(value);return url.protocol==="https:"&&!url.username&&!url.password&&!url.port&&url.hostname.includes(".")&&!/^localhost$|\.local$|\.internal$|^[\d.]+$|:/.test(url.hostname)}catch{return false}
}
export function validBrief(value:unknown):value is PromotionBrief{
 if(!value||typeof value!=="object")return false;const v=value as PromotionBrief;
 return Object.keys(v).sort().join() === "channel,end,goal,language,sourceIds,start"&&["zh","en"].includes(v.language)&&["xiaohongshu","wechat"].includes(v.channel)&&["rooms","local"].includes(v.goal)&&!!bookingPeriod(v)&&Array.isArray(v.sourceIds)&&v.sourceIds.length<=5&&v.sourceIds.every(id)&&new Set(v.sourceIds).size===v.sourceIds.length;
}
export function validPromotion(value:unknown):value is PromotionState{
 if(!value||typeof value!=="object")return false;const v=value as PromotionState;
 if(Object.keys(v).sort().join()!=="drafts,sources"||!Array.isArray(v.sources)||!Array.isArray(v.drafts)||v.sources.length>12||v.drafts.length>20)return false;
 const sources=v.sources.every(s=>s&&Object.keys(s).sort().join()==="checkedOn,end,id,start,summary,title,url"&&id(s.id)&&text(s.title,120)&&!!s.title.trim()&&publicSourceUrl(s.url)&&text(s.summary,600)&&!!s.summary.trim()&&!!bookingPeriod(s)&&!!bookingPeriod({start:s.checkedOn,end:s.checkedOn}));
 const drafts=v.drafts.every(d=>d&&(Object.keys(d).sort().join()==="basis,brief,content,createdAt,engine,id"||Object.keys(d).sort().join()==="basis,brief,content,createdAt,engine,id,kind"&&d.kind==="action")&&id(d.id)&&validBrief(d.brief)&&text(d.content,4000)&&!!d.content.trim()&&["model_v1","rules_v1"].includes(d.engine)&&text(d.createdAt,30)&&Number.isFinite(Date.parse(d.createdAt))&&Array.isArray(d.basis)&&d.basis.length<=12&&d.basis.every(b=>b&&Object.keys(b).every(k=>["label","text","url"].includes(k))&&text(b.label,120)&&text(b.text,1500)&&(b.url===undefined||publicSourceUrl(b.url))));
 return sources&&drafts&&new Set(v.sources.map(s=>s.id)).size===v.sources.length&&new Set(v.drafts.map(d=>d.id)).size===v.drafts.length&&new TextEncoder().encode(JSON.stringify(v)).length<=180000;
}
export function matchingSources(sources:PromotionSource[],brief:PromotionBrief){return sources.filter(s=>brief.sourceIds.includes(s.id)&&s.start<=brief.end&&s.end>=brief.start)}

// The model chooses an angle/order from fixed candidates. It receives no names,
// addresses, source prose, guest messages or booking details, and cannot invent claims.
export async function arrangePromotion(factIds:string[],brief:PromotionBrief,options:{model:boolean;fetcher?:typeof fetch;signal?:AbortSignal}){
 const fallback={engine:"rules_v1" as const,ids:factIds,fallback:options.model};
 if(!options.model||factIds.length<2)return {...fallback,fallback:false};
 const base=process.env.MODEL_BASE_URL,key=process.env.MODEL_API_KEY,model=process.env.MODEL_NAME;
 try{
  if(!base||new URL(base).protocol!=="https:"||!key||!model)return fallback;
  const response=await (options.fetcher||fetch)(base.replace(/\/$/,"")+"/chat/completions",{method:"POST",redirect:"manual",cache:"no-store",headers:{"Content-Type":"application/json",Authorization:`Bearer ${key}`,...(process.env.MODEL_AUTH_MODE==="api-key"?{"api-key":key}:{})},signal:options.signal?AbortSignal.any([options.signal,AbortSignal.timeout(10000)]):AbortSignal.timeout(10000),body:JSON.stringify({model,stream:false,max_tokens:200,messages:[{role:"system",content:'Arrange a homestay promotion using only supplied fact IDs. For local trips prioritise source IDs; for rooms prioritise room IDs. Return JSON only: {"ids":[every supplied ID exactly once]}. Do not write copy or add facts.'},{role:"user",content:JSON.stringify({goal:brief.goal,channel:brief.channel,ids:factIds})}]})});
  if(!response.ok)return fallback;const data=await response.json();if(data.choices?.[0]?.finish_reason!=="stop")return fallback;
  const parsed=JSON.parse(data.choices[0].message.content),ids=parsed.ids;
  if(Object.keys(parsed).length!==1||!Array.isArray(ids)||ids.length!==factIds.length||new Set(ids).size!==factIds.length||ids.some((v:unknown)=>typeof v!=="string"||!factIds.includes(v)))return fallback;
  return {engine:"model_v1" as const,ids:ids as string[],fallback:false};
 }catch{return fallback}
}

export function promotionCopy(brief:PromotionBrief,name:string,facts:{id:string;text:string}[],ordered:string[]){
 const zh=brief.language==="zh",local=brief.goal==="local";
 const title=zh?(local?`住进${name}，把周边加入旅行计划`:`在${name}，安排一段小住`):(local?`Stay at ${name}, explore nearby`:`Plan a stay at ${name}`);
 const body=ordered.map(v=>facts.find(f=>f.id===v)?.text).filter(Boolean).join("\n\n");
 const dates=zh?`计划出行：${brief.start} — ${brief.end}`:`Travel dates: ${brief.start} — ${brief.end}`;
 const cta=zh?"想了解房型和入住安排，欢迎联系民宿。具体房态、价格及周边开放安排请在预订前核实。":"Contact the property for room types and stay arrangements. Confirm availability, prices and local opening arrangements before booking.";
 return [title,dates,body,cta,brief.channel==="xiaohongshu"?(zh?"#民宿旅行 #周边游":"#Homestay #LocalTravel"):""].filter(Boolean).join("\n\n");
}
