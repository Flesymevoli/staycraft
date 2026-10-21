import {notFound} from "next/navigation";
import {renderWorkspace} from "@/lib/workspace";
export const dynamic="force-dynamic";
export default async function RoomPage({params}:{params:Promise<{roomId:string}>}){
  const {roomId}=await params;if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(roomId))notFound();
  return renderWorkspace("work",roomId);
}
