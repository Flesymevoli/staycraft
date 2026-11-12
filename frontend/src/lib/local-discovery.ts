import {publicSourceUrl} from './promotion';
export type LocalSearchResult={title:string;url:string;snippet:string;publishedAt:string|null;site:string;content?:string;authority?:number};
export function eventSearchKey(){return process.env.SEARCH_API_KEY||(process.env.EVENT_SEARCH_ENABLED==='1'?process.env.DEEPSEEK_API_KEY:undefined)}
export function searchConfigured(){return !!eventSearchKey();}
export function parseSearchResults(value:unknown):LocalSearchResult[]{
 if(!value||typeof value!=='object'||!Array.isArray((value as {results?:unknown}).results))throw Error('invalid_search_response');
 const seen=new Set<string>();const results:LocalSearchResult[]=[];
 const ranked=[...(value as {results:Record<string,unknown>[]}).results].sort((a,b)=>Number(b?.rerank_score||0)-Number(a?.rerank_score||0));
 for(const item of ranked){
  if(!item||!publicSourceUrl(item.url)||typeof item.title!=='string'||!item.title.trim()||seen.has(item.url))continue;
  const snippet=typeof item.snippet==='string'&&item.snippet.trim()?item.snippet:typeof item.summary==='string'?item.summary:'';
  if(!snippet.trim()&&!(typeof item.content==='string'&&item.content.trim()))continue;
  seen.add(item.url);const clean=(v:string,n:number)=>v.replace(/[\u0000-\u001f]/g,' ').trim().slice(0,n);
  results.push({title:clean(item.title,120),url:item.url,snippet:clean(snippet,600),publishedAt:typeof item.date==='string'&&Number.isFinite(Date.parse(item.date))?item.date:null,site:typeof item.site_name==='string'?clean(item.site_name,80):new URL(item.url).hostname,
   ...(typeof item.content==='string'?{content:item.content.slice(0,40000)}:{}),...(typeof item.authority==='number'?{authority:item.authority}:{})});
  if(results.length===5)break;
 }
 return results;
}
export async function searchLocal(location:string,start:string,end:string,options:{fetcher?:typeof fetch;signal?:AbortSignal;key?:string;needContent?:boolean}={}){
 const key=options.key??eventSearchKey();
 if(!key)throw Error('search_not_configured');
 // Search accepts the official API credential; never send the course gateway's model key here.
 const signal=options.signal?AbortSignal.any([options.signal,AbortSignal.timeout(15000)]):AbortSignal.timeout(15000);
 // Discover broadly; exact event dates and distance are filtered after extraction.
 // Stacking dates and every event category would require irrelevant keyword intersections.
 const monthLabel=(date:string)=>/^\d{4}-\d{2}-\d{2}$/.test(date)?`${date.slice(0,4)}年${Number(date.slice(5,7))}月`:'';
 const firstMonth=monthLabel(start),lastMonth=monthLabel(end);
 const month=lastMonth&&lastMonth!==firstMonth?`${firstMonth}至${lastMonth}`:firstMonth;
 const response=await(options.fetcher||fetch)('https://api.deepseek.com/v1/tools/search',{method:'POST',redirect:'manual',cache:'no-store',signal,headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({query:`${location.slice(0,65)} ${month} 活动`.trim().slice(0,128),count:5,need_content:options.needContent===true})});
 if(!response.ok)throw Error(response.status===429?'search_busy':'search_unavailable');
 const reader=response.body?.getReader();if(!reader)throw Error('invalid_search_response');
 const decoder=new TextDecoder();let text='',bytes=0;
 try{while(true){signal.throwIfAborted();const part=await reader.read();if(part.done)break;bytes+=part.value.length;if(bytes>262144)throw Error('invalid_search_response');text+=decoder.decode(part.value,{stream:true})}text+=decoder.decode();return parseSearchResults(JSON.parse(text))}
 finally{void reader.cancel().catch(()=>{})}
}
