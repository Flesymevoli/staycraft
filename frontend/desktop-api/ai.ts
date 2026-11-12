import {createClient} from '@supabase/supabase-js';

type Limiter={limit(input:{key:string}):Promise<{success:boolean}>};
export type AiEnv={
 SUPABASE_URL:string;SUPABASE_PUBLISHABLE_KEY:string;DEMO_LOGIN_EMAIL?:string;
 AI_ENABLED?:string;AI_PROVIDER?:'course'|'deepseek_official';
 MODEL_BASE_URL?:string;MODEL_API_KEY?:string;MODEL_NAME?:string;MODEL_AUTH_MODE?:string;
 DEEPSEEK_API_KEY?:string;DEEPSEEK_MODEL?:string;
 AUTH_RATE_LIMITER:Limiter;AI_RATE_LIMITER:Limiter;AI_GLOBAL_RATE_LIMITER:Limiter;
};
type Dependencies={fetcher?:typeof fetch;timeoutMs?:number};
type RecordValue=Record<string,unknown>;
const PATH='/desktop-api/v1/ai',INPUT_LIMIT=229376,OUTPUT_LIMIT=262144;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const caps={analysis:2200,report:2600,review:2000,promotion:1300,plan:2000,priorities:2000};
type Purpose=keyof typeof caps;
const toolNames=new Set(['get_revenue','get_bookings','get_metrics','get_inventory','query_market']);
const headers={'Cache-Control':'private, no-store','Content-Type':'application/json; charset=utf-8','X-Content-Type-Options':'nosniff'};
class Failure extends Error{constructor(readonly code:string,readonly status:number,readonly retryAfter=60){super(code)}}
const record=(value:unknown):value is RecordValue=>!!value&&typeof value==='object'&&!Array.isArray(value);
const text=(value:unknown,max:number):value is string=>typeof value==='string'&&value.length<=max;
const keys=(value:RecordValue,allowed:string[])=>Object.keys(value).every(key=>allowed.includes(key));
const invalid=()=>new Failure('invalid_input',400);

