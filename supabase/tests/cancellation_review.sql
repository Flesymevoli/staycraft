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

update public.direct_bookings set refund_result='review_pending' where property_id='c2000000-0000-4000-8000-000000000001' and room_id='c4000000-0000-4000-8000-000000000001' and arrival=(now() at time zone 'Asia/Shanghai')::date;
update public.direct_bookings set guest_hash=encode(sha256(convert_to(repeat('1',64),'UTF8')),'hex') where property_id='c2000000-0000-4000-8000-000000000001';
select set_config('request.jwt.claim.sub','c1000000-0000-4000-8000-000000000001',true);
set local role authenticated;
do $$declare a uuid;b uuid;stamp timestamptz;v jsonb;begin
 select id into a from public.direct_bookings where property_id='c2000000-0000-4000-8000-000000000001' and room_id='c4000000-0000-4000-8000-000000000001' and departure=arrival+2 and arrival=(now() at time zone 'Asia/Shanghai')::date;
 select id into b from public.direct_bookings where property_id='c2000000-0000-4000-8000-000000000001' and room_id='c4000000-0000-4000-8000-000000000001' and departure=arrival+1 and arrival=(now() at time zone 'Asia/Shanghai')::date;
 perform public.review_booking_cancellation('c2000000-0000-4000-8000-000000000001',a,'approve');
 if (select status from public.direct_bookings where id=a)<>'cancelled' then raise exception 'approve failed';end if;
 select cancellation_reviewed_at into stamp from public.direct_bookings where id=a;
 perform public.review_booking_cancellation('c2000000-0000-4000-8000-000000000001',a,'approve');
 if stamp is distinct from (select cancellation_reviewed_at from public.direct_bookings where id=a) then raise exception 'repeat rewrote audit';end if;
 begin perform public.review_booking_cancellation('c2000000-0000-4000-8000-000000000001',a,'reject');raise exception 'opposite decision allowed';exception when others then if sqlerrm<>'review_changed' then raise;end if;end;
 perform public.review_booking_cancellation('c2000000-0000-4000-8000-000000000001',b,'reject');
 if (select status from public.direct_bookings where id=b)<>'confirmed' or (select refund_result from public.direct_bookings where id=b)<>'review_rejected' then raise exception 'reject lost reservation';end if;
 v:=public.get_booking_metrics('c2000000-0000-4000-8000-000000000001',7);
 if v->>'booked_room_nights'<>'3' then raise exception 'review metrics wrong %',v;end if;
 perform public.change_booking_stay('c2000000-0000-4000-8000-000000000001',b,'checkin');
 if (select stay_state from public.direct_bookings where id=b)<>'checked_in' then raise exception 'rejected cancellation prevents arrival';end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub','c1000000-0000-4000-8000-000000000002',true);
set local role authenticated;
do $$begin begin perform public.review_booking_cancellation('c2000000-0000-4000-8000-000000000001',gen_random_uuid(),'approve');raise exception 'cross account write';exception when others then if sqlerrm<>'property_not_owned' then raise;end if;end;end $$;
reset role;
set local role anon;
do $$declare payload jsonb;begin
 payload:=public.direct_booking_api('c2000000-0000-4000-8000-000000000001','orders',repeat('1',64),'{}');
 if exists(select 1 from jsonb_array_elements(payload->'orders') o where o ? 'cancellation_reviewed_by') then raise exception 'guest reviewer identity leak';end if;
end $$;
do $$begin begin perform public.review_booking_cancellation('c2000000-0000-4000-8000-000000000001',gen_random_uuid(),'approve');raise exception 'anon write';exception when insufficient_privilege then null;end;end $$;
reset role;
rollback;
