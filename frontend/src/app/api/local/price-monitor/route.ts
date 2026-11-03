import {captureBarrier} from "@/lib/competitor-observations";
import {buildPriceWatch} from "@/lib/competitor-observations";
import {priceWatchCsv} from "@/lib/price-watch-export";
import {spawn} from "node:child_process";
import {readFile,stat} from "node:fs/promises";
import path from "node:path";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const local=(r:Request)=>process.env.NODE_ENV==="development"&&!process.env.STAYCRAFT_HOSTED&&!process.env.VERCEL&&["localhost","127.0.0.1"].includes(new URL(r.url).hostname)&&["localhost","127.0.0.1"].includes((r.headers.get("host")||"").split(":")[0]);
export async function GET(request:Request){
 if(!local(request))return new Response(null,{status:404});
 try{
 if(new URL(request.url).searchParams.get("view")==="cloud-window"){
  const window=JSON.parse(await readFile(path.join(process.cwd(),".price-monitor/cloud-manual-window.json"),"utf8"));
  if(!Number.isFinite(Date.parse(window.expiresAt))||Date.parse(window.expiresAt)<=Date.now())return new Response("临时窗口已过期，请返回 Staycraft。",{status:410});
  const link=new URL(window.liveUrl);if(link.protocol!=="https:"||link.hostname!=="live.browser.run")throw Error("invalid_live_view");
  return new Response(null,{status:302,headers:{Location:link.href,"Cache-Control":"no-store","Referrer-Policy":"no-referrer"}});
 }
 if(new URL(request.url).searchParams.get("view")==="connection"){
  let state="not_opened",locked=false;
  try{const saved=JSON.parse(await readFile(path.join(process.cwd(),".price-monitor/login-state.json"),"utf8"));if(["opening","open","closed","failed"].includes(saved.state))state=saved.state}catch(e){if((e as NodeJS.ErrnoException).code!=="ENOENT")throw e}
  try{await stat(path.join(process.cwd(),".price-monitor/collector.lock"));locked=true}catch(e){if((e as NodeJS.ErrnoException).code!=="ENOENT")throw e}
  // A closed window is not evidence that the user actually signed in.
  if(!locked&&["opening","open"].includes(state))state="closed";
  return Response.json({state,locked},{headers:{"Cache-Control":"no-store"}});
 }
 let job:{status:string;id?:string;error?:string;startedAt?:string;finishedAt?:string;dates?:string[];results?:{hotelId:string;status:string;error?:string|null;originalError?:string|null}[]}={status:"idle"};
 try{job=JSON.parse(await readFile(path.join(process.cwd(),".price-monitor/job.json"),"utf8"))}catch(e){if((e as NodeJS.ErrnoException).code!=="ENOENT")throw e}
 const view=new URL(request.url).searchParams.get("view");
 if(view==="observations"||view==="export"){
  let history=[],scope="anonymous";
  try{history=JSON.parse(await readFile(path.join(process.cwd(),".price-monitor/history.json"),"utf8"))}catch(e){if((e as NodeJS.ErrnoException).code!=="ENOENT")throw e}
  try{const session=JSON.parse(await readFile(path.join(process.cwd(),".price-monitor/session.json"),"utf8"));scope=session.scope||scope}catch(e){if((e as NodeJS.ErrnoException).code!=="ENOENT")throw e}
  const watch=buildPriceWatch(history,job,scope);
  if(view==="export")return new Response(priceWatchCsv(watch),{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":"attachment; filename=staycraft-price-watch.csv","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
  return Response.json(watch,{headers:{"Cache-Control":"no-store"}});
 }
 if(job.id&&/^[a-f0-9-]{36}$/.test(job.id)&&Array.isArray(job.results)){
  for(const result of job.results){if(!/^\d{1,12}$/.test(result.hotelId))continue;
   try{const evidence=JSON.parse(await readFile(path.join(process.cwd(),`.price-monitor/${job.id}-${result.hotelId}-failure.json`),"utf8"));const barrier=captureBarrier(evidence.url,evidence.snapshot);if(barrier){result.originalError=result.error;result.error=barrier}}catch{}
  }
 }
 return Response.json(job,{headers:{"Cache-Control":"no-store"}});
 }catch(e){if((e as NodeJS.ErrnoException).code==="ENOENT")return Response.json(new URL(request.url).searchParams.get("view")==="observations"?buildPriceWatch([],{status:"idle"},"anonymous"):{status:"idle"},{headers:{"Cache-Control":"no-store"}});return Response.json({error:"job_unavailable"},{status:503})}
}
export async function POST(request:Request){
 if(!local(request))return new Response(null,{status:404});
 const expected=new URL(request.url);expected.host=request.headers.get("host")||expected.host;
 if(request.headers.get("origin")!==expected.origin)return new Response(null,{status:403});
 try{
 const action=new URL(request.url).searchParams.get("action");
 if(action&&action!=="login")return new Response(null,{status:400});
 const login=action==="login";
 try{await stat(path.join(process.cwd(),".price-monitor/collector.lock"));return Response.json({error:"already_running"},{status:409})}catch(e){if((e as NodeJS.ErrnoException).code!=="ENOENT")throw e}
 let job;try{job=JSON.parse(await readFile(path.join(process.cwd(),".price-monitor/job.json"),"utf8"))}catch(e){if((e as NodeJS.ErrnoException).code!=="ENOENT")throw e}
 if(!login&&job?.status==="running")return Response.json({error:"already_running"},{status:409});
 if(!login&&job?.finishedAt&&Date.now()-Date.parse(job.finishedAt)<300000)return Response.json({error:"cooldown"},{status:429});
 const child=spawn(process.execPath,[path.join(process.cwd(),login?"scripts/login-price-monitor.mjs":"scripts/collect-public-prices.mjs"),login?"--open-login":"--collect-public-prices"],{cwd:process.cwd(),windowsHide:true,stdio:"ignore",env:{...process.env,NODE_ENV:"development"}});
 await new Promise<void>((resolve,reject)=>{child.once("spawn",resolve);child.once("error",reject)});child.unref();
 return Response.json({accepted:true},{status:202});
 }catch{return Response.json({error:"collector_unavailable"},{status:503})}
}
