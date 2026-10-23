"use client";
import {useEffect,useRef,useState} from "react";
import Link from "next/link";
import {ArrowLeft,MessageCircle,ChevronRight} from "lucide-react";
import {useOperatorSample} from "./operator-sample-context";
import "./cloud-conversations.css";
import {ConversationDraft} from "./conversation-draft";
type Message={id:string;sender:"guest"|"owner";body:string;created_at:string;automatic?:boolean};
type Summary={id:string;guest_name:string;manual_control?:boolean;handoff_reason?:string;latest:Message|null};
async function read(url:string,signal?:AbortSignal){const response=await fetch(url,{cache:"no-store",signal});const body=await response.json();if(!response.ok)throw new Error();return body;}

function CloudThread({thread,property,zh}:{thread?:string;property?:string;zh:boolean}){
 const guest=!!property,sample=useOperatorSample();const [name,setName]=useState(""),[messages,setMessages]=useState<Message[]>([]),[status,setStatus]=useState("loading"),[text,setText]=useState(""),[busy,setBusy]=useState(false),[notice,setNotice]=useState(""),[retry,setRetry]=useState(0),[uncertain,setUncertain]=useState(false);
 const [manual,setManual]=useState(false),[controlBusy,setControlBusy]=useState(false);
 const pending=useRef<{requestId:string;body:string;replyTo?:string}|null>(null),sending=useRef(false),generation=useRef(0);
 const t=(en:string,cn:string)=>zh?cn:en;
 useEffect(()=>{const controller=new AbortController(),current=++generation.current;
  void read(guest?`/api/guest?property=${property}&action=messages`:`/api/workspace/conversations?thread=${thread}`,controller.signal).then(body=>{if(current===generation.current&&!controller.signal.aborted){setMessages(body.messages);setManual(!!body.manual_control);setName(body.guest_name||"");setStatus("ready");}}).catch(()=>{if(!controller.signal.aborted&&current===generation.current)setStatus("error")});
  return()=>controller.abort();
 },[thread,property,guest,retry]);
 const latest=messages.at(-1);
 async function control(){if(controlBusy)return;setControlBusy(true);try{const response=await fetch("/api/workspace/automation",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({thread,manual:!manual})});if(!response.ok)throw new Error();setManual(!manual);setNotice(manual?t("Automatic handling resumes for new messages when the property switch is on.","民宿自动回复开启时，后续新消息恢复自动处理。"):t("You have taken over this conversation.","你已接管这条会话。"))}catch{setNotice(t("Could not confirm the change. Refresh before retrying.","尚未确认变更，请刷新核对后重试。"))}finally{setControlBusy(false)}}
 async function send(event:React.FormEvent){event.preventDefault();if(sending.current||!text.trim()||(!guest&&latest?.sender!=="guest"&&!pending.current))return;
  pending.current??={requestId:crypto.randomUUID(),body:text.trim(),replyTo:latest?.id};const input=pending.current;
  sending.current=true;setBusy(true);setUncertain(true);setNotice("");++generation.current;
  try{const response=await fetch(guest?"/api/guest":"/api/workspace/conversations",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(guest?{property,action:"message",requestId:input.requestId,body:input.body}:{thread,...input})});const body=await response.json();
   if(!response.ok){if(response.status===409){pending.current=null;setUncertain(false);setRetry(v=>v+1);}throw new Error(body.error);}
   setMessages(old=>guest?body.messages:old.some(m=>m.id===body.id)?old:[...old,body]);setText("");pending.current=null;setUncertain(false);setStatus("ready");setNotice(sample?t("Sample reply saved locally.","演示回复已保存到本机。"):t("Sent to this website conversation.","已发送至站内会话。"));
  }catch(error){setNotice((error as Error).message==="conversation_changed"?t("New messages arrived. Review the refreshed conversation before replying.","会话已更新，请核对最新消息后再回复。输入已保留。"):t("Not confirmed. Your text is retained; retry the same message.","尚未确认发送成功，输入已保留，请重试同一条消息。"));}
  finally{sending.current=false;setBusy(false);}
 }
 return <div className="cloud-thread"><div className="native-section-head"><h3>{guest?"联系民宿":name||t("Conversation","会话")}</h3><button type="button" className="inventory-text" disabled={busy} onClick={()=>{setStatus("loading");setRetry(v=>v+1)}}>{t("Refresh","刷新")}</button></div>
 {!guest&&status==="ready"&&<div className="conversation-control"><span>{manual?t("Manual handling","人工处理中"):t("Follows automatic reply setting","跟随民宿自动回复设置")}</span><button type="button" className="inventory-text" disabled={busy||controlBusy} onClick={()=>void control()}>{manual?t("Resume automatic handling","恢复自动处理"):t("Take over","转人工接管")}</button></div>}
 {status==="loading"?<p role="status">{t("Loading messages…","正在读取消息…")}</p>:status==="error"?<p role="alert">{t("Messages unavailable. Please retry.","暂时无法读取消息，请刷新重试。")}</p>:<><div className="cloud-message-list">{!messages.length&&<p>{t("No messages yet.","暂无消息，可以在下方留言。")}</p>}{messages.map(message=><article key={message.id} className={`cloud-message cloud-message-${message.sender}`}><small>{message.sender==="guest"?t("Guest","客人"):message.automatic?t("Automatic reply","自动回复"):t("Property","民宿")} · {new Date(message.created_at).toLocaleString(zh?"zh-CN":"en-GB",{timeZone:"Asia/Shanghai"})}</small><p>{message.body}</p></article>)}</div>
 {!guest&&thread&&latest?.sender==="guest"&&<ConversationDraft key={`${latest.id}:${zh}`} thread={thread} zh={zh} disabled={busy||uncertain} hasText={!!text.trim()} onUse={setText}/>}
 <form onSubmit={event=>void send(event)}><label>{guest?"你的问题":t("Your reply","你的回复")}<textarea rows={3} maxLength={2000} required disabled={busy||uncertain} value={text} onChange={event=>setText(event.target.value)}/></label><button className={guest?"guest-primary":"native-primary"} disabled={busy||!text.trim()||(!guest&&latest?.sender!=="guest"&&!uncertain)}>{busy?t("Sending…","正在发送…"):uncertain?t("Retry send","重试发送"):t("Send","发送")}</button></form>
 {!guest&&latest?.sender==="owner"&&<p>{t("Reply sent. Wait for the next guest message.","已回复，等待客人的下一条消息。")}</p>}{notice&&<p role="status">{notice}</p>}</>}
 </div>;
}
export function GuestContactMessages({property}:{property:string}){return <CloudThread key={property} property={property} zh/>;}
export function WorkspaceInbox({zh}:{zh:boolean}){
 const [items,setItems]=useState<Summary[]>([]),[status,setStatus]=useState("loading"),[retry,setRetry]=useState(0);
 const t=(en:string,cn:string)=>zh?cn:en;
 useEffect(()=>{const controller=new AbortController();void read("/api/workspace/conversations",controller.signal).then(body=>{if(!controller.signal.aborted){setItems(body.items);setStatus("ready")}}).catch(()=>{if(!controller.signal.aborted)setStatus("error")});return()=>controller.abort();},[retry]);
 useEffect(()=>{if(status!=="ready")return;const locate=()=>{const hash=window.location.hash.slice(1);if(!/^message-[a-f0-9-]{36}$/i.test(hash))return;const target=document.getElementById(hash);if(target){target.scrollIntoView({block:"center"});target.focus({preventScroll:true});}};locate();window.addEventListener("hashchange",locate);return()=>window.removeEventListener("hashchange",locate);},[status,items]);
 return <section id="workspace-messages" className="workspace-section workspace-messages"><div className="native-section-head"><h2>{t("Guest messages","客人消息")}</h2>{<button aria-label={t("Refresh messages","刷新消息")} className="inventory-text" type="button" onClick={()=>{setStatus("loading");setRetry(v=>v+1)}}>{t("Refresh","刷新")}</button>}</div><div className="native-card cloud-inbox">{status==="loading"?<p role="status">{t("Loading conversations…","正在读取会话…")}</p>:status==="error"?<p role="alert">{t("Messages unavailable. Please retry.","暂时无法读取消息，请刷新重试。")}</p>:!items.length?<div className="cloud-inbox-empty"><MessageCircle size={26}/><h3>{t("Ready for your first conversation.","等待第一条客人消息。")}</h3><p>{t("Messages from the guest contact page will appear here.","客人在「联系民宿」留下的咨询会显示在这里。")}</p></div>:<>{items.map(item=><Link className="cloud-inbox-row" id={`message-${item.id}`} tabIndex={0} key={item.id} href={`/app/messages/${item.id}`}><span className="cloud-inbox-avatar" aria-hidden="true">{Array.from(item.guest_name.trim())[0] || "G"}</span><div className="cloud-inbox-copy"><strong>{item.guest_name}</strong><span>{item.latest?.body}</span><small className={item.latest?.sender==="guest"?"is-pending":""}>{item.latest?.sender==="guest"?item.handoff_reason?t("Needs your attention","需人工处理"):t("Needs reply","待回复"):item.latest?.automatic?t("Replied automatically","已自动回复"):t("Replied","已回复")}</small></div><ChevronRight size={15} aria-hidden="true" className="cloud-inbox-chevron"/></Link>)}{items.length===50&&<p>{t("Showing the 50 most recent conversations.","当前显示最近50条会话。")}</p>}</>}</div></section>;
}

export function WorkspaceConversation({zh,threadId}:{zh:boolean;threadId:string}){return <section className="workspace-section"><Link className="room-detail-back" href={`/app/work#message-${threadId}`}><ArrowLeft size={16}/>{zh?"返回消息列表":"Back to messages"}</Link><div className="native-card"><CloudThread thread={threadId} zh={zh}/></div></section>;}
