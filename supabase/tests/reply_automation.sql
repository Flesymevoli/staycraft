-- Fictional fixtures; always rollback, including the migration in pre-apply verification.
begin;
insert into auth.users(id,email) values('c9000000-0000-4000-8000-000000000001','automation-a@example.invalid'),('c9000000-0000-4000-8000-000000000002','automation-b@example.invalid');
insert into public.properties(id,owner_user_id,name) values('c9000000-0000-4000-8000-000000000003','c9000000-0000-4000-8000-000000000001','虚构自动化测试');
insert into public.property_details(property_id,profile) values('c9000000-0000-4000-8000-000000000003','{"name":"虚构民宿","location":"","roomCount":"","breakfast":"07:30–10:00","checkin":"15:00","notes":"私人资料不外传"}');
set local role anon;
do $$declare p uuid:='c9000000-0000-4000-8000-000000000003';v jsonb;begin
 v:=public.guest_reply_automation(p,repeat('1',64),'begin','{}');if v->>'state'<>'paused' then raise exception 'not default off';end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub','c9000000-0000-4000-8000-000000000001',true);
set local role authenticated;
select public.control_reply_automation('c9000000-0000-4000-8000-000000000003',true,null);
do $$begin
 begin perform public.control_reply_automation('c9000000-0000-4000-8000-000000000003',false,null);raise exception 'stale revision accepted';exception when raise_exception then if sqlerrm<>'settings_changed' then raise;end if;end;
 begin update public.reply_automation_settings set enabled=false;raise exception 'direct update allowed';exception when insufficient_privilege then null;end;
 begin perform claim from public.reply_automation_events;raise exception 'claim exposed';exception when insufficient_privilege then null;end;
end $$;
reset role;
set local role anon;
do $$declare p uuid:='c9000000-0000-4000-8000-000000000003';v jsonb;f jsonb;begin
 perform public.guest_message_api(p,'message',repeat('1',64),jsonb_build_object('requestId',gen_random_uuid(),'body','早餐几点开始？'));
 v:=public.guest_reply_automation(p,repeat('1',64),'begin','{}');
 if v->>'state'<>'processing' or v->'profile' ? 'notes' then raise exception 'bad processing context';end if;
 f:=jsonb_build_object('claim',v->>'claim','key','breakfast','language','zh','reason','ready','engine','rules_v1','body','MALICIOUS PROMISE');
 if public.guest_reply_automation(p,repeat('1',64),'finish',f)->>'state'<>'replied' then raise exception 'reply failed';end if;
 perform public.guest_reply_automation(p,repeat('1',64),'finish',f);
 v:=public.guest_message_api(p,'messages',repeat('1',64),'{}');
 if jsonb_array_length(v->'messages')<>2 or v->'messages'->1->>'body'<>'早餐时间：07:30–10:00。' then raise exception 'duplicate or arbitrary reply';end if;
 if public.guest_reply_automation(p,repeat('2',64),'begin','{}')->>'state'<>'idle' then raise exception 'cross guest';end if;
 perform public.guest_message_api(p,'message',repeat('1',64),jsonb_build_object('requestId',gen_random_uuid(),'body','可以提前入住吗？'));
 v:=public.guest_reply_automation(p,repeat('1',64),'begin','{}');
 perform public.guest_reply_automation(p,repeat('1',64),'finish',jsonb_build_object('claim',v->>'claim','key','checkin','language','zh','reason','ready','engine','rules_v1'));
 if public.guest_reply_automation(p,repeat('1',64),'begin','{}')->>'state'<>'manual' then raise exception 'handoff not persistent';end if;
 perform set_config('qa.thread',(public.guest_message_api(p,'messages',repeat('1',64),'{}')->>'id'),true);
