-- Retire the public guest surface without deleting business records or owner RPCs.
-- Apply with the matching app release. The old deployment cannot keep guest writes.
begin;
do $$
declare f record;
begin
 for f in
   select p.oid::regprocedure as signature
   from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname in ('public','private')
     and p.proname in ('direct_booking_api','guest_message_api',
       'guest_reply_automation','guest_property_profile','control_reply_automation',
       'reply_conversation')
 loop
   execute format('revoke execute on function %s from public, anon, authenticated',f.signature);
 end loop;
end $$;
commit;
