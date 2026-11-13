import {verifiedProperty,requireSameOrigin,boundedBody,WorkspaceError,workspaceFailure} from '@/lib/workspace-access';
import {validateProfile} from '@/lib/property-profile';
import {bookingPeriod} from '@/lib/booking-period';
import {amapAddress,validCoordinates} from '@/lib/amap-nearby';
import {validateInventory} from '@/lib/property-inventory';
export const dynamic='force-dynamic';
export async function POST(request:Request){try{
 requireSameOrigin(request);const {supabase,propertyId}=await verifiedProperty();
 const input=JSON.parse(new TextDecoder().decode(await boundedBody(request,500)));const period=bookingPeriod(input);
 if(input.coordinates!==undefined&&!validCoordinates(input.coordinates))throw new WorkspaceError('invalid_input',400);
 const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai'}).format(new Date());
 if(!period||input.start<today)throw new WorkspaceError('invalid_input',400);
 const nights=Math.round((Date.parse(input.end)-Date.parse(input.start))/86400000);if(nights<1||nights>28)throw new WorkspaceError('invalid_input',400);
 let location:string|undefined;
 if(input.coordinates){location=await amapAddress(input.coordinates,request.signal);}
 else{const {data,error}=await supabase.from('property_details').select('profile').eq('property_id',propertyId).maybeSingle();location=validateProfile(data?.profile)?.location?.replace(/（[^）]*虚构[^）]*）/g,'').replace(/周边$/,'').trim();if(error||!location)throw new WorkspaceError('property_location_required',422);}
 const key=process.env.ROLLINGGO_API_KEY;if(!key)throw new WorkspaceError('market_not_configured',503);
 const r=await fetch('https://mcp.rollinggo.cn/mcp',{method:'POST',redirect:'manual',cache:'no-store',signal:AbortSignal.any([request.signal,AbortSignal.timeout(25000)]),headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json',Accept:'application/json, text/event-stream'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'searchHotels',arguments:{originQuery:`查询${location}附近酒店公开报价`,place:location,placeType:'详细地址',checkInParam:{checkInDate:input.start,stayNights:nights,adultCount:2},size:5}}})});
 if(!r.ok)throw new WorkspaceError('market_unavailable',503);const raw=await r.text();if(raw.length>1500000)throw new WorkspaceError('market_unavailable',503);
 const envelope=JSON.parse(raw.trim().startsWith('{')?raw:raw.split('\n').find(l=>l.startsWith('data:'))?.slice(5)||'{}');
 const result=envelope.result;const payload=result?.structuredContent||JSON.parse(result?.content?.find((c:{type:string})=>c.type==='text')?.text||'{}');
 if(result?.isError||!payload.success||!Array.isArray(payload.hotelInformationList))throw new WorkspaceError('market_unavailable',503);
 const image=(value:unknown)=>{if(typeof value!=='string')return null;try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&url.hostname==='image-cdn.rollinggo.cn'?url.href:null}catch{return null}};
 const hotels=payload.hotelInformationList.slice(0,5).map((h:{hotelId:number;name:string;address:string;imageUrl?:string;price?:{hasPrice:boolean;lowestPrice:number;currency:string;message:string}})=>({id:h.hotelId,name:h.name,address:h.address,imageUrl:image(h.imageUrl),price:h.price?.hasPrice&&Number.isFinite(h.price.lowestPrice)?h.price.lowestPrice:null,currency:h.price?.currency||'',conditions:h.price?.message||'暂无可售报价'}));
 const inventoryResult=await supabase.rpc('get_room_inventory',{p_property:propertyId});
 const inventory=inventoryResult.error?null:validateInventory(inventoryResult.data?.inventory,propertyId);
 const active=new Set(inventory?.rooms.filter(r=>r.active).map(r=>r.typeId));
 const rates=inventory?.types.filter(t=>active.has(t.id)).map(t=>t.price).filter((price):price is number=>price!==null&&price>0)||[];
 const ownRates=rates.length?{min:Math.min(...rates),max:Math.max(...rates)}:null;
 return Response.json({hotels,ownRates,location,locationPrecision:input.coordinates?'address':'property',start:input.start,end:input.end,nights,adults:2,provider:'RollingGo',checkedAt:new Date().toISOString()},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return workspaceFailure(e)}}
