-- Repeatable fictional tests, no persistent user or booking changes.
begin;
insert into auth.users(id,email) values('c1000000-0000-4000-8000-000000000001','metrics-test-a@example.invalid'),('c1000000-0000-4000-8000-000000000002','metrics-test-b@example.invalid');
insert into public.properties(id,owner_user_id,name) values('c2000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000001','虚构指标测试');
insert into public.room_types(property_id,id,name,beds,capacity,price) values('c2000000-0000-4000-8000-000000000001','c3000000-0000-4000-8000-000000000001','虚构大床房','1张大床',2,520);
insert into public.rooms(property_id,id,type_id,number,floor,housekeeping,active) values
 ('c2000000-0000-4000-8000-000000000001','c4000000-0000-4000-8000-000000000001','c3000000-0000-4000-8000-000000000001','101','1楼','clean',true),
 ('c2000000-0000-4000-8000-000000000001','c4000000-0000-4000-8000-000000000002','c3000000-0000-4000-8000-000000000001','102','1楼','dirty',true),
 ('c2000000-0000-4000-8000-000000000001','c4000000-0000-4000-8000-000000000003','c3000000-0000-4000-8000-000000000001','103','1楼','clean',false);
insert into public.direct_bookings(property_id,guest_hash,request_id,room_id,type_id,room_number,type_name,arrival,departure,guest_name,phone,expected_arrival,nightly_rate,total,status,refund_result,stay_state,checked_in_at,checked_out_at)
 select 'c2000000-0000-4000-8000-000000000001',repeat('a',64),gen_random_uuid(),room::uuid,'c3000000-0000-4000-8000-000000000001','QA','虚构房型',
 (now() at time zone 'Asia/Shanghai')::date+a,(now() at time zone 'Asia/Shanghai')::date+d,'虚构客人','13800000000','18:00 前',520,total,status,refund,stay,
 case when stay='completed' then now()-interval '2 days' else null end,case when stay='completed' then now() else null end
 from (values
 ('c4000000-0000-4000-8000-000000000001',-1,2,100.01,'confirmed',null,'pending'),
 ('c4000000-0000-4000-8000-000000000002',6,8,1.01,'confirmed','review_pending','pending'),
 ('c4000000-0000-4000-8000-000000000002',0,1,900.00,'cancelled',null,'pending'),
 ('c4000000-0000-4000-8000-000000000002',1,2,900.00,'confirmed',null,'completed'),
 ('c4000000-0000-4000-8000-000000000003',0,1,900.00,'confirmed',null,'pending')
 ) entries(room,a,d,total,status,refund,stay);
select set_config('request.jwt.claim.sub','c1000000-0000-4000-8000-000000000001',true);
set local role authenticated;
do $$declare a jsonb;b jsonb;begin
 a:=public.get_booking_metrics('c2000000-0000-4000-8000-000000000001',7);
 if a->>'amount_cents'<>'6718' or a->>'booked_order_room_nights'<>'3' or a->>'average_booked_rate_cents'<>'2239' or a->'daily'->0->>'amount_cents'<>'3334' or a->'daily'->1->>'amount_cents'<>'3333' or a->'daily'->6->>'amount_cents'<>'51' then raise exception 'cross-boundary cents wrong: %',a;end if;
 b:=public.get_booking_metrics('c2000000-0000-4000-8000-000000000001',28);
 if b->>'amount_cents'<>'6768' or b->>'booked_order_room_nights'<>'4' then raise exception '28 day cents wrong';end if;
end $$;
reset role;
rollback;
select 'PASS exact cent allocation, cross-period clipping, cancelled/completed/inactive exclusion and review-pending inclusion; fictional data rolled back' as result;
