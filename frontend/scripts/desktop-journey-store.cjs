// In-memory PostgREST-shaped adapter for the isolated desktop journey only.
// The production agent, detectors and plan routes still execute unchanged.
const rows=[];
const json=(value,status=200)=>Response.json(value,{status});
const field=(row,key)=>key.split(/->>?/).reduce((value,part)=>value?.[part],row);
module.exports=function(url,init,property){
 if(process.env.STAYCRAFT_QA_DESKTOP_JOURNEY!=='1'||process.env.STAYCRAFT_QA_IMPORT_DB!=='1')throw Error('isolated_desktop_journey_only');
 const params=url.searchParams,method=init?.method||'GET';
 const match=row=>row.property_id===property&&[...params].every(([key,value])=>{
  if(['select','order','limit','offset'].includes(key))return true;
  const raw=field(row,key);
  if(value.startsWith('eq.'))return String(raw)===value.slice(3);
  if(value.startsWith('neq.'))return String(raw)!==value.slice(4);
  if(value==='not.is.null')return raw!==null&&raw!==undefined;
  if(value==='is.null')return raw===null||raw===undefined;
  if(value.startsWith('lt.'))return raw<value.slice(3);
  if(value.startsWith('gte.'))return raw>=value.slice(4);
  if(value.startsWith('in.('))return value.slice(4,-1).split(',').includes(String(raw));
  throw Error('Unsupported agent-store fixture filter: '+key);
 });
 if(method==='POST'){
  const body=JSON.parse(init.body);
  if(body.property_id!==property)return json({code:'42501'},403);
  if(rows.some(row=>row.property_id===property&&row.language===body.language&&row.status==='running'))return json({code:'23505'},409);
  const now=new Date().toISOString();
  rows.push({status:'running',steps:[],result:null,engine:null,error:null,created_at:now,updated_at:now,completed_at:null,...body});
  return json([rows.at(-1)],201);
 }
 if(method==='PATCH'){
  const body=JSON.parse(init.body),changed=[];
  for(const row of rows)if(match(row)){Object.assign(row,body);changed.push(row);}
  return json(changed);
 }
 if(method!=='GET')throw Error('Unexpected agent-store fixture method');
 const selected=rows.filter(match).sort((a,b)=>b.created_at.localeCompare(a.created_at)).slice(0,Number(params.get('limit')||rows.length));
 return json(selected.map(row=>({...row,summary:row.result?.summary||'',actionPlan:row.result?.actionPlan??null})));
};