function toolCall(value:unknown){
 if(!record(value)||!keys(value,['id','type','function'])||!text(value.id,100)||!value.id||value.type!=='function'
  ||!record(value.function)||!keys(value.function,['name','arguments'])||!toolNames.has(String(value.function.name))
  ||!text(value.function.arguments,4000))throw invalid();
 return {id:value.id,type:'function',function:{name:value.function.name as string,arguments:value.function.arguments}};
}
function messages(value:unknown,purpose:Purpose){
 if(!Array.isArray(value)||!value.length||value.length>60)throw invalid();
 return value.map(raw=>{
  if(!record(raw)||!keys(raw,['role','content','tool_calls','tool_call_id'])||!['system','user','assistant','tool'].includes(String(raw.role)))throw invalid();
  if(raw.content!==null&&!text(raw.content,220000))throw invalid();
  if(raw.role!=='assistant'&&typeof raw.content!=='string')throw invalid();
  const calls=raw.tool_calls;
  if(calls!==undefined&&(purpose!=='analysis'||raw.role!=='assistant'||!Array.isArray(calls)||!calls.length||calls.length>5))throw invalid();
  if(raw.role==='tool'&&(purpose!=='analysis'||!text(raw.tool_call_id,100)||!raw.tool_call_id))throw invalid();
  if(raw.role!=='tool'&&raw.tool_call_id!==undefined)throw invalid();
  return {role:raw.role,content:raw.content,...(calls!==undefined?{tool_calls:(calls as unknown[]).map(toolCall)}:{}),
   ...(raw.role==='tool'?{tool_call_id:raw.tool_call_id}:{})};
 });
}
function parseInput(value:unknown){
 if(!record(value)||!keys(value,['version','propertyId','purpose','body'])||value.version!==1
  ||!text(value.propertyId,36)||!UUID.test(value.propertyId)||!Object.hasOwn(caps,String(value.purpose))||!record(value.body))throw invalid();
 const purpose=value.purpose as Purpose,b=value.body;
 if(!keys(b,['messages','stream','max_tokens','temperature','response_format','tools','tool_choice'])
  ||b.stream!==undefined&&b.stream!==false||!Number.isInteger(b.max_tokens)||(b.max_tokens as number)<1||(b.max_tokens as number)>caps[purpose]
  ||b.temperature!==undefined&&(typeof b.temperature!=='number'||!Number.isFinite(b.temperature)||b.temperature<0||b.temperature>1))throw invalid();
 if(b.response_format!==undefined&&(!record(b.response_format)||!keys(b.response_format,['type'])||b.response_format.type!=='json_object'))throw invalid();
 let tools:RecordValue[]|undefined;
 if(b.tools!==undefined){
  if(purpose!=='analysis'||!Array.isArray(b.tools)||b.tools.length<1||b.tools.length>5)throw invalid();
  const seen=new Set();
  tools=b.tools.map(raw=>{
   if(!record(raw)||!keys(raw,['type','function'])||raw.type!=='function'||!record(raw.function)
    ||!keys(raw.function,['name','description','parameters'])||!toolNames.has(String(raw.function.name))||seen.has(raw.function.name)
    ||!text(raw.function.description,1500)||!record(raw.function.parameters)||JSON.stringify(raw.function.parameters).length>4000)throw invalid();
   seen.add(raw.function.name);return raw;
  });
 }
 if(b.tool_choice!==undefined&&(!tools||!['auto','none'].includes(String(b.tool_choice))))throw invalid();
 return {propertyId:value.propertyId,purpose,body:{messages:messages(b.messages,purpose),stream:false,max_tokens:b.max_tokens,
  ...(b.temperature!==undefined?{temperature:b.temperature}:{}),...(b.response_format?{response_format:b.response_format}:{}),
  ...(tools?{tools}:{}),...(b.tool_choice?{tool_choice:b.tool_choice}:{})}};
}
async function aborted<T>(work:PromiseLike<T>,signal:AbortSignal):Promise<T>{
 const promise=Promise.resolve(work);
 if(signal.aborted){void promise.catch(()=>{});throw new Failure('request_timeout',504)}
 return new Promise<T>((resolve,reject)=>{
  const stop=()=>reject(new Failure('request_timeout',504));signal.addEventListener('abort',stop,{once:true});
  promise.then(resolve,reject).finally(()=>signal.removeEventListener('abort',stop));
 });
}
async function bytes(body:ReadableStream<Uint8Array>|null,limit:number,signal:AbortSignal):Promise<Uint8Array>{
 if(!body)return new Uint8Array();
 const reader=body.getReader(),chunks:Uint8Array[]=[];let total=0;
 try{
  while(true){const result=await aborted(reader.read(),signal);if(result.done)break;total+=result.value.length;if(total>limit)throw new Failure('payload_too_large',413);chunks.push(result.value)}
 }catch(error){void reader.cancel().catch(()=>{});throw error}
 const result=new Uint8Array(total);let offset=0;for(const chunk of chunks){result.set(chunk,offset);offset+=chunk.length}return result;
}
async function jsonBody(response:Response,signal:AbortSignal,kind:'upstream'|'model_response'='upstream'){
 if(!response.headers.get('content-type')?.toLowerCase().includes('application/json')){void response.body?.cancel().catch(()=>{});throw new Failure(kind+'_content_type',502)}
 if(Number(response.headers.get('content-length')??0)>OUTPUT_LIMIT){void response.body?.cancel().catch(()=>{});throw new Failure(kind+'_too_large',502)}
 try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(await bytes(response.body,OUTPUT_LIMIT,signal)))}
 catch(error){if(error instanceof Failure&&error.status===504)throw error;throw new Failure(kind+(error instanceof Failure&&error.status===413?'_too_large':'_json'),502)}
}
function providerConfiguration(env:AiEnv){
 const provider=env.AI_PROVIDER??(env.MODEL_BASE_URL&&env.MODEL_API_KEY&&env.MODEL_NAME?'course':'deepseek_official');
 if(!['course','deepseek_official'].includes(provider))throw new Failure('model_unavailable',503);
 const official=provider==='deepseek_official',key=official?env.DEEPSEEK_API_KEY:env.MODEL_API_KEY;
 const model=official?env.DEEPSEEK_MODEL||'deepseek-flash':env.MODEL_NAME;
 const base=official?'https://api.deepseek.com':env.MODEL_BASE_URL;
 if(!key||!model||model.length>100||!base)throw new Failure('model_unavailable',503);
 let url;try{url=new URL(base.replace(/\/$/,'')+'/chat/completions')}catch{throw new Failure('model_unavailable',503)}
 if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.port
  ||! /^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i.test(url.hostname)||/^(?:\d+\.){3}\d+$/.test(url.hostname)
  ||/\.(?:localhost|local|internal)$/i.test(url.hostname))throw new Failure('model_unavailable',503);
 return {provider,official,key,model,url};
}
async function rateLimit(binding:Limiter,key:string,signal:AbortSignal){
 const result=await aborted(binding.limit({key}),signal);if(!result.success)throw new Failure('rate_limited',429);
}
function completion(value:unknown,purpose:Purpose){
 if(!record(value)||!Array.isArray(value.choices)||value.choices.length!==1||!record(value.choices[0]))throw new Failure('model_response_choices',502);
 const choice=value.choices[0],message=choice.message;
 if(!record(message))throw new Failure('model_response_message',502);
 if(message.role!=='assistant')throw new Failure('model_response_role',502);
 if(!['stop','tool_calls','length','content_filter'].includes(String(choice.finish_reason)))throw new Failure('model_response_finish_reason',502);
 // Compatible gateways may omit content for a tool-only assistant turn and
 // serialize absent tool calls as null or []. Normalize these optional fields.
 const content=message.content??null;
 if(content!==null&&!text(content,100000))throw new Failure('model_response_content',502);
 let calls:ReturnType<typeof toolCall>[]|undefined;
 if(message.tool_calls!==undefined&&message.tool_calls!==null){
  if(!Array.isArray(message.tool_calls)||message.tool_calls.length>5||purpose!=='analysis'&&message.tool_calls.length>0)throw new Failure('model_response_tools',502);
  if(message.tool_calls.length)calls=message.tool_calls.map(raw=>{
   if(!record(raw)||raw.type!=='function'||!record(raw.function))throw new Failure('model_response_tool_shape',502);
   if(!text(raw.id,100)||!raw.id||!toolNames.has(String(raw.function.name)))throw new Failure('model_response_tool_identity',502);
   if(!text(raw.function.arguments,4000))throw new Failure('model_response_tool_arguments',502);
   // Drop wire metadata such as index; executable name and arguments keep the
   // exact same allowlist and bounds as client-submitted conversation history.
   return toolCall({id:raw.id,type:raw.type,function:{name:raw.function.name,arguments:raw.function.arguments}});
  });
 }
 if(choice.finish_reason==='tool_calls'&&!calls?.length)throw new Failure('model_response_tools_missing',502);
 if(choice.finish_reason==='stop'&&!content?.toString().trim()&&!calls?.length)throw new Failure('model_response_empty',502);
 const usage=record(value.usage)?value.usage:{};
 const count=(field:string)=>typeof usage[field]==='number'&&Number.isInteger(usage[field])&&(usage[field] as number)>=0&&(usage[field] as number)<1000000?usage[field] as number:0;
 return {choices:[{index:0,finish_reason:choice.finish_reason,message:{role:'assistant',content,...(calls?{tool_calls:calls}:{})}}],
  usage:{prompt_tokens:count('prompt_tokens'),completion_tokens:count('completion_tokens'),total_tokens:count('total_tokens')}};
}

