// Isolated front-end fixtures. Never used to populate a formal account or database.
export type RevenueOrder={id:string;room:string;type:string;typeEn:string;arrival:string;departure:string;totalCents:number;status:"completed"|"confirmed"|"cancelled"};
const shift=(date:string,days:number)=>{const d=new Date(date+"T12:00:00Z");d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10)};
export function demoRevenueOrders(today:string):RevenueOrder[]{
 const month=today.slice(0,7),previous=new Date(month+"-01T12:00:00Z");previous.setUTCMonth(previous.getUTCMonth()-1);
 const orders:RevenueOrder[]=[];
 for(const m of [previous.toISOString().slice(0,7),month])for(const [index,day] of [1,3,5,8,11,14,17,20,23,26].entries()){
  const arrival=`${m}-${String(day).padStart(2,"0")}`,nights=index%3+1,departure=shift(arrival,nights);
  // Future fixture stays are omitted; completion is an explicit source status.
  if(departure>today)continue;
  orders.push({id:`demo-revenue-${m}-${day}`,room:index%2?"201":"101",type:index%2?"庭院双床房":"花园大床房",typeEn:index%2?"Courtyard twin":"Garden double",arrival,departure,totalCents:(index%2?58000:52000)*nights,status:"completed"});
  if(index%3===2)orders.push({id:`demo-revenue-family-${m}-${day}`,room:"202",type:"湖景家庭房",typeEn:"Lake family",arrival,departure:shift(arrival,1),totalCents:76000,status:"completed"});
 }
 orders.push({id:"demo-revenue-cancelled",room:"202",type:"湖景家庭房",typeEn:"Lake family",arrival:month+"-02",departure:month+"-04",totalCents:152000,status:"cancelled"});
 orders.push({id:"demo-revenue-upcoming",room:"103",type:"庭院双床房",typeEn:"Courtyard twin",arrival:today,departure:shift(today,2),totalCents:116000,status:"confirmed"});
 return orders;
}
export function revenueDays(month:string,orders:RevenueOrder[]){
 const count=new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5)),0)).getUTCDate();
 return Array.from({length:count},(_,index)=>{const date=`${month}-${String(index+1).padStart(2,"0")}`;
 const entries=orders.filter(order=>order.status==="completed"&&order.arrival<=date&&order.departure>date).map(order=>{const nights=Math.round((Date.parse(order.departure)-Date.parse(order.arrival))/86400000),night=Math.round((Date.parse(date)-Date.parse(order.arrival))/86400000);return {...order,cents:Math.floor(order.totalCents/nights)+(night<order.totalCents%nights?1:0)}});
 return {date,entries,cents:entries.reduce((sum,entry)=>sum+entry.cents,0)};
 });
}
