// Server-only switch: the local launcher supplies an isolated in-memory provider.
export function operatorSample(){
  return process.env.STAYCRAFT_OPERATOR_SAMPLE==="1"&&process.env.STAYCRAFT_QA_AUTH_FIXTURES==="1"&&process.env.VERCEL!=="1"&&process.env.STAYCRAFT_HOSTED!=="1";
}
export function sampleCookieOptions(){return operatorSample()?{name:"staycraft-operator-sample-auth"}:undefined;}

// Live AI in the loopback sample is an explicit operator opt-in.
export function operatorModelEnabled(){
 return process.env.MODEL_ENABLED==='1'&&process.env.FORMAL_MODEL_ENABLED==='1'&&(!operatorSample()||process.env.STAYCRAFT_SAMPLE_LIVE_MODEL==='1');
}
