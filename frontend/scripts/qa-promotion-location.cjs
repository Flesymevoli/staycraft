// Account/profile/source changes in memory only. No network, model or database writes.
const fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),assert=require('node:assert/strict');
const root=path.resolve('src'),cache=new Map();
const propertyId='11111111-1111-4111-8111-111111111111',sourceId='22222222-2222-4222-8222-222222222222';
let location='北京市测试地址',profileRevision='profile-a',revision=null,state={sources:[],drafts:[]},writes=0;
const db={from(table){let row;const query={select(){return query},eq(_key,value){if(_key==='property_id')assert.equal(value,propertyId);return query},abortSignal(){return query},insert(value){row=value;return query},update(value){row=value;return query},async maybeSingle(){return {error:null,data:table==='property_details'?{profile:{name:'虚构民宿',location},revision:profileRevision}:revision?{state,revision}:null}},then(resolve,reject){if(!row)return query.maybeSingle().then(resolve,reject);writes++;state=row.state;revision=row.revision;return Promise.resolve({error:null,data:[{state,revision}]}).then(resolve,reject)}};return query},rpc(){return {abortSignal:async()=>({data:{inventory:{rooms:[{active:true,typeId:'room-type'}],types:[{id:'room-type',name:'双人房',capacity:2}]},revision:'inventory-a'},error:null})}}};
class WorkspaceError extends Error{constructor(message,status){super(message);this.status=status}}
function load(file){
 const filename=path.resolve(root,file.endsWith('.ts')?file:file+'.ts');if(cache.has(filename))return cache.get(filename).exports;
 const module={exports:{}};cache.set(filename,module);
 const resolve=id=>{
  if(id==='server-only')return {};
  if(id.endsWith('workspace-access'))return {WorkspaceError,verifiedProperty:async()=>({supabase:db,propertyId}),writableProperty:async()=>({supabase:db,propertyId}),boundedBody:async request=>new Uint8Array(await request.arrayBuffer()),requireSameOrigin(){},workspaceFailure:error=>Response.json({error:error.message},{status:error.status||500})};
  if(id.endsWith('property-profile'))return {validateProfile:value=>value};
  if(id.endsWith('property-inventory'))return {validateInventory:value=>value};
  if(id.endsWith('decision-agent-store'))return {agentStore(){throw Error('unexpected diagnosis read')}};
  return id.startsWith('@/')?load(id.slice(2)):id.startsWith('.')?load(path.relative(root,path.resolve(path.dirname(filename),id))):require(id);
 };
 new Function('exports','require',ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(module.exports,resolve);return module.exports;
}
const {validPromotion,matchingSources}=load('lib/promotion');
const {promotionContext}=load('lib/promotion-context'),route=load('app/api/workspace/promotion/route');
const source={id:sourceId,title:'虚构北京活动',url:'https://example.com/event',summary:'公开活动日期',start:'2026-11-10',end:'2026-11-30',checkedOn:'2026-11-12',location};
const brief={language:'zh',channel:'wechat',goal:'rooms',start:'2026-11-14',end:'2026-11-15',sourceIds:[sourceId]};
const put=next=>route.PUT(new Request('http://localhost/api/workspace/promotion',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision,state:next})}));
(async()=>{
 assert(validPromotion({sources:[source],drafts:[]}));
 const {location:_,...legacy}=source;assert(validPromotion({sources:[legacy],drafts:[]}));
 assert.equal(matchingSources([source],brief,'北京市 测试地址').length,1);
 assert.equal(matchingSources([source,legacy],brief,'杭州市测试地址').length,0);
 assert.equal(matchingSources([legacy],brief,location).length,0);
 assert.equal((await put({sources:[source],drafts:[]})).status,200);assert.equal(writes,1);
 let context=await promotionContext(db,propertyId,brief);assert.equal(context.sources[0].title,source.title);await context.unchanged();
 location='杭州市测试地址';profileRevision='profile-b';
 await assert.rejects(()=>context.unchanged(),/promotion_changed/);
 await assert.rejects(()=>promotionContext(db,propertyId,brief),/promotion_source_required/);
 let reply=await route.GET();assert.equal((await reply.json()).location,location);
 assert.equal((await put({sources:[{...source,summary:'旧地址请求晚到'}],drafts:[]})).status,409);assert.equal(writes,1);
 // Historical records stay readable and savable, but cannot seed new-address copy.
 assert.equal((await put(state)).status,200);assert.equal(writes,2);
 assert.equal((await put({sources:[{...legacy,id:'33333333-3333-4333-8333-333333333333'}],drafts:[]})).status,409);
 const local={...source,title:'虚构杭州活动',location};
 assert.equal((await put({sources:[local],drafts:[]})).status,200);
 context=await promotionContext(db,propertyId,brief);assert.equal(context.sources[0].title,local.title);
 state={sources:[legacy],drafts:[]};await assert.rejects(()=>promotionContext(db,propertyId,brief),/promotion_source_required/);
 assert.equal((await promotionContext(db,propertyId,{...brief,sourceIds:[]})).sources.length,0);
 console.log('PASS promotion location: current address only, old/missing source scope blocked, in-flight profile edits detected, late old-source saves rejected, historical records retained. No network or real writes.');
})().catch(error=>{console.error(error);process.exitCode=1});
