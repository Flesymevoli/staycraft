-- Only fictional transaction-local data. No model call; every test row is rolled back.
begin;
insert into auth.users(id,email) values('b1000000-0000-4000-8000-000000000001','draft-test-a@example.invalid'),('b1000000-0000-4000-8000-000000000002','draft-test-b@example.invalid');
insert into public.properties(id,owner_user_id,name) values('b2000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001','虚构草稿测试');
insert into public.property_details(property_id,profile,revision) values('b2000000-0000-4000-8000-000000000001','{"name":"虚构民宿","location":"","roomCount":"","breakfast":"07:30–10:00","checkin":"15:00","notes":""}','b3000000-0000-4000-8000-000000000001');
insert into public.conversations(property_id,id,guest_hash) values('b2000000-0000-4000-8000-000000000001','b4000000-0000-4000-8000-000000000001',repeat('a',64));
insert into public.messages(property_id,conversation_id,id,sender,body,request_id) values('b2000000-0000-4000-8000-000000000001','b4000000-0000-4000-8000-000000000001','b5000000-0000-4000-8000-000000000001','guest','早餐几点？（虚构）',gen_random_uuid());
select set_config('request.jwt.claim.sub','b1000000-0000-4000-8000-000000000001',true);
set local role authenticated;
do $$declare decision jsonb:='{"draft":"早餐07:30–10:00","citations":[{"key":"breakfast","value":"07:30–10:00"}],"engine":"rules_v1","reason_code":"ready","sent":false,"disposition":"needs_review"}';a jsonb;b jsonb;
begin
 a:=public.save_reply_draft('b2000000-0000-4000-8000-000000000001','b4000000-0000-4000-8000-000000000001','b5000000-0000-4000-8000-000000000001','b3000000-0000-4000-8000-000000000001','zh','rules_v1',decision);
 b:=public.save_reply_draft('b2000000-0000-4000-8000-000000000001','b4000000-0000-4000-8000-000000000001','b5000000-0000-4000-8000-000000000001','b3000000-0000-4000-8000-000000000001','zh','rules_v1',decision);
 if a->>'id'<>b->>'id' or (select count(*) from public.reply_drafts)<>1 or (select count(*) from public.messages)<>1 then raise exception 'Cache or no-send invariant failed';end if;
 begin
  perform public.save_reply_draft('b2000000-0000-4000-8000-000000000001','b4000000-0000-4000-8000-000000000001','b5000000-0000-4000-8000-000000000001','b3000000-0000-4000-8000-000000000001','zh','rules_v1',jsonb_set(decision,'{citations,0,value}','"invented time"'));
  raise exception 'Invalid citation accepted';
 exception when others then if sqlerrm<>'invalid_citation' then raise;end if;end;
 begin
  perform public.save_reply_draft('b2000000-0000-4000-8000-000000000001','b4000000-0000-4000-8000-000000000001','b5000000-0000-4000-8000-000000000001','b3000000-0000-4000-8000-000000000001','zh','rules_v1',jsonb_set(decision,'{sent}','true'));
  raise exception 'Sent draft accepted';
 exception when others then if sqlerrm<>'invalid_draft' then raise;end if;end;
 begin update public.reply_drafts set decision='{}';raise exception 'Direct write allowed';exception when insufficient_privilege then null;end;
end $$;
reset role;
update public.property_details set revision='b3000000-0000-4000-8000-000000000002',profile=jsonb_set(profile,'{breakfast}','"08:00–10:00"') where property_id='b2000000-0000-4000-8000-000000000001';
set local role authenticated;
do $$begin
 begin perform public.save_reply_draft('b2000000-0000-4000-8000-000000000001','b4000000-0000-4000-8000-000000000001','b5000000-0000-4000-8000-000000000001','b3000000-0000-4000-8000-000000000001','zh','rules_v1','{}');raise exception 'Stale facts accepted';exception when others then if sqlerrm<>'facts_changed' then raise;end if;end;
end $$;
reset role;
insert into public.messages(property_id,conversation_id,sender,body,request_id) values('b2000000-0000-4000-8000-000000000001','b4000000-0000-4000-8000-000000000001','guest','又一个问题（虚构）',gen_random_uuid());
set local role authenticated;
do $$begin
 begin perform public.save_reply_draft('b2000000-0000-4000-8000-000000000001','b4000000-0000-4000-8000-000000000001','b5000000-0000-4000-8000-000000000001','b3000000-0000-4000-8000-000000000002','zh','rules_v1','{}');raise exception 'Stale message accepted';exception when others then if sqlerrm<>'conversation_changed' then raise;end if;end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','b1000000-0000-4000-8000-000000000002',true);
set local role authenticated;
do $$begin
 if (select count(*) from public.reply_drafts)<>0 then raise exception 'Cross owner read';end if;
 begin perform public.save_reply_draft('b2000000-0000-4000-8000-000000000001','b4000000-0000-4000-8000-000000000001','b5000000-0000-4000-8000-000000000001','b3000000-0000-4000-8000-000000000001','zh','rules_v1','{}');raise exception 'Cross owner write';exception when others then if sqlerrm<>'property_not_owned' then raise;end if;end;
end $$;
reset role;
set local role anon;
do $$begin begin perform count(*) from public.reply_drafts;raise exception 'Anon draft leak';exception when insufficient_privilege then null;end;end $$;
reset role;
rollback;
select 'PASS draft persistence/cache, exact citations, no-send, stale facts/message, owner/anon isolation; all fictional rows rolled back' as result;
