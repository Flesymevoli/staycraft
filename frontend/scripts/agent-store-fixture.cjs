// QA-only persistent diagnosis store. Imported exclusively by the loopback fixture server.
const fs=require('node:fs'),path=require('node:path');
module.exports=function(url,init,property){
 const file=process.env.STAYCRAFT_QA_AGENT_STORE || path.resolve(__dirname,'../../tmp/sample-agent-runs-v2.json');
 let rows=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):[];
 const json=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{'Content-Type':'application/json'}});
 const params=url.searchParams,method=init?.method||'GET',match=row=>{if(row.property_id!==property)return false;for(const [k,v]of params){if(['select','order','limit','offset'].includes(k))continue;const raw=row[k];if(v.startsWith('eq.')&&String(raw)!==v.slice(3))return false;if(v.startsWith('in.(')&&!v.slice(4,-1).split(',').includes(String(raw)))return false;if(v.startsWith('lt.')&&!(raw<v.slice(3)))return false;if(v.startsWith('gte.')&&!(raw>=v.slice(4)))return false;}return true;};
 if(method==='POST'){const body=JSON.parse(init.body);if(body.property_id!==property)return json({code:'42501'},403);if(rows.some(r=>r.property_id===property&&r.language===body.language&&r.status==='running'))return json({code:'23505'},409);rows.push({status:'running',steps:[],result:null,engine:null,error:null,created_at:new Date().toISOString(),updated_at:new Date().toISOString(),completed_at:null,...body});fs.writeFileSync(file,JSON.stringify(rows));return json([rows.at(-1)],201);}
 if(method==='PATCH'){const body=JSON.parse(init.body),changed=[];rows=rows.map(r=>{if(!match(r))return r;const next={...r,...body};changed.push(next);return next});fs.writeFileSync(file,JSON.stringify(rows));return json(changed);}
 let found=rows.filter(match).sort((a,b)=>b.created_at.localeCompare(a.created_at));if(params.has('limit'))found=found.slice(0,Number(params.get('limit')));return json(found.map(r=>({...r,summary:r.result?.summary||''})));
};
