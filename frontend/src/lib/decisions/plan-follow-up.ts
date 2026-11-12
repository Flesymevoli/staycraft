import type {SupabaseClient} from '@supabase/supabase-js';
import type {BookingMetrics} from '@/components/booking-metrics';
import {demoMetrics} from '@/lib/demo-period';
import {bookingPeriod} from '@/lib/booking-period';
import {comparePlanValue} from './action-plan';
import type {ActionPlan} from './types';

export async function readPlanFollowUp(db:SupabaseClient,propertyId:string,plan:ActionPlan,options:{demo:boolean;today:string;signal:AbortSignal}){
 const {window,name}=plan.metricBaseline;
 const period=window&&bookingPeriod(window);
 if(options.today<plan.followUpAt)return {state:'insufficient' as const,detail:`计划安排于 ${plan.followUpAt} 跟进，届时可对照最新订单回看。`};
 if(!period||period.days>60||!window)return comparePlanValue(plan,null);
 const signal=AbortSignal.any([options.signal,AbortSignal.timeout(5000)]);
 let value:number|null=null;
 if(name==='cancellation_rate'||name==='top_channel_share'){
  const orders: {id:string;status:string;external_channel:string|null}[]=[];
  const ids=new Set<string>();
  let total:number|null=null;
  for(let offset=0;offset<10000;offset+=500){
   const {data,error,count}=await db.from('direct_bookings').select('id,status,external_channel',{count:'exact'})
    .eq('property_id',propertyId).gte('arrival',window.start).lte('arrival',window.end).order('id').range(offset,offset+499).abortSignal(signal);
   if(error||!data||count===null||count>10000||total!==null&&total!==count)return comparePlanValue(plan,null);
   total=count;
   for(const row of data){
    if(ids.has(row.id))return comparePlanValue(plan,null);
    ids.add(row.id);orders.push(row);
   }
   if(orders.length===total)break;
   if(data.length!==500)return comparePlanValue(plan,null);
  }
  if(orders.length!==total||orders.length<5)return comparePlanValue(plan,null);
  if(name==='cancellation_rate')value=Math.round(orders.filter(row=>row.status==='cancelled').length/ orders.length*1000)/10;
  else{
   const shares=new Map<string,number>();
   if(orders.length>=5){
    for(const row of orders){
     const channel=row.external_channel||'direct';
     shares.set(channel,(shares.get(channel)||0)+1);
    }
    value=Math.round(Math.max(...shares.values())/orders.length*1000)/10;
   }
  }
 }else{
  const {data,error}=await db.rpc('get_booking_metrics_range',{p_property:propertyId,p_start:window.start,p_end:window.end}).abortSignal(signal);
  if(error||!data||data.period_start!==window.start||data.period_end!==window.end||
   !Array.isArray(data.daily)||data.daily.length!==period.days||
   data.daily.some((row:BookingMetrics['daily'][number],index:number)=>
    row.date!==new Date(Date.parse(window.start)+index*86400000).toISOString().slice(0,10)))return comparePlanValue(plan,null);
  const metrics:BookingMetrics=options.demo?demoMetrics(data):data;
  if(name==='average_price'||name==='room_nights'){
   const nights=metrics.daily.reduce((sum,row)=>sum+row.booked,0);
   if(name==='room_nights')value=nights;
   else if(nights&&metrics.daily.every(row=>row.amount_cents!=null))
    value=Math.round(metrics.daily.reduce((sum,row)=>sum+row.amount_cents!,0)/nights)/100;
  }else if(!metrics.historical_inventory_unknown&&metrics.daily.every(row=>row.capacity>0)){
   if(name==='booked_pct')value=metrics.booked_pct;
   if(name==='consecutive_open_nights'){
    let longest=0,current=0;
    for(const row of metrics.daily){current=row.available>0?current+1:0;longest=Math.max(longest,current);}
    value=longest;
   }
  }
 }
 return comparePlanValue(plan,value);
}
