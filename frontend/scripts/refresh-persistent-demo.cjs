// Incremental fictional demo bookings only. Default is read-only; --apply adds
// current-date examples via the public booking flow. Never resets old records.
const assert=require('node:assert/strict'),fs=require('node:fs'),{randomUUID}=require('node:crypto');
require('@next/env').loadEnvConfig(process.cwd());
const {createServerClient}=require('@supabase/ssr');
const today=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai'}).format(new Date());
function day(date,offset){const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+offset);return d.toISOString().slice(0,10)}
function plan(anchor,types){assert.equal(types.length,3,'Expected the existing three fictional demo room types');return [[0,2,0,'A'],[0,1,1,'B'],[1,3,2,'C'],[7,9,0,'D']].map(([from,to,type,key])=>({arrival:day(anchor,from),departure:day(anchor,to),typeId:types[type].id,price:types[type].price,name:`近期演示${key}（虚构）`,phone:'00000000000',expectedArrival:'18:00 前',requestId:randomUUID()}))}
module.exports={plan};
if(require.main===module)(async()=>{
const jar=new Map(),client=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:items=>items.forEach(({name,value})=>jar.set(name,value))}});
const auth=await client.auth.signInWithPassword({email:'demo@example.invalid',password:'staycraft-demo'});assert.ok(!auth.error,'Demo sign-in failed');assert.equal(auth.data.user.email,'demo@example.invalid');
try{
const owned=await client.from('properties').select('id').eq('owner_user_id',auth.data.user.id).single();assert.ok(!owned.error,'Demo property unavailable');const property=owned.data.id,base='https://staycraft.online';
const headers={Origin:base,'Content-Type':'application/json',cookie:[...jar].map(([name,value])=>name+'='+value).join('; ')};
const read=async path=>{const response=await fetch(base+path,{headers,signal:AbortSignal.timeout(30000)});assert.equal(response.status,200,path);return response.json()};
const [profile,inventory,before,metricsBefore]=await Promise.all([read('/api/workspace/profile'),read('/api/workspace/inventory'),read('/api/workspace/bookings'),read('/api/workspace/metrics?days=7')]);
assert.match(profile.profile?.name||'',/虚构|演示/,'Refusing non-fictional property');assert.equal(inventory.inventory.rooms.length,6,'Refusing a modified demo property');
const types=inventory.inventory.types;assert.equal(types.length,3);const anchor=today(),planned=plan(anchor,types),existing=before.bookings;
const todo=planned.filter(p=>!existing.some(b=>b.guest_name===p.name&&b.arrival===p.arrival&&b.departure===p.departure&&b.type_name===types.find(t=>t.id===p.typeId).name));
console.log(JSON.stringify({mode:process.argv.includes('--apply')?'apply':'read-only',anchor,existingBookings:existing.length,bookedRoomNightsBefore:metricsBefore.booked_room_nights,newFictionalBookings:todo.map(({name,arrival,departure})=>({name,arrival,departure}))}));
if(!process.argv.includes('--apply'))return;
assert(existing.length+todo.length<100,'Demo size limit reached; review before adding more');
const session=await fetch(base+'/api/guest',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({property,action:'session'}),signal:AbortSignal.timeout(30000)});assert.equal(session.status,200);const guestCookie=session.headers.getSetCookie().map(v=>v.split(';')[0]).find(v=>v.startsWith('staycraft-guest='));assert(guestCookie);
const created=[];
for(const booking of todo){
 const catalog=await fetch(base+'/api/guest?'+new URLSearchParams({property,arrival:booking.arrival,departure:booking.departure}),{signal:AbortSignal.timeout(30000)});assert.equal(catalog.status,200);const available=(await catalog.json()).types.find(t=>t.id===booking.typeId);assert(available?.available>0,'No demo availability; existing bookings kept');
 const response=await fetch(base+'/api/guest',{method:'POST',headers:{Origin:base,'Content-Type':'application/json',cookie:guestCookie},body:JSON.stringify({property,action:'book',...booking}),signal:AbortSignal.timeout(30000)});assert.equal(response.status,200,'Booking failed; existing data was not reset');const saved=await response.json();assert(saved.id);created.push({id:saved.id,arrival:saved.arrival,departure:saved.departure,name:saved.guest_name});
}
const [after,metrics7,metrics28]=await Promise.all([read('/api/workspace/bookings'),read('/api/workspace/metrics?days=7'),read('/api/workspace/metrics?days=28')]);
for(const old of existing){const current=after.bookings.find(b=>b.id===old.id);assert.deepEqual(current,old,'An existing booking changed during refresh')}
assert.equal(after.bookings.length,existing.length+created.length);assert(metrics7.booked_room_nights>0);assert(metrics28.booked_room_nights>=metrics7.booked_room_nights);
const report={anchor,created,preservedBookings:existing.length,totalBookings:after.bookings.length,metrics7:{booked:metrics7.booked_room_nights,capacity:metrics7.capacity_room_nights,amount_cents:metrics7.amount_cents},metrics28:{booked:metrics28.booked_room_nights,capacity:metrics28.capacity_room_nights,amount_cents:metrics28.amount_cents}};
fs.writeFileSync('qa-demo-refresh-'+anchor+'.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));console.log('PASS incremental fictional demo refresh: ordinary Auth/public guest booking flow; old bookings unchanged, current 7/28-day data present, no model requests or real payments.');
}finally{await client.auth.signOut({scope:'local'})}
})().catch(e=>{console.error(e.message);process.exitCode=1});
