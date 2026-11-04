const assert=require('node:assert/strict');
const fs=require('node:fs');
function day(anchor,offset){return new Date(Date.parse(anchor+'T12:00:00Z')+offset*86400000).toISOString().slice(0,10)}
function plan(anchor,inventory,existing){
 const types=new Map(inventory.types.map(t=>[t.id,t]));
 const rooms=inventory.rooms.filter(r=>r.active),rows=[];
 for(const [i,offset] of [-20,-17,-14,-11,-8,-5,-2,0,1,3,5,7,9,12,15,18,22,25].entries()){
  for(let slot=0;slot<2;slot++){
   const room=rooms[(i+slot*2)%rooms.length],type=types.get(room.typeId),arrival=day(anchor,offset),departure=day(anchor,offset+1+(i+slot)%3);
   const id=`RECENT-${anchor}-${i}-${slot}`;
   if(existing.some(b=>b.external_channel==='DEMO'&&b.external_id===id))continue;
   const overlaps=b=>b.status!=='cancelled'&&(b.room_id===room.id||b.room_number===room.number)&&b.arrival<departure&&b.departure>arrival;
   if(existing.some(overlaps)||rows.some(overlaps))continue;
   const weekend=[5,6].includes(new Date(arrival+'T12:00:00Z').getUTCDay());
   const total=Math.round(type.price*(weekend?1.12:.94)*(Date.parse(departure)-Date.parse(arrival))/86400000);
   rows.push({external_id:id,room_id:room.id,room_number:room.number,type_name:type.name,arrival,departure,status:departure<=anchor?'completed':'confirmed',total});
  }
 }
 return rows;
}
module.exports={plan};
if(require.main===module)(async()=>{
 require('@next/env').loadEnvConfig(process.cwd(),false,{info(){},error(){}});
 const {createServerClient}=require('@supabase/ssr');
 const jar=new Map(),base='https://staycraft.online';
 const legacy=fs.readFileSync('scripts/refresh-persistent-demo.cjs','utf8');
 const email=legacy.match(/email:'([^']+)'/)[1],password=legacy.match(/password:'([^']+)'/)[1];
 const client=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:items=>items.forEach(({name,value})=>jar.set(name,value))}});
 const auth=await client.auth.signInWithPassword({email,password});assert(!auth.error,'Existing fictional demo login failed');
 try{
  const headers={Origin:base,'Content-Type':'application/json',cookie:[...jar].map(([name,value])=>name+'='+value).join('; ')};
  const read=async path=>{const r=await fetch(base+path,{headers,signal:AbortSignal.timeout(30000)});assert.equal(r.status,200,path);return r.json()};
  const [profile,inventory,before]=await Promise.all([read('/api/workspace/profile'),read('/api/workspace/inventory'),read('/api/workspace/bookings')]);
  assert.match(profile.profile.name,/虚构|演示/);assert.equal(inventory.inventory.rooms.length,6);assert.equal(inventory.inventory.types.length,3);
  const anchor=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai'}).format(new Date());
  const rows=plan(anchor,inventory.inventory,before.bookings);
  const summary={anchor,preserved:before.bookings.length,newRows:rows.length,completed:rows.filter(r=>r.status==='completed').length,upcoming:rows.filter(r=>r.status==='confirmed').length,from:rows[0]?.arrival,through:rows.at(-1)?.departure};
  console.log(JSON.stringify({...summary,mode:process.argv.includes('--apply')?'apply':'preview'}));
  if(!rows.length||!process.argv.includes('--apply'))return;
  assert(before.bookings.length+rows.length<=100,'Demo limit reached; review existing samples before adding more');
  const csv=['channel,external_id,room_type,room_number,arrival,departure,status,total,currency,source_updated_at',...rows.map(r=>['DEMO',r.external_id,r.type_name,r.room_number,r.arrival,r.departure,r.status,r.total,'CNY',anchor+'T00:00:00Z'].map(v=>'"'+String(v).replaceAll('"','""')+'"').join(','))].join('\r\n');
  const run=async body=>{const r=await fetch(base+'/api/workspace/booking-import',{method:'POST',headers,body:JSON.stringify(body),signal:AbortSignal.timeout(30000)});const data=await r.json();assert.equal(r.status,200,JSON.stringify(data));return data};
  const preview=await run({csv,commit:false});assert(preview.canCommit&&preview.revision);assert(preview.rows.every(r=>r.action==='new'),'Only new fictional records may be imported');
  const result=await run({csv,commit:true,revision:preview.revision});assert(result.saved);
  const after=await read('/api/workspace/bookings');
  for(const old of before.bookings)assert.deepEqual(after.bookings.find(b=>b.id===old.id),old,'Existing booking changed');
  assert.equal(after.bookings.length,before.bookings.length+rows.length);
  const repeat=await run({csv,commit:false});assert(repeat.rows.every(r=>r.action==='duplicate'));
  const metrics=await read('/api/workspace/metrics?start='+anchor+'&end='+day(anchor,27));assert(metrics.booked_room_nights>0);
  console.log(JSON.stringify({...summary,total:after.bookings.length,bookedNext28:metrics.booked_room_nights,passed:true}));
 }finally{await client.auth.signOut({scope:'local'})}
})().catch(e=>{console.error(e.message);process.exitCode=1});
