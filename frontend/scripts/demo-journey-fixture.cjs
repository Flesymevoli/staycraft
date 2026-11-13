const {randomUUID,createHash}=require('node:crypto');
module.exports=function createDemoJourney({sample,seed,profiles,inventories,properties,stays,batches,reloadDatabase}){
 const steps=['profile','import','collect','explore','finish'];let completed=[],chain=Promise.resolve();
 const saved=require('./demo-replay-prices.json');
 // Fill the next Saturday only in this isolated rehearsal seed, so the
 // visible diagnosis and chart demonstrate the same real inventory arithmetic.
 const anchor=new Date(seed.anchor+'T12:00:00Z');
 anchor.setUTCDate(anchor.getUTCDate()+(6-anchor.getUTCDay()+7)%7);
 const saturday=anchor.toISOString().slice(0,10);anchor.setUTCDate(anchor.getUTCDate()+1);
 const departure=anchor.toISOString().slice(0,10);
 for(const room of seed.inventory.rooms.filter(room=>room.active)){
  if(seed.bookings.some(b=>b.room_id===room.id&&b.status==='confirmed'&&b.arrival<=saturday&&b.departure>saturday))continue;
  const original=seed.bookings.find(b=>b.room_id===room.id),type=seed.inventory.types.find(type=>type.id===room.typeId),id=randomUUID();
  seed.bookings.push({...structuredClone(original),id,property_id:sample.propertyId,room_id:room.id,room_number:room.number,rooms:{number:room.number},type_id:room.typeId,type_name:type.name,arrival:saturday,departure,nightly_rate:type.price,total:type.price,status:'confirmed',refund_result:null,stay_state:'pending',checked_in_at:null,checked_out_at:null,guest_name:'周末住客',external_channel:'ctrip',external_id:'rehearsal-'+id,external_snapshot:{status:'confirmed',currency:'CNY',fictional:true}});
 }
 const dates=Object.keys(saved).sort();
 const snapshot=()=>({completed:[...completed],orders:sample.bookings.length,rooms:inventories.get(sample.propertyId).inventory.rooms.length,quotes:(batches.get(sample.propertyId)?.[0]?.quotes||[]).length,start:dates[0],end:dates.at(-1),capturedAt:saved[dates.at(-1)].capturedAt});
 return input=>{const run=async()=>{
  const action=input.action||'state';if(action==='state')return snapshot();
  if(!steps.includes(action))throw Error('invalid_demo_action');
  if(completed.includes(action))return snapshot();
  if(action==='finish'&&!completed.includes('import'))throw Error('demo_step_required');
  if(['profile','import','collect','explore'].includes(action)&&!completed.includes('profile')){
   const profile={...seed.profile,name:'后浪小筑',location:'江苏省苏州市太仓市后浪街区'};
   sample.profile=profile;profiles.set(sample.propertyId,{property_id:sample.propertyId,profile,revision:randomUUID()});properties.set(sample.ownerId,{id:sample.propertyId,name:profile.name});
   completed.push('profile');
  }
  if(action==='import'){
   inventories.set(sample.propertyId,{inventory:structuredClone(seed.inventory),revision:randomUUID()});sample.inventory=inventories.get(sample.propertyId).inventory;
   sample.bookings.splice(0,sample.bookings.length,...structuredClone(seed.bookings));
   stays.clear();for(const b of sample.bookings)if(b.stay_state&&b.stay_state!=='pending')stays.set(b.id,b.stay_state);
   await reloadDatabase();
  }else if(action==='collect'){
   const quotes=dates.flatMap(date=>saved[date].rows.map(row=>{const hotelId='list-'+createHash('sha256').update(row.name.normalize('NFKC')).digest('hex').slice(0,24);return {id:hotelId+':'+date,hotelId,source:'platform',sourceName:row.name,capturedAt:saved[date].capturedAt,stayDate:date,nights:1,adults:1,priceCny:row.priceCny,priceType:'display',status:'available',sourceUrl:'https://hotels.ctrip.com/hotels/list',note:'携程搜索列表起价'};}));
   batches.set(sample.propertyId,[{id:randomUUID(),property_id:sample.propertyId,source:'ctrip',captured_at:saved[dates.at(-1)].capturedAt,window_start:dates[0],window_end:dates.at(-1),quotes,quote_count:quotes.length,note:JSON.stringify({version:1,kind:'property_market_scope',location:sample.profile.location.normalize('NFKC').replace(/\s+/g,'')})}]);
  }
  if(!completed.includes(action))completed.push(action);return snapshot();
 };const pending=chain.then(run,run);chain=pending.catch(()=>{});return pending;};
};
