export type NearbyPlace={id:string;name:string;address:string;category:string;url:string};
export function validCoordinates(v:unknown):v is {latitude:number;longitude:number}{if(!v||typeof v!=='object')return false;const p=v as Record<string,unknown>;return Object.keys(p).every(k=>['latitude','longitude'].includes(k))&&typeof p.latitude==='number'&&Number.isFinite(p.latitude)&&Math.abs(p.latitude)<=90&&typeof p.longitude==='number'&&Number.isFinite(p.longitude)&&Math.abs(p.longitude)<=180}
// Browser GPS is WGS84; AMap uses GCJ02 in mainland China. Outside mainland
// bounds coordinates are retained. Conversion is local, with no extra location provider.
export function amapCoordinates(latitude:number,longitude:number){
 const x=longitude-105,y=latitude-35,pi=Math.PI;
 if(longitude<72.004||longitude>137.8347||latitude<.8293||latitude>55.8271)return `${longitude},${latitude}`;
 let lat=-100+2*x+3*y+.2*y*y+.1*x*y+.2*Math.sqrt(Math.abs(x));
 let lon=300+x+2*y+.1*x*x+.1*x*y+.1*Math.sqrt(Math.abs(x));
 const wave=(a:number,b:number)=>(20*Math.sin(6*a*pi)+20*Math.sin(2*a*pi))*2/3+b;
 lat=wave(x,lat)+(20*Math.sin(y*pi)+40*Math.sin(y/3*pi))*2/3+(160*Math.sin(y/12*pi)+320*Math.sin(y*pi/30))*2/3;
 lon=wave(x,lon)+(20*Math.sin(x*pi)+40*Math.sin(x/3*pi))*2/3+(150*Math.sin(x/12*pi)+300*Math.sin(x/30*pi))*2/3;
 const rad=latitude/180*pi,magic=1-.00669342162296594323*Math.sin(rad)**2,sqrt=Math.sqrt(magic);
 return `${(longitude+lon/(6378245/sqrt*Math.cos(rad)*pi)*180).toFixed(6)},${(latitude+lat/((6378245*(1-.00669342162296594323))/(magic*sqrt)*pi)*180).toFixed(6)}`;
}
export type AmapOptions={key?:string;fetcher?:typeof fetch};
export async function amapTool(name:string,args:Record<string,unknown>,signal?:AbortSignal,fetcher:typeof fetch=fetch,options?:AmapOptions){
 const key=options&&Object.hasOwn(options,'key')?options.key:process.env.AMAP_MAPS_API_KEY;if(!key)throw Error('amap_not_configured');
 const url=new URL('https://mcp.amap.com/mcp');url.searchParams.set('key',key);
 const response=await fetcher(url,{method:'POST',redirect:'manual',cache:'no-store',signal:signal?AbortSignal.any([signal,AbortSignal.timeout(15000)]):AbortSignal.timeout(15000),headers:{'Content-Type':'application/json',Accept:'application/json, text/event-stream'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name,arguments:args}})});
 if(!response.ok)throw Error('amap_unavailable');
 const raw=await response.text();if(raw.length>500000)throw Error('amap_unavailable');
 const value=JSON.parse(raw.trim().startsWith('{')?raw:raw.split('\n').find(l=>l.startsWith('data:'))?.slice(5)||'{}');
 if(value.error||value.result?.isError||!value.result?.content)throw Error('amap_unavailable');
 const block=value.result.content.find((c:{type:string;text?:string})=>c.type==='text'&&c.text);
 if(!block)throw Error('amap_unavailable');const data=JSON.parse(block.text);
 if(data.status==='0')throw Error('amap_unavailable');return data;
}
export async function amapAddress(coordinates:{latitude:number;longitude:number},signal?:AbortSignal,fetcher:typeof fetch=fetch){
 const key=process.env.AMAP_MAPS_API_KEY;if(!key)throw Error('amap_not_configured');
 const url=new URL('https://restapi.amap.com/v3/geocode/regeo');
 url.search=new URLSearchParams({key,location:amapCoordinates(coordinates.latitude,coordinates.longitude),extensions:'base',radius:'1000'}).toString();
 const response=await fetcher(url,{redirect:'manual',cache:'no-store',signal:signal?AbortSignal.any([signal,AbortSignal.timeout(15000)]):AbortSignal.timeout(15000)});
 if(!response.ok)throw Error('amap_location_unknown');
 const data=await response.json();
 if(data.status!=='1'||typeof data.regeocode?.formatted_address!=='string'||!data.regeocode.formatted_address.trim())throw Error('amap_location_unknown');
 return data.regeocode.formatted_address.trim().slice(0,300);
}
export function placeResults(data:{pois?:Record<string,unknown>[]}){
 const seen=new Set<string>();
 return (Array.isArray(data.pois)?data.pois:[]).filter(p=>{if(typeof p.id!=='string'||typeof p.name!=='string')return false;const code=String(p.typecode||'');if(code.startsWith('05')||code.startsWith('15')&&!/^150[1278]/.test(code))return false;const identity=`${p.name}|${p.address||''}`;if(seen.has(p.id)||seen.has(identity))return false;seen.add(p.id);seen.add(identity);return true}).slice(0,6).map(p=>({id:String(p.id),name:String(p.name).slice(0,120),address:typeof p.address==='string'?p.address.slice(0,200):'',category:/大学|学院|高校/.test(String(p.name))?'高校访客':/会展|展览|会议/.test(String(p.name))?'会展访客':/站|机场|枢纽/.test(String(p.name))?'交通出行客群':'景区短住客群',url:`https://uri.amap.com/marker?poiid=${encodeURIComponent(String(p.id))}&name=${encodeURIComponent(String(p.name))}&src=StayCraft&callnative=0`}));
}
export async function amapGeocode(location:string,signal?:AbortSignal,options?:AmapOptions):Promise<string>{
 const clean=location.replace(/（[^）]*虚构[^）]*）/g,'').replace(/周边$/,'').trim();
 const geo=await amapTool('maps_geo',{address:clean},signal,options?.fetcher??fetch,options),point=(geo.results||geo.geocodes)?.[0]?.location;
 if(!amapPoint(point))throw Error('amap_location_unknown');
 return point;
}
export function amapPoint(value:unknown){
 if(typeof value!=='string'||! /^-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?$/.test(value))return null;
 const [longitude,latitude]=value.split(',').map(Number);
 const point={latitude,longitude};
 return validCoordinates(point)?point:null;
}
export async function nearbyPlacesFromPoint(point:string,signal?:AbortSignal){
 const groups=await Promise.all(['景区','会展中心','火车站','大学'].map(keywords=>amapTool('maps_around_search',{keywords,location:point,radius:'5000'},signal)));
 return placeResults({pois:groups.flatMap(g=>Array.isArray(g.pois)?g.pois:[])});
}
export async function nearbyPlaces(location:string,coordinates?:{latitude:number;longitude:number},signal?:AbortSignal){
 const point=coordinates?amapCoordinates(coordinates.latitude,coordinates.longitude):await amapGeocode(location,signal);
 return nearbyPlacesFromPoint(point,signal);
}
