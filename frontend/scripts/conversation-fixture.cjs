// Isolated test/sample adapter, never imported by production code.
const {randomUUID,createHash}=require('node:crypto');
module.exports=function conversationFixture(sample,getProfile){
 const threads=new Map();
 const drafts=new Map();
 if(sample)for(const [index,question] of ['早餐几点开始？','可以提前到店吗？'].entries()){
  const thread={id:randomUUID(),property_id:sample.propertyId,guest_name:index?'周小雨（虚构）':'林小夏（虚构）',hash:'sample-'+index,messages:[{id:randomUUID(),sender:'guest',body:question,created_at:new Date().toISOString()}]};threads.set(thread.id,thread);
 }
 return function handle(url,body,identity,propertyId){
  const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
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
   return json([...threads.values()].filter(t=>t.property_id===propertyId).map(t=>({id:t.id,guest_name:t.guest_name,latest:t.messages.at(-1)})));
  }
  if(url.pathname==='/rest/v1/rpc/reply_conversation'){
   const thread=threads.get(body.p_thread);if(!identity||body.p_property!==propertyId||thread?.property_id!==propertyId)return json({message:'conversation_not_found'},404);
   const previous=thread.messages.find(m=>m.sender==='owner'&&m.request===body.p_request);
   if(previous)return previous.body===body.p_body?json(previous):json({message:'request_changed'},409);
   if(thread.messages.at(-1)?.id!==body.p_reply_to||thread.messages.at(-1)?.sender!=='guest')return json({message:'conversation_changed'},409);
   const message={id:randomUUID(),sender:'owner',body:body.p_body,request:body.p_request,created_at:new Date().toISOString()};thread.messages.push(message);return json(message);
  }
  if(url.pathname==='/rest/v1/conversations'||url.pathname==='/rest/v1/messages'){
   if(!identity||identity.index===2)return json({message:'Forbidden'},403);
   if(url.searchParams.get('property_id')!==`eq.${propertyId}`)return json([]);
   if(url.pathname.endsWith('/conversations'))return json([...threads.values()].filter(t=>t.property_id===propertyId&&'eq.'+t.id===url.searchParams.get('id')).map(t=>({id:t.id,guest_name:t.guest_name})));
   const thread=[...threads.values()].find(t=>t.property_id===propertyId&&'eq.'+t.id===url.searchParams.get('conversation_id'));return json(thread?.messages||[]);
  }
  if(sample&&url.pathname==='/rest/v1/rpc/direct_booking_api'&&body.p_action==='catalog')return json({name:sample.profile.name,types:sample.inventory.types.map(t=>({...t,available:1}))});
  return null;
 };
};
