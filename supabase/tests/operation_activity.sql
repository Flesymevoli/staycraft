-- Repeatable fictional tests, no persistent user or booking changes.
begin;
insert into auth.users(id,email) values('c1000000-0000-4000-8000-000000000001','metrics-test-a@example.invalid'),('c1000000-0000-4000-8000-000000000002','metrics-test-b@example.invalid');
insert into public.properties(id,owner_user_id,name) values('c2000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000001','虚构指标测试');
insert into public.room_types(property_id,id,name,beds,capacity,price) values('c2000000-0000-4000-8000-000000000001','c3000000-0000-4000-8000-000000000001','虚构大床房','1张大床',2,520);
insert into public.rooms(property_id,id,type_id,number,floor,housekeeping,active) values
 ('c2000000-0000-4000-8000-000000000001','c4000000-0000-4000-8000-000000000001','c3000000-0000-4000-8000-000000000001','101','1楼','clean',true),
 ('c2000000-0000-4000-8000-000000000001','c4000000-0000-4000-8000-000000000002','c3000000-0000-4000-8000-000000000001','102','1楼','dirty',true),
 ('c2000000-0000-4000-8000-000000000001','c4000000-0000-4000-8000-000000000003','c3000000-0000-4000-8000-000000000001','103','1楼','clean',false);
insert into public.direct_bookings(property_id,guest_hash,request_id,room_id,type_id,room_number,type_name,arrival,departure,guest_name,phone,expected_arrival,nightly_rate,total,status,refund_result)
 select 'c2000000-0000-4000-8000-000000000001',repeat('a',64),gen_random_uuid(),room::uuid,'c3000000-0000-4000-8000-000000000001','QA','虚构房型',
 (now() at time zone 'Asia/Shanghai')::date+start_offset,(now() at time zone 'Asia/Shanghai')::date+end_offset,'虚构客人','13800000000','18:00 前',520,520*(end_offset-start_offset),state,refund
 from (values
  ('c4000000-0000-4000-8000-000000000001',0,2,'confirmed',null),
  ('c4000000-0000-4000-8000-000000000001',0,1,'confirmed',null), -- Intentional duplicate room/night; must not double count.
  ('c4000000-0000-4000-8000-000000000002',1,3,'confirmed','review_pending'),
  ('c4000000-0000-4000-8000-000000000002',0,1,'cancelled','auto_cancelled'),
  ('c4000000-0000-4000-8000-000000000003',0,1,'confirmed',null),
  ('c4000000-0000-4000-8000-000000000001',-2,0,'confirmed',null), -- Departure day is exclusive.
  ('c4000000-0000-4000-8000-000000000001',7,8,'confirmed',null)
 ) rows(room,start_offset,end_offset,state,refund);

update public.direct_bookings set guest_hash=encode(sha256(convert_to(repeat('1',64),'UTF8')),'hex') where property_id='c2000000-0000-4000-8000-000000000001';
select set_config('request.jwt.claim.sub','c1000000-0000-4000-8000-000000000001',true);
set local role authenticated;
do $$declare b uuid;n int;begin
 select id into b from public.direct_bookings where property_id='c2000000-0000-4000-8000-000000000001' and room_id='c4000000-0000-4000-8000-000000000001' and arrival=(now() at time zone 'Asia/Shanghai')::date and departure=arrival+2;
 perform public.change_booking_stay('c2000000-0000-4000-8000-000000000001',b,'checkin');
 select count(*) into n from public.operation_activity where kind='checked_in';if n<>1 then raise exception 'checkin activity missing';end if;
 perform public.change_booking_stay('c2000000-0000-4000-8000-000000000001',b,'checkin');
 if (select count(*) from public.operation_activity where kind='checked_in')<>n then raise exception 'duplicate activity';end if;
 perform public.change_booking_stay('c2000000-0000-4000-8000-000000000001',b,'checkout');
 if (select count(*) from public.operation_activity where kind='checked_out')<>1 or (select count(*) from public.operation_activity where kind='room_dirty')<>1 then raise exception 'checkout/dirty activity missing';end if;
 begin insert into public.operation_activity(property_id,kind,resource_id,room_number) values('c2000000-0000-4000-8000-000000000001','room_cleaned',gen_random_uuid(),'fake');raise exception 'forged completed action';exception when insufficient_privilege then null;end;
end $$;
reset role;
do $$declare n int;begin
 select count(*) into n from public.operation_activity;
 begin
  update public.rooms set housekeeping='clean' where property_id='c2000000-0000-4000-8000-000000000001' and number='101';
  raise exception 'simulated_operation_failure';
 exception when raise_exception then if sqlerrm<>'simulated_operation_failure' then raise;end if;end;
 if (select count(*) from public.operation_activity)<>n then raise exception 'failed operation recorded as success';end if;
end $$;
select set_config('request.jwt.claim.sub','c1000000-0000-4000-8000-000000000002',true);
set local role authenticated;
do $$begin if exists(select 1 from public.operation_activity) then raise exception 'cross account history leak';end if;end $$;
reset role;
set local role anon;
do $$begin begin perform 1 from public.operation_activity;raise exception 'anon history leak';exception when insufficient_privilege then null;end;end $$;
reset role;
rollback;
select 'PASS transaction-backed activity, idempotent stay changes, no false completion on rollback, no direct insert, account/anon isolation; all fixtures rolled back' as result;
