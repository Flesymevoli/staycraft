import {verifiedProperty,requireSameOrigin,boundedBody,WorkspaceError,workspaceFailure} from '@/lib/workspace-access';
import {validateInventory} from '@/lib/property-inventory';
import {isDemoWorkspace,operatorSample} from '@/lib/operator-sample';
import {buildMarketSample,ownPosition,describeSample} from '@/lib/market/sample';
import {marketDay,hotelKey} from '@/lib/market/quote-identity';
import {readSavedMarketSnapshot} from '@/lib/market/saved-snapshot';
import {readListDisplayPrices} from '@/lib/market/list-display-prices';
import demoListPrices from '@/lib/market/demo-list-prices.json';
import type {Quote} from '@/lib/market/types';
import {normalizeMarketLocation} from '@/lib/market/snapshot-scope';
export const dynamic='force-dynamic';
const DAY=86400000;
const isDay=marketDay;
// The market page reads an imported snapshot only. It never calls RollingGo or a browser here.
export async function POST(request:Request){try{
 requireSameOrigin(request);
 const {supabase,propertyId,user}=await verifiedProperty();
 const input=JSON.parse(new TextDecoder().decode(await boundedBody(request,500)));
 const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai'}).format(new Date());
 if(!isDay(input.start)||!isDay(input.end))throw new WorkspaceError('invalid_input',400);
 const demoAccount=isDemoWorkspace(user.email);
 if((input.start<today&&!demoAccount)||input.end<input.start)throw new WorkspaceError('invalid_input',400);
 const nights=Math.round((Date.parse(input.end)-Date.parse(input.start))/DAY);
 if(nights<0||nights>27)throw new WorkspaceError('invalid_input',400);
 const inventoryResult=await supabase.rpc('get_room_inventory',{p_property:propertyId});
 const inventory=inventoryResult.error?null:validateInventory(inventoryResult.data?.inventory,propertyId);
 const active=new Set(inventory?.rooms.filter(room=>room.active).map(room=>room.typeId));
 const rates=inventory?.types.filter(type=>active.has(type.id)).map(type=>type.price)||[];
 const ownRates=rates.length?{min:Math.min(...rates),max:Math.max(...rates)}:null;
 const demo=operatorSample();
 let window={start:input.start,end:input.end};

 const selectSnapshotWindow=(quotes:Quote[])=>{
  if(input.latestSnapshot!==true)return;
  const first=quotes.filter(quote=>quote.status==='available'&&quote.priceCny!==null).map(quote=>quote.stayDate).sort()[0];
  if(first)window={start:first,end:new Date(Date.parse(first)+6*DAY).toISOString().slice(0,10)};
 };
 const snapshot=await readSavedMarketSnapshot(supabase,propertyId,user.email);
 const profileResult=await supabase.from('property_details').select('profile').eq('property_id',propertyId).maybeSingle();
 const currentLocation=typeof profileResult.data?.profile?.location==='string'?normalizeMarketLocation(profileResult.data.profile.location):'';
 const locationStatus=!snapshot.capturedLocation?'unknown':currentLocation===normalizeMarketLocation(snapshot.capturedLocation)?'matched':'changed';
 if(demoAccount)selectSnapshotWindow(snapshot.quotes);
 const quotes=snapshot.quotes.filter(quote=>quote.stayDate>=window.start&&quote.stayDate<=window.end&&(demoAccount||quote.stayDate>=today));
 const sample=buildMarketSample({quotes,window});
 const localCollection=snapshot.status==='collected'||'localCollection' in snapshot;
 const dataMode=localCollection||snapshot.status==='imported'&&demoAccount?'collected_ctrip_snapshot':demo?'fictional_demo':'live';
 const provider=localCollection?'ctrip_local_collection':snapshot.status==='fictional'?'demo_manual':'imported_snapshot';
 return Response.json({sample,position:quotes.length?ownPosition(sample,ownRates):null,ownRates,description:describeSample(sample),dataMode,provider,
  ...(demoAccount?{listDisplayPrices:(demo ? readListDisplayPrices(window.start) : null)
    ?? demoListPrices[window.start as keyof typeof demoListPrices] ?? null}:{}),
  snapshot:{status:snapshot.status,capturedAt:snapshot.capturedAt,locationStatus,...('batchWindow' in snapshot?{batchWindow:snapshot.batchWindow}:{}),hotels:new Set(quotes.map(hotelKey)).size,nights:new Set(quotes.map(quote=>quote.stayDate)).size}},
  {headers:{'Cache-Control':'no-store'}});
 }catch(e){return workspaceFailure(e)}}
