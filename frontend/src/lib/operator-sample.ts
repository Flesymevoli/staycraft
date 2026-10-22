// Server-only switch: the local launcher supplies an isolated in-memory provider.
export function operatorSample(){
  return process.env.STAYCRAFT_OPERATOR_SAMPLE==="1"&&process.env.STAYCRAFT_QA_AUTH_FIXTURES==="1"&&process.env.VERCEL!=="1"&&process.env.STAYCRAFT_HOSTED!=="1";
}
export function sampleCookieOptions(){return operatorSample()?{name:"staycraft-operator-sample-auth"}:undefined;}
