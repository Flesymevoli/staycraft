// Invoked only by server-side model operations. No secrets are returned or logged.
export type ModelProvider='course'|'deepseek_official';
export type ModelPurpose='analysis'|'report'|'review'|'promotion'|'plan'|'priorities'|'translation';
export type ModelTransport=(body:Record<string,unknown>,options:{signal?:AbortSignal;timeoutMs?:number;purpose:ModelPurpose})=>Promise<{response:Response;provider:ModelProvider;fallback:boolean}>;
export async function modelChat(body:Record<string,unknown>,options:{fetcher?:typeof fetch;signal?:AbortSignal;preferOfficial?:boolean;timeoutMs?:number;fallbackOnIncomplete?:boolean;transport?:ModelTransport;purpose?:ModelPurpose}={}){
 if(options.transport)return options.transport(body,{signal:options.signal,timeoutMs:options.timeoutMs,purpose:options.purpose??'analysis'});
 const officialKey=process.env.DEEPSEEK_API_KEY,primaryReady=Boolean(process.env.MODEL_BASE_URL&&process.env.MODEL_API_KEY&&process.env.MODEL_NAME);
 async function send(provider:ModelProvider){
  const official=provider==='deepseek_official',base=official?'https://api.deepseek.com':process.env.MODEL_BASE_URL!,key=official?officialKey:process.env.MODEL_API_KEY;
  if(!key||!base||new URL(base).protocol!=='https:')throw new Error('model_not_configured');
  const response=await (options.fetcher||fetch)(base.replace(/\/$/,'')+'/chat/completions',{method:'POST',redirect:'manual',cache:'no-store',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`,...(!official&&process.env.MODEL_AUTH_MODE==='api-key'?{'api-key':key}:{})},signal:options.signal?AbortSignal.any([options.signal,AbortSignal.timeout(options.timeoutMs??25000)]):AbortSignal.timeout(options.timeoutMs??25000),body:JSON.stringify({...body,model:official?process.env.DEEPSEEK_MODEL||'deepseek-flash':process.env.MODEL_NAME,...(official?{thinking:{type:'disabled'}}:{})})});
  return {response,provider};
 }
 if(options.preferOfficial||!primaryReady){const result=await send('deepseek_official');return {...result,fallback:false};}
 let result;
 try{result=await send('course')}catch(error){if(!officialKey||options.signal?.aborted)throw error;const replacement=await send('deepseek_official');return {...replacement,fallback:true};}
 let incomplete=false;
 if(result.response.ok&&officialKey&&options.fallbackOnIncomplete!==false){try{const parsed=await result.response.clone().json(),choice=parsed.choices?.[0];incomplete=choice?.finish_reason!=='content_filter'&&(!choice||!['stop','tool_calls'].includes(choice.finish_reason)||!choice.message?.content&&!choice.message?.tool_calls?.length)}catch{incomplete=true}}
 if((!result.response.ok&&result.response.status!==400||incomplete)&&officialKey&&!options.signal?.aborted){const replacement=await send('deepseek_official');return {...replacement,fallback:true};}
 return {...result,fallback:false};
}