export async function handleAiRequest(request:Request,env:AiEnv,dependencies:Dependencies={}):Promise<Response>{
 try{
  const url=new URL(request.url);
  if(url.pathname!==PATH||url.search)throw new Failure('not_found',404);
  if(request.method!=='POST')throw new Failure('method_not_allowed',405);
  if(env.AI_ENABLED!=='1')throw new Failure('model_disabled',503);
  if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type')??''))throw new Failure('invalid_content_type',415);
  const match=request.headers.get('authorization')?.match(/^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/);
  if(!match||match[1].length>8192)throw new Failure('sign_in_required',401);
  if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(env.SUPABASE_URL??'')||!/^sb_publishable_[A-Za-z0-9_-]+$/.test(env.SUPABASE_PUBLISHABLE_KEY??'')
   ||!env.AUTH_RATE_LIMITER?.limit||!env.AI_RATE_LIMITER?.limit||!env.AI_GLOBAL_RATE_LIMITER?.limit)throw new Failure('service_unavailable',503);
  const token=match[1],signal=AbortSignal.any([request.signal,AbortSignal.timeout(dependencies.timeoutMs??100000)]);
  const ip=request.headers.get('CF-Connecting-IP');
  await rateLimit(env.AUTH_RATE_LIMITER,'desktop-ai:ip:'+(ip&&/^[a-f0-9:.]{3,45}$/i.test(ip)?ip:'unknown'),signal);
  if(Number(request.headers.get('content-length')??0)>INPUT_LIMIT)throw new Failure('payload_too_large',413);
  let value;try{value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(await bytes(request.body,INPUT_LIMIT,signal)))}catch(error){if(error instanceof Failure)throw error;throw invalid()}
  const input=parseInput(value),provider=providerConfiguration(env),fetcher=dependencies.fetcher??fetch;
  const authFetch:typeof fetch=async(resource,init)=>{
   const target=new URL(resource instanceof Request?resource.url:String(resource)),sent=new Headers(init?.headers);
   if(target.origin!==env.SUPABASE_URL||!['/auth/v1/user','/rest/v1/properties'].includes(target.pathname)
    ||(init?.method??'GET')!=='GET'||sent.get('authorization')!=='Bearer '+token)throw new Failure('upstream_request_blocked',503);
   const response=await aborted(fetcher(resource,{...init,redirect:'manual',cache:'no-store',signal}),signal);
   if(response.redirected||response.status>=300&&response.status<400){void response.body?.cancel().catch(()=>{});throw new Failure('auth_unavailable',503)}
   const data=await jsonBody(response,signal);
   return new Response(JSON.stringify(data),{status:response.status,headers:{'Content-Type':'application/json'}});
  };
  const supabase=createClient(env.SUPABASE_URL,env.SUPABASE_PUBLISHABLE_KEY,{global:{fetch:authFetch,headers:{Authorization:'Bearer '+token}},
   auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,skipAutoInitialize:true}});
  const {data:auth,error:authError}=await aborted(supabase.auth.getUser(token),signal);
  if(authError||!auth.user){if(authError&&![400,401,403].includes(authError.status??0))throw new Failure('auth_unavailable',503);throw new Failure('sign_in_required',401)}
  if(!UUID.test(auth.user.id)||auth.user.is_anonymous||auth.user.role!=='authenticated')throw new Failure('sign_in_required',401);
  if(env.DEMO_LOGIN_EMAIL?.trim()&&auth.user.email?.toLowerCase()===env.DEMO_LOGIN_EMAIL.trim().toLowerCase())throw new Failure('demo_read_only',403);
  const {data:property,error:propertyError}=await aborted(supabase.from('properties').select('id').eq('id',input.propertyId).eq('owner_user_id',auth.user.id).maybeSingle(),signal);
  if(propertyError)throw new Failure('property_unavailable',503);
  if(property?.id!==input.propertyId)throw new Failure('property_forbidden',403);
  await rateLimit(env.AI_RATE_LIMITER,'desktop-ai:user:'+auth.user.id,signal);
  // The platform limiter is locality based; this is an additional burst guard, not a billing quota.
  await rateLimit(env.AI_GLOBAL_RATE_LIMITER,'desktop-ai:all',signal);
  const response=await aborted(fetcher(provider.url.href,{method:'POST',redirect:'manual',cache:'no-store',signal,
   headers:{'Content-Type':'application/json',Authorization:'Bearer '+provider.key,...(!provider.official&&env.MODEL_AUTH_MODE==='api-key'?{'api-key':provider.key}:{})},
   body:JSON.stringify({...input.body,model:provider.model,...(provider.official?{thinking:{type:'disabled'}}:{})})}),signal);
  if(response.redirected||response.status>=300&&response.status<400){void response.body?.cancel().catch(()=>{});throw new Failure('model_upstream_redirect',502)}
  if(response.status===429){
   const raw=response.headers.get('Retry-After'),retry=raw&&/^\d{1,6}$/.test(raw)?Math.max(1,Math.min(300,Number(raw))):60;
   void response.body?.cancel().catch(()=>{});throw new Failure('model_rate_limited',429,retry);
  }
  if(!response.ok){void response.body?.cancel().catch(()=>{});throw new Failure('model_upstream_http_'+response.status,502)}
  const result=completion(await jsonBody(response,signal,'model_response'),input.purpose);
  signal.throwIfAborted();
  return new Response(JSON.stringify({version:1,userId:auth.user.id,propertyId:input.propertyId,purpose:input.purpose,
   provider:provider.provider,fallback:false,completion:result}),{headers});
 }catch(error){
  const failure=error instanceof Failure?error:new Failure('service_unavailable',503);
  return new Response(JSON.stringify({version:1,error:failure.code}),{status:failure.status,headers:{...headers,...(failure.status===429?{'Retry-After':String(failure.retryAfter)}:{})}});
 }
}
