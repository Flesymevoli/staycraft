import {operatorSample} from './operator-sample';
import {amapGeocode,amapPoint} from './amap-nearby';
import {isDemoEventProperty} from './signals/events';

// Only the configured demonstration account may use this fictional property's map center.
export function demoPropertyPoint(location:string,email?:string){
 const configured=process.env.DEMO_LOGIN_EMAIL?.trim().toLowerCase();
 const demo=operatorSample()||Boolean(configured&&email?.trim().toLowerCase()===configured);
 return demo&&isDemoEventProperty(location)?{latitude:31.43,longitude:121.11}:null;
}

export async function propertyPoint(location:string,email?:string,signal?:AbortSignal){
 const demo=demoPropertyPoint(location,email);
 if(demo)return demo;
 if(!location||!process.env.AMAP_MAPS_API_KEY)return null;
 if(operatorSample()&&process.env.STAYCRAFT_SAMPLE_LIVE_AMAP!=='1')return null;
 const timeout=AbortSignal.timeout(8000);
 return amapPoint(await amapGeocode(location,signal?AbortSignal.any([signal,timeout]):timeout));
}
