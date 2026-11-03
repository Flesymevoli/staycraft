import type {BookingMetrics} from '@/components/booking-metrics';
export type BookingMetric='occupancy'|'booking'|'amount'|'adr';
export function bookingChartValues(data:BookingMetrics,metric:BookingMetric){
 return data.daily.map(day=>{
  if(metric==='occupancy')return day.booked_pct;
  if(metric==='booking')return data.historical_inventory_unknown?day.order_room_nights??null:day.booked;
  if(metric==='amount')return day.amount_cents===undefined?null:day.amount_cents/100;
  return day.amount_cents!==undefined&&day.order_room_nights?day.amount_cents/day.order_room_nights/100:null;
 });
}
export function chartMaximum(values:(number|null)[],metric:BookingMetric){
 const max=Math.max(0,...values.filter((v):v is number=>v!==null&&Number.isFinite(v)));
 if(metric==='occupancy')return Math.max(100,Math.ceil(max/50)*50);
 if(!max)return metric==='booking'?2:1;
 const power=10**Math.floor(Math.log10(max)),scale=max/power;
 const ceiling=(scale<=1?1:scale<=2?2:scale<=5?5:10)*power;
 return metric==='booking'?Math.max(2,Math.ceil(ceiling/2)*2):ceiling;
}
