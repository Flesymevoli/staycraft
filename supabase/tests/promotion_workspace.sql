-- Fictional fixtures only. All users, properties and drafts are rolled back.
begin;
insert into auth.users(id,email) values
 ('ca100000-0000-4000-8000-000000000001','promotion-test-a@example.invalid'),
 ('ca100000-0000-4000-8000-000000000002','promotion-test-b@example.invalid');
insert into public.properties(id,owner_user_id,name) values
 ('ca200000-0000-4000-8000-000000000001','ca100000-0000-4000-8000-000000000001','Fictional promotion test A'),
 ('ca200000-0000-4000-8000-000000000002','ca100000-0000-4000-8000-000000000002','Fictional promotion test B');
select set_config('request.jwt.claim.sub','ca100000-0000-4000-8000-000000000001',true);
set local role authenticated;
do $$ declare v uuid; n int; begin
 insert into public.promotion_workspaces(property_id) values ('ca200000-0000-4000-8000-000000000001') returning revision into v;
 update public.promotion_workspaces set revision=gen_random_uuid() where property_id='ca200000-0000-4000-8000-000000000001' and revision=v;
 get diagnostics n=row_count;
 if n<>1 then raise exception 'owner update failed'; end if;
 update public.promotion_workspaces set revision=gen_random_uuid() where property_id='ca200000-0000-4000-8000-000000000001' and revision=v;
 get diagnostics n=row_count;
 if n<>0 then raise exception 'stale revision allowed'; end if;
 begin
  update public.promotion_workspaces set state='{"sources":[],"drafts":[],"extra":true}' where property_id='ca200000-0000-4000-8000-000000000001';
  raise exception 'invalid shape allowed';
 exception when check_violation then null; end;
 begin
  delete from public.promotion_workspaces where property_id='ca200000-0000-4000-8000-000000000001';
  raise exception 'delete privilege allowed';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','ca100000-0000-4000-8000-000000000002',true);
set local role authenticated;
do $$ declare n int; begin
 if exists(select 1 from public.promotion_workspaces where property_id='ca200000-0000-4000-8000-000000000001') then raise exception 'cross-account read allowed'; end if;
 begin
  insert into public.promotion_workspaces(property_id) values ('ca200000-0000-4000-8000-000000000001');
  raise exception 'cross-account insert allowed';
 exception when insufficient_privilege then null; end;
 update public.promotion_workspaces set revision=gen_random_uuid() where property_id='ca200000-0000-4000-8000-000000000001';
 get diagnostics n=row_count;
 if n<>0 then raise exception 'cross-account update allowed'; end if;
 insert into public.promotion_workspaces(property_id) values ('ca200000-0000-4000-8000-000000000002');
 if (select count(*) from public.promotion_workspaces)<>1 then raise exception 'owner isolation failed'; end if;
end $$;
reset role;
set local role anon;
do $$ begin
 begin perform 1 from public.promotion_workspaces; raise exception 'anonymous read allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
select 'PASS owner read/write, stale revision, shape constraint, cross-account/anonymous/delete denial; all fixtures rolled back' as result;
