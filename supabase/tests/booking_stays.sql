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
do $$declare b uuid;dirty uuid;before_revision uuid;after_revision uuid;v jsonb;begin
 select id into b from public.direct_bookings where property_id='c2000000-0000-4000-8000-000000000001' and room_id='c4000000-0000-4000-8000-000000000001' and arrival=(now() at time zone 'Asia/Shanghai')::date and departure=arrival+2;
 select inventory_revision into before_revision from public.properties where id='c2000000-0000-4000-8000-000000000001';
 perform public.change_booking_stay('c2000000-0000-4000-8000-000000000001',b,'checkin');
 perform public.change_booking_stay('c2000000-0000-4000-8000-000000000001',b,'checkin');
 if (select stay_state from public.direct_bookings where id=b)<>'checked_in' then raise exception 'checkin not saved';end if;
 begin update public.direct_bookings set status='cancelled' where id=b;raise exception 'direct update allowed';exception when insufficient_privilege then null;end;
 select id into dirty from public.direct_bookings where property_id='c2000000-0000-4000-8000-000000000001' and room_id='c4000000-0000-4000-8000-000000000001' and arrival=(now() at time zone 'Asia/Shanghai')::date and departure=arrival+1;
 begin perform public.change_booking_stay('c2000000-0000-4000-8000-000000000001',dirty,'checkin');raise exception 'double occupancy accepted';exception when others then if sqlerrm<>'room_occupied' then raise;end if;end;
 begin perform public.direct_booking_api('c2000000-0000-4000-8000-000000000001','cancel',repeat('1',64),jsonb_build_object('id',b));raise exception 'occupied guest cancellation accepted';exception when others then if sqlerrm<>'stay_changed' then raise;end if;end;
 perform public.change_booking_stay('c2000000-0000-4000-8000-000000000001',b,'checkout');
 select inventory_revision into after_revision from public.properties where id='c2000000-0000-4000-8000-000000000001';
 if before_revision is not distinct from after_revision then raise exception 'revision unchanged';end if;
 if (select housekeeping from public.rooms where property_id='c2000000-0000-4000-8000-000000000001' and id='c4000000-0000-4000-8000-000000000001')<>'dirty' then raise exception 'checkout not dirty';end if;
 perform public.change_booking_stay('c2000000-0000-4000-8000-000000000001',b,'checkout');
 if after_revision is distinct from (select inventory_revision from public.properties where id='c2000000-0000-4000-8000-000000000001') then raise exception 'duplicate checkout changed revision';end if;
 begin perform public.change_booking_stay('c2000000-0000-4000-8000-000000000001',dirty,'checkin');raise exception 'dirty accepted';exception when others then if sqlerrm<>'not_ready_for_checkin' then raise;end if;end;
 v:=public.get_booking_stays('c2000000-0000-4000-8000-000000000001');if jsonb_array_length(v->'bookings')<>7 then raise exception 'wrong stays read';end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub','c1000000-0000-4000-8000-000000000002',true);
set local role authenticated;
do $$begin begin perform public.get_booking_stays('c2000000-0000-4000-8000-000000000001');raise exception 'cross account read';exception when others then if sqlerrm<>'property_not_owned' then raise;end if;end;begin perform public.change_booking_stay('c2000000-0000-4000-8000-000000000001',gen_random_uuid(),'checkin');raise exception 'cross account write';exception when others then if sqlerrm<>'property_not_owned' then raise;end if;end;end $$;
reset role;
set local role anon;
do $$begin begin perform public.get_booking_stays('c2000000-0000-4000-8000-000000000001');raise exception 'anon read';exception when insufficient_privilege then null;end;begin perform public.change_booking_stay('c2000000-0000-4000-8000-000000000001',gen_random_uuid(),'checkin');raise exception 'anon write';exception when insufficient_privilege then null;end;end $$;
reset role;
rollback;
