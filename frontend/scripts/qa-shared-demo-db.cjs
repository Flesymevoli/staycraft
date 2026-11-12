const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { PGlite } = require("@electric-sql/pglite");

async function main() {
  const db = await PGlite.create();
  try {
    const tables = [
      "properties", "property_memberships", "property_details", "property_inventory",
      "room_types", "rooms", "direct_bookings", "promotion_workspaces", "conversations",
      "messages", "reply_drafts", "reply_automation_settings", "reply_automation_events",
      "operation_activity", "booking_import_batches", "booking_import_tasks",
      "competitor_watches", "market_quote_batches",
    ];
    await db.exec(`
      create role anon;
      create role authenticated;
      create schema auth;
      create schema private;
      create schema storage;
      create table auth.users(id uuid primary key, raw_app_meta_data jsonb);
      create function auth.jwt() returns jsonb language sql stable
        as $$ select current_setting('request.jwt.claims', true)::jsonb $$;
      create function auth.uid() returns uuid language sql stable
        as $$ select (auth.jwt()->>'sub')::uuid $$;
      create table storage.objects(bucket_id text);
      create table public.decision_agent_runs(result jsonb);
      ${tables.map((table) => `create table public.${table}(id integer);`).join("\n")}
      grant select, insert, update, delete on all tables in schema public to authenticated;
      grant usage on schema storage to authenticated;
      grant select, insert, update, delete on storage.objects to authenticated;
      create function public.fixture_write_booking() returns void language sql security definer
        set search_path = '' as $$ insert into public.direct_bookings values (8) $$;
      insert into auth.users values
        ('00000000-0000-0000-0000-000000000001', '{"staycraft_demo_read_only":true}'),
        ('00000000-0000-0000-0000-000000000002', '{}');
      insert into rooms values (1);
    `);
    await db.exec(readFileSync(join(__dirname, "../../supabase/migrations/20261111000200_shared_demo_write_protection.sql"), "utf8"));

    const login = async (id, role = "authenticated") => {
      await db.query("select set_config('request.jwt.claims', $1, false)", [
        JSON.stringify({ role, sub: `00000000-0000-0000-0000-00000000000${id}` }),
      ]);
    };
    const blocked = (sql) => assert.rejects(db.exec(sql), { code: "42501", message: "demo_read_only" });

    await db.exec("set role authenticated");
    await login(1);
    assert.deepEqual((await db.query("select id from rooms")).rows, [{ id: 1 }]);
    for (const table of tables) await blocked(`insert into public.${table} values (2)`);
    await blocked("update rooms set id = 2");
    await blocked("delete from rooms");
    await blocked("select fixture_write_booking()");
    await blocked("insert into storage.objects values ('room-photos')");
    await db.exec("insert into storage.objects values ('unrelated')");
    await blocked("update storage.objects set bucket_id = 'room-photos'");
    await db.exec(`insert into decision_agent_runs values ('{"summary":"Generated"}')`);
    await db.exec(`update decision_agent_runs set result = '{"summary":"Refined"}'`);
    await blocked(`update decision_agent_runs set result = '{"actionPlan":{"status":"saved"}}'`);

    await login(2);
    await db.exec("select fixture_write_booking(); insert into rooms values (2)");
    await db.exec(`update decision_agent_runs set result = '{"actionPlan":{"status":"saved"}}'`);
    await db.exec("insert into storage.objects values ('room-photos')");
    await login(1);
    await blocked("delete from decision_agent_runs");
    await blocked("delete from storage.objects where bucket_id = 'room-photos'");

    await db.exec("reset role");
    await login(1, "service_role");
    await db.exec("insert into rooms values (3)");
    console.log("Shared demo database write protection passed.");
  } finally {
    await db.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
