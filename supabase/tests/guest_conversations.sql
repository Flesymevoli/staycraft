-- Regression test: fictional data, always rolled back. Run after guest_conversations migration.
begin;
insert into auth.users(id,email) values('a1000000-0000-4000-8000-000000000001','message-test-a@example.invalid'),('a1000000-0000-4000-8000-000000000002','message-test-b@example.invalid');
insert into public.properties(id,owner_user_id,name) values('a2000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','虚构消息测试');
set local role anon;
do $$
declare first jsonb; again jsonb; other jsonb;
begin
 first:=public.guest_message_api('a2000000-0000-4000-8000-000000000001','message',repeat('a',64),'{"body":"早餐几点？（虚构）","requestId":"a3000000-0000-4000-8000-000000000001"}');
 again:=public.guest_message_api('a2000000-0000-4000-8000-000000000001','message',repeat('a',64),'{"body":"早餐几点？（虚构）","requestId":"a3000000-0000-4000-8000-000000000001"}');
 if first<>again or jsonb_array_length(again->'messages')<>1 then raise exception 'Idempotency failed';end if;
 other:=public.guest_message_api('a2000000-0000-4000-8000-000000000001','messages',repeat('b',64),'{}');
 if jsonb_array_length(other->'messages')<>0 then raise exception 'Guest isolation failed';end if;
 begin
  perform public.guest_message_api('a2000000-0000-4000-8000-000000000001','message',repeat('a',64),'{"body":"changed","requestId":"a3000000-0000-4000-8000-000000000001"}');
  raise exception 'Expected request conflict';
 exception when others then if sqlerrm<>'request_changed' then raise;end if;end;
 begin perform count(*) from public.messages;raise exception 'Anonymous table leak';exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000001',true);
set local role authenticated;
do $$
declare thread uuid; guest uuid; answer jsonb; replay jsonb;
begin
 thread:=((public.get_conversations('a2000000-0000-4000-8000-000000000001')->0)->>'id')::uuid;
 select id into guest from public.messages where conversation_id=thread and sender='guest';
 answer:=public.reply_conversation('a2000000-0000-4000-8000-000000000001',thread,'a4000000-0000-4000-8000-000000000001',guest,'07:30开始。（虚构）');
 replay:=public.reply_conversation('a2000000-0000-4000-8000-000000000001',thread,'a4000000-0000-4000-8000-000000000001',guest,'07:30开始。（虚构）');
 if answer<>replay then raise exception 'Owner idempotency failed';end if;
 begin perform public.reply_conversation('a2000000-0000-4000-8000-000000000001',thread,'a4000000-0000-4000-8000-000000000002',guest,'duplicate');raise exception 'Expected stale reply rejection';exception when others then if sqlerrm<>'conversation_changed' then raise;end if;end;
 begin update public.messages set body='changed';raise exception 'Direct update allowed';exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000002',true);
set local role authenticated;
do $$begin
 if (select count(*) from public.messages)<>0 or jsonb_array_length(public.get_conversations('a2000000-0000-4000-8000-000000000001'))<>0 then raise exception 'Owner isolation failed';end if;
 begin perform public.reply_conversation('a2000000-0000-4000-8000-000000000001','a5000000-0000-4000-8000-000000000001','a4000000-0000-4000-8000-000000000003','a5000000-0000-4000-8000-000000000002','cross account');raise exception 'Cross owner reply allowed';exception when others then if sqlerrm<>'property_not_owned' then raise;end if;end;
end $$;
reset role;
set local role anon;
do $$declare result jsonb;begin
 result:=public.guest_message_api('a2000000-0000-4000-8000-000000000001','messages',repeat('a',64),'{}');
 if jsonb_array_length(result->'messages')<>2 or result->'messages'->1->>'sender'<>'owner' then raise exception 'Guest cannot read owner reply';end if;
 begin perform public.reply_conversation('a2000000-0000-4000-8000-000000000001','a5000000-0000-4000-8000-000000000001','a4000000-0000-4000-8000-000000000003','a5000000-0000-4000-8000-000000000002','anonymous reply');raise exception 'Anon owner function allowed';exception when insufficient_privilege then null;end;
 for i in 1..9 loop
  perform public.guest_message_api('a2000000-0000-4000-8000-000000000001','message',repeat('a',64),jsonb_build_object('body','虚构限频测试','requestId',gen_random_uuid()));
 end loop;
 begin perform public.guest_message_api('a2000000-0000-4000-8000-000000000001','message',repeat('a',64),jsonb_build_object('body','too many','requestId',gen_random_uuid()));raise exception 'Rate limit failed';exception when others then if sqlerrm<>'message_rate_limit' then raise;end if;end;
end $$;
reset role;
rollback;
select 'PASS fictional guest/owner message persistence, idempotency, isolation, stale reply rejection; all test rows rolled back' as result;
