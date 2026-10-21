// Loaded only by the isolated QA server; no production imports and no cloud writes.
if (process.env.STAYCRAFT_QA_AUTH_FIXTURES === '1') {
  const originalFetch = globalThis.fetch;
  const profiles = new Map();
  const inventories = new Map();
  const photos = new Map();
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
      if(identity.index!==1)return json({message:'Forbidden'},403);
      const path=url.pathname.split('/room-photos/')[1];
      if(!path.startsWith('dddddddd-dddd-4ddd-8ddd-dddddddddddd/'))return json({message:'Forbidden'},403);
      if(init?.method==='POST'){photos.set(path,init.body);return json({Key:'room-photos/'+path});}
      return photos.has(path)?new Response(photos.get(path),{headers:{'Content-Type':'image/webp'}}):json({message:'Missing'},404);
    }
    if (url.pathname === '/rest/v1/property_inventory') {
      if(identity.index!==1)return json({code:'42501'},403);
      const propertyId='dddddddd-dddd-4ddd-8ddd-dddddddddddd';const method=init?.method || 'GET';
      if(method==='GET')return json(inventories.has(propertyId)?[inventories.get(propertyId)]:[]);
      const body=JSON.parse(init.body);if(body.property_id!==propertyId)return json({code:'42501'},403);
      if(body.inventory?.types[0]?.name==='QA_SAVE_FAILURE')return json({code:'internal_error'},500);
      const previous=inventories.get(propertyId);
      if(method==='POST' && previous)return json({code:'23505'},409);
      if(method==='PATCH' && (!previous || url.searchParams.get('revision')!==`eq.${previous.revision}`))return json([]);
      inventories.set(propertyId,body);return json([body],method==='POST'?201:200);
    }
    if (url.pathname === '/rest/v1/property_details') {
      if (identity.index !== 1) return json({ code: '42501' }, 403);
      const propertyId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
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
    if (url.pathname === '/rest/v1/property_memberships') {
      if (url.searchParams.get('user_id') !== `eq.${identity.id}`) return json({ message: 'Incorrect user filter' }, 403);
      if (identity.index === 2) return json({ code: 'PGRST205', message: 'Missing schema' }, 404);
      if (identity.index === 0) return json([]);
      if (identity.index === 3) { await new Promise(resolve => setTimeout(resolve, 1800)); return json([]); }
      return json([{ property_id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', role: 'owner', properties: { name: 'Account B private property' } }]);
    }
    throw new Error('Unexpected Supabase request in workspace QA: ' + url.pathname);
  };
}
