// Process-local receipts prevent concurrent/retried requests from invoking the
// model twice. A missing receipt after restart is UNKNOWN, never permission to
// automatically repeat a paid request.
type Receipt={digest:string;state:'running'|'complete'|'failed';value?:unknown;error?:string;promise:Promise<unknown>;created:number};
const globalReceipts=globalThis as typeof globalThis&{staycraftGenerationReceipts?:Map<string,Receipt>};
const receipts=globalReceipts.staycraftGenerationReceipts??=new Map<string,Receipt>();
export function generationReceipt(key:string){const item=receipts.get(key);return item?{state:item.state,value:item.value,error:item.error}:{state:'unknown' as const}}
export function generateOnce<T>(key:string,digest:string,work:()=>Promise<T>):Promise<T>{
 const existing=receipts.get(key);
 if(existing){if(existing.digest!==digest)throw Error('generation_request_conflict');return existing.promise as Promise<T>}
 for(const [id,item] of receipts)if(item.state!=='running'&&Date.now()-item.created>86400000)receipts.delete(id);
 if(receipts.size>=200)throw Error('generation_capacity');
 const entry:Receipt={digest,state:'running',created:Date.now(),promise:Promise.resolve()};
 const pending=Promise.resolve().then(work);entry.promise=pending;receipts.set(key,entry);
 void pending.then(value=>{entry.state='complete';entry.value=value},error=>{entry.state='failed';const code=typeof error?.code==='string'?error.code:error instanceof Error?error.message:'';entry.error=['promotion_rate_limited','promotion_timeout','promotion_invalid_copy','promotion_model_unavailable','promotion_changed','promotion_location_changed'].includes(code)?code:'generation_failed'});
 return pending;
}
