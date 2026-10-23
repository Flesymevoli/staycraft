-- Fictional transaction only; always rollback.
begin;
insert into auth.users(id,email) values('ca000000-0000-4000-8000-000000000001','guest-profile-test@example.invalid');
insert into public.properties(id,owner_user_id,name) values('ca000000-0000-4000-8000-000000000002','ca000000-0000-4000-8000-000000000001','Fictional public profile');
insert into public.property_details(property_id,profile) values('ca000000-0000-4000-8000-000000000002','{"name":"Fictional","location":"虚构地址","breakfast":"07:30–10:00","checkin":"15:00","roomCount":"99","notes":"PRIVATE INTERNAL TEXT","guestNotes":"公开入住须知"}');
set local role anon;
do $$declare data jsonb;begin
 data:=public.guest_property_profile('ca000000-0000-4000-8000-000000000002');
 if data->>'notes'<>'公开入住须知' or data->>'location'<>'虚构地址' or data->>'breakfast'<>'07:30–10:00' or data->>'checkin'<>'15:00' then raise exception 'public fields missing';end if;
 if data::text like '%PRIVATE%' or data ? 'owner_user_id' or data ? 'roomCount' or (select count(*) from jsonb_object_keys(data))<>4 then raise exception 'private fields exposed';end if;
 if public.guest_property_profile('ca000000-0000-4000-8000-000000000099') is not null then raise exception 'unknown property not null';end if;
 begin
  if exists(select 1 from public.property_details where property_id='ca000000-0000-4000-8000-000000000002') then raise exception 'raw profile visible';end if;
 exception when insufficient_privilege then null;end;
end $$;
reset role;
update public.property_details set profile=profile-'guestNotes' where property_id='ca000000-0000-4000-8000-000000000002';
set local role anon;
do $$begin
 if public.guest_property_profile('ca000000-0000-4000-8000-000000000002')->>'notes'<>'' then raise exception 'legacy private notes published';end if;
end $$;
reset role;
rollback;
