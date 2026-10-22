// Loaded only by the isolated QA server; no production imports and no cloud writes.
if (process.env.STAYCRAFT_QA_AUTH_FIXTURES === '1') {
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
  globalThis.fetch = async (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    if (url.hostname !== 'husrpqalpjjswpvrkxet.supabase.co') return originalFetch(input, init);
    const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
    const identity = tokens.get((headers.get('authorization') || '').replace(/^Bearer /, ''));
    const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
    if (!identity) return json({ message: 'Invalid session' }, 401);
    if (url.pathname === '/auth/v1/user') return json({ id: identity.id, email: `account-${identity.index}@example.invalid`, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, identities: [], created_at: '2026-01-01T00:00:00Z' });
    if (url.pathname === '/auth/v1/logout') return json({});
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
