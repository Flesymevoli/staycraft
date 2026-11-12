// Explicit, reviewed demo-only sync. Never deletes or rewrites existing orders.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {createSample}=require('./operator-sample-data.cjs');
const hash=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const overlaps=(a,b)=>a.arrival<b.departure&&a.departure>b.arrival;
function assertReviewedPlan(saved,plan){
 if(saved.ordersHash!==plan.ordersHash||saved.profileHash!==plan.profileHash||['rows','batch','nextProfile'].some(key=>hash(saved[key])!==hash(plan[key])))throw Error('reviewed_plan_changed_run_preview_again');
}

function planDemoOrders(sample,inventory,existing,anchor){
 const selected=[],skipped=[];
 for(const source of sample.bookings){
  const type=inventory.types.filter(t=>t.name===source.type_name);
  if(type.length!==1)throw Error('room_type_mapping_required');
  const rooms=inventory.rooms.filter(r=>r.typeId===type[0].id&&r.number===source.room_number&&r.active);
  if(rooms.length!==1)throw Error('room_mapping_required');
  const room=rooms[0],externalId=anchor.replaceAll('-','')+'-'+source.id;
  if(existing.some(b=>b.external_channel==='DEMO-RICH'&&b.external_id===externalId)){skipped.push({id:externalId,reason:'existing_identity'});continue;}
  const occupying=existing.filter(b=>b.status!=='cancelled');
  if(source.status!=='cancelled'&&occupying.some(b=>(b.room_id===room.id||b.room_number===room.number||!b.room_id&&b.type_id===type[0].id)&&overlaps(source,b))){skipped.push({id:externalId,reason:'existing_room_dates'});continue;}
  const status=source.status==='cancelled'?'cancelled':source.stay_state==='completed'?'completed':'confirmed';
  if(status!=='cancelled'&&selected.some(b=>b.status!=='cancelled'&&b.roomNumber===room.number&&overlaps(source,b)))throw Error('candidate_overlap');
  selected.push({channel:'DEMO-RICH',externalId,roomType:type[0].name,roomNumber:room.number,arrival:source.arrival,departure:source.departure,status,totalCents:Math.round(source.total*100),currency:'CNY',sourceUpdatedAt:anchor+'T00:00:00Z'});
 }
 return {selected,skipped};
}
function loadTs(file){
 const Module=require('node:module'),ts=require('typescript');const mod=new Module(file);
 mod.require=name=>name.startsWith('.')?loadTs(path.resolve(path.dirname(file),name)+'.ts'):require(name);
 mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);
 return mod.exports;
}

