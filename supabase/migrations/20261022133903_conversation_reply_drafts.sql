begin;
create table public.reply_drafts(
 property_id uuid not null,conversation_id uuid not null,message_id uuid not null,id uuid not null default gen_random_uuid(),
 source_version text not null,language text not null check(language in ('en','zh')),mode text not null check(mode in ('rules_v1','model_v1')),
 question text not null,decision jsonb not null,created_at timestamptz not null default clock_timestamp(),
 primary key(property_id,id),foreign key(property_id,conversation_id) references public.conversations(property_id,id),
 foreign key(property_id,message_id) references public.messages(property_id,id),
 unique(property_id,conversation_id,message_id,source_version,language,mode),
 check(jsonb_typeof(decision)='object' and decision->'sent'='false'::jsonb and decision->>'disposition'='needs_review')
);
create index reply_drafts_message on public.reply_drafts(property_id,message_id);
alter table public.reply_drafts enable row level security;
revoke all on public.reply_drafts from public,anon,authenticated;
grant select on public.reply_drafts to authenticated;
create policy "owner reads reply drafts" on public.reply_drafts for select to authenticated using(exists(select 1 from public.properties p where p.id=reply_drafts.property_id and p.owner_user_id=(select auth.uid())));
create function private.save_reply_draft(p_property uuid,p_thread uuid,p_message uuid,p_source_version text,p_language text,p_mode text,p_decision jsonb) returns jsonb
language plpgsql security definer set search_path='' set statement_timeout='5s' as $$
declare profile jsonb; version text; latest public.messages; cached public.reply_drafts; citation jsonb;
begin
 if not exists(select 1 from public.properties where id=p_property and owner_user_id=(select auth.uid())) then raise exception 'property_not_owned';end if;
 if p_language is null or p_language not in ('en','zh') or p_mode is null or p_mode not in ('rules_v1','model_v1') then raise exception 'invalid_draft';end if;
 select d.profile,d.revision::text into profile,version from public.property_details d where d.property_id=p_property for share;
 if coalesce(version,'none') is distinct from p_source_version then raise exception 'facts_changed';end if;
 perform 1 from public.conversations where property_id=p_property and id=p_thread for update;
 if not found then raise exception 'conversation_not_found';end if;
 select * into latest from public.messages where property_id=p_property and conversation_id=p_thread order by created_at desc,id desc limit 1;
 if latest.id is distinct from p_message or latest.sender<>'guest' then raise exception 'conversation_changed';end if;
 if p_decision is null or jsonb_typeof(p_decision)<>'object' or (p_decision->'sent') is distinct from 'false'::jsonb or (p_decision->>'disposition') is distinct from 'needs_review'
  or coalesce(p_decision->>'engine','') not in ('rules_v1','model_v1') or coalesce(p_decision->>'reason_code','') not in ('ready','auto_reply_off','missing_fact','needs_confirmation','sensitive_request','unsupported_question','model_review','model_unavailable')
  or (p_decision->'draft'<>'null'::jsonb and (jsonb_typeof(p_decision->'draft')<>'string' or length(trim(p_decision->>'draft')) not between 1 and 1000))
  or not(p_decision ? 'draft') or jsonb_typeof(p_decision->'citations') is distinct from 'array' then raise exception 'invalid_draft';end if;
 if jsonb_array_length(p_decision->'citations')>2 or (p_decision->>'engine'='model_v1' and jsonb_array_length(p_decision->'citations')=0) then raise exception 'invalid_draft';end if;
 if p_mode='rules_v1' and p_decision->>'engine'<>'rules_v1' then raise exception 'invalid_draft';end if;
 for citation in select value from jsonb_array_elements(p_decision->'citations') loop
  if coalesce(citation->>'key','') not in ('breakfast','checkin') or nullif(citation->>'value','') is null or (profile->>(citation->>'key')) is distinct from citation->>'value' then raise exception 'invalid_citation';end if;
 end loop;
 insert into public.reply_drafts(property_id,conversation_id,message_id,source_version,language,mode,question,decision)
 values(p_property,p_thread,p_message,p_source_version,p_language,p_mode,latest.body,p_decision)
 on conflict(property_id,conversation_id,message_id,source_version,language,mode) do nothing;
 select * into cached from public.reply_drafts where property_id=p_property and conversation_id=p_thread and message_id=p_message and source_version=p_source_version and language=p_language and mode=p_mode;
 return to_jsonb(cached);
end $$;
revoke all on function private.save_reply_draft(uuid,uuid,uuid,text,text,text,jsonb) from public,anon;
grant execute on function private.save_reply_draft(uuid,uuid,uuid,text,text,text,jsonb) to authenticated;
create function public.save_reply_draft(p_property uuid,p_thread uuid,p_message uuid,p_source_version text,p_language text,p_mode text,p_decision jsonb) returns jsonb language sql security invoker set search_path='' as $$select private.save_reply_draft(p_property,p_thread,p_message,p_source_version,p_language,p_mode,p_decision)$$;
revoke all on function public.save_reply_draft(uuid,uuid,uuid,text,text,text,jsonb) from public,anon;
grant execute on function public.save_reply_draft(uuid,uuid,uuid,text,text,text,jsonb) to authenticated;
commit;
