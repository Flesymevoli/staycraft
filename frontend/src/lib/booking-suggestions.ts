import type {BookingMetrics} from "@/components/booking-metrics";
export function bookingSuggestions(data:BookingMetrics){
 const quietest=data.daily.filter(day=>day.capacity>0).reduce<BookingMetrics["daily"][number]|null>((best,day)=>!best||day.available>best.available?day:best,null);
 return {quietest:data.available_room_nights>0?quietest:null,hasInactive:data.inactive_booked_room_nights>0,needsRooms:data.active_rooms===0,fullyBooked:data.capacity_room_nights>0&&data.available_room_nights===0};
}
