// Mirrors the RPC contract for isolated UI testing, not a production data source.
module.exports=function metrics(inventory,bookings,days,anchor){
 const rooms=inventory.rooms,active=rooms.filter(r=>r.active),capacity=active.length;
 const day=offset=>{const d=new Date(anchor+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+offset);return d.toISOString().slice(0,10)};
 let inactive=0;
 const daily=Array.from({length:days},(_,index)=>{
  const date=day(index),ids=new Set(bookings.filter(b=>b.status==='confirmed'&&b.arrival<=date&&b.departure>date).map(b=>b.room_id));
  const booked=active.filter(r=>ids.has(r.id)).length;inactive+=rooms.filter(r=>!r.active&&ids.has(r.id)).length;
  const entries=bookings.filter(b=>b.status==='confirmed'&&b.stay_state!=='completed'&&b.arrival<=date&&b.departure>date&&active.some(r=>r.id===b.room_id));
  const amount=entries.reduce((sum,b)=>{const nights=Math.round((Date.parse(b.departure)-Date.parse(b.arrival))/86400000),index=Math.round((Date.parse(date)-Date.parse(b.arrival))/86400000),total=Math.round(Number(b.total)*100);return sum+Math.floor(total/nights)+(index<total%nights?1:0)},0);
  return {date,booked,capacity,amount_cents:amount,order_room_nights:entries.length,available:capacity-booked,booked_pct:capacity?Math.round(booked*1000/capacity)/10:null};
 });
 const booked=daily.reduce((sum,d)=>sum+d.booked,0),prices=inventory.types.filter(t=>active.some(r=>r.typeId===t.id)).map(t=>t.price);
 const amount=daily.reduce((s,d)=>s+d.amount_cents,0),orderNights=daily.reduce((s,d)=>s+d.order_room_nights,0);
 return {amount_cents:amount,booked_order_room_nights:orderNights,average_booked_rate_cents:orderNights?Math.round(amount/orderNights):null,amount_per_capacity_night_cents:capacity?Math.round(amount/(capacity*days)):null,overlapping_order_room_nights:orderNights-booked,source:'direct_bookings',as_of:anchor,period_days:days,period_start:anchor,period_end:day(days-1),active_rooms:capacity,capacity_room_nights:capacity*days,booked_room_nights:booked,inactive_booked_room_nights:inactive,available_room_nights:capacity*days-booked,booked_pct:capacity?Math.round(booked*1000/(capacity*days))/10:null,daily,rate_min:prices.length?Math.min(...prices):null,rate_max:prices.length?Math.max(...prices):null};
};
