// Isolated test/sample adapter, never imported by production code.
const {randomUUID,createHash}=require('node:crypto');
module.exports=function conversationFixture(sample,getProfile){
 const threads=new Map();
 const drafts=new Map();const settings=new Map(),events=new Map();
 if(sample)for(const [index,question] of ['早餐几点开始？','可以提前到店吗？'].entries()){
  const thread={id:randomUUID(),property_id:sample.propertyId,guest_name:index?'周小雨（虚构）':'林小夏（虚构）',hash:'sample-'+index,messages:[{id:randomUUID(),sender:'guest',body:question,created_at:new Date().toISOString()}]};threads.set(thread.id,thread);
 }
 return function handle(url,body,identity,propertyId){
  const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
  if(['/rest/v1/reply_automation_settings','/rest/v1/reply_automation_events'].includes(url.pathname)){
   if(!identity||identity.index===2||url.searchParams.get('property_id')!=='eq.'+propertyId)return json({message:'property_not_owned'},403);
   return json(url.pathname.endsWith('settings')?(settings.has(propertyId)?[settings.get(propertyId)]:[]):[...events.values()].filter(e=>e.property_id===propertyId&&(!url.searchParams.has('state')||['replied','handoff'].includes(e.state))).sort((a,b)=>b.created_at.localeCompare(a.created_at)).map(({claim,version,...event})=>event));
  }
  if(url.pathname==='/rest/v1/rpc/control_reply_automation'){
   if(!identity||identity.index===2||body.p_property!==propertyId)return json({message:'property_not_owned'},403);
   if(body.p_thread){const thread=threads.get(body.p_thread);if(thread?.property_id!==propertyId)return json({message:'conversation_not_found'},404);thread.manual_control=body.p_manual;thread.handoff_reason=null;for(const e of events.values())if(e.conversation_id===thread.id&&e.state==='processing'&&body.p_manual)e.state='superseded';return json({manual_control:body.p_manual})}
   const old=settings.get(propertyId);if((old?.revision||null)!==body.p_revision)return json({message:'settings_changed'},409);
   const value={enabled:body.p_enabled,revision:randomUUID()};settings.set(propertyId,value);if(!value.enabled)for(const e of events.values())if(e.property_id===propertyId&&e.state==='processing')e.state='superseded';return json(value);
  }
  if(url.pathname==='/rest/v1/rpc/guest_reply_automation'){
   if(!/^[a-f0-9]{64}$/.test(body.p_token||''))return json({message:'guest_session_required'},401);
   const config=settings.get(body.p_property);if(!config?.enabled)return json({state:'paused'});
   const hash=createHash('sha256').update(body.p_token).digest('hex'),thread=[...threads.values()].find(t=>t.property_id===body.p_property&&t.hash===hash);
   if(!thread)return json({state:'idle'});if(thread.manual_control)return json({state:'manual'});
   const message=thread.messages.at(-1);if(message?.sender!=='guest')return json({state:'idle'});
   const details=getProfile(body.p_property),profile=details?.profile||{},version=details?.revision||'none';let event=events.get(message.id);
   if(body.p_action==='begin'){
    if(event)return json({state:event.state});event={id:randomUUID(),claim:randomUUID(),property_id:body.p_property,conversation_id:thread.id,message_id:message.id,state:'processing',reason:'processing',created_at:new Date().toISOString(),version,revision:config.revision};events.set(message.id,event);
    return json({state:'processing',claim:event.claim,message:message.body,profile:{breakfast:profile.breakfast,checkin:profile.checkin}});
   }
   if(event?.claim!==body.p_data.claim)return json({message:'automation_changed'},409);
   if(event.state!=='processing')return json({state:event.state});
   const plan=body.p_data;event.engine=plan.engine;
   if(event.version!==version||event.revision!==config.revision||plan.reason!=='ready'||!profile[plan.key]){event.state='handoff';event.reason=plan.reason==='ready'?'context_changed':plan.reason;thread.manual_control=true;thread.handoff_reason=event.reason;return json({state:'handoff'})}
   const value=profile[plan.key],zh=plan.language==='zh',text=plan.key==='breakfast'?(zh?`早餐时间：${value}。`:`Breakfast hours: ${value}.`):(zh?`常规入住时间：${value}。`:`Standard check-in time: ${value}.`);
   thread.messages.push({id:randomUUID(),sender:'owner',body:text,automatic:true,created_at:new Date().toISOString()});event.state='replied';event.reason='ready';event.citation_key=plan.key;event.citation_value=value;return json({state:'replied'});
  }
  const draftPath=url.pathname.match(/^\/v1\/properties\/([^/]+)\/conversations\/([^/]+)\/draft$/);
  if(draftPath){
   const thread=threads.get(draftPath[2]);if(!identity||draftPath[1]!==propertyId||thread?.property_id!==propertyId)return json({detail:'not_found'},404);
   const message=thread.messages.at(-1);if(message?.sender!=='guest')return json({detail:'conversation_changed'},409);
   const details=getProfile(propertyId),version=details?.revision||'none',profile=details?.profile||{},key=[thread.id,message.id,version,body.language].join(':');
   if(drafts.has(key))return json(drafts.get(key));
   const zh=body.language==='zh',question=message.body;let draft=null,reason='unsupported_question',citations=[];
   if(/提前|early|退款|refund|cancel|取消/i.test(question))reason=/退款|refund|cancel|取消/i.test(question)?'sensitive_request':'needs_confirmation';
   else if(/早餐|breakfast/i.test(question)){
    if(profile.breakfast){draft=zh?`早餐时间：${profile.breakfast}。`:`Breakfast hours: ${profile.breakfast}.`;reason='ready';citations=[{key:'breakfast',value:profile.breakfast}];}else reason='missing_fact';
   }else if(/入住|check.?in/i.test(question)){
    if(profile.checkin){draft=zh?`常规入住时间：${profile.checkin}。`:`Standard check-in time: ${profile.checkin}.`;reason='ready';citations=[{key:'checkin',value:profile.checkin}];}else reason='missing_fact';
   }
   const result={id:randomUUID(),message_id:message.id,source_version:version,created_at:new Date().toISOString(),decision:{draft,engine:'rules_v1',reason_code:reason,citations,sent:false,disposition:'needs_review'}};
   drafts.set(key,result);return json(result);
  }
  if(url.pathname==='/rest/v1/rpc/guest_message_api'){
   if(!/^[a-f0-9]{64}$/.test(body.p_token||''))return json({message:'guest_session_required'},401);
   const hash=createHash('sha256').update(body.p_token).digest('hex');let thread=[...threads.values()].find(t=>t.property_id===body.p_property&&t.hash===hash);
   if(body.p_action==='message'){
    if(!thread){thread={id:randomUUID(),property_id:body.p_property,guest_name:'访客',hash,messages:[]};threads.set(thread.id,thread)}
    const old=thread.messages.find(m=>m.sender==='guest'&&m.request===body.p_data.requestId);
    if(old&&old.body!==body.p_data.body)return json({message:'request_changed'},409);
    if(!old)thread.messages.push({id:randomUUID(),sender:'guest',body:body.p_data.body,request:body.p_data.requestId,created_at:new Date().toISOString()});
   }
   return json({id:thread?.id||null,messages:thread?.messages.map(({request,...m})=>m)||[]});
  }
  if(url.pathname==='/rest/v1/rpc/get_conversations'){
   if(!identity||identity.index===2||body.p_property!==propertyId)return json({message:'property_not_owned'},403);
   return json([...threads.values()].filter(t=>t.property_id===propertyId).map(t=>({id:t.id,guest_name:t.guest_name,manual_control:!!t.manual_control,handoff_reason:t.handoff_reason,latest:t.messages.at(-1)})));
  }
  if(url.pathname==='/rest/v1/rpc/reply_conversation'){
   const thread=threads.get(body.p_thread);if(!identity||body.p_property!==propertyId||thread?.property_id!==propertyId)return json({message:'conversation_not_found'},404);
   const previous=thread.messages.find(m=>m.sender==='owner'&&m.request===body.p_request);
   if(previous)return previous.body===body.p_body?json(previous):json({message:'request_changed'},409);
   if(thread.messages.at(-1)?.id!==body.p_reply_to||thread.messages.at(-1)?.sender!=='guest')return json({message:'conversation_changed'},409);
   const message={id:randomUUID(),sender:'owner',body:body.p_body,request:body.p_request,created_at:new Date().toISOString()};thread.messages.push(message);thread.manual_control=true;thread.handoff_reason=null;return json(message);
  }
  if(url.pathname==='/rest/v1/conversations'||url.pathname==='/rest/v1/messages'){
   if(!identity||identity.index===2)return json({message:'Forbidden'},403);
   if(url.searchParams.get('property_id')!==`eq.${propertyId}`)return json([]);
   if(url.pathname.endsWith('/conversations'))return json([...threads.values()].filter(t=>t.property_id===propertyId&&'eq.'+t.id===url.searchParams.get('id')).map(t=>({id:t.id,guest_name:t.guest_name,manual_control:!!t.manual_control,handoff_reason:t.handoff_reason})));
   const thread=[...threads.values()].find(t=>t.property_id===propertyId&&'eq.'+t.id===url.searchParams.get('conversation_id'));return json(thread?.messages||[]);
  }
  if(sample&&url.pathname==='/rest/v1/rpc/direct_booking_api'&&body.p_action==='catalog')return json({name:sample.profile.name,types:sample.inventory.types.map(t=>({...t,available:1}))});
  return null;
 };
};
