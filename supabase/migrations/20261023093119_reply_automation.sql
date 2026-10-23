begin;
create table public.reply_automation_settings(
 property_id uuid primary key references public.properties(id),enabled boolean not null default false,
 revision uuid not null default gen_random_uuid(),updated_at timestamptz not null default now()
);
alter table public.conversations add column manual_control boolean not null default false,add column handoff_reason text;
alter table public.messages add column automatic boolean not null default false,add column automation_engine text check(automation_engine in ('rules_v1','model_v1'));
create table public.reply_automation_events(
 property_id uuid not null,conversation_id uuid not null,message_id uuid not null,id uuid not null default gen_random_uuid(),
 state text not null check(state in ('processing','replied','handoff','superseded')),
 reason text not null,engine text check(engine in ('rules_v1','model_v1')),citation_key text,citation_value text,
 source_version text not null,settings_revision uuid not null,claim uuid not null default gen_random_uuid(),
 created_at timestamptz not null default clock_timestamp(),updated_at timestamptz not null default clock_timestamp(),
 primary key(property_id,id),unique(property_id,message_id),foreign key(property_id,conversation_id) references public.conversations(property_id,id),foreign key(property_id,message_id) references public.messages(property_id,id)
);
create index reply_automation_events_recent on public.reply_automation_events(property_id,created_at desc,id);
alter table public.reply_automation_settings enable row level security;
alter table public.reply_automation_events enable row level security;
revoke all on public.reply_automation_settings,public.reply_automation_events from public,anon,authenticated;
grant select on public.reply_automation_settings to authenticated;
grant select(property_id,conversation_id,message_id,id,state,reason,engine,citation_key,citation_value,created_at,updated_at) on public.reply_automation_events to authenticated;
grant select(manual_control,handoff_reason) on public.conversations to authenticated;
grant select(automatic,automation_engine) on public.messages to authenticated;
create policy "owner reads automation settings" on public.reply_automation_settings for select to authenticated using(exists(select 1 from public.properties p where p.id=property_id and p.owner_user_id=(select auth.uid())));
create policy "owner reads automation events" on public.reply_automation_events for select to authenticated using(exists(select 1 from public.properties p where p.id=property_id and p.owner_user_id=(select auth.uid())));

create function private.control_reply_automation(p_property uuid,p_enabled boolean,p_revision uuid,p_thread uuid default null,p_manual boolean default null) returns jsonb
language plpgsql security definer set search_path='' set statement_timeout='5s' as $$
declare settings public.reply_automation_settings;
begin
 perform 1 from public.properties where id=p_property and owner_user_id=(select auth.uid()) for update;
 if not found then raise exception 'property_not_owned';end if;
 if p_thread is not null then
  if p_manual is null then raise exception 'invalid_request';end if;
  update public.conversations set manual_control=p_manual,handoff_reason=null where property_id=p_property and id=p_thread;
  if not found then raise exception 'conversation_not_found';end if;
  if p_manual then update public.reply_automation_events set state='superseded',reason='manual_takeover',updated_at=clock_timestamp() where property_id=p_property and conversation_id=p_thread and state='processing';end if;
  return jsonb_build_object('manual_control',p_manual);
 end if;
 if p_enabled is null then raise exception 'invalid_request';end if;
 select * into settings from public.reply_automation_settings where property_id=p_property for update;
 if settings.property_id is null then
  if p_revision is not null then raise exception 'settings_changed';end if;
  insert into public.reply_automation_settings(property_id,enabled) values(p_property,p_enabled) returning * into settings;
 else
  if p_revision is distinct from settings.revision then raise exception 'settings_changed';end if;
  update public.reply_automation_settings set enabled=p_enabled,revision=gen_random_uuid(),updated_at=clock_timestamp() where property_id=p_property returning * into settings;
 end if;
 if not p_enabled then update public.reply_automation_events set state='superseded',reason='automation_paused',updated_at=clock_timestamp() where property_id=p_property and state='processing';end if;
 return to_jsonb(settings)-'property_id';
