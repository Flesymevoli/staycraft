import {bookingPeriod} from '@/lib/booking-period';
import {amapAddress,amapCoordinates,amapPoint,validCoordinates} from '@/lib/amap-nearby';
import {searchConfigured} from '@/lib/local-discovery';
import {validateProfile} from '@/lib/property-profile';
import {collectEvents,EVENT_RADIUS_KM} from '@/lib/signals/events';
import {fetchEvents} from '@/lib/signals/official-events';
import {propertyPoint} from '@/lib/property-location';
import {normalizeMarketLocation} from '@/lib/market/snapshot-scope';
import {desktopSignalsEnabled,readDesktopEvents} from '@/lib/desktop-external-signals';
import {isDemoWorkspace} from '@/lib/operator-sample';
import {boundedBody,requireSameOrigin,verifiedProperty,WorkspaceError,workspaceFailure} from '@/lib/workspace-access';

export const dynamic='force-dynamic';

function serviceError(error:unknown){
 if(error instanceof Error&&['amap_unavailable','amap_location_unknown','search_busy','search_unavailable','invalid_search_response'].includes(error.message))return error.message;
 return 'service_unavailable';
}

export async function POST(request:Request){
 try{
  requireSameOrigin(request);
  const account=await verifiedProperty();
  const {supabase,propertyId,user}=account;
  let input:Record<string,unknown>;
  try{input=JSON.parse(new TextDecoder().decode(await boundedBody(request,1000)))}catch{throw new WorkspaceError('invalid_input',400)}
  if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>!['start','end','coordinates'].includes(key)))throw new WorkspaceError('invalid_input',400);
  const period=bookingPeriod({start:input.start,end:input.end});
  if(!period?.start||!period.end||input.coordinates!==undefined&&!validCoordinates(input.coordinates))throw new WorkspaceError('invalid_input',400);
  const {start,end}=period;
  const coordinates=input.coordinates;
  const stored=await supabase.from('property_details').select('profile').eq('property_id',propertyId).maybeSingle();
  if(stored.error)throw new WorkspaceError('profile_unavailable',503);
  const location=validateProfile(stored.data?.profile)?.location||'';
  if(!location&&!coordinates)throw new WorkspaceError('property_location_required',422);

  if(!coordinates&&desktopSignalsEnabled()&&!isDemoWorkspace(user.email)){
   const {events,source:eventSource}=await readDesktopEvents({account,location,start,end,signal:request.signal});
   return Response.json({location,start,end,center:'property',events,eventSource,eventRadiusKm:EVENT_RADIUS_KM,provider:'official_calendar',searchedAt:new Date().toISOString()},{headers:{'Cache-Control':'no-store'}});
  }

  let point:ReturnType<typeof amapPoint>=null,geocodeError:string|undefined;
  let searchLocation=coordinates?'':location;
  if(coordinates){
   point=amapPoint(amapCoordinates(coordinates.latitude,coordinates.longitude));
   if(!isDemoWorkspace(user.email)&&searchConfigured()){
    try{searchLocation=await amapAddress(coordinates,request.signal)}catch{/* Keep coordinate-based calendars when the current area is unknown. */}
   }
  }else{
   try{point=await propertyPoint(location,user?.email,request.signal)}catch(error){geocodeError=serviceError(error)}
  }

  const eventInput={window:{start,end},scope:{center:point}};
  const {events,source:eventSource}=isDemoWorkspace(user.email)?collectEvents(eventInput):await fetchEvents({...eventInput,location:searchLocation,resolveVenue:(address,signal)=>propertyPoint(address,undefined,signal),signal:request.signal});
  if(!coordinates){
   const latest=await supabase.from('property_details').select('profile').eq('property_id',propertyId).maybeSingle();
   if(latest.error)throw new WorkspaceError('profile_unavailable',503);
   if(normalizeMarketLocation(validateProfile(latest.data?.profile)?.location||'')!==normalizeMarketLocation(location))throw new WorkspaceError('property_location_changed',409);
  }
  const context={
   location:coordinates?searchLocation||'当前位置':location,start,end,center:coordinates?'current':'property',
   events,eventSource,eventRadiusKm:EVENT_RADIUS_KM,
  };
  const headers={'Cache-Control':'no-store'};
  if(!point)return Response.json({...context,error:geocodeError??'amap_location_unknown'},{status:503,headers});
  return Response.json({...context,provider:'official_calendar',searchedAt:new Date().toISOString()},{headers});
 }catch(error){return workspaceFailure(error)}
}
