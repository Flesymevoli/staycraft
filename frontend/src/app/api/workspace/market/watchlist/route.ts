// Owner-facing monitor list: read the list, refresh it, replace one hotel, or remove one.
// Demo mode keeps the list in memory for the session; a live account persists to
// competitor_watches and degrades to an explicit "not initialised" state when the table is absent.
import {verifiedProperty,writableProperty,requireSameOrigin,boundedBody,WorkspaceError,workspaceFailure} from '@/lib/workspace-access';
import {operatorSample} from '@/lib/operator-sample';
import {demoQuotes} from '@/lib/market/demo-quotes';
import {demoWatchlist,replaceAll,replaceOne,removeWatch,pickCandidates,WATCH_LIMIT,type Watch,type Candidate} from '@/lib/market/watchlist';
import {searchCandidates} from '@/lib/market/rollinggo';
import type {SupabaseClient} from '@supabase/supabase-js';
export const dynamic='force-dynamic';

const memory=new Map<string,Watch[]>();
const today=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai'}).format(new Date());
const DAY=86400000;
const shift=(day:string,offset:number)=>new Date(Date.parse(day+'T00:00:00Z')+offset*DAY).toISOString().slice(0,10);

export async function GET(request:Request){try{
 requireSameOrigin(request);
 const {supabase,propertyId}=await verifiedProperty();
 const demo=operatorSample();
 const url=new URL(request.url);
 const start=url.searchParams.get('start')||shift(today(),3);
 const end=url.searchParams.get('end')||shift(start,2);
 if(demo){
  const watches=memory.get(propertyId)||demoWatchlist();
  const quotes=demoQuotes(today()).filter(quote=>quote.stayDate>=start&&quote.stayDate<=end);
  return Response.json({watches,quotes,storage:'memory',dataMode:'fictional_demo',limit:WATCH_LIMIT},{headers:{'Cache-Control':'no-store'}});
 }
 const {data,error}=await supabase.from('competitor_watches').select('id,hotel_id,hotel_name,room_class,source,status,added_at,retired_at').eq('property_id',propertyId).eq('status','active').order('added_at');
 if(error){
  if(/does not exist|42P01|relation/i.test(error.message||''))return Response.json({watches:[],storage:'uninitialised',dataMode:'live',limit:WATCH_LIMIT},{headers:{'Cache-Control':'no-store'}});
  throw new WorkspaceError('watchlist_unavailable',503);
 }
 const watches=(data||[]).map(row=>({id:row.id,hotelId:row.hotel_id?Number(row.hotel_id):null,name:row.hotel_name,roomClass:row.room_class||undefined,source:row.source,status:row.status,addedAt:row.added_at}));
 return Response.json({watches,quotes:[],storage:'database',dataMode:'live',limit:WATCH_LIMIT},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return workspaceFailure(e)}}

export async function POST(request:Request){try{
 requireSameOrigin(request);
 const {supabase,propertyId}=await writableProperty();
 const input=JSON.parse(new TextDecoder().decode(await boundedBody(request,2000)));
 const action=typeof input.action==='string'?input.action:'';
 const demo=operatorSample();
 let current:Watch[];
 if(demo)current=memory.get(propertyId)||demoWatchlist();
 else{
  const {data,error}=await supabase.from('competitor_watches')
   .select('id,hotel_id,hotel_name,room_class,source,status,added_at,retired_at').eq('property_id',propertyId);
  if(error)throw new WorkspaceError('watchlist_unavailable',503);
  current=(data??[]).map(row=>({id:row.id,hotelId:row.hotel_id?Number(row.hotel_id):null,name:row.hotel_name,
   roomClass:row.room_class||undefined,source:row.source,status:row.status,addedAt:row.added_at,retiredAt:row.retired_at||undefined}));
 }
 const now=new Date().toISOString();

 const candidatePool=async():Promise<Candidate[]>=>{
  if(demo)return demoWatchlist(now).map(watch=>({hotelId:null,name:watch.name,star:null,roomClass:watch.roomClass}));
  const found=await searchCandidates({place:typeof input.place==='string'&&input.place?input.place:await placeOf(supabase,propertyId),start:shift(today(),3),nights:1,size:12});
  return found.map(item=>({hotelId:item.hotelId,name:item.name,star:item.star,priceCny:item.priceCny}));
 };
 const persist=async(next:Watch[])=>{
  if(demo){memory.set(propertyId,next);return {watches:next,storage:'memory'};}
  const previouslyActive=new Set(current.filter(watch=>watch.status==='active').map(watch=>watch.id));
  const retired=next.filter(watch=>watch.status==='retired'&&previouslyActive.has(watch.id));
  const active=next.filter(watch=>watch.status==='active'&&watch.id.startsWith('new-'));
  const {data,error}=await supabase.rpc('update_competitor_watchlist',{
   p_property:propertyId,p_expected:[...previouslyActive],p_retire:retired.map(watch=>watch.id),
   p_add:active.map(watch=>({hotel_id:String(watch.hotelId??watch.name),hotel_name:watch.name,room_class:watch.roomClass||null,source:watch.source})),
  }).abortSignal(AbortSignal.timeout(5000));
  if(error?.code==='40001')throw new WorkspaceError('watchlist_conflict',409);
  if(error||!Array.isArray(data))throw new WorkspaceError('watchlist_write_failed',503);
  const watches=data.map(row=>({id:row.id,hotelId:row.hotel_id&&/^\d+$/.test(row.hotel_id)?Number(row.hotel_id):null,
   name:row.hotel_name,roomClass:row.room_class||undefined,source:row.source,status:row.status,addedAt:row.added_at}));
  return {watches,storage:'database'};
 };

 if(action==='refresh'){
  const pool=await candidatePool();
  const next=replaceAll(current,pickCandidates(pool,current,WATCH_LIMIT),now);
  return Response.json({...await persist(next),changed:'all',note:'整批更换：旧名单已停用，趋势从今天重新计算'});
 }
 if(action==='replaceOne'){
  const target=current.find(watch=>watch.status==='active'&&watch.id===input.watchId);
  if(!target)throw new WorkspaceError('watch_not_found',404);
  const pool=await candidatePool();
  const replacement=pickCandidates(pool,current,1)[0];
  if(!replacement)throw new WorkspaceError('watch_candidate_required',409);
  const next=replaceOne(current,target,replacement,now);
  return Response.json({...await persist(next),changed:'one',note:'仅替换这一家，其余四家继续可比'});
 }
 if(action==='remove'){
  const target=current.find(watch=>watch.status==='active'&&watch.id===input.watchId);
  if(!target)throw new WorkspaceError('watch_not_found',404);
  const next=removeWatch(current,target,now);
  return Response.json({...await persist(next),changed:'one'});
 }
 throw new WorkspaceError('invalid_input',400);
 }catch(e){return workspaceFailure(e)}}

async function placeOf(supabase:SupabaseClient,propertyId:string):Promise<string>{
 const {data}=await supabase.from('property_details').select('profile').eq('property_id',propertyId).maybeSingle();
 const location=(data?.profile as {location?:string}|undefined)?.location;
 if(!location)throw new WorkspaceError('property_location_required',422);
 return location.replace(/（[^）]*虚构[^）]*）/g,'').replace(/周边$/,'').trim();
}
