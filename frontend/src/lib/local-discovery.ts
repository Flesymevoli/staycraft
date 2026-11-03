import {publicSourceUrl} from './promotion';
export type LocalSearchResult={title:string;url:string;snippet:string;publishedAt:string|null;site:string};
export function searchConfigured(){return !!process.env.SEARCH_API_KEY;}
export function parseSearchResults(value:unknown):LocalSearchResult[]{
 if(!value||typeof value!=='object'||!Array.isArray((value as {results?:unknown}).results))throw Error('invalid_search_response');
 const seen=new Set<string>();const results:LocalSearchResult[]=[];
 for(const item of (value as {results:Record<string,unknown>[]}).results){
  if(!item||!publicSourceUrl(item.url)||typeof item.title!=='string'||!item.title.trim()||typeof item.snippet!=='string'||!item.snippet.trim()||typeof item.rerank_score!=='number'||item.rerank_score<1.5||seen.has(item.url))continue;
  seen.add(item.url);const clean=(v:string,n:number)=>v.replace(/[\u0000-\u001f]/g,' ').trim().slice(0,n);
  results.push({title:clean(item.title,120),url:item.url,snippet:clean(item.snippet,600),publishedAt:typeof item.date==='string'&&Number.isFinite(Date.parse(item.date))?item.date:null,site:typeof item.site_name==='string'?clean(item.site_name,80):new URL(item.url).hostname});
  if(results.length===5)break;
 }
 return results;
}
export async function searchLocal(location:string,start:string,end:string,options:{fetcher?:typeof fetch;signal?:AbortSignal}={}){
 const key=process.env.SEARCH_API_KEY;
 if(!key)throw Error('search_not_configured');
 // Dedicated search credentials: never send the course gateway's model key here.
 const response=await(options.fetcher||fetch)('https://api.deepseek.com/v1/tools/search',{method:'POST',redirect:'manual',cache:'no-store',signal:options.signal?AbortSignal.any([options.signal,AbortSignal.timeout(15000)]):AbortSignal.timeout(15000),headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({query:`${location} ${start} ${end} 展览 文旅 官方 活动`.slice(0,128),count:5,need_content:false})});
 if(!response.ok)throw Error(response.status===429?'search_busy':'search_unavailable');
 const text=await response.text();if(text.length>200000)throw Error('invalid_search_response');
 return parseSearchResults(JSON.parse(text));
}
