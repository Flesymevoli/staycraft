const {PGlite}=require('@electric-sql/pglite');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const root=path.resolve(__dirname,'..');
const a={id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',property:'11111111-1111-4111-8111-111111111111'};
const b={id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',property:'22222222-2222-4222-8222-222222222222'};
const sample={hotelId:'123',hotelName:'虚构测试民宿',stayDate:'2026-11-12',capturedAt:'2026-11-11T08:00:00+08:00',currency:'CNY',kind:'calendar_reference',rooms:1,adults:2,children:0,nights:1,status:'observed',amount:325,sourceUrl:'https://hotels.ctrip.com/hotels/123.html',authScope:'test-do-not-upload'};
const payload=(account=a)=>({userId:account.id,propertyId:account.property,start:'2026-11-12',end:'2026-11-18',observations:[sample]});
function load(file,mocks){
 const module=new Module(file);
 module.require=name=>Object.hasOwn(mocks,name)?mocks[name]:name.startsWith('@/')?load(path.join(root,'src',name.slice(2)+'.ts'),mocks):name.startsWith('.')?load(path.resolve(path.dirname(file),name+'.ts'),mocks):require(name);
 module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);
 return module.exports;
}
(async()=>{
 const db=new PGlite();
 try{
  await db.exec(`create role anon; create role authenticated; create schema auth;
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   grant usage on schema auth to authenticated;
   create table properties(id uuid primary key,owner_user_id uuid);
   grant select on properties to authenticated;`);
  for(const account of [a,b])await db.query('insert into properties values ($1,$2)',[account.property,account.id]);
  await db.exec(fs.readFileSync(path.join(root,'../supabase/migrations/20261110000200_market_quote_batches.sql'),'utf8'));
  let active=a;
  let demo=false;
  const fields=['property_id','source','captured_at','window_start','window_end','quotes','quote_count','note'];
  const receipt='id,captured_at,window_start,window_end,quote_count';
  const supabase={from(table){
   if(table==='property_details')return {select(){return {eq(key,value){assert.equal(key,'property_id');assert.equal(value,active.property);return {async maybeSingle(){return {data:{profile:{location:active===a?'杭州地址':'苏州地址'}}}}}}}}};
   assert.equal(table,'market_quote_batches');
   return {
    insert(row){return {select(){return {async single(){try{
     const query='insert into market_quote_batches ('+fields.join(',')+') values ($1,$2,$3,$4,$5,$6,$7,$8) returning '+receipt;
     const result=await db.query(query,fields.map(f=>f==='quotes'?JSON.stringify(row[f]):row[f]));
     return {data:result.rows[0]};
    }catch(error){return {error}}}}}}},
    select(){const filters={};const query={eq(key,value){filters[key]=value;return query},async maybeSingle(){
     const keys=['property_id','source','captured_at','window_start','window_end'];
     const result=await db.query('select '+receipt+',quotes from market_quote_batches where '+keys.map((key,i)=>key+'=$'+(i+1)).join(' and '),keys.map(key=>filters[key]));
     return {data:result.rows[0]};
    }};return query}
   };
  }};
  class WorkspaceError extends Error{constructor(code,status){super(code);this.status=status}}
  const mocks={
   '@/lib/operator-sample':{operatorSample:()=>demo},
   '@/lib/workspace-access':{
    verifiedProperty:async()=>({supabase,propertyId:active.property,user:{id:active.id}}),
    requireSameOrigin:request=>{if(request.headers.get('origin')!=='https://local.test')throw new WorkspaceError('invalid_origin',403)},
    boundedBody:request=>request.arrayBuffer(),
    WorkspaceError,
    workspaceFailure:error=>Response.json({error:error.message},{status:error.status||503})
   }
  };
  const {GET,POST}=load(path.join(root,'src/app/api/workspace/market/sync/route.ts'),mocks);
  await db.exec('set role authenticated');
  async function switchTo(account){active=account;await db.query("select set_config('request.jwt.claim.sub',$1,false)",[account.id]);}
  const post=(body,origin='https://local.test')=>POST(new Request('https://local.test/api/workspace/market/sync',{method:'POST',headers:{Origin:origin},body:JSON.stringify(body)}));
  await switchTo(a);
  assert.deepEqual(await (await GET()).json(),{userId:a.id,propertyId:a.property});
  const first=await post(payload());assert.equal(first.status,201);const saved=(await first.json()).batch;
  const retry=await post(payload());assert.equal(retry.status,200);assert.equal((await retry.json()).batch.id,saved.id);
  assert.equal((await post({...payload(),observations:[{...sample,amount:500}]})).status,409);
  assert.equal((await post({...payload(),observations:[sample,sample]})).status,400);
  assert.equal((await post({...payload(),observations:[{...sample,stayDate:'2026-11-19'}]})).status,400);
  assert.equal((await post(payload(),'https://other.test')).status,403);
  const rows=(await db.query('select quotes,note from market_quote_batches')).rows;
  assert.equal(JSON.parse(rows[0].note).location,'杭州地址');
  assert.equal(rows.length,1);assert.equal(rows[0].quotes[0].priceCny,325);assert(!Object.hasOwn(rows[0].quotes[0],'authScope'));
  await switchTo(b);
  assert.equal((await post(payload())).status,409);
  assert.equal((await db.query('select id from market_quote_batches')).rows.length,0);
  assert.equal((await post(payload(b))).status,201);
  assert.notEqual((await db.query('select id from market_quote_batches')).rows[0].id,saved.id);
  demo=true;assert.equal((await post(payload(b))).status,403);
  await switchTo(a);assert.equal((await db.query('select id from market_quote_batches')).rows[0].id,saved.id);
  demo=false;
  const listing={...sample,kind:'display_starting_price',capturedAt:'2026-11-11T03:00:00Z'};
  assert.equal((await post({...payload(),observations:[listing]})).status,201);
  assert.equal((await post({...payload(),observations:[listing]})).status,200);
  assert.equal((await post({...payload(),observations:[listing,sample]})).status,400);
  const listRow=(await db.query("select quotes from market_quote_batches where quotes->0->>'priceType'='display'")).rows[0];
  assert.equal(listRow.quotes[0].priceType,'display');
  assert(!Object.hasOwn(listRow.quotes[0],'authScope'));
  console.log('PASS desktop sync route + PGlite: account scope, two isolated owners, duplicate retry, conflict, origin, demo, validation, and local session field exclusion');
 }finally{await db.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
