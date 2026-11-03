import {bookingPeriod} from '@/lib/booking-period';
import {searchConfigured,searchLocal} from '@/lib/local-discovery';
import {operatorSample} from '@/lib/operator-sample';
import {nearbyPlaces,validCoordinates} from '@/lib/amap-nearby';
import {validateProfile} from '@/lib/property-profile';
import {boundedBody,requireSameOrigin,verifiedProperty,WorkspaceError,workspaceFailure} from '@/lib/workspace-access';
export const dynamic='force-dynamic';
export async function POST(request:Request){try{
 requireSameOrigin(request);const {supabase,propertyId}=await verifiedProperty();let input;
 try{input=JSON.parse(new TextDecoder().decode(await boundedBody(request,1000)))}catch{throw new WorkspaceError('invalid_input',400)}
 if(!input||Object.keys(input).some(k=>!['start','end','coordinates'].includes(k))||!bookingPeriod({start:input.start,end:input.end})||input.coordinates!==undefined&&!validCoordinates(input.coordinates))throw new WorkspaceError('invalid_input',400);
 const stored=await supabase.from('property_details').select('profile').eq('property_id',propertyId).maybeSingle();
 if(stored.error)throw new WorkspaceError('profile_unavailable',503);
 const profile=validateProfile(stored.data?.profile),location=profile?.location;
 if(!location&&!input.coordinates)throw new WorkspaceError('property_location_required',422);
 const context={location:input.coordinates?'当前位置':location,start:input.start,end:input.end};
 if(process.env.AMAP_MAPS_API_KEY&&(!operatorSample()||process.env.STAYCRAFT_SAMPLE_LIVE_AMAP==='1')){
  const places=await nearbyPlaces(location||'',input.coordinates,request.signal);
  return Response.json({...context,places,provider:'amap',searchedAt:new Date().toISOString()},{headers:{'Cache-Control':'no-store'}});
 }
 if(operatorSample()||!searchConfigured())return Response.json({...context,error:'search_not_configured'},{status:503,headers:{'Cache-Control':'no-store'}});
 const results=await searchLocal(location||'',input.start,input.end,{signal:request.signal});
 return Response.json({...context,results,searchedAt:new Date().toISOString()},{headers:{'Cache-Control':'no-store'}});
}catch(error){if(error instanceof Error&&['amap_unavailable','amap_location_unknown','search_busy','search_unavailable','invalid_search_response'].includes(error.message))return workspaceFailure(new WorkspaceError(error.message,503));return workspaceFailure(error)}}