end $$;
revoke all on function private.control_reply_automation(uuid,boolean,uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function private.control_reply_automation(uuid,boolean,uuid,uuid,boolean) to authenticated;
create function public.control_reply_automation(p_property uuid,p_enabled boolean,p_revision uuid,p_thread uuid default null,p_manual boolean default null) returns jsonb language sql security invoker set search_path='' as $$select private.control_reply_automation(p_property,p_enabled,p_revision,p_thread,p_manual)$$;
revoke all on function public.control_reply_automation(uuid,boolean,uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.control_reply_automation(uuid,boolean,uuid,uuid,boolean) to authenticated;

-- The guest capability can process only that guest's latest question. No arbitrary text
-- can be sent: the database constructs the reply from one current approved time fact.
create function private.guest_reply_automation(p_property uuid,p_token text,p_action text,p_data jsonb) returns jsonb
language plpgsql security definer set search_path='' set statement_timeout='5s' as $$
declare settings public.reply_automation_settings;thread public.conversations;latest public.messages;event public.reply_automation_events;
 profile jsonb;version text;fact_key text;fact_value text;text_body text;lang text;v_reason text;v_engine text;
begin
 if p_token is null or p_token !~ '^[a-f0-9]{64}$' then raise exception 'guest_session_required';end if;
 if p_action is null or p_action not in ('begin','finish') then raise exception 'invalid_request';end if;
 select * into settings from public.reply_automation_settings where property_id=p_property for share;
 if not coalesce(settings.enabled,false) then return jsonb_build_object('state','paused');end if;
 select d.profile,d.revision::text into profile,version from public.property_details d where d.property_id=p_property for share;
 version:=coalesce(version,'none');
 select * into thread from public.conversations where property_id=p_property and guest_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') for update;
 if thread.id is null then return jsonb_build_object('state','idle');end if;
 if thread.manual_control then return jsonb_build_object('state','manual');end if;
 select * into latest from public.messages where property_id=p_property and conversation_id=thread.id order by created_at desc,id desc limit 1;
 if latest.id is null or latest.sender<>'guest' then return jsonb_build_object('state','idle');end if;
 update public.reply_automation_events set state='superseded',reason='new_message',updated_at=clock_timestamp() where property_id=p_property and conversation_id=thread.id and message_id<>latest.id and state='processing';
 select * into event from public.reply_automation_events where property_id=p_property and message_id=latest.id for update;
 if p_action='begin' then
  if event.id is not null then
   -- A lost/expired worker becomes a visible handoff, never an unbounded retry.
   if event.state='processing' and event.updated_at<clock_timestamp()-interval '30 seconds' then
    update public.reply_automation_events set state='handoff',reason='processing_timeout',updated_at=clock_timestamp() where property_id=p_property and id=event.id;
    update public.conversations set manual_control=true,handoff_reason='processing_timeout' where property_id=p_property and id=thread.id;
    return jsonb_build_object('state','handoff');
   end if;
   return jsonb_build_object('state',event.state);
  end if;
  insert into public.reply_automation_events(property_id,conversation_id,message_id,state,reason,source_version,settings_revision)
  values(p_property,thread.id,latest.id,'processing','processing',version,settings.revision) returning * into event;
  return jsonb_build_object('state','processing','claim',event.claim,'message',latest.body,'message_id',latest.id,'profile',jsonb_build_object('breakfast',profile->>'breakfast','checkin',profile->>'checkin'));
 end if;
 if event.id is null or event.claim::text is distinct from p_data->>'claim' then raise exception 'automation_changed';end if;
 if event.state<>'processing' then return jsonb_build_object('state',event.state);end if;
 if event.source_version<>version or event.settings_revision<>settings.revision or event.updated_at<clock_timestamp()-interval '30 seconds' then
  update public.reply_automation_events set state='handoff',reason='context_changed',updated_at=clock_timestamp() where property_id=p_property and id=event.id;
  update public.conversations set manual_control=true,handoff_reason='context_changed' where property_id=p_property and id=thread.id;
  return jsonb_build_object('state','handoff');
 end if;
 v_engine:=p_data->>'engine';lang:=p_data->>'language';fact_key:=p_data->>'key';v_reason:=p_data->>'reason';
 if coalesce(v_engine,'') not in ('rules_v1','model_v1') or coalesce(lang,'') not in ('zh','en') then raise exception 'invalid_plan';end if;
 if coalesce(v_reason,'') not in ('ready','missing_fact','needs_confirmation','sensitive_request','unsupported_question','model_unavailable') then raise exception 'invalid_plan';end if;
 if v_reason='ready' then
  if coalesce(fact_key,'') not in ('breakfast','checkin') then raise exception 'invalid_plan';end if;
  fact_value:=profile->>fact_key;
  if (fact_key='breakfast' and (fact_value is null or fact_value !~ '^([01][0-9]|2[0-3]):[0-5][0-9]–([01][0-9]|2[0-3]):[0-5][0-9]$' or left(fact_value,5)>=right(fact_value,5))) or (fact_key='checkin' and (fact_value is null or fact_value !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')) then v_reason:='missing_fact';end if;
 end if;
 if v_reason<>'ready' then
  update public.reply_automation_events set state='handoff',reason=v_reason,engine=v_engine,updated_at=clock_timestamp() where property_id=p_property and id=event.id;
  update public.conversations set manual_control=true,handoff_reason=v_reason where property_id=p_property and id=thread.id;
  return jsonb_build_object('state','handoff');
 end if;
 text_body:=case when fact_key='breakfast' then case when lang='zh' then '早餐时间：'||fact_value||'。' else 'Breakfast hours: '||fact_value||'.' end else case when lang='zh' then '常规入住时间：'||fact_value||'。' else 'Standard check-in time: '||fact_value||'.' end end;
 insert into public.messages(property_id,conversation_id,sender,body,request_id,reply_to,automatic,automation_engine)
 values(p_property,thread.id,'owner',text_body,event.id,latest.id,true,v_engine);
 update public.reply_automation_events set state='replied',reason='ready',engine=v_engine,citation_key=fact_key,citation_value=fact_value,updated_at=clock_timestamp() where property_id=p_property and id=event.id;
 update public.conversations set updated_at=clock_timestamp(),handoff_reason=null where property_id=p_property and id=thread.id;
 return jsonb_build_object('state','replied');
end $$;
revoke all on function private.guest_reply_automation(uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function private.guest_reply_automation(uuid,text,text,jsonb) to anon;
create function public.guest_reply_automation(p_property uuid,p_token text,p_action text,p_data jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select private.guest_reply_automation(p_property,p_token,p_action,p_data)$$;
revoke all on function public.guest_reply_automation(uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.guest_reply_automation(uuid,text,text,jsonb) to anon;

create or replace function public.get_conversations(p_property uuid) returns jsonb language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(c) order by c.updated_at desc,c.id),'[]') from (
 select t.id,t.guest_name,t.updated_at,t.manual_control,t.handoff_reason,(select jsonb_build_object('id',m.id,'sender',m.sender,'body',m.body,'automatic',m.automatic) from public.messages m where m.property_id=t.property_id and m.conversation_id=t.id order by m.created_at desc,m.id desc limit 1) latest
 from public.conversations t where t.property_id=p_property order by t.updated_at desc,t.id limit 50) c
$$;
create or replace function private.reply_conversation(p_property uuid,p_thread uuid,p_request uuid,p_reply_to uuid,p_body text) returns jsonb
language plpgsql security definer set search_path='' set statement_timeout='5s' as $$
declare previous public.messages; latest public.messages; result public.messages;
begin
 if not exists(select 1 from public.properties where id=p_property and owner_user_id=(select auth.uid())) then raise exception 'property_not_owned';end if;
 if p_request is null or p_reply_to is null or p_body is null or length(trim(p_body)) not between 1 and 2000 then raise exception 'invalid_message';end if;
 perform 1 from public.conversations where property_id=p_property and id=p_thread for update;
 if not found then raise exception 'conversation_not_found';end if;
 select * into previous from public.messages where property_id=p_property and conversation_id=p_thread and sender='owner' and request_id=p_request;
 if previous.id is not null then
  if previous.body<>trim(p_body) or previous.reply_to<>p_reply_to then raise exception 'request_changed';end if;
  return jsonb_build_object('id',previous.id,'sender',previous.sender,'body',previous.body,'created_at',previous.created_at);
 end if;
 select * into latest from public.messages where property_id=p_property and conversation_id=p_thread order by created_at desc,id desc limit 1;
 if latest.id is distinct from p_reply_to or latest.sender<>'guest' then raise exception 'conversation_changed';end if;
 insert into public.messages(property_id,conversation_id,sender,body,request_id,reply_to) values(p_property,p_thread,'owner',trim(p_body),p_request,p_reply_to) returning * into result;
 update public.conversations set updated_at=clock_timestamp(),manual_control=true,handoff_reason=null where property_id=p_property and id=p_thread;
 update public.reply_automation_events set state='superseded',reason='manual_reply',updated_at=clock_timestamp() where property_id=p_property and conversation_id=p_thread and state='processing';
 return jsonb_build_object('id',result.id,'sender',result.sender,'body',result.body,'created_at',result.created_at);
end $$;
commit;
