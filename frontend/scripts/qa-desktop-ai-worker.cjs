const assert=require('node:assert/strict');
const path=require('node:path');
const Module=require('node:module');
const {readFile}=require('node:fs/promises');
const {build}=require('esbuild');
const root=path.resolve(__dirname,'..');
const USER='11111111-1111-4111-8111-111111111111',OTHER='22222222-2222-4222-8222-222222222222',PROPERTY='33333333-3333-4333-8333-333333333333';
const TOKEN='fixture.access.signature',OTHER_TOKEN='other.access.signature',KEY='private-model-fixture';
const initial={version:1,propertyId:PROPERTY,purpose:'promotion',body:{stream:false,max_tokens:1300,temperature:.75,messages:[{role:'system',content:'Use only supplied facts.'},{role:'user',content:'Fictional hotel fixture.'}]}};
const json=(value,status=200,headers={})=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json',...headers}});
const success={choices:[{index:0,finish_reason:'stop',message:{role:'assistant',content:'A fictional test response.'}}],usage:{prompt_tokens:10,completion_tokens:8,total_tokens:18}};
let assertions=0;
function check(value,message){assert.ok(value,message);assertions++}
function harness(options={}){
 const calls=[],limits=[];
 const env={AI_ENABLED:'1',SUPABASE_URL:'https://worker-fixture.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture',
  MODEL_BASE_URL:'https://course.example.test/v1',MODEL_API_KEY:KEY,MODEL_NAME:'fixture-model',
  AUTH_RATE_LIMITER:{limit:async({key})=>{limits.push(key);return {success:!options.ipLimited}}},
  AI_RATE_LIMITER:{limit:async({key})=>{limits.push(key);return {success:!options.userLimited}}},
  AI_GLOBAL_RATE_LIMITER:{limit:async({key})=>{limits.push(key);return {success:!options.globalLimited}}},...options.env};
 const fetcher=async(resource,init={})=>{
  const url=new URL(resource instanceof Request?resource.url:String(resource)),headers=new Headers(init.headers),method=init.method||'GET';
  calls.push({url,headers,method,redirect:init.redirect,cache:init.cache,body:init.body});
  if(options.hang)return new Promise(()=>{});
  if(url.origin===env.SUPABASE_URL){
   check(method==='GET','auth and property checks are read-only');
   check([`Bearer ${TOKEN}`,`Bearer ${OTHER_TOKEN}`].includes(headers.get('authorization')),'caller JWT is used for RLS');
   if(options.authRedirect)return new Response(null,{status:302,headers:{Location:'https://untrusted.example'}});
   if(url.pathname==='/auth/v1/user')return options.invalidToken?json({msg:'invalid JWT',code:'bad_jwt'},401):json({id:headers.get('authorization')===`Bearer ${OTHER_TOKEN}`?OTHER:USER,email:'fixture@example.test',role:'authenticated',aud:'authenticated',is_anonymous:!!options.anonymous,app_metadata:{},user_metadata:{},created_at:'2020-01-01T00:00:00Z'});
   if(url.pathname==='/rest/v1/properties'){
    check(url.searchParams.get('id')===`eq.${PROPERTY}`,'property filter pinned');
    check(url.searchParams.get('owner_user_id')===`eq.${headers.get('authorization')===`Bearer ${OTHER_TOKEN}`?OTHER:USER}`,'server verified user owns filter');
    return options.propertyError?json({message:'do not expose '+TOKEN},500):json(options.foreignProperty||headers.get('authorization')===`Bearer ${OTHER_TOKEN}`?[]:[{id:PROPERTY}]);
   }
   throw Error('Unexpected Supabase request');
  }
  check(['https://course.example.test','https://api.deepseek.com'].includes(url.origin),'only configured model endpoint is contacted');
  check(method==='POST'&&url.pathname.endsWith('/chat/completions'),'fixed model operation');
  check(headers.get('authorization')===`Bearer ${KEY}`&&!headers.has('cookie')&&!headers.has('apikey'),'only model key, never session or database credentials');
  const body=JSON.parse(init.body);check(body.stream===false&&body.model==='fixture-model','server selects model and disables streaming');
  if(options.modelHang)return new Promise(()=>{});
  if(options.modelRedirect)return new Response(null,{status:302,headers:{Location:'https://untrusted.example'}});
  if(options.modelError)return json({error:{message:KEY+' '+TOKEN}},500,{'Set-Cookie':'secret=yes'});
  if(options.modelLimited)return json({error:{message:KEY+' '+TOKEN}},429,{'Retry-After':options.retryAfter??'120'});
  if(options.modelOversize)return new Response('x'.repeat(262145),{headers:{'Content-Type':'application/json'}});
  if(options.invalidJson)return new Response('{bad',{headers:{'Content-Type':'application/json'}});
  return json(options.completion??success,200,{'set-cookie':'secret=yes','X-Private':KEY});
 };
 return {env,fetcher,calls,limits};
}
function request(body=initial,options={}){
 return new Request(options.url||'https://staycraft.online/desktop-api/v1/ai',{method:options.method||'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${TOKEN}`,...options.headers},
  ...(options.method==='GET'?{}:{body:typeof body==='string'?body:JSON.stringify(body)}),...(options.signal?{signal:options.signal}:{})});
}
async function main(){
 global.fetch=async()=>{throw Error('Live network prohibited in AI Worker QA')};
 const compiled=await build({entryPoints:[path.join(root,'desktop-api/ai.ts')],bundle:true,platform:'node',format:'cjs',write:false,logLevel:'silent'});
 const loaded=new Module(path.join(__dirname,'ai-worker-memory.cjs'));loaded.filename=path.join(__dirname,'ai-worker-memory.cjs');loaded.paths=Module._nodeModulePaths(root);loaded._compile(compiled.outputFiles[0].text,loaded.filename);
 const {handleAiRequest}=loaded.exports;
 async function invoke(body=initial,options={},reqOptions={}){
  const state=harness(options),response=await handleAiRequest(request(body,reqOptions),state.env,{fetcher:state.fetcher,timeoutMs:options.timeoutMs??1000}),result=await response.json();
  check(!response.headers.has('set-cookie')&&!response.headers.has('X-Private'),'provider response headers never escape');
  check(!JSON.stringify(result).includes(TOKEN)&&!JSON.stringify(result).includes(KEY),'credentials never escape');
  check(response.headers.get('Cache-Control').includes('no-store'),'private response is not cached');
  for(const call of state.calls)check(call.redirect==='manual'&&call.cache==='no-store','no redirect and no cache upstream');
  const modelCalls=state.calls.filter(call=>call.method==='POST');check(modelCalls.length<=1,'at most one billed upstream request; no retry or fallback');
  return {...state,response,result,modelCalls};
 }
 let result=await invoke();
 check(result.response.status===200&&result.result.userId===USER&&result.result.propertyId===PROPERTY&&result.result.purpose==='promotion','server verified envelope');
 check(result.result.provider==='course'&&result.result.fallback===false&&result.result.completion.choices[0].message.content===success.choices[0].message.content,'completion returned with actual provider');
 check(result.limits.includes(`desktop-ai:user:${USER}`)&&result.limits.includes('desktop-ai:all'),'verified user and shared burst guards');
 for(const purpose of ['analysis','report','review','plan','priorities']){result=await invoke({...initial,purpose,body:{...initial.body,max_tokens:500,response_format:{type:'json_object'}}});check(result.response.status===200,'each named purpose accepts bounded JSON response')}
 result=await invoke({...initial,body:{...initial.body,stream:undefined}});check(result.response.status===200&&JSON.parse(result.modelCalls[0].body).stream===false,'omitted stream is normalized');
 result=await invoke({...initial,purpose:'report',body:{...initial.body,max_tokens:2600,messages:[{role:'user',content:'x'.repeat(200000)}]}});check(result.response.status===200,'large immutable report evidence fits bounded request');
 result=await invoke(initial,{env:{AI_PROVIDER:'deepseek_official',DEEPSEEK_API_KEY:KEY,DEEPSEEK_MODEL:'fixture-model'}});
 check(result.response.status===200&&result.result.provider==='deepseek_official'&&JSON.parse(result.modelCalls[0].body).thinking.type==='disabled','official model selected by server, not client');
 result=await invoke(initial,{env:{MODEL_AUTH_MODE:'api-key'}});check(result.modelCalls[0].headers.get('api-key')===KEY,'course API key mode retained');
 const tool={type:'function',function:{name:'get_metrics',description:'Read scoped metrics',parameters:{type:'object',properties:{start:{type:'string'},end:{type:'string'}},required:['start','end']}}};
 const call={id:'call-1',type:'function',function:{name:'get_metrics',arguments:'{"start":"2026-11-12","end":"2026-11-18"}'}};
 const toolInput={...initial,purpose:'analysis',body:{...initial.body,max_tokens:2200,tools:[tool],tool_choice:'auto',messages:[...initial.body.messages,{role:'assistant',content:null,tool_calls:[call]},{role:'tool',content:'{"booked":1}',tool_call_id:'call-1'}]}};
 result=await invoke(toolInput,{completion:{choices:[{finish_reason:'tool_calls',message:{role:'assistant',content:null,tool_calls:[call]}}]}});
 check(result.response.status===200&&result.result.completion.choices[0].message.tool_calls[0].function.name==='get_metrics','analysis tool conversation retained');
 result=await invoke(toolInput,{completion:{choices:[{finish_reason:'tool_calls',message:{role:'assistant',tool_calls:[{...call,index:0}]}}]}});
 check(result.response.status===200&&result.result.completion.choices[0].message.content===null&&!('index' in result.result.completion.choices[0].message.tool_calls[0]),'tool-only omitted content and wire index are normalized');
 for(const empty of [null,[]]){result=await invoke(initial,{completion:{choices:[{finish_reason:'stop',message:{role:'assistant',content:'valid text',tool_calls:empty}}]}});check(result.response.status===200&&!result.result.completion.choices[0].message.tool_calls,'empty optional tools are normalized away')}
 result=await invoke(initial,{completion:{choices:[{finish_reason:'stop',message:{role:'assistant'}}]}});check(result.result.error==='model_response_empty','missing content does not become a successful text completion');
 result=await invoke(toolInput,{completion:{choices:[{finish_reason:'tool_calls',message:{role:'assistant',tool_calls:[{...call,function:{name:'write_bookings',arguments:'{}'}}]}}]}});check(result.result.error==='model_response_tool_identity','unknown executable tool stays forbidden');
 for(const field of ['model','base','url','headers','api_key','n','user','functions','response_url']){result=await invoke({...initial,body:{...initial.body,[field]:'untrusted'}});check(result.response.status===400&&result.calls.length===0,'client configuration and extra capability rejected')}
 for(const body of [{...initial,purpose:'chat'},{...initial,version:2},{...initial,propertyId:'bad'},{...initial,userId:OTHER},
  ...[{max_tokens:1301},{max_tokens:0},{max_tokens:1.5},{stream:true},{temperature:1.1},{messages:[]},{messages:[{role:'developer',content:'x'}]},
   {messages:[{role:'user',content:[{type:'image_url',image_url:'https://untrusted'}]}]},
   {response_format:{type:'json_schema'}},{tools:[tool]},{tool_choice:'auto'}].map(overrides=>({...initial,body:{...initial.body,...overrides}})),
  {...toolInput,body:{...toolInput.body,tools:[{...tool,function:{...tool.function,name:'fetch_url'}}]}},
  {...toolInput,body:{...toolInput.body,tools:[tool,tool]}},
  {...initial,body:{...initial.body,messages:[{role:'user',content:'x',tool_call_id:'call-1'}]}}]){
  result=await invoke(body);check(result.response.status===400&&result.calls.length===0,'malformed input rejected before auth or model');
 }
 for(const value of ['0',undefined]){result=await invoke(initial,{env:{AI_ENABLED:value}});check(result.response.status===503&&result.calls.length===0,'explicit server enablement required')}
 for(const binding of ['AUTH_RATE_LIMITER','AI_RATE_LIMITER','AI_GLOBAL_RATE_LIMITER']){result=await invoke(initial,{env:{[binding]:undefined}});check(result.response.status===503&&result.calls.length===0,'missing guard fails closed')}
 result=await invoke(initial,{env:{SUPABASE_PUBLISHABLE_KEY:'sb_secret_forbidden'}});check(result.response.status===503&&result.calls.length===0,'database service role cannot be used');
 for(const base of ['http://course.example.test','https://127.0.0.1','https://user:pass@course.example.test','https://course.example.test?key=secret']){
  result=await invoke(initial,{env:{MODEL_BASE_URL:base}});check(result.response.status===503&&result.calls.length===0,'unsafe provider configuration fails closed');
 }
 result=await invoke(initial,{}, {headers:{Authorization:''}});check(result.response.status===401&&result.calls.length===0,'missing caller token rejected');
 result=await invoke(initial,{invalidToken:true});check(result.response.status===401&&result.calls.length===1,'invalid token stops before property');
 result=await invoke(initial,{anonymous:true});check(result.response.status===401&&result.modelCalls.length===0,'anonymous auth cannot spend model credits');
 result=await invoke(initial,{env:{DEMO_LOGIN_EMAIL:' Fixture@Example.Test '}});check(result.response.status===403&&result.calls.length===1,'read-only demo cannot spend model credits');
 result=await invoke(initial,{foreignProperty:true});check(result.response.status===403&&result.modelCalls.length===0,'foreign property blocks model');
 result=await invoke(initial,{}, {headers:{Authorization:`Bearer ${OTHER_TOKEN}`}});check(result.response.status===403&&result.modelCalls.length===0,'different account cannot claim property');
 result=await invoke(initial,{propertyError:true});check(result.response.status===503&&result.modelCalls.length===0,'database failure does not call model');
 for(const option of ['ipLimited','userLimited','globalLimited']){result=await invoke(initial,{[option]:true});check(result.response.status===429&&result.modelCalls.length===0&&result.response.headers.get('Retry-After')==='60','rate limited calls never reach model')}
 for(const [retryAfter,expected] of [['120','120'],['999999','300'],['0','1'],['-1','60'],['invalid '+KEY,'60']]){
  result=await invoke(initial,{modelLimited:true,retryAfter});check(result.response.status===429&&result.result.error==='model_rate_limited'&&result.response.headers.get('Retry-After')===expected&&result.modelCalls.length===1,'upstream rate limit is stable and retry delay is sanitized without retry');
 }
 for(const option of ['authRedirect','modelRedirect','modelError','modelOversize','invalidJson']){result=await invoke(initial,{[option]:true});check(result.response.status>=500,'upstream failures are bounded and redacted')}
 for(const completion of [{choices:[]},{choices:[{finish_reason:'stop',message:{role:'assistant',content:''}}]},
  {choices:[{finish_reason:'tool_calls',message:{role:'assistant',content:null}}]},
  {choices:[{finish_reason:'stop',message:{role:'assistant',content:'x',tool_calls:[call]}}]}]){
  result=await invoke(initial,{completion});check(result.response.status===502,'invalid or disallowed model output rejected');
 }
 result=await invoke(initial,{completion:{...success,private_key:KEY,session:TOKEN}});check(result.response.status===200&&!('private_key' in result.result.completion),'only known completion fields escape');
 result=await invoke(initial,{completion:{choices:[{finish_reason:'length',message:{role:'assistant',content:'partial'}}]}});check(result.response.status===200&&result.result.completion.choices[0].finish_reason==='length','truncation retained for caller validation');
 result=await invoke('x'.repeat(229377));check(result.response.status===413&&result.calls.length===0,'input stream size bounded');
 result=await invoke(initial,{}, {method:'GET'});check(result.response.status===405,'read request cannot call model');
 result=await invoke(initial,{}, {url:'https://staycraft.online/desktop-api/v1/ai?url=evil'});check(result.response.status===404,'query forwarding rejected');
 result=await invoke(initial,{}, {headers:{'Content-Type':'text/plain'}});check(result.response.status===415,'content type checked');
 result=await invoke(initial,{modelHang:true,timeoutMs:20});check(result.response.status===504&&result.modelCalls.length===1,'hung model respects overall deadline without retry');
 const controller=new AbortController();controller.abort();result=await invoke(initial,{}, {signal:controller.signal});check(result.response.status===504&&result.calls.length===0,'caller cancellation prevents network');
 const config=JSON.parse(await readFile(path.join(root,'desktop-api/wrangler.jsonc'),'utf8'));
 check(['0','1'].includes(config.vars.AI_ENABLED)&&config.ratelimits.some(v=>v.name==='AI_RATE_LIMITER')&&config.ratelimits.some(v=>v.name==='AI_GLOBAL_RATE_LIMITER'),'configuration declares enablement explicitly and defines independent guards');
 check(!Object.keys(config.vars).some(k=>/API_KEY|MODEL_BASE|MODEL_NAME|DEEPSEEK/.test(k)),'model configuration and secrets absent from public vars');
 console.log('Desktop AI Worker offline QA passed: '+assertions+' assertions; no live network, model calls or database writes.');
}
const keepAlive=setInterval(()=>{},1000);
main().catch(error=>{console.error(error.stack);process.exitCode=1}).finally(()=>clearInterval(keepAlive));
