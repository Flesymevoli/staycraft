// Server-only switch: the local launcher supplies an isolated in-memory provider.
export function operatorSample(){
  return process.env.STAYCRAFT_OPERATOR_SAMPLE==="1"&&process.env.STAYCRAFT_QA_AUTH_FIXTURES==="1"&&process.env.VERCEL!=="1"&&process.env.STAYCRAFT_HOSTED!=="1";
}
export function sampleCookieOptions(){return operatorSample()?{name:"staycraft-operator-sample-auth"}:undefined;}

export function desktopTrial(){
 return process.env.NODE_ENV==='development'
  && process.env.STAYCRAFT_DESKTOP_DEV==='1'
  && process.env.STAYCRAFT_QA_DESKTOP_JOURNEY==='1'
  && process.env.STAYCRAFT_QA_AUTH_FIXTURES==='1'
  && process.env.NEXT_PUBLIC_SUPABASE_URL==='https://staycraft-qa.invalid'
  && process.env.STAYCRAFT_HOSTED!=='1'
  && process.env.VERCEL!=='1';
}

// Live AI in the loopback sample is an explicit operator opt-in.
export function operatorModelEnabled(){
 return (process.env.STAYCRAFT_DESKTOP_RUNTIME==='1'&&process.env.MODEL_ENABLED!=='0'&&process.env.FORMAL_MODEL_ENABLED!=='0'&&process.env.STAYCRAFT_HOSTED!=='1'&&!operatorSample())||process.env.MODEL_ENABLED==='1'&&process.env.FORMAL_MODEL_ENABLED==='1'&&(!operatorSample()||process.env.STAYCRAFT_SAMPLE_LIVE_MODEL==='1');
}
export function isDemoWorkspace(email?:string){
 const configured=process.env.DEMO_LOGIN_EMAIL?.trim().toLowerCase();
 return operatorSample()||Boolean(configured&&email?.trim().toLowerCase()===configured);
}
