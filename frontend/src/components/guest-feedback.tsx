"use client";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { exploreTopics, type TopicId } from "./explore-data";
import "./guest-feedback.css";
const topicIds: TopicId[] = ["Location", "Cleanliness", "Breakfast", "Service"];
export function GuestFeedback({ language }: { language: "en" | "zh" }) {
 const [topic,setTopic] = useState<TopicId>("Breakfast");
 const [showComments,setShowComments] = useState(false);
 const zh=language === "zh";
 const t=(en:string,cn:string)=>zh?cn:en;
 const selectedTopic=exploreTopics[topic];
 return <div id="guest-feedback">
      <section className="explore-guests">
        <span className="native-kicker">{t("GUEST INTELLIGENCE", "客人洞察")}</span>
        <h2>{t("What guests are talking about", "客人都在聊什么")}</h2>
        <p className="explore-note">{t("Tap a topic from 42 fictional reviews. Topics can overlap.", "点选 42 条虚构评价中的话题，同一评价可涉及多个话题。")}</p>
        <div className="explore-topic-orbit" role="group" aria-label={t("Review topics", "评价话题")}>{topicIds.map((id, index) => <button type="button" key={id} className={"explore-topic topic-" + index} aria-pressed={topic === id} onClick={() => { setTopic(id); setShowComments(false); }}><span>{zh ? exploreTopics[id].chinese : id}</span><small>{exploreTopics[id].mentions}</small></button>)}</div>
        <div className="explore-topic-detail" aria-live="polite"><div><small>{zh ? selectedTopic.chinese : topic}</small><h3>{selectedTopic.sentiment[zh ? 1 : 0]}</h3><p>{t("Mentioned in " + selectedTopic.mentions + " sample reviews", selectedTopic.mentions + " 条示例评价提及")}</p></div><button type="button" className="native-primary" onClick={() => setShowComments(!showComments)}>{t("View comments", "查看评价")} <ArrowRight size={15} /></button></div>
      </section>


 {showComments && <div className="feedback-comments">{selectedTopic.comments.map((comment,index)=><blockquote key={index}><p>{comment[zh?1:0]}</p><small>{t("Sample guest", "示例客人")} {index+1}</small></blockquote>)}</div>}
 </div>;
}
