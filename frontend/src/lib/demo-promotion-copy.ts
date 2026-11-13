import type {PromotionBrief,PromotionDraft,PromotionSource} from './promotion';

// Deterministic copy for the isolated desktop rehearsal. Never used by real accounts.
export function demoPromotionDraft(brief:PromotionBrief,source?:PromotionSource):PromotionDraft{
 const zh=brief.language==='zh';
 const dates=source?(source.start===source.end?source.start:`${source.start} — ${source.end}`):'';
 const content=source?(zh?
  `${source.title==='精品舞蹈专场'?'把一场舞蹈，留进太仓的周末':'为一场喜欢的活动，在太仓多留一晚'}\n\n把喜欢的活动放进周末，也给自己留一点不赶路的时间。\n\n「${source.title}」\n活动日期：${dates}\n${source.summary}\n\n看完后，和同行的人聊聊印象最深的片段，再回住处好好休息。不必把出行安排成当天往返，把它变成一次两天一晚的小旅行。\n\n想来太仓赴这场约？私信入住日期和人数，我们帮你核对房型、价格和可订情况。活动时间及票务以主办方最新发布为准。`:
  `Make room for a little more Taicang\n\nLet your next outing be more than a hurried return trip. Choose an event you would love to see, then give yourself an extra night to slow down.\n\n${source.title}\nEvent dates: ${dates}\n${source.summary}\n\nAfter the event, head back for a quiet rest and leave tomorrow unrushed. Whether you are travelling alone or sharing a short break, there is no need to fit everything into one day.\n\nVisiting between ${brief.start} and ${brief.end}? Send your dates and guest count to check rooms, rates and availability. Confirm event details and tickets with the organiser.`):
  zh?`给自己一个慢下来的太仓周末\n\n暂时放下赶路的节奏，给自己留一晚不着急的小住。白天按自己的步调逛逛，晚上回到住处好好休息。\n\n计划在 ${brief.start} — ${brief.end} 出发？私信入住日期和人数，一起确认适合的房型、价格与可订情况。`:
  `A slower weekend in Taicang\n\nLeave room for an unhurried overnight stay. Explore at your own pace, then return for a quiet rest.\n\nPlanning a trip between ${brief.start} and ${brief.end}? Send your dates and guest count to check room options, prices and availability.`;
 return {id:crypto.randomUUID(),brief,content,engine:'rules_v1',createdAt:new Date().toISOString(),basis:source?[{label:source.title,text:`${source.summary}\n${dates}`,url:source.url}]:[]};
}
