import {bookingCsvHeader,previewBookingCsv} from "@/lib/booking-csv";
import {isDemoWorkspace} from "@/lib/operator-sample";
import {boundedBody,requireSameOrigin,verifiedProperty,writableProperty,WorkspaceError,workspaceFailure} from "@/lib/workspace-access";
export const dynamic="force-dynamic";
// Preview and confirmed writes share an owner-checked PostgreSQL transaction.
export async function GET(request:Request){try{
 const {supabase,propertyId}=await verifiedProperty();
 if(new URL(request.url).searchParams.get('view')==='state'){
  const [batches,tasks]=await Promise.all([supabase.from('booking_import_batches').select('*').eq('property_id',propertyId).order('imported_at',{ascending:false}).limit(10),supabase.from('booking_import_tasks').select('id,booking_id,kind,scheduled_on,completed_at,booking:direct_bookings(external_channel,external_id,room_number,type_name)').eq('property_id',propertyId).eq('withdrawn',false).is('completed_at',null).order('scheduled_on').limit(200)]);
  if(batches.error||tasks.error)throw new WorkspaceError('import_setup_required',503);
  return Response.json({batches:batches.data,tasks:tasks.data},{headers:{'Cache-Control':'no-store'}});
 }
 return new Response('\uFEFF'+bookingCsvHeader+'\r\n',{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":"attachment; filename=staycraft-booking-template.csv","Cache-Control":"no-store"}});
}catch(error){return workspaceFailure(error)}}
export async function POST(request:Request){try{
 requireSameOrigin(request);const {supabase,propertyId,user}=await verifiedProperty();
 if(isDemoWorkspace(user.email))throw new WorkspaceError('booking_import_demo_disabled',403);
 const bytes=await boundedBody(request,1100000);
 let text:string;try{text=new TextDecoder('utf-8',{fatal:true}).decode(bytes)}catch{throw new WorkspaceError('utf8_required',400)}
 let commit=false,revision:string|null=null,confirm=false;
 if(request.headers.get('content-type')?.startsWith('application/json')){
  let payload;try{payload=JSON.parse(text)}catch{throw new WorkspaceError('invalid_input',400)}
  if(!payload||typeof payload.csv!=='string'||typeof payload.commit!=='boolean'||(payload.confirmUnversioned!==undefined&&typeof payload.confirmUnversioned!=='boolean')||(payload.commit&&!/^[a-f0-9-]{36}$/.test(payload.revision||'')))throw new WorkspaceError('invalid_input',400);
  text=payload.csv;commit=payload.commit;revision=payload.revision||null;confirm=payload.confirmUnversioned===true;
 }else if(!request.headers.get('content-type')?.startsWith('text/csv'))throw new WorkspaceError('csv_required',415);
 try{
  const preview=previewBookingCsv(text);
  if(!preview.canCommit)return Response.json({...preview,saved:false},{headers:{'Cache-Control':'no-store'}});
  const {data,error}=await supabase.rpc('process_booking_import',{p_property:propertyId,p_rows:preview.valid.map(v=>v.booking),p_commit:commit,p_revision:revision,p_confirm_unversioned:confirm});
  if(error){const code=['import_changed','room_type_unmatched','room_unmatched','manual_stay_conflict','stale_source','confirm_unversioned','invalid_row','room_date_conflict'].find(c=>error.message.includes(c));throw new WorkspaceError(code||'import_unavailable',code?409:503)}
  return Response.json({...preview,...data},{headers:{"Cache-Control":"no-store"}});
 }catch(error){
  const code=error instanceof Error?error.message:'';
  if(['file_too_large','invalid_csv_quotes','invalid_template','too_many_rows','invalid_columns'].includes(code))throw new WorkspaceError(code,400);
  throw error;
 }
}catch(error){return workspaceFailure(error)}}
export async function PUT(request:Request){try{
 requireSameOrigin(request);const {supabase,propertyId}=await writableProperty();
 let input;try{input=JSON.parse(new TextDecoder().decode(await boundedBody(request,1000)))}catch{throw new WorkspaceError('invalid_input',400)}
 if(!input||typeof input.task!=='string'||!/^[a-f0-9-]{36}$/.test(input.task))throw new WorkspaceError('invalid_input',400);
 const {error}=await supabase.rpc('complete_import_task',{p_property:propertyId,p_task:input.task});
 if(error)throw new WorkspaceError('task_changed',409);
 return Response.json({completed:true},{headers:{'Cache-Control':'no-store'}});
}catch(error){return workspaceFailure(error)}}
