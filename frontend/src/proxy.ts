import {NextResponse,type NextRequest} from "next/server";
import {updateSession} from "@/lib/supabase/proxy";
import {isHosted} from "@/lib/deployment";
export async function proxy(request:NextRequest){
 const path=request.nextUrl.pathname;
 if(isHosted()){
  const prototype=path.startsWith("/native-")||path==="/legacy"||path.endsWith(".html")||path.startsWith("/api/demo/")||path.startsWith("/api/local/");
  const guest=path==="/guest"||path.startsWith("/guest/");const property=request.nextUrl.searchParams.get("property")||"";
  if(prototype||(guest&&!/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(property)))return new NextResponse(null,{status:404,headers:{"Cache-Control":"no-store"}});
 }
 if(path==="/app"||path.startsWith("/app/")||path==="/login"||path.startsWith("/api/workspace/")){const response=await updateSession(request);response.headers.set("Cache-Control","private, no-store");return response;}
 return NextResponse.next();
}
export const config={matcher:["/((?!_next/static|_next/image|favicon.ico).*)"]};
