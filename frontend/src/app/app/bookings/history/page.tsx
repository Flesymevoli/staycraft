import {renderWorkspace} from "@/lib/workspace";

export const dynamic="force-dynamic";

export default async function BookingHistoryPage(){
 return renderWorkspace("work",undefined,{bookingHistory:true});
}
