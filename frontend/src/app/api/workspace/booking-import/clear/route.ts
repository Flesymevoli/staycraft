import {boundedBody,requireSameOrigin,writableProperty,WorkspaceError,workspaceFailure} from '@/lib/workspace-access';

export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};

async function clear(commit:boolean,revision:string|null){
 const {supabase,propertyId}=await writableProperty();
 const {data,error}=await supabase.rpc('clear_imported_booking_data',{p_property:propertyId,p_commit:commit,p_revision:revision}).abortSignal(AbortSignal.timeout(20000));
 if(error){
  if(error.message.includes('import_changed'))throw new WorkspaceError('import_changed',409);
  if(error.message.includes('demo_read_only'))throw new WorkspaceError('demo_read_only',403);
  throw new WorkspaceError('clear_import_unavailable',503);
 }
 return Response.json(data,{headers});
}
export async function GET(){try{return await clear(false,null)}catch(error){return workspaceFailure(error)}}
export async function DELETE(request:Request){try{
 requireSameOrigin(request);
 let input;try{input=JSON.parse(new TextDecoder().decode(await boundedBody(request,500)))}catch{throw new WorkspaceError('invalid_input',400)}
 if(input?.confirmation!=='CLEAR_IMPORTED_BOOKINGS'||typeof input.revision!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(input.revision))throw new WorkspaceError('invalid_input',400);
 return await clear(true,input.revision);
}catch(error){return workspaceFailure(error)}}
