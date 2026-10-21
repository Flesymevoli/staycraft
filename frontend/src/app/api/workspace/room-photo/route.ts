import { randomUUID } from "node:crypto";
import { boundedBody, requireSameOrigin, verifiedProperty, WorkspaceError, workspaceFailure } from "@/lib/workspace-access";
export const dynamic="force-dynamic";
const bucket="room-photos";
export async function POST(request:Request){
  try{
    requireSameOrigin(request);const {supabase,propertyId}=await verifiedProperty();
    const bytes=await boundedBody(request,262144);
    if(request.headers.get("content-type")!=="image/webp" || bytes.length<30 || new TextDecoder().decode(bytes.slice(0,4))!=="RIFF" || new TextDecoder().decode(bytes.slice(8,12))!=="WEBP")throw new WorkspaceError("invalid_image",400);
    const path=`${propertyId}/${randomUUID()}.webp`;
    const {error}=await supabase.storage.from(bucket).upload(path,bytes,{contentType:"image/webp",upsert:false});
    if(error)throw new WorkspaceError("photo_unavailable",503);
    return Response.json({path},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return workspaceFailure(error);}
}
export async function GET(request:Request){
  try{
    const {supabase,propertyId}=await verifiedProperty();const path=new URL(request.url).searchParams.get("path") || "";
    if(!path.startsWith(propertyId+"/") || !/^[a-f0-9-]{36}\/[a-f0-9-]{36}\.webp$/i.test(path))throw new WorkspaceError("photo_not_found",404);
    const {data,error}=await supabase.storage.from(bucket).download(path);
    if(error || !data)throw new WorkspaceError("photo_unavailable",404);
    return new Response(data,{headers:{"Content-Type":"image/webp","Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
  }catch(error){return workspaceFailure(error);}
}
