import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import type {ModelTransport} from './model-provider';
import {isDemoWorkspace,operatorSample} from './operator-sample';

type Account={supabase:SupabaseClient;user:{id:string;email?:string};propertyId:string};
const ENDPOINT='https://staycraft.online/desktop-api/v1/ai';
const fail=()=>new Error('desktop_model_unavailable');
class ModelRateLimited extends Error{constructor(){super('model_rate_limited')}}
export function desktopModelEnabled(){
 return process.env.STAYCRAFT_DESKTOP_RUNTIME==='1'&&process.env.STAYCRAFT_HOSTED!=='1'&&!operatorSample();
}
function endpoint(){
 const test=process.env.STAYCRAFT_DESKTOP_AI_TEST_ORIGIN;
 if(process.env.STAYCRAFT_DESKTOP_AI_TEST!=='1'||!test)return ENDPOINT;
 if(!/^http:\/\/127\.0\.0\.1:[1-9]\d{0,4}$/.test(test)||Number(new URL(test).port)>65535)throw fail();
 return test+'/desktop-api/v1/ai';
}
async function untilAbort<T>(work:PromiseLike<T>,signal:AbortSignal):Promise<T>{
 const pending=Promise.resolve(work);
 if(signal.aborted){void pending.catch(()=>{});throw fail()}
 return new Promise<T>((resolve,reject)=>{
  const stop=()=>reject(fail());signal.addEventListener('abort',stop,{once:true});
  pending.then(resolve,reject).finally(()=>signal.removeEventListener('abort',stop));
 });
}
async function limitedJson(response:Response,signal:AbortSignal){
 if(!response.headers.get('content-type')?.includes('application/json')||Number(response.headers.get('content-length'))>262144){void response.body?.cancel().catch(()=>{});throw fail()}
 const reader=response.body?.getReader();if(!reader)throw fail();
 const chunks:Uint8Array[]=[];let size=0;
 const cancel=()=>{void reader.cancel().catch(()=>{});};signal.addEventListener('abort',cancel,{once:true});
 try{
  while(true){signal.throwIfAborted();const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>262144)throw fail();chunks.push(value)}
  signal.throwIfAborted();const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}
  return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
 }finally{signal.removeEventListener('abort',cancel);await reader.cancel().catch(()=>{})}
}
// The authenticated route supplies the scope. Each call rechecks that the
// current session still belongs to that account; the remote server checks ownership.
export function desktopModelTransport(account:Account):ModelTransport|undefined{
 if(!desktopModelEnabled()||isDemoWorkspace(account.user.email))return undefined;
 return async(body,options)=>{
  const signal=AbortSignal.any([...(options.signal?[options.signal]:[]),AbortSignal.timeout(options.timeoutMs??45000)]);
  try{
   signal.throwIfAborted();
   const current=await untilAbort(account.supabase.auth.getSession(),signal);let session=current.data.session;
   if(current.error||!session||session.user.id!==account.user.id)throw fail();
   if(!session.expires_at||session.expires_at*1000-Date.now()<300000){const next=await untilAbort(account.supabase.auth.refreshSession(),signal);if(next.error)throw fail();session=next.data.session}
   if(!session||session.user.id!==account.user.id||!session.access_token||!session.expires_at||session.expires_at*1000-Date.now()<90000)throw fail();
   signal.throwIfAborted();
   // Strip local model choice: model names and credentials belong to the gateway.
   const payload={...body,stream:false};delete (payload as Record<string,unknown>).model;
   const response=await fetch(endpoint(),{method:'POST',redirect:'error',cache:'no-store',signal,
    headers:{Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},
    body:JSON.stringify({version:1,propertyId:account.propertyId,purpose:options.purpose,body:payload})});
   if(!response.ok){
    if(response.status===429){
     const failure=await limitedJson(response,signal);
     if(failure?.version===1&&['model_rate_limited','rate_limited'].includes(failure.error))throw new ModelRateLimited();
    }
    void response.body?.cancel().catch(()=>{});throw fail();
   }
   const value=await limitedJson(response,signal);
   if(value?.version!==1||value.userId!==account.user.id||value.propertyId!==account.propertyId||value.purpose!==options.purpose
    ||!['course','deepseek_official'].includes(value.provider)||typeof value.fallback!=='boolean'
    ||!value.completion||!Array.isArray(value.completion.choices)||value.completion.choices.length!==1)throw fail();
   const verified=await untilAbort(account.supabase.auth.getUser(session.access_token),signal);
   if(verified.error||verified.data.user?.id!==account.user.id)throw fail();
   const after=await untilAbort(account.supabase.auth.getSession(),signal);
   if(after.error||after.data.session?.user.id!==account.user.id)throw fail();
   signal.throwIfAborted();
   return {response:Response.json(value.completion),provider:value.provider,fallback:value.fallback};
  }catch(error){if(error instanceof ModelRateLimited)throw error;throw fail()}
 };
}
