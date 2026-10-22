import {GuestClient} from "@/components/guest-client";
import {CloudGuestClient} from "@/components/cloud-guest-client";
export default async function Page({searchParams}:{searchParams:Promise<{property?:string;room?:string;arrival?:string;departure?:string;order?:string}>}){
 const params=await searchParams;
 if(params.property&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(params.property))return <CloudGuestClient property={params.property} view="contact" roomId={params.room} initialArrival={params.arrival} initialDeparture={params.departure}/>;
 return <GuestClient view="contact" bookingParams={params} orderId={params.order}/>;
}
