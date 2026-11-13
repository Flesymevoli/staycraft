import {boundedBody,requireSameOrigin,verifiedProperty,WorkspaceError,workspaceFailure} from '@/lib/workspace-access';
export const dynamic='force-dynamic';
export async function POST(request:Request){try{
 if(process.env.STAYCRAFT_DESKTOP_DEMO!=='1'||process.env.STAYCRAFT_DESKTOP_GUIDED_DEMO!=='1')throw new WorkspaceError('not_found',404);
 requireSameOrigin(request);const {supabase}=await verifiedProperty();
 const input=JSON.parse(new TextDecoder().decode(await boundedBody(request,1000)));
 if(!['state','profile','import','collect','finish'].includes(input.action))throw new WorkspaceError('invalid_input',400);
 const {data,error}=await supabase.rpc('desktop_demo_journey',{action:input.action}).abortSignal(AbortSignal.timeout(20000));
 if(error)throw new WorkspaceError('demo_step_failed',409);
 return Response.json(data,{headers:{'Cache-Control':'no-store'}});
}catch(error){return workspaceFailure(error)}}
