import {isDeepStrictEqual} from 'node:util';
import {prepareCtripBatch} from '@/lib/market/desktop-sync';
import {operatorSample} from '@/lib/operator-sample';
import {marketScopeNote} from '@/lib/market/snapshot-scope';
import {boundedBody,requireSameOrigin,verifiedProperty,WorkspaceError,workspaceFailure} from '@/lib/workspace-access';

export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};
const table='market_quote_batches';
const receipt='id,captured_at,window_start,window_end,quote_count';

async function syncAccount(){
 const account=await verifiedProperty();
 const demoEmail=process.env.DEMO_LOGIN_EMAIL?.trim().toLowerCase();
 const isolated=operatorSample()&&process.env.STAYCRAFT_QA_DESKTOP_SYNC==="1";
 if(!isolated&&(operatorSample()||demoEmail&&account.user.email?.toLowerCase()===demoEmail)){
  throw new WorkspaceError('market_sync_demo_disabled',403);
 }
 return account;
}

export async function GET(){
 try{
  const {propertyId,user}=await syncAccount();
  return Response.json({propertyId,userId:user.id},{headers});
 }catch(error){return workspaceFailure(error)}
}

export async function POST(request:Request){
 try{
  requireSameOrigin(request);
  const {supabase,propertyId,user}=await syncAccount();
  const bytes=await boundedBody(request,5_000_000);
  let body;
  try{body=JSON.parse(new TextDecoder().decode(bytes))}catch{throw new WorkspaceError('invalid_market_batch',400)}
  if(!body||typeof body!=='object'||Array.isArray(body))throw new WorkspaceError('invalid_market_batch',400);
  if(body.propertyId!==propertyId||body.userId!==user.id)throw new WorkspaceError('market_sync_account_changed',409);
  const batch=prepareCtripBatch(body.start,body.end,body.observations);
  if(!batch)throw new WorkspaceError('invalid_market_batch',400);

  const {data:details,error:profileError}=await supabase.from('property_details').select('profile').eq('property_id',propertyId).maybeSingle();
  if(profileError)throw new WorkspaceError('market_sync_unavailable',503);
  const location=typeof details?.profile?.location==='string'?details.profile.location:'';
  const inserted=await supabase.from(table).insert({...batch,property_id:propertyId,note:marketScopeNote(location)}).select(receipt).single();
  if(!inserted.error&&inserted.data)return Response.json({status:'saved',batch:inserted.data},{status:201,headers});
  if(inserted.error?.code!=='23505')throw new WorkspaceError('market_sync_unavailable',503);

  // The database unique key arbitrates concurrent retries. A duplicate never updates history.
  const {data,error}=await supabase.from(table).select('id,captured_at,window_start,window_end,quote_count,quotes')
   .eq('property_id',propertyId).eq('source',batch.source).eq('captured_at',batch.captured_at)
   .eq('window_start',batch.window_start).eq('window_end',batch.window_end).maybeSingle();
  if(error||!data)throw new WorkspaceError('market_sync_unavailable',503);
  const {quotes,...existing}=data;
  if(!isDeepStrictEqual(quotes,batch.quotes))throw new WorkspaceError('market_sync_batch_conflict',409);
  return Response.json({status:'already_saved',batch:existing},{headers});
 }catch(error){return workspaceFailure(error)}
}
