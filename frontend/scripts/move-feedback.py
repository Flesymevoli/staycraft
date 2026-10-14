from pathlib import Path
root=Path(__file__).resolve().parents[1]/'src/components'
path=root/'explore-client.tsx'
s=path.read_text(encoding='utf-8')
start=s.index('      <section className="explore-guests">')
end=s.index('      <section className="explore-nearby">',start)
section=s[start:end].replace('openSheet("comments")','setShowComments(!showComments)')
component='''"use client";
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
'''+section.replace('onClick={() => setTopic(id)}','onClick={() => { setTopic(id); setShowComments(false); }}')+'''
 {showComments && <div className="feedback-comments">{selectedTopic.comments.map((comment,index)=><blockquote key={index}><p>{comment[zh?1:0]}</p><small>{t("Sample guest", "示例客人")} {index+1}</small></blockquote>)}</div>}
 </div>;
}
'''
(root/'guest-feedback.tsx').write_text(component,encoding='utf-8')
css=(root/'native-explore.css').read_text(encoding='utf-8')
a=css.index('.explore-guests {');b=css.index('.explore-nearby {',a)
(root/'guest-feedback.css').write_text(css[a:b]+'''\n#guest-feedback { margin-top: 30px; scroll-margin-top: 20px; }
#guest-feedback .explore-note { color: var(--muted); font-size: 12px; line-height: 1.6; }
#guest-feedback .explore-guests h2 { font-size: 24px; }
.feedback-comments blockquote { margin: 10px 0; padding: 16px; background: #fff; border-radius: 18px; font-size: 14px; line-height: 1.6; }
.feedback-comments small { color: var(--muted); font-size: 11px; }
''',encoding='utf-8')
s=s[:start]+'''      <section className="explore-local">
        <div className="explore-section-head"><h2>{t("Around your neighbourhood", "周边活动与服务")}</h2><span>{t("Sample listings", "示例信息")}</span></div>
        <p className="explore-note">{t("Local ideas for guest recommendations and promotion.", "为客人推荐和民宿推广提供线索。")}</p>
        {[
          {id:"market",title:t("Lakeside weekend market", "湖畔周末市集"),meta:t("Sep 26 · 10:00–18:00 · 15 min walk", "9 月 26 日 · 10:00–18:00 · 步行 15 分钟"),note:t("A sample event linked to the demand peak. Suggest a stay before the weekend rush.", "与需求高峰关联的示例活动，可考虑提前入住的推广方向。")},
          {id:"walk",title:t("Village morning walk", "村落晨间漫步"),meta:t("Daily · Suggested route · 45 min", "每日 · 推荐路线 · 45 分钟"),note:t("A quieter weekday experience to include in guest recommendations.", "适合工作日客人的安静体验，可作为游玩推荐。")},
          {id:"transfer",title:t("Garden Transfer", "Garden Transfer 接送服务"),meta:t("Saved partner · Airport pickup", "已保存合作方 · 机场接送"),note:t("AI can recommend this sample service and ask for arrival details. Availability needs provider confirmation.", "AI 可推荐此示例服务并询问到达信息，可用时间需服务方确认。")},
        ].map(item=><article key={item.id} className="native-card explore-local-card"><h3>{item.title}</h3><small>{item.meta}</small><p>{item.note}</p>{item.id === "transfer" ? <Link href="/native-work" className="work-text-action">{t("See guest messages", "查看客人消息")} <ArrowRight size={15}/></Link> : <button type="button" className="explore-local-action" onClick={()=>{setPromotionContext(item.id === "market" ? "market" : "walk");setPromotionDraft("");setPromotionSaved(false);document.getElementById("promotion")?.scrollIntoView({behavior:"smooth"});}}>{t("Use for promotion", "用于推广")} <ArrowRight size={15}/></button>}</article>)}
      </section>

'''+s[end:]
s=s.replace('import { exploreDays, exploreTopics, type TopicId }','import { exploreDays }')
s=s.replace('type Sheet = "day" | "comments" | null;','type Sheet = "day" | null;')
s=s.replace('const topicIds: TopicId[] = ["Location", "Cleanliness", "Breakfast", "Service"];','')
s=s.replace('  const [topic, setTopic] = useState<TopicId>("Breakfast");','')
s=s.replace('  const selectedTopic = exploreTopics[topic];','')
s=s.replace('  const [promotionSaved, setPromotionSaved] = useState(false);','  const [promotionSaved, setPromotionSaved] = useState(false);\n  const [promotionContext, setPromotionContext] = useState("market");')
start=s.index(' : sheet === "comments" ?')
end=s.index(' : null}',start)
s=s[:start]+s[end:]
s=s.replace('<h2>{t("A promotion worth exploring", "发现一个推广机会")}</h2>','<h2>{t("Promotion opportunity", "推广机会")}</h2><p className="explore-note">{promotionContext === "market" ? t("Selected idea: lakeside weekend market · Sample", "已选线索：湖畔周末市集 · 示例") : t("Selected idea: village morning walk · Sample", "已选线索：村落晨间漫步 · 示例")}</p>')
s=s.replace('setPromotionDraft(zh ?', 'setPromotionDraft((promotionContext === "market" ? t("Local idea: lakeside weekend market (sample). Verify event details before publishing.\\n\\n", "周边线索：湖畔周末市集（示例），发布前需确认活动信息。\\n\\n") : t("Local idea: a village morning walk (sample). Verify route details before publishing.\\n\\n", "周边线索：村落晨间漫步（示例），发布前需确认路线信息。\\n\\n")) + (zh ?')
# Close the extra parenthesis around the translated sample body.
s=s.replace(')); }}>{t("Generate sample content"', '))); }}>{t("Generate sample content"')
path.write_text(s,encoding='utf-8')
path=root/'analysis-client.tsx';s=path.read_text(encoding='utf-8')
s=s.replace('import "./native-analysis.css";', 'import "./native-analysis.css";\nimport { GuestFeedback } from "./guest-feedback";')
s=s.replace('<Link href="/native-explore">{t("Explore guest feedback", "查看客人反馈")}', '<a href="#guest-feedback">{t("Explore guest feedback", "查看客人反馈")}')
s=s.replace('"查看客人反馈")} <ArrowRight size={14} /></Link>', '"查看客人反馈")} <ArrowRight size={14} /></a>')
s=s.replace('      <p className="analysis-footer">', '      <GuestFeedback language={language} />\n      <p className="analysis-footer">')
path.write_text(s,encoding='utf-8')
