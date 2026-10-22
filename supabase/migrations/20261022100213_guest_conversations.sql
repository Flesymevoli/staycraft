begin;
create table public.conversations(
 property_id uuid not null references public.properties(id),id uuid not null default gen_random_uuid(),
 guest_hash text not null check(guest_hash ~ '^[a-f0-9]{64}$'),guest_name text not null default '访客' check(length(guest_name) between 1 and 60),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 primary key(property_id,id),unique(property_id,guest_hash)
);
create index conversations_recent on public.conversations(property_id,updated_at desc,id);
create table public.messages(
 property_id uuid not null,conversation_id uuid not null,id uuid not null default gen_random_uuid(),
 sender text not null check(sender in ('guest','owner')),body text not null check(length(trim(body)) between 1 and 2000),
 request_id uuid not null,reply_to uuid,created_at timestamptz not null default clock_timestamp(),
 primary key(property_id,id),foreign key(property_id,conversation_id) references public.conversations(property_id,id),
 unique(property_id,conversation_id,sender,request_id),
 check((sender='guest' and reply_to is null) or (sender='owner' and reply_to is not null)),
 foreign key(property_id,reply_to) references public.messages(property_id,id)
);
create index messages_thread on public.messages(property_id,conversation_id,created_at,id);
create unique index messages_one_reply on public.messages(property_id,reply_to);
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
revoke all on public.conversations,public.messages from public,anon,authenticated;
grant select(id,property_id,guest_name,created_at,updated_at) on public.conversations to authenticated;
grant select(id,property_id,conversation_id,sender,body,reply_to,created_at) on public.messages to authenticated;
create policy "owner reads conversations" on public.conversations for select to authenticated using(exists(select 1 from public.properties p where p.id=conversations.property_id and p.owner_user_id=(select auth.uid())));
create policy "owner reads messages" on public.messages for select to authenticated using(exists(select 1 from public.properties p where p.id=messages.property_id and p.owner_user_id=(select auth.uid())));

create function private.guest_message_api(p_property uuid,p_action text,p_token text,p_data jsonb) returns jsonb
language plpgsql security definer set search_path='' set statement_timeout='5s' as $$
declare hashed text; thread public.conversations; item public.messages; text_body text; req uuid; result jsonb;
begin
 if p_token is null or p_token !~ '^[a-f0-9]{64}$' then raise exception 'guest_session_required';end if;
 if p_action is null or p_action not in ('messages','message') then raise exception 'invalid_action';end if;
 hashed:=encode(sha256(convert_to(p_token,'UTF8')),'hex');
 if p_action='message' then
  text_body:=trim(p_data->>'body');req:=(p_data->>'requestId')::uuid;
  if text_body is null or length(text_body) not between 1 and 2000 or req is null then raise exception 'invalid_message';end if;
  -- Short property lock serializes first-thread creation/quota only; no network calls.
  perform 1 from public.properties where id=p_property for update;
  if not found then raise exception 'property_unavailable';end if;
  select * into thread from public.conversations where property_id=p_property and guest_hash=hashed for update;
  if thread.id is null then
   if (select count(*) from public.conversations where property_id=p_property)>=500 then raise exception 'conversation_limit';end if;
   insert into public.conversations(property_id,guest_hash,guest_name) values(p_property,hashed,coalesce((select left(guest_name,60) from public.direct_bookings where property_id=p_property and guest_hash=hashed order by created_at desc limit 1),'访客')) returning * into thread;
  end if;
  select * into item from public.messages where property_id=p_property and conversation_id=thread.id and sender='guest' and request_id=req;
  if item.id is not null then
   if item.body<>text_body then raise exception 'request_changed';end if;
  else
   if (select count(*) from public.messages where property_id=p_property and conversation_id=thread.id and sender='guest')>=100 then raise exception 'conversation_limit';end if;
   if (select count(*) from public.messages where property_id=p_property and conversation_id=thread.id and sender='guest' and created_at>now()-interval '1 minute')>=10 then raise exception 'message_rate_limit';end if;
   insert into public.messages(property_id,conversation_id,sender,body,request_id) values(p_property,thread.id,'guest',text_body,req);
   update public.conversations set updated_at=clock_timestamp() where property_id=p_property and id=thread.id;
  end if;
 else
  select * into thread from public.conversations where property_id=p_property and guest_hash=hashed;
 end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',m.id,'sender',m.sender,'body',m.body,'created_at',m.created_at) order by m.created_at,m.id),'[]') into result from public.messages m where m.property_id=p_property and m.conversation_id=thread.id;
 return jsonb_build_object('id',thread.id,'messages',result);
end $$;
revoke all on function private.guest_message_api(uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function private.guest_message_api(uuid,text,text,jsonb) to anon;
create function public.guest_message_api(p_property uuid,p_action text,p_token text,p_data jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select private.guest_message_api(p_property,p_action,p_token,p_data)$$;
revoke all on function public.guest_message_api(uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.guest_message_api(uuid,text,text,jsonb) to anon;

create function public.get_conversations(p_property uuid) returns jsonb language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(c) order by c.updated_at desc,c.id),'[]') from (
 select t.id,t.guest_name,t.updated_at,(select jsonb_build_object('id',m.id,'sender',m.sender,'body',m.body) from public.messages m where m.property_id=t.property_id and m.conversation_id=t.id order by m.created_at desc,m.id desc limit 1) latest
 from public.conversations t where t.property_id=p_property order by t.updated_at desc,t.id limit 50) c
$$;
revoke all on function public.get_conversations(uuid) from public,anon;
grant execute on function public.get_conversations(uuid) to authenticated;

create function private.reply_conversation(p_property uuid,p_thread uuid,p_request uuid,p_reply_to uuid,p_body text) returns jsonb
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
 update public.conversations set updated_at=clock_timestamp() where property_id=p_property and id=p_thread;
 return jsonb_build_object('id',result.id,'sender',result.sender,'body',result.body,'created_at',result.created_at);
end $$;
revoke all on function private.reply_conversation(uuid,uuid,uuid,uuid,text) from public,anon;
grant execute on function private.reply_conversation(uuid,uuid,uuid,uuid,text) to authenticated;
create function public.reply_conversation(p_property uuid,p_thread uuid,p_request uuid,p_reply_to uuid,p_body text) returns jsonb language sql security invoker set search_path='' as $$select private.reply_conversation(p_property,p_thread,p_request,p_reply_to,p_body)$$;
revoke all on function public.reply_conversation(uuid,uuid,uuid,uuid,text) from public,anon;
grant execute on function public.reply_conversation(uuid,uuid,uuid,uuid,text) to authenticated;
commit;
