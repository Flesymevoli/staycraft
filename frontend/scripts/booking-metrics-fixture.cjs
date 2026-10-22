// Mirrors the RPC contract for isolated UI testing, not a production data source.
module.exports=function metrics(inventory,bookings,days,anchor){
 const rooms=inventory.rooms,active=rooms.filter(r=>r.active),capacity=active.length;
 const day=offset=>{const d=new Date(anchor+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+offset);return d.toISOString().slice(0,10)};
 let inactive=0;
 const daily=Array.from({length:days},(_,index)=>{
  const date=day(index),ids=new Set(bookings.filter(b=>b.status==='confirmed'&&b.arrival<=date&&b.departure>date).map(b=>b.room_id));
  const booked=active.filter(r=>ids.has(r.id)).length;inactive+=rooms.filter(r=>!r.active&&ids.has(r.id)).length;
  return {date,booked,capacity,available:capacity-booked,booked_pct:capacity?Math.round(booked*1000/capacity)/10:null};
 });
 const booked=daily.reduce((sum,d)=>sum+d.booked,0),prices=inventory.types.filter(t=>active.some(r=>r.typeId===t.id)).map(t=>t.price);
 return {source:'direct_bookings',as_of:anchor,period_days:days,period_start:anchor,period_end:day(days-1),active_rooms:capacity,capacity_room_nights:capacity*days,booked_room_nights:booked,inactive_booked_room_nights:inactive,available_room_nights:capacity*days-booked,booked_pct:capacity?Math.round(booked*1000/(capacity*days))/10:null,daily,rate_min:prices.length?Math.min(...prices):null,rate_max:prices.length?Math.max(...prices):null};
};
