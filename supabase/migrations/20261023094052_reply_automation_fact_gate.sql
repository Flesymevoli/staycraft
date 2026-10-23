begin;
create or replace function private.guest_reply_automation(p_property uuid,p_token text,p_action text,p_data jsonb) returns jsonb
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
 -- Repeat the high-risk gate in the database: RPC arguments are untrusted.
 if lower(latest.body) ~ '(refund|cancel|discount|compensation|price|cost|free|退款|退订|取消|赔偿|优惠|折扣|多少钱|收费|免费)' then v_reason:='sensitive_request';
 elsif lower(latest.body) ~ '(early|earlier|late|later|before|提前|提早|延迟|接送|司机|pickup|transfer|driver)' then v_reason:='needs_confirmation';end if;
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
commit;
