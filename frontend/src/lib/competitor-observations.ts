// Public calendar observations only. Never interpret these as room-plan offers.
export type Observation = {
  hotelId: string; hotelName: string; sourceUrl: string; authScope?: string;
  capturedAt: string; stayDate: string; amount: number | null;
  currency: "CNY"; kind: "calendar_reference";
  status: "observed" | "missing" | "conflicting" | "not_accepting" | "login_required";
  rooms: 1; adults: 2; children: 0; nights: 1;
};
export function parseCalendar(input: {hotelId:string;hotelName:string;capturedAt:string;snapshot:string;dates:string[];authScope?:string}): Observation[] {
  if(!input.hotelName?.trim()||input.hotelName.length>200||!Array.isArray(input.dates)||input.dates.length>62||!/^\d{1,12}$/.test(input.hotelId) || !Number.isFinite(Date.parse(input.capturedAt)) || input.snapshot.length > 1000000) throw new Error("invalid_capture");
  if(!input.snapshot.includes(input.hotelName)||!input.snapshot.includes("1间, 2成人, 0儿童")) throw new Error("capture_context_missing");
  if(input.authScope&&!/^(anonymous|member:[a-f0-9-]{36})$/.test(input.authScope))throw new Error("invalid_scope");
  const prices = new Map<string,Set<number>>();
  // Only calendar checkbox labels, not arbitrary currency strings, facilities or reviews.
  for(const line of input.snapshot.split("\n")) {
    const match=line.match(/checkbox "(\d{4})年(\d{1,2})月(\d{1,2})日[^"\n]*The price is CNY ([0-9]+(?:\.[0-9]{1,2})?), Select the (?:start|end) date you want"/);
    if(!match) continue;
    const date=`${match[1]}-${match[2].padStart(2,"0")}-${match[3].padStart(2,"0")}`, amount=Number(match[4]);
    if(!Number.isFinite(amount)||amount<=0||amount>1000000) continue;
    const values=prices.get(date)||new Set<number>(); values.add(amount);prices.set(date,values);
  }
  return [...new Set(input.dates)].map(stayDate=>{
    if(!/^\d{4}-\d{2}-\d{2}$/.test(stayDate)||new Date(stayDate).toISOString().slice(0,10)!==stayDate) throw new Error("invalid_date");
    const values=prices.get(stayDate);
    const status:Observation["status"]=values?.size===1?"observed":values&&values.size>1?"conflicting":input.snapshot.includes("本酒店目前不接受预订")?"not_accepting":input.snapshot.includes("登录看低价")?"login_required":"missing";
    return {authScope:input.authScope||"anonymous",hotelId:input.hotelId,hotelName:input.hotelName,sourceUrl:`https://hotels.ctrip.com/hotels/${input.hotelId}.html`,capturedAt:input.capturedAt,stayDate,amount:status==="observed"?[...values!][0]:null,currency:"CNY",kind:"calendar_reference",status,rooms:1,adults:2,children:0,nights:1};
  });
}
export function compareObservations(current:Observation, previous:Observation|undefined):number|null {
  if((current.authScope||"anonymous")!==(previous?.authScope||"anonymous"))return null;
  if(!previous||current.status!=="observed"||previous.status!=="observed"||current.amount===null||previous.amount===null) return null;
  if((["hotelId","stayDate","currency","kind","rooms","adults","children","nights"] as const).some(k=>current[k]!==previous[k])) return null;
  if(Date.parse(current.capturedAt)<=Date.parse(previous.capturedAt)) return null;
  return Math.round((current.amount-previous.amount)*100)/100;
}

// Classify the actual landing page before interpreting room/calendar failures.
export function captureBarrier(url:string,snapshot:string):"login_required"|"verification_required"|null {
  let location:URL;try{location=new URL(url)}catch{return null}
  if(location.hostname==="passport.ctrip.com"||/账号密码登录|国内手机号\/用户名\/邮箱\/卡号/.test(snapshot))return "login_required";
  if(/请完成安全验证|拖动滑块|安全验证|请完成下面的验证测试|请按顺序点选图标/.test(snapshot))return "verification_required";
  return null;
}
export const monitorHotels=[
 {id:"2132616",name:"杭州沐曦民宿(西湖店)"},
 {id:"1762435",name:"杭州糖堂民宿(西湖灵隐寺店)"},
];
type Job={status?:string;error?:string;startedAt?:string;finishedAt?:string;dates?:string[];results?:{hotelId:string;status:string;error?:string|null}[]};
export function buildPriceWatch(history:Observation[],job:Job,scope:string,now=Date.now()){
 const sorted=history.filter(o=>(o.authScope||"anonymous")===scope).sort((a,b)=>Date.parse(b.capturedAt)-Date.parse(a.capturedAt));
 const dates=[...new Set(job.dates?.length?job.dates:sorted.map(o=>o.stayDate))].sort().slice(0,62);
 const rows=dates.flatMap(date=>monitorHotels.map(hotel=>{
  const records=sorted.filter(o=>o.hotelId===hotel.id&&o.stayDate===date);
  const latest=records[0],previous=records[1];
  const result=job.results?.find(r=>r.hotelId===hotel.id);
  const failed=!!job.finishedAt&&!!job.startedAt&&(!latest||Date.parse(latest.capturedAt)<Date.parse(job.startedAt));
  const stale=!!latest&&(now-Date.parse(latest.capturedAt)>6*60*60*1000);
  const available=!failed&&!stale&&latest?.status==="observed";
  const good=records.find(r=>r.status==="observed"&&r.amount!==null);
  return {hotelId:hotel.id,hotelName:hotel.name,stayDate:date,member:scope.startsWith("member:"),
   sourceUrl:`https://hotels.ctrip.com/hotels/${hotel.id}.html`,
   amount:available?latest.amount:null,status:failed?(result?.error||job.error||"not_collected"):stale?"stale":latest?.status||"missing",
   capturedAt:latest?.capturedAt||null,attemptAt:job.finishedAt||null,
   // Calendar references do not identify a sellable room plan. Never infer terms.
   conditions:{roomType:null,breakfast:null,cancellation:null,taxes:null,comparable:false} as const,
   change:available?compareObservations(latest,previous):null,
   lastGood:!available&&good?{amount:good.amount,capturedAt:good.capturedAt}:null,
   history:records.slice(0,12).map(r=>({amount:r.amount,status:r.status,capturedAt:r.capturedAt})),
  };
 }));
 return {dates,rows,status:job.status||"idle"};
}
export type PriceWatch=ReturnType<typeof buildPriceWatch>;
