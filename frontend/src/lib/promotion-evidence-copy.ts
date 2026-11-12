import type {PromotionBrief, PromotionSource} from './promotion';
import {buildPromotionWritingContext,type PromotionWritingOptions} from './promotion-writing-context';

function stayScene(features:string[],zh:boolean,angle:string,audience:string,capacity?:number){
 // These are invitations to use an explicitly described space, not promises of
 // weather, quiet, views, refreshments or a particular stay experience.
 const choices=[
  {match:/阅读角|reading (?:corner|nook)/i,zh:'带上一本正在读的书，在阅读角接着读完上次停下的那一页。',en:'Bring a book to the reading corner and return to the page where you last left off.'},
  {match:/书房|阅览|reading room|library/i,zh:'带上一本正在读的书，给翻页的片刻留一点时间。',en:'Bring a book you are reading and leave a little unhurried time to turn its pages.'},
  {match:/茶席|tea (?:table|corner)/i,zh:'在茶席前坐一坐，先不急着安排下一站。',en:'Pause at the tea space before deciding where to go next.'},
  {match:/茶室|茶桌|tea room/i,zh:'给喝茶的片刻留一点时间，先不急着安排下一站。',en:'Leave a moment for tea before deciding where to go next.'},
  {match:/露台|terrace/i,zh:'不妨到露台上停留片刻，把下一段行程留给稍后的自己。',en:'Step onto the terrace for a pause, leaving the next part of the itinerary for later.'},
  {match:/庭院|院落|小院|院子|courtyard/i,zh:'给院里的一小段停留也留出时间，不必把每个空当都填满。',en:'Leave time for a pause in the courtyard; there is no need to fill every gap in the day.'},
  {match:/窗|window/i,zh:'不妨在窗边停一会儿，让目光从屏幕移向窗外。',en:'Pause by the window and let your attention move from the screen to what is outside.'},
  {match:/花园|garden/i,zh:'留一点时间看看花园，再慢慢决定接下来要去哪里。',en:'Take a moment to look at the garden before deciding where the day should take you.'},
 ];
 const available=choices.filter(choice=>features.some(feature=>choice.match.test(feature)));
 const focused=available.find(choice=>choice.match.test(angle));
 const selected=[...(focused?[focused]:[]),...available.filter(choice=>choice!==focused)].slice(0,2);
 if(selected.length)return selected.map(choice=>zh?choice.zh:choice.en).join(zh?'':' ');
 if(features.length)return zh?`${features[0].replace(/[。.]$/,'')}。把这一处细节，也留进小住的时间里。`:`${features[0].replace(/[。.]$/,'')}. Leave a little time to enjoy this detail during your stay.`;
 if(/独自|独行|solo/i.test(audience))return zh?'若是独自出发，就把这段时间留给自己的步调：想走走便出门，想停下也无需赶路。':'If you are travelling on your own, leave this time to your own pace: wander when you feel like it, and pause without rushing on.';
 if(capacity&&capacity>=2&&/双人|两人|好友|朋友|pairs|couple|friends/i.test(audience))return zh?'和同行的人各留一个想去的地方，也留一点不用商量下一站的时间。':'Choose somewhere each of you would like to go, and leave some time without a next stop to agree on.';
 return zh?'不必把每天排得满满当当，留一点时间走走停停，也留一点时间什么都不安排。':'Leave some time to wander, and some time with nothing planned at all.';
}

export function promotionEvidenceCopy(brief:PromotionBrief,name:string,source?:PromotionSource,opening?:string,location?:string,facts:{id:string;text:string}[]=[],options:Omit<PromotionWritingOptions,'source'>={}){
 const context=buildPromotionWritingContext(facts,brief,name,{...options,source}),zh=brief.language==='zh';
 const place=context.property.location||location||'',room=context.property.rooms[0];
 const selected=context.selectedSource;
 // Legacy callers may have only an attributed source title. Do not invent its
 // date, location or URL to manufacture a complete source object.
 const legacyTitle=!source?facts.find(f=>/^source_\d+$/.test(f.id))?.text.split('\n')[0].trim():undefined;
 const period=selected&&(selected.start===selected.end?selected.start:`${selected.start} — ${selected.end}`);
 const dates=brief.start===brief.end?brief.start:`${brief.start} — ${brief.end}`;
 const scene=stayScene(context.property.features,zh,context.creativeDirection.angle,context.creativeDirection.audience,room?.capacity);
 const invite=zh?`${place?`若打算到${place}走走，`:''}欢迎来${name}小住。`:`${place?`If you are planning a trip to ${place}, `:'For your next short trip, '}we would love to welcome you to ${name}.`;
 let reason='';
 if(selected?.kind==='weather'){
  const forecast=selected.summary.split(' · ').filter(part=>!/^(获取于|Retrieved |预报可能变化$|Forecast, subject to change$)/i.test(part.trim())).join(zh?'，':', ').replace(/[。.]$/,'');
  reason=zh?`${selected.title}（${period}）：${forecast}。把天气当作安排行程的参考，也给出发留一点弹性；出行前请再看看最新预报。`:`${selected.title} (${period}): ${forecast}. Let the forecast guide a flexible itinerary, and check the latest update before setting off.`;
 }else if(selected){
  reason=zh?`如果你也想去看看「${selected.title}」，不妨由它开始，安排一段不赶路的小住。活动日期为 ${period}，出发前再核对主办方的安排。`:`If “${selected.title}” has caught your interest, let it be the start of an unhurried short trip. The event runs ${period}; check the organiser’s arrangements before travelling.`;
 }else if(legacyTitle){
  reason=zh?`从「${legacyTitle}」出发，给一次小住找一个具体的理由，也给行程留一点余地。`:`Let “${legacyTitle}” be a reason for a short trip, with a little room left in the itinerary.`;
 }
 const cta=zh?`若计划在 ${dates} 来小住，欢迎私信入住日期与人数，我们一起确认${room?`「${room.name}」的`:'适合的房型、'}房态与价格。`:`For a stay during ${dates}, message us with your dates and group size to check ${room?`availability and rates for ${room.name}`:'suitable rooms, availability and rates'}.`;
 // Sparse profiles stay short. Rich profiles get room for a scene; there is no
 // mandated title, paragraph count, time of day, weekday or length of stay.
 const stay=reason?[invite,scene].join(zh?'':' '):[invite,scene].join('\n\n');
 return [opening,reason,stay,cta].filter(Boolean).join('\n\n');
}
