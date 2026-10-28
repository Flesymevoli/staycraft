export type BookingRange={start:string;end:string};
export function bookingPeriod(input:{days?:unknown;start?:unknown;end?:unknown}){
 if(input.start!==undefined||input.end!==undefined){
  const {start,end}=input;
  const valid=(v:unknown):v is string=>typeof v==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&v>="2000-01-01"&&v<="2100-12-31"&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
  if(!valid(start)||!valid(end))return null;
  const days=(Date.parse(end)-Date.parse(start))/86400000+1;
  if(days<1||days>366)return null;
  return {days,start,end,rpc:"get_booking_metrics_range",args:{p_start:start,p_end:end}};
 }
 const days=Number(input.days??7);
 if(days!==7&&days!==28)return null;
 return {days,start:undefined,end:undefined,rpc:"get_booking_metrics",args:{p_days:days}};
}
