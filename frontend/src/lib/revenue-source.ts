import type {RevenueOrder} from "./revenue-preview";
export function monthBounds(month:string){
 if(!/^(20[0-9]{2})-(0[1-9]|1[0-2])$/.test(month))throw new Error("invalid_month");
 const next=new Date(month+"-01T00:00:00Z");next.setUTCMonth(next.getUTCMonth()+1);
 return {start:month+"-01",end:next.toISOString().slice(0,10)};
}
export function completedRevenueOrder(row:Record<string,unknown>):RevenueOrder{
 const date=(v:unknown)=>typeof v==="string"&&/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(v)&&new Date(v+"T00:00:00Z").toISOString().slice(0,10)===v;
 const amount=String(row.total);if(!/^[0-9]{1,10}(?:[.][0-9]{1,2})?$/.test(amount))throw new Error("invalid_amount");
 const [whole,fraction=""]=amount.split("."),totalCents=Number(whole)*100+Number(fraction.padEnd(2,"0"));
 if(row.status!=="confirmed"||row.stay_state!=="completed"||!date(row.arrival)||!date(row.departure)||String(row.arrival)>=String(row.departure)||Date.parse(String(row.departure))-Date.parse(String(row.arrival))>30*86400000||!Number.isSafeInteger(totalCents)||totalCents<=0||typeof row.id!=="string"||typeof row.room_number!=="string"||typeof row.type_name!=="string")throw new Error("invalid_revenue_order");
 return {id:row.id,room:row.room_number,type:row.type_name,typeEn:row.type_name,arrival:String(row.arrival),departure:String(row.departure),totalCents,status:"completed"};
}
