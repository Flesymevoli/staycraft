// Loaded only by the isolated QA server; no production imports and no cloud writes.
if (process.env.STAYCRAFT_QA_AUTH_FIXTURES === '1') {
  const sampleMode=process.env.STAYCRAFT_OPERATOR_SAMPLE==='1';
  if(sampleMode&&(process.env.VERCEL==='1'||process.env.STAYCRAFT_HOSTED==='1'||!process.argv.includes('127.0.0.1')))throw new Error('Samples require a separate loopback-only server');
  const sample=(sampleMode||process.env.STAYCRAFT_QA_FORMAL_STAYS==='1')?require('./operator-sample-data.cjs').createSample(process.env.STAYCRAFT_SAMPLE_DATE||undefined):null;
  const conversations=require('./conversation-fixture.cjs')(sample,propertyId=>profiles.get(propertyId));
  const originalFetch = globalThis.fetch;
  const profiles = new Map();
  const inventories = new Map();
  const photos = new Map();
  const properties=new Map([['bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',{id:'dddddddd-dddd-4ddd-8ddd-dddddddddddd',name:'Account B private property'}]]);
  const propertyFor=index=>index===1?'dddddddd-dddd-4ddd-8ddd-dddddddddddd':index===0?'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee':'ffffffff-ffff-4fff-8fff-ffffffffffff';
  const ids = ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'];
  const tokens = new Map(ids.map((id, index) => {
    const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
    const token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: id, exp: 4102444800, iat: 1700000000, aud: 'authenticated', role: 'authenticated' })}.qa-signature`;
    return [token, { id, index }];
  }));
  if(sample){
    properties.set(sample.ownerId,{id:sample.propertyId,name:sample.profile.name});
    profiles.set(sample.propertyId,{property_id:sample.propertyId,profile:sample.profile,revision:'20000000-0000-4000-8000-000000000001'});
    inventories.set(sample.propertyId,{inventory:sample.inventory,revision:'20000000-0000-4000-8000-000000000002'});
  }
  const stays=new Map(sample?sample.bookings.filter(b=>b.arrival<sample.anchor&&b.departure===sample.anchor&&b.status==='confirmed').map(b=>[b.id,'checked_in']):[]);
  globalThis.fetch = async (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
    const identity = tokens.get((headers.get('authorization') || '').replace(/^Bearer /, ''));
    if (url.hostname !== 'husrpqalpjjswpvrkxet.supabase.co') {
      if(sampleMode&&!['127.0.0.1','localhost','[::1]'].includes(url.hostname))throw new Error('External network disabled in sample');
      if(sampleMode&&/\/v1\/properties\/[^/]+\/conversations\/[^/]+\/draft$/.test(url.pathname))return conversations(url,JSON.parse(init?.body||'{}'),identity,identity?propertyFor(identity.index):null);
      return originalFetch(input, init);
    }
    const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
    const conversation=url.pathname.startsWith('/rest/v1/')?conversations(url,init?.body&&typeof init.body==='string'?JSON.parse(init.body):{},identity,identity?propertyFor(identity.index):null):null;
    if(conversation)return conversation;
    if(sample&&url.pathname==='/auth/v1/token'){
      const body=JSON.parse(init.body||'{}');
      if(body.email!=='demo@example.invalid'||body.password!=='staycraft-demo')return json({message:'Invalid demo credentials',code:'invalid_credentials'},400);
      const token=[...tokens].find(([,value])=>value.id===sample.ownerId)[0];
      return json({access_token:token,refresh_token:'sample-only',token_type:'bearer',expires_in:3600,expires_at:4102444800,user:{id:sample.ownerId,email:'demo@example.invalid',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},identities:[],created_at:'2026-01-01T00:00:00Z'}});
    }
    if (!identity) return json({ message: 'Invalid session' }, 401);
    if (url.pathname === '/auth/v1/user') return json({ id: identity.id, email: `account-${identity.index}@example.invalid`, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, identities: [], created_at: '2026-01-01T00:00:00Z' });
    if (url.pathname === '/auth/v1/logout') return json({});
    if(url.pathname==='/rest/v1/rpc/review_booking_cancellation'){
      const body=JSON.parse(init.body||'{}');if(!sample||identity.id!==sample.ownerId||body.p_property!==sample.propertyId)return json({message:'property_not_owned'},403);
      const b=sample.bookings.find(b=>b.id===body.p_booking),result=body.p_decision==='approve'?'review_approved':'review_rejected';
      if(!b||!['approve','reject'].includes(body.p_decision))return json({message:'review_changed'},409);
      if(b.refund_result===result)return json({id:b.id,status:b.status,refund_result:result});
      if(b.refund_result!=='review_pending'||b.status!=='confirmed'||stays.get(b.id)&&stays.get(b.id)!=='pending')return json({message:'review_changed'},409);
      b.refund_result=result;b.status=body.p_decision==='approve'?'cancelled':'confirmed';return json({id:b.id,status:b.status,refund_result:result});
    }
    if(['/rest/v1/rpc/sample_stays','/rest/v1/rpc/get_booking_stays','/rest/v1/rpc/change_booking_stay'].includes(url.pathname)){
      if(!sample)return json({bookings:[]});
      const body=JSON.parse(init.body||'{}');
      if(!sample||identity.id!==sample.ownerId||body.p_property!==sample.propertyId)return json({message:'property_not_owned'},403);
      if(body.p_action){
       const b=sample.bookings.find(b=>b.id===body.p_booking),room=inventories.get(sample.propertyId).inventory.rooms.find(r=>r.id===b?.room_id),state=stays.get(b?.id)||'pending';
       if(!b||!room||b.status!=='confirmed'||b.refund_result==='review_pending')return json({message:'stay_changed'},409);
       if(body.p_action==='checkin'&&state!=='checked_in'){
        if(state!=='pending'||!room.active||room.housekeeping!=='clean'||b.arrival>sample.anchor||b.departure<=sample.anchor||sample.bookings.some(other=>other.room_id===b.room_id&&stays.get(other.id)==='checked_in'))return json({message:'stay_changed'},409);
        stays.set(b.id,'checked_in');
       }else if(body.p_action==='checkout'&&state!=='completed'){
        if(state!=='checked_in')return json({message:'stay_changed'},409);
        const previous=inventories.get(sample.propertyId);inventories.set(sample.propertyId,{inventory:{...previous.inventory,rooms:previous.inventory.rooms.map(r=>r.id===room.id?{...r,housekeeping:'dirty'}:r)},revision:require('node:crypto').randomUUID()});stays.set(b.id,'completed');
       }
      }
      return json({bookings:sample.bookings.map(b=>({...b,stay_state:stays.get(b.id)||'pending'}))});
    }
    if(url.pathname==='/rest/v1/rpc/get_booking_metrics'){
      const body=JSON.parse(init.body),propertyId=propertyFor(identity.index);
      if(identity.index===2||body.p_property!==propertyId)return json({message:'property_not_owned'},403);
      const inventory=inventories.get(propertyId)?.inventory||{types:[],rooms:[]};
      return json(require('./booking-metrics-fixture.cjs')(inventory,sample?.bookings.filter(b=>stays.get(b.id)!=='completed')||[],body.p_days,sample?.anchor||new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())));
    }
    if (url.pathname.includes('/storage/v1/object/') && url.pathname.includes('/room-photos/')) {
      if(identity.index===2)return json({message:'Forbidden'},403);
      const path=url.pathname.split('/room-photos/')[1];
      if(!path.startsWith(propertyFor(identity.index)+'/'))return json({message:'Forbidden'},403);
      if(init?.method==='POST'){photos.set(path,init.body);return json({Key:'room-photos/'+path});}
      return photos.has(path)?new Response(photos.get(path),{headers:{'Content-Type':'image/webp'}}):json({message:'Missing'},404);
    }
    if(url.pathname==='/rest/v1/rpc/get_room_inventory'||url.pathname==='/rest/v1/rpc/save_room_inventory'){
      const body=JSON.parse(init.body),propertyId=propertyFor(identity.index);
      if(identity.index===2||body.p_property!==propertyId)return json({message:'property_not_owned'},403);
      const previous=inventories.get(propertyId);
      if(url.pathname.endsWith('/get_room_inventory'))return json(previous||{inventory:{types:[],rooms:[]},revision:null});
      if(body.p_inventory?.types[0]?.name==='QA_SAVE_FAILURE')return json({message:'save_unavailable'},500);
      if((previous?.revision||null)!==body.p_revision)return json({message:'inventory_changed'},409);
      if(previous&&previous.inventory.rooms.some(room=>!body.p_inventory.rooms.some(item=>item.id===room.id)))return json({message:'archive_room_instead'},400);
      const value={inventory:body.p_inventory,revision:require('node:crypto').randomUUID()};inventories.set(propertyId,value);return json(value);
    }
    if (url.pathname === '/rest/v1/direct_bookings') {
      if(identity.index===2)return json({code:'42501'},403);
      if(sample){
        if(identity.id!==sample.ownerId)return json([]);
        let rows=sample.bookings.map(item=>({...item,rooms:{number:inventories.get(sample.propertyId).inventory.rooms.find(room=>room.id===item.room_id)?.number||item.room_number}}));
        const or=url.searchParams.get('or'),room=url.searchParams.get('room_id'),status=url.searchParams.get('status'),arrival=url.searchParams.get('arrival'),departure=url.searchParams.get('departure');
        if(or){const date=or.match(/\d{4}-\d{2}-\d{2}/)?.[0];rows=rows.filter(item=>item.arrival===date||item.departure===date)}
        if(room)rows=rows.filter(item=>'eq.'+item.room_id===room);
        if(status)rows=rows.filter(item=>'eq.'+item.status===status);
        if(arrival?.startsWith('lte.'))rows=rows.filter(item=>item.arrival<=arrival.slice(4));
        if(departure?.startsWith('gt.'))rows=rows.filter(item=>item.departure>departure.slice(3));
        return json(rows.sort((a,b)=>b.arrival.localeCompare(a.arrival)));
      }
      if(process.env.STAYCRAFT_QA_BOOKINGS!=='1'||identity.index!==1)return json([]);
      const item={id:'11111111-1111-4111-8111-111111111111',room_id:'22222222-2222-4222-8222-222222222222',room_number:'OLD301',rooms:{number:'QA301'},type_name:'QA 房型',arrival:'2026-11-10',departure:'2026-11-12',guest_name:'QA 日程客人',expected_arrival:'18:00 前',total:760,status:'confirmed'};
      const filter=url.searchParams.get('or');return json(filter&&!filter.includes('2026-11-10')&&!filter.includes('2026-11-12')?[]:[item]);
    }
    if (url.pathname === '/rest/v1/property_details') {
      if (identity.index === 2) return json({ code: '42501' }, 403);
      const propertyId=propertyFor(identity.index);
      const method = init?.method || 'GET';
      if (method === 'GET') return json(profiles.has(propertyId) ? [profiles.get(propertyId)] : []);
      const body = JSON.parse(init.body);
      if (body.property_id !== propertyId) return json({ code: '42501' }, 403);
      if (body.profile?.notes === 'QA_SAVE_FAILURE') return json({ code: 'internal_error' }, 500);
      const previous = profiles.get(propertyId);
      if (method === 'POST' && previous) return json({ code: '23505' }, 409);
      if (method === 'PATCH' && (!previous || url.searchParams.get('revision') !== `eq.${previous.revision}`)) return json([]);
      profiles.set(propertyId, body); return json([body], method === 'POST' ? 201 : 200);
    }
    if(url.pathname==='/rest/v1/properties'){
      if(identity.index===2)return json({code:'PGRST205'},404);
      if(init?.method==='POST'){
        const body=JSON.parse(init.body);if(body.owner_user_id!==identity.id)return json({code:'42501'},403);
        if(properties.has(identity.id))return json({code:'23505'},409);
        const property={id:propertyFor(identity.index),name:body.name};properties.set(identity.id,property);return json(property,201);
      }
      if(url.searchParams.get('owner_user_id')!==`eq.${identity.id}`)return json({code:'42501'},403);
      if(identity.index===3)await new Promise(resolve=>setTimeout(resolve,1800));
      return json(properties.has(identity.id)?[properties.get(identity.id)]:[]);
    }
    throw new Error('Unexpected Supabase request in workspace QA: ' + url.pathname);
  };
}
