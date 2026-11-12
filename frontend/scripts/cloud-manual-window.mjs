import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
export async function openCloudManualWindow({token,accountId,fetchImpl=fetch}){
 if(!token||!/^[a-f0-9]{32}$/.test(accountId||''))throw Error('configuration_missing');
 const base=`https://api.cloudflare.com/client/v4/accounts/${accountId}/browser-run/devtools/browser`;
 const request=async(url,method,body)=>{
  const r=await fetchImpl(url,{method,headers:{Authorization:`Bearer ${token}`,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,redirect:'error',signal:AbortSignal.timeout(30000)});
  if(!r.ok)throw Error(`cloud_api_${r.status}`);const data=await r.json();if(data.success===false)throw Error('cloud_api_failed');return data.result??data;
 };
 const session=await request(base+'?keep_alive=180000','POST');
 if(!/^[a-f0-9-]{36}$/.test(session.sessionId||''))throw Error('invalid_session');
 const close=()=>request(`${base}/${session.sessionId}`,'DELETE');
 try{
  const target=await request(`${base}/${session.sessionId}/json/new?url=${encodeURIComponent('https://hotels.ctrip.com/hotels/2132616.html')}`,'PUT');
  const live=await request(`${base}/${session.sessionId}/live_view`,'POST',{mode:'tab',targetId:target.id,expiresInMs:300000});
  const link=new URL(live.devtoolsFrontendUrl);if(link.protocol!=='https:'||link.hostname!=='live.browser.run')throw Error('invalid_live_view');
  const directory=path.resolve(import.meta.dirname,'../.price-monitor');await mkdir(directory,{recursive:true});
  await writeFile(path.join(directory,'cloud-manual-window.json'),JSON.stringify({sessionId:session.sessionId,liveUrl:link.href,expiresAt:new Date(Date.now()+300000).toISOString()}));
  return {close};
 }catch(error){await close().catch(()=>{});throw error;}
}
