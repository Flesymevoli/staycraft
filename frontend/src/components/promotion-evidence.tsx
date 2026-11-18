import {REVIEW_REASONS,type EventSearchReview} from '@/lib/signals/event-review';
import {officialHolidayReferences} from '@/lib/official-holidays';

export function PromotionEvidence({review,zh}:{review?:EventSearchReview;zh:boolean}){
 const t=(cn:string,en:string)=>zh?cn:en;
 if(!review)return null;
 return <div className="gemini-promo-evidence">
  <details className="gemini-promo-review"><summary>{t('搜索核验详情','Search verification details')}</summary>
   <p>{t(`原始结果 ${review.raw} 条 → 可读页面 ${review.pages} 篇 → 解析活动 ${review.parsed} 项 → 筛选保留 ${review.final} 项`,`Raw ${review.raw} → Readable pages ${review.pages} → Parsed events ${review.parsed} → Retained ${review.final}`)}</p>
   <p>{t('一篇报道可能包含多项活动；此漏斗仅统计本次搜索，独立日历来源另计。','One article may contain multiple events. This funnel excludes separate calendar sources.')}</p>
   <p>{t('检索：','Query: ')}{review.query}<br/>{t('采集于：','Collected: ')}{review.observedAt.replace('T',' ').replace(/\.\d+Z$/,' UTC')}{review.cached&&t(' · 使用缓存，场地距离已重新核验',' · Cached pages; venue distances rechecked')}</p>
   <ol>{review.rows.map((row,index)=><li key={index}><strong>{row.title}</strong>{row.events.length?<ul>{row.events.map((event,i)=><li key={i}>{event.title} · {REVIEW_REASONS[event.reason][zh?0:1]}</li>)}</ul>:<p>{REVIEW_REASONS[row.reason][zh?0:1]}</p>}</li>)}</ol>
  </details>
 </div>;
}

export function PromotionOpportunities({start,end,zh}:{start:string;end:string;zh:boolean}){
 const t=(cn:string,en:string)=>zh?cn:en;
 const days:string[]=[];
 const from=Date.parse(start),to=Date.parse(end);
 if(Number.isFinite(from)&&Number.isFinite(to)&&to>=from&&to-from<28*86400000){for(let at=from;at<=to;at+=86400000){if([0,6].includes(new Date(at).getUTCDay()))days.push(new Date(at).toISOString().slice(0,10))}}
 const holidays=officialHolidayReferences(start,end,zh);
 const month=Number(start.slice(5,7));
 const preparation=month>=11||month<=2?t('可检查保暖床品与热水供应，并准备已有取暖设施的使用说明。','Check warm bedding and hot water, and prepare instructions for existing heating amenities.'):month>=6&&month<=8?t('可检查通风、遮阳与雨具，并准备已有降温设施的使用说明。','Check ventilation, shade and rain gear, and prepare instructions for existing cooling amenities.'):t('可检查床品厚薄与雨具，并核对室内外活动空间的使用安排。','Review bedding, rain gear and arrangements for indoor and outdoor spaces.');
 return <section className="gemini-promo-opportunities" aria-label={t('经营机会','Operating opportunities')}>
  <h3>{t('经营机会 · 日历建议','Operating opportunities · Calendar ideas')}</h3>
  <p>{t('根据所选日期提出准备建议，不是本地活动记录，也不代表需求或房价将上涨。','Preparation ideas based on your dates, not local events or evidence of increased demand or prices.')}</p>
  <ul>
   {days.length>0&&<li><strong>{t('周末小住','Weekend stays')}</strong><p>{t(`所选范围含 ${days.length} 个周六或周日（如 ${days[0]}）。可核对空房与到店安排，再准备短住邀请；实际休息日以调休安排为准。`,`Your dates include ${days.length} Saturdays or Sundays (e.g. ${days[0]}). Check availability and arrival arrangements before drafting short-stay invitations; adjusted working days may differ.`)}</p></li>}
   {holidays.map(holiday=><li key={holiday.start}><strong>{holiday.title}</strong><p>{holiday.start} — {holiday.end} · {t('可提前核对入住须知与人员安排，优惠须结合实际库存。','Review arrival information and staffing; base offers on actual inventory.')}</p><a href={holiday.url} target="_blank" rel="noopener noreferrer">{t('查看假期依据','View holiday source')}</a></li>)}
   <li><strong>{t(`${month} 月入住准备`,`Stay preparation · Month ${month}`)}</strong><p>{preparation}{t('仅介绍民宿真实设施；具体气温和降雨以临近预报为准。','Describe only actual amenities; check weather forecasts closer to arrival.')}</p></li>
  </ul>
 </section>;
}
