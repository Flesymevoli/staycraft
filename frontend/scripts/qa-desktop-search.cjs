// Isolated PostgreSQL + real Supabase query builder. No network or cloud writes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const {PGlite} = require('@electric-sql/pglite');
const {createClient} = require('@supabase/supabase-js');
const root = path.resolve(__dirname, '../src');
const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const typeId = '10000000-0000-4000-8000-000000000001', roomId = '20000000-0000-4000-8000-000000000001';
const oldId = '30000000-0000-4000-8000-000000000001', foreignId = '30000000-0000-4000-8000-000000000002';
let account = A, signedIn = true, client, reads = 0, seenQueries = [];
class WorkspaceError extends Error {constructor(code, status) {super(code); this.code = code; this.status = status;}}
const access = {
  WorkspaceError,
  verifiedProperty: async () => {if (!signedIn) throw new WorkspaceError('sign_in_required', 401); return {supabase: client, propertyId: account};},
  workspaceFailure: error => Response.json({error: error.code || 'service_unavailable'}, {status: error.status || 503, headers: {'Cache-Control': 'no-store'}}),
};
const cache = new Map();
function load(file) {
  file = path.resolve(root, file);
  if (cache.has(file)) return cache.get(file);
  const module = {exports: {}};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText;
  const localRequire = name => {
    if (name === 'server-only') return {};
    if (name.endsWith('workspace-access')) return access;
    if (name.startsWith('@/')) return load(name.slice(2) + '.ts');
    if (name.startsWith('.')) return load(path.relative(root, path.resolve(path.dirname(file), name + '.ts')));
    return require(name);
  };
  new Function('require', 'module', 'exports', code)(localRequire, module, module.exports);
  cache.set(file, module.exports);
  return module.exports;
}
function inventory(property) {
  return {types: [{id: typeId, name: property === A ? '临水大床房' : '另一账号海景房', beds: '双人床', capacity: 2, price: 380, photo: ''}], rooms: [{id: roomId, number: property === A ? '101' : '999', floor: '一楼', typeId, housekeeping: 'clean', active: true}]};
}
(async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role search_reader; create table direct_bookings(id uuid,property_id uuid,external_id text,guest_name text,room_number text,type_name text,external_channel text,arrival date,departure date);
      alter table direct_bookings enable row level security; grant select on direct_bookings to search_reader;
      create policy owns_property on direct_bookings to search_reader using(property_id=current_setting('staycraft.test_property')::uuid);`);
    const add = (id, property, external, guest, arrival = '2026-11-12') => db.query('insert into direct_bookings values($1,$2,$3,$4,$5,$6,$7,$8,$9)', [id, property, external, guest, property === A ? '101' : '999', property === A ? '临水大床房' : '另一账号海景房', 'ctrip', arrival, arrival]);
    await add(oldId, A, 'ARCHIVE-001', '旧订单客人', '2020-01-01');
    await add(foreignId, B, 'ARCHIVE-001', '不可泄露客人');
    await db.query(`insert into direct_bookings select gen_random_uuid(),$1::uuid,'LATEST-'||n,'普通客人','101','临水大床房','ctrip','2026-11-12'::date,'2026-11-13'::date from generate_series(1,550) n`, [A]);
    const punctuation = ['100%', 'a_b', '*', 'a.*', 'a,b', 'a"b', 'a\\b', 'a),property_id.neq.x', 'a[0-9]', '(?i).*'];
    for (const [index, value] of punctuation.entries()) await add(`40000000-0000-4000-8000-${String(index).padStart(12, '0')}`, A, value, '符号订单');
    await db.query("select set_config('staycraft.test_property',$1,false)", [A]);
    await db.exec('set role search_reader');
    client = createClient('https://search.invalid', 'test-key', {auth: {persistSession: false}, global: {fetch: async (input, init) => {
      reads++;
      const url = new URL(input instanceof Request ? input.url : String(input));
      const reply = body => new Response(JSON.stringify(body), {headers: {'Content-Type': 'application/json'}});
      if (url.pathname.endsWith('/rpc/get_room_inventory')) {
        const body = JSON.parse(init.body);
        assert.equal(body.p_property, account);
        return reply({inventory: inventory(account), revision: null});
      }
      assert.equal(url.pathname, '/rest/v1/direct_bookings');
      seenQueries.push(url.searchParams);
      const params = [], where = [];
      const bind = value => {params.push(value); return '$' + params.length;};
      for (const field of ['property_id', 'id', 'room_id']) {
        const value = url.searchParams.get(field);
        if (value) {assert(value.startsWith('eq.')); where.push(`${field}=${bind(value.slice(3))}`);}
      }
      const raw = url.searchParams.get('or');
      if (raw) {
        assert(raw.startsWith('(') && raw.endsWith(')'));
        const expression = raw.slice(1, -1);
        const clauses = [...expression.matchAll(/([a-z_]+)\.(imatch|eq)\.("(?:\\.|[^"\\])*"|[^,]+)/g)];
        assert.equal(clauses.map(match => match[0]).join(','), expression, 'No injected PostgREST clauses');
        where.push('(' + clauses.map(([, field, op, value]) => {
          assert(['external_id', 'guest_name', 'room_number', 'type_name', 'external_channel', 'arrival', 'departure', 'id'].includes(field));
          return `${field} ${op === 'imatch' ? '~*' : '='} ${bind(value.startsWith('"') ? JSON.parse(value) : value)}`;
        }).join(' or ') + ')');
      }
      const limit = Number(url.searchParams.get('limit'));
      assert(Number.isInteger(limit) && limit > 0 && limit <= 500);
      const rows = (await db.query(`select * from direct_bookings where ${where.join(' and ')} order by arrival desc,id desc limit ${limit}`, params)).rows;
      return reply(rows.map(row => ({...row, arrival: row.arrival.toISOString().slice(0, 10), departure: row.departure.toISOString().slice(0, 10), rooms: {number: row.room_number}})));
    }}});
    const route = load('app/api/workspace/search/route.ts');
    const bookingsRoute = load('app/api/workspace/bookings/route.ts');
    const query = q => route.GET(new Request('http://localhost/api/workspace/search?q=' + encodeURIComponent(q) + '&property_id=' + B));
    let response = await query('ARCHIVE');
    assert.equal(response.status, 200); assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
    let result = await response.json();
    assert.deepEqual(result.bookings.map(item => item.id), [oldId]);
    assert.equal(result.bookings[0].guestName, '旧订单客人');
    assert.equal(seenQueries.at(-1).get('limit'), '7');
    assert.equal(seenQueries.at(-1).get('property_id'), 'eq.' + A);
    assert(!seenQueries.at(-1).get('select').includes('phone'));
    result = await (await query('临水')).json();
    assert.equal(result.bookings.length, 6); assert.equal(result.more.bookings, true); assert.equal(result.rooms[0].number, '101'); assert.equal(result.roomTypes[0].name, '临水大床房');
    result = await (await query('１０１')).json(); assert.equal(result.rooms[0].number, '101');
    result = await (await query('2020-01-01')).json(); assert.deepEqual(result.bookings.map(item => item.id), [oldId]);
    result = await (await query(oldId)).json(); assert.deepEqual(result.bookings.map(item => item.id), [oldId]);
    for (const value of punctuation) {
      result = await (await query(value)).json();
      assert(result.bookings.some(item => item.externalId === value), 'literal query finds ' + value);
      assert(!result.bookings.some(item => item.externalId.startsWith('LATEST')), 'literal query does not match arbitrary records');
    }
    result = await (await query('不存在的记录')).json(); assert.equal(result.bookings.length + result.rooms.length + result.roomTypes.length, 0);
    for (const invalid of ['', ' '.repeat(5), 'a'.repeat(81), 'a\u0000b']) assert.equal((await query(invalid)).status, 400);
    response = await bookingsRoute.GET(new Request('http://localhost/api/workspace/bookings?id=' + oldId));
    result = await response.json(); assert.deepEqual(result.bookings.map(item => item.id), [oldId]); assert.equal(seenQueries.at(-1).get('limit'), '1');
    result = await (await bookingsRoute.GET(new Request('http://localhost/api/workspace/bookings?id=' + foreignId))).json(); assert.deepEqual(result.bookings, []);
    assert.equal((await bookingsRoute.GET(new Request('http://localhost/api/workspace/bookings?id=bad-id'))).status, 400);
    account = B; await db.query("select set_config('staycraft.test_property',$1,false)", [B]);
    result = await (await query('ARCHIVE')).json(); assert.deepEqual(result.bookings.map(item => item.id), [foreignId]);
    result = await (await query('海景')).json(); assert.equal(result.rooms[0].number, '999'); assert.equal(result.roomTypes[0].name, '另一账号海景房');
    signedIn = false; const before = reads; assert.equal((await query('ARCHIVE')).status, 401); assert.equal(reads, before);
    console.log('PASS desktop search: PostgreSQL literal matching (10 special-character queries), current-account scope + RLS, inventory, bounded results, no contact fields, old order beyond 550 newer records, exact detail reads, cache headers, input validation, no-result state and authentication. Isolated data; no network.');
  } finally {await db.close();}
})().catch(error => {console.error(error); process.exitCode = 1;});
