const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');

const owner = '10000000-0000-4000-8000-000000000001';
const property = '10000000-0000-4000-8000-000000000002';
const other = '10000000-0000-4000-8000-000000000003';
const migration = file => fs.readFileSync(path.resolve(__dirname, '../../supabase/migrations', file), 'utf8');

async function main() {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated;
      create schema auth;
      create function auth.uid() returns uuid language sql stable as
        $$select current_setting('request.jwt.claim.sub', true)::uuid$$;
      grant usage on schema auth to authenticated;
      create table properties(id uuid primary key, owner_user_id uuid not null);
      grant select on properties to authenticated;
      insert into properties values ('${property}', '${owner}');
    `);
    await db.exec(migration('20261110000100_competitor_watches.sql'));
    await db.exec(migration('20261111000100_atomic_competitor_watches.sql'));
    await db.exec(`set role authenticated; set request.jwt.claim.sub = '${owner}'`);
    const change = (expected, retire, add) => db.query(
      'select * from update_competitor_watchlist($1,$2,$3,$4)',
      [property, expected, retire, JSON.stringify(add)]
    );
    const hotel = hotel_id => ({ hotel_id, hotel_name: hotel_id, source: 'manual' });
    const first = (await change([], [], [hotel('A'), hotel('B')])).rows;
    const ids = first.map(row => row.id);
    const a = first.find(row => row.hotel_id === 'A').id;
    await assert.rejects(change(ids, [a], [hotel('B')]), { code: '23505' });
    const afterFailedInsert = await db.query("select hotel_id from competitor_watches where status='active' order by hotel_id");
    assert.deepEqual(afterFailedInsert.rows.map(row => row.hotel_id), ['A', 'B']);
    const next = (await change(ids, [a], [hotel('C')])).rows;
    assert.deepEqual(next.map(row => row.hotel_id).sort(), ['B', 'C']);
    await assert.rejects(change(ids, [a], []), { code: '40001' });
    assert.equal((await db.query("select status from competitor_watches where id=$1", [a])).rows[0].status, 'retired');
    await db.exec(`set request.jwt.claim.sub = '${other}'`);
    await assert.rejects(change(next.map(row => row.id), [], []), { code: '42501' });
    console.log('PASS watchlist transaction: persisted IDs, rollback, stale revision, retired history and owner isolation');
  } finally {
    await db.close();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