async function main(){
 const args=process.argv.slice(2),commit=args.includes('--commit');
 if(commit===args.includes('--preview'))throw Error('Choose exactly one: --preview (read-only) or --commit (approved plan only)');
 const option=name=>args[args.indexOf(name)+1];
 const propertyId=args.includes('--property')?option('--property'):'';
 const anchor=args.includes('--anchor')?option('--anchor'):'';
 if(!/^[a-f\d-]{36}$/.test(propertyId)||!/^\d{4}-\d{2}-\d{2}$/.test(anchor))throw Error('Use --property UUID --anchor YYYY-MM-DD [--commit]');
 const root=path.resolve(__dirname,'..');require('@next/env').loadEnvConfig(root);
 const base='https://staycraft.online';
 const {chromium}=require('playwright');const browser=await chromium.launch({headless:true});
 try{
  const context=await browser.newContext();
  await context.route('**/api/workspace/agent**',r=>r.fulfill({status:503,contentType:'application/json',body:'{"error":"demo_sync_no_model"}'}));
  const page=await context.newPage();await page.goto(base,{waitUntil:'networkidle'});
  await page.locator('#landing-trial .landing-cta').click();await page.waitForURL('**/app',{timeout:45000});
  let cookies=await context.cookies();
  const db=require('@supabase/ssr').createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{cookies:{getAll:()=>cookies,setAll:rows=>{for(const row of rows){cookies=cookies.filter(c=>c.name!==row.name);cookies.push(row);}}}});
  const user=await db.auth.getUser();if(user.error||!user.data.user)throw Error('demo_auth_failed');
  const p=await db.from('properties').select('id,name,owner_user_id').eq('id',propertyId).single();
  if(p.error||p.data.owner_user_id!==user.data.user.id||!p.data.name.includes('虚构演示'))throw Error('confirmed_demo_property_required');
  const profile=await db.from('property_details').select('profile').eq('property_id',propertyId).single();
  if(profile.error||!profile.data.profile.notes?.includes('虚构'))throw Error('fictional_profile_required');
  const inventoryResult=await db.rpc('get_room_inventory',{p_property:propertyId});
  if(inventoryResult.error||!inventoryResult.data?.inventory)throw Error('inventory_unavailable');
  const fields='id,property_id,room_id,room_number,type_id,type_name,arrival,departure,status,stay_state,total,external_channel,external_id,external_snapshot,source_updated_at';
  const orders=await db.from('direct_bookings').select(fields).eq('property_id',propertyId).order('id');
  if(orders.error||!orders.data)throw Error('orders_unavailable');
  const sample=createSample(anchor,{rich:true});
  const {selected,skipped}=planDemoOrders(sample,inventoryResult.data.inventory,orders.data,anchor);
  const snapshot=loadTs(path.join(root,'src/lib/market/collected.ts')).readCollectedSnapshot(root);
  if(!snapshot||snapshot.status!=='collected'||!snapshot.quotes.length)throw Error('collected_quotes_required');
  const dates=snapshot.quotes.map(q=>q.stayDate).sort();
  const batch={property_id:propertyId,source:'ctrip',captured_at:snapshot.capturedAt,window_start:dates[0],window_end:dates.at(-1),quotes:snapshot.quotes,quote_count:snapshot.quotes.length,note:loadTs(path.join(root,'src/lib/market/snapshot-scope.ts')).marketScopeNote(sample.profile.location)};
  const nextProfile={...profile.data.profile,location:sample.profile.location,notes:sample.profile.notes};
  const preview=selected.length?await db.rpc('process_booking_import',{p_property:propertyId,p_rows:selected,p_commit:false}):{data:{rows:[]}};
  if(preview.error||preview.data.rows.some(r=>r.action!=='new'))throw Error('add_only_preview_failed:'+String(preview.error?.message||''));
  const summary={propertyId,anchor,oldOrders:orders.data.length,newOrders:selected.length,skipped:skipped.length,completed:selected.filter(r=>r.status==='completed').length,future:selected.filter(r=>r.status==='confirmed').length,cancelled:selected.filter(r=>r.status==='cancelled').length,lastDeparture:selected.map(r=>r.departure).sort().at(-1),quotes:batch.quote_count,hotels:snapshot.hotels,quoteWindow:[batch.window_start,batch.window_end],oldLocation:profile.data.profile.location,newLocation:nextProfile.location};
  const file=path.join(root,'.price-monitor',`hosted-demo-plan-${anchor}.json`);
  const plan={summary,ordersHash:hash(orders.data),profileHash:hash(profile.data.profile),rows:selected,skipped,batch,nextProfile,originalOrders:orders.data};
  if(!commit){fs.writeFileSync(file,JSON.stringify(plan,null,2));console.log(JSON.stringify({...summary,mode:'preview',planFile:file}));return;}
  const saved=JSON.parse(fs.readFileSync(file,'utf8'));
  assertReviewedPlan(saved,plan);
  // Snapshot identities are unique; a retry never overwrites an earlier batch.
  const prior=await db.from('market_quote_batches').select('id,quote_count').eq('property_id',propertyId).eq('source','ctrip').eq('captured_at',batch.captured_at).eq('window_start',batch.window_start).eq('window_end',batch.window_end);
  if(prior.error)throw Error('market_table_unavailable');
  if(!prior.data.length){const result=await db.from('market_quote_batches').insert(batch);if(result.error)throw Error('quote_insert_failed:'+result.error.code);}
  const updated=await db.from('property_details').update({profile:nextProfile}).eq('property_id',propertyId).select('property_id');
  if(updated.error||updated.data?.length!==1)throw Error('profile_update_failed');
  let imported={rows:[],saved:true};
  if(selected.length){const result=await db.rpc('process_booking_import',{p_property:propertyId,p_rows:selected,p_commit:true,p_revision:preview.data.revision,p_confirm_unversioned:false});if(result.error)throw Error('import_failed:'+result.error.message);imported=result.data;}
  const after=await db.from('direct_bookings').select(fields).eq('property_id',propertyId).order('id');
  if(after.error)throw Error('verification_read_failed');
  const oldIds=new Set(orders.data.map(b=>b.id));
  if(hash(after.data.filter(b=>oldIds.has(b.id)))!==hash(orders.data))throw Error('existing_records_changed');
  if(after.data.length!==orders.data.length+selected.length)throw Error('unexpected_import_count');
  const repeated=selected.length?await db.rpc('process_booking_import',{p_property:propertyId,p_rows:selected,p_commit:false}):{data:{rows:[]}};
  if(repeated.error||repeated.data.rows.some(r=>r.action!=='duplicate'))throw Error('duplicate_check_failed');
  const metrics={};
  for(const [label,start,end] of [['week',anchor,new Date(Date.parse(anchor)+6*86400000).toISOString().slice(0,10)],['demoday','2026-11-18','2026-11-20']]){
   const result=await db.rpc('get_booking_metrics_range',{p_property:propertyId,p_start:start,p_end:end});
   if(result.error)throw Error('metrics_verification_failed');metrics[label]=result.data;
  }
  fs.writeFileSync(file.replace('.json','-result.json'),JSON.stringify({summary,saved:imported.saved,newCount:selected.length,totalOrders:after.data.length,originalOrdersUnchanged:true,repeatIsDuplicate:true,metrics},null,2));
  console.log(JSON.stringify({...summary,mode:'committed',totalOrders:after.data.length,originalOrdersUnchanged:true,repeatIsDuplicate:true,metrics}));
 }finally{await browser.close();}
}
module.exports={planDemoOrders,assertReviewedPlan};
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
