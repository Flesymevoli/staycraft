// Anonymous, explicit one-page compatibility probe. Does not import local profiles.
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
export async function probeCloudPage({token,accountId,fetchImpl=fetch}) {
 if(!token||!/^([a-f0-9]{32})$/.test(accountId||''))throw Error('cloud_probe_configuration_missing');
 const response=await fetchImpl(`https://api.cloudflare.com/client/v4/accounts/${accountId}/browser-run/content`,{
  method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
  body:JSON.stringify({url:'https://hotels.ctrip.com/hotels/2132616.html',gotoOptions:{waitUntil:'domcontentloaded',timeout:30000}}),
  signal:AbortSignal.timeout(45000),redirect:'error',
 });
 let body;try{body=await response.json()}catch{return {status:'invalid_response',httpStatus:response.status}}
 const codes=Array.isArray(body.errors)?body.errors.map(e=>e.code).filter(v=>Number.isInteger(v)):[];
 if(!response.ok||body.success!==true)return {status:'api_failed',httpStatus:response.status,codes};
 if(typeof body.result!=='string')return {status:'invalid_response',httpStatus:response.status};
 // These are only compatibility hints, never extracted room offers or prices.
 const html=body.result;
 return {status:'html_received',httpStatus:response.status,bytes:Buffer.byteLength(html),
  hotelNamePresent:html.includes('杭州沐曦'),verificationHint:/请完成安全验证|拖动滑块/.test(html),
  roomOffersVerified:false,authenticated:false};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 if(process.argv[2]!=='--anonymous-cloud-probe')throw Error('explicit_cloud_probe_only');
 try{
  const result=await probeCloudPage({token:process.env.CLOUDFLARE_API_TOKEN,accountId:process.env.CLOUDFLARE_ACCOUNT_ID});
  const report={checkedAt:new Date().toISOString(),...result};
  const directory=path.resolve(import.meta.dirname,'../.price-monitor');await mkdir(directory,{recursive:true});
  await writeFile(path.join(directory,'cloud-probe.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report));if(result.status!=='html_received')process.exitCode=1;
 }catch{console.error('Cloud probe did not complete. Check configuration, permissions and network. No automatic retry.');process.exitCode=1;}
}
