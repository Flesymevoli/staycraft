// Bound the whole browser request, including a response body that never ends.
// Keep timeout distinct from the owner's cancellation and unmount cleanup.
export async function promotionRequest(url:string,init:RequestInit={},timeoutMs=25000){
 const timeout=AbortSignal.timeout(timeoutMs);
 const signal=init.signal?AbortSignal.any([init.signal,timeout]):timeout;
 try{
  const response=await fetch(url,{...init,signal});
  const data=await response.json();
  if(!response.ok)throw Error(data.error||'promotion_unavailable');
  return data;
 }catch(error){if(timeout.aborted)throw Error('promotion_timeout');throw error}
}