end $$;
reset role;
set local role authenticated;
select public.control_reply_automation('c9000000-0000-4000-8000-000000000003',null,null,current_setting('qa.thread')::uuid,false);
reset role;
set local role anon;
do $$declare p uuid:='c9000000-0000-4000-8000-000000000003';v jsonb;begin
 perform public.guest_message_api(p,'message',repeat('1',64),jsonb_build_object('requestId',gen_random_uuid(),'body','几点入住？'));
 v:=public.guest_reply_automation(p,repeat('1',64),'begin','{}');perform set_config('qa.claim',v->>'claim',true);
end $$;
reset role;
set local role authenticated;
select public.control_reply_automation('c9000000-0000-4000-8000-000000000003',null,null,current_setting('qa.thread')::uuid,true);
reset role;
set local role anon;
do $$declare v jsonb;begin
 v:=public.guest_reply_automation('c9000000-0000-4000-8000-000000000003',repeat('1',64),'finish',jsonb_build_object('claim',current_setting('qa.claim'),'key','checkin','language','zh','reason','ready','engine','model_v1'));
 if v->>'state'<>'manual' then raise exception 'takeover race';end if;
end $$;
reset role;
-- Changed facts and a paused setting must invalidate in-flight work.
set local role authenticated;
select public.control_reply_automation('c9000000-0000-4000-8000-000000000003',null,null,current_setting('qa.thread')::uuid,false);
reset role;
set local role anon;
do $$declare p uuid:='c9000000-0000-4000-8000-000000000003';v jsonb;begin
 perform public.guest_message_api(p,'message',repeat('1',64),jsonb_build_object('requestId',gen_random_uuid(),'body','早餐几点开始？'));
 v:=public.guest_reply_automation(p,repeat('1',64),'begin','{}');perform set_config('qa.claim',v->>'claim',true);
end $$;
reset role;
update public.property_details set revision=gen_random_uuid() where property_id='c9000000-0000-4000-8000-000000000003';
set local role anon;
do $$declare v jsonb;begin
 v:=public.guest_reply_automation('c9000000-0000-4000-8000-000000000003',repeat('1',64),'finish',jsonb_build_object('claim',current_setting('qa.claim'),'key','breakfast','language','zh','reason','ready','engine','rules_v1'));
 if v->>'state'<>'handoff' then raise exception 'stale facts sent';end if;
end $$;
reset role;
set local role authenticated;
select public.control_reply_automation('c9000000-0000-4000-8000-000000000003',null,null,current_setting('qa.thread')::uuid,false);
reset role;
set local role anon;
do $$declare p uuid:='c9000000-0000-4000-8000-000000000003';v jsonb;begin
 perform public.guest_message_api(p,'message',repeat('1',64),jsonb_build_object('requestId',gen_random_uuid(),'body','早餐几点开始？'));
 v:=public.guest_reply_automation(p,repeat('1',64),'begin','{}');perform set_config('qa.claim',v->>'claim',true);
end $$;
reset role;
set local role authenticated;
select public.control_reply_automation('c9000000-0000-4000-8000-000000000003',false,(select revision from public.reply_automation_settings where property_id='c9000000-0000-4000-8000-000000000003'));
reset role;
set local role anon;
do $$declare v jsonb;begin
 v:=public.guest_reply_automation('c9000000-0000-4000-8000-000000000003',repeat('1',64),'finish',jsonb_build_object('claim',current_setting('qa.claim'),'key','breakfast','language','zh','reason','ready','engine','rules_v1'));
 if v->>'state'<>'paused' then raise exception 'paused processing sent';end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub','c9000000-0000-4000-8000-000000000002',true);
set local role authenticated;
do $$begin
 if exists(select 1 from public.reply_automation_events) or exists(select 1 from public.reply_automation_settings) then raise exception 'cross-account leakage';end if;
 begin perform public.control_reply_automation('c9000000-0000-4000-8000-000000000003',true,null);raise exception 'cross-account write';exception when raise_exception then if sqlerrm<>'property_not_owned' then raise;end if;end;
end $$;
reset role;
rollback;
