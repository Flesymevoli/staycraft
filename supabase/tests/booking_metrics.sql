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
select set_config('request.jwt.claim.sub','c1000000-0000-4000-8000-000000000001',true);
set local role authenticated;
do $$declare a jsonb;b jsonb;begin
 a:=public.get_booking_metrics('c2000000-0000-4000-8000-000000000001',7);
 if a->>'active_rooms'<>'2' or a->>'booked_room_nights'<>'4' or a->>'capacity_room_nights'<>'14' or (a->>'booked_pct')::numeric<>28.6 or a->>'inactive_booked_room_nights'<>'1' then raise exception 'Wrong period accounting: %',a;end if;
 if a->'daily'->0->>'booked'<>'1' or jsonb_array_length(a->'daily')<>7 or a->>'available_room_nights'<>'10' then raise exception 'Daily/summary mismatch';end if;
 b:=public.get_booking_metrics('c2000000-0000-4000-8000-000000000001',28);
 if b->>'booked_room_nights'<>'5' or b->>'capacity_room_nights'<>'56' or jsonb_array_length(b->'daily')<>28 then raise exception 'Wrong 28-day boundary';end if;
 begin perform public.get_booking_metrics('c2000000-0000-4000-8000-000000000001',999);raise exception 'Invalid period accepted';exception when others then if sqlerrm<>'invalid_period' then raise;end if;end;
end $$;
reset role;
update public.direct_bookings set status='cancelled' where property_id='c2000000-0000-4000-8000-000000000001' and room_id='c4000000-0000-4000-8000-000000000001';
set local role authenticated;
do $$declare a jsonb;begin a:=public.get_booking_metrics('c2000000-0000-4000-8000-000000000001',7);if a->>'booked_room_nights'<>'2' then raise exception 'Cancellation not reflected';end if;end $$;
reset role;
update public.rooms set active=false where property_id='c2000000-0000-4000-8000-000000000001';
set local role authenticated;
do $$declare a jsonb;begin a:=public.get_booking_metrics('c2000000-0000-4000-8000-000000000001',7);if a->'booked_pct'<>'null'::jsonb or a->>'active_rooms'<>'0' or a->>'inactive_booked_room_nights'<>'3' then raise exception 'Zero/disabled inventory misleading';end if;end $$;
reset role;
select set_config('request.jwt.claim.sub','c1000000-0000-4000-8000-000000000002',true);
set local role authenticated;
do $$begin begin perform public.get_booking_metrics('c2000000-0000-4000-8000-000000000001',7);raise exception 'Cross-account metrics leak';exception when others then if sqlerrm<>'property_not_owned' then raise;end if;end;end $$;
reset role;
set local role anon;
do $$begin begin perform public.get_booking_metrics('c2000000-0000-4000-8000-000000000001',7);raise exception 'Anon metrics leak';exception when insufficient_privilege then null;end;end $$;
reset role;
rollback;
select 'PASS active-room night accounting, deduplication, cancellation, exclusive departure, 7/28-day boundaries, disabled/zero inventory, owner/anon isolation; all fictional data rolled back' as result;
