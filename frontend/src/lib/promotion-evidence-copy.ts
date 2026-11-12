import type {PromotionBrief, PromotionSource} from './promotion';

export function promotionEvidenceCopy(brief:PromotionBrief,name:string,source?:PromotionSource,opening?:string,location?:string,facts:{id:string;text:string}[]=[]){
 const zh=brief.language==='zh';
 const weather=!!source&&/天气预报|weather forecast/i.test(source.title);
 const period=source&&(source.start===source.end?source.start:`${source.start} — ${source.end}`);
 const title=weather?(zh?'出发前，看一眼天气':'Check the forecast before you go'):source?(zh?'看一场活动，留一晚慢慢逛':'Make a short stay out of a local event'):(zh?`下一次小住，来${name}`:`Plan a short stay at ${name}`);
 const lead=source?(weather?(zh?`准备来${name}小住？不妨给行程留一点弹性。`:`Planning a stay at ${name}? Leave a little room for a change of plans.`):(zh?`想把行程排得松一点？可以先挑一场活动，再把${name}列进住宿备选。`:`Pick an event you’d like to see and consider ${name} as a place to stay.`)):(location?(zh?`如果你计划到${location}走走，可以把我们加进住宿清单。`:`If you’re planning a trip to ${location}, consider staying with us.`):'');
 const forecast=source?.summary.split(' · ').filter(part=>!/^(获取于|Retrieved |预报可能变化$|Forecast, subject to change$)/.test(part)).join(zh?'，':', ');
 const anchor=source&&(weather
  ? (zh?`${source.title}：${forecast}。出发前以最新预报为准。`:`${source.title}: ${forecast}. Check the latest forecast before travelling.`)
  : (zh?`想去看「${source.title}」的话，可以先记下活动日期：${period}。出发前可查看主办方的最新安排。`:`Save the dates for “${source.title}”: ${period}. Check the organiser’s latest schedule before travelling.`));
 const room=facts.find(f=>/^room_\d+$/.test(f.id))?.text.replace(/^(房型|Room type)[:：]\s*/,'').trim();
 const notes=facts.find(f=>f.id==='notes')?.text.replace(/^(民宿说明|Property notes)[:：]\s*/,'').trim();
 const propertyDetail=!opening&&[source&&location?(zh?`${name}位于${location}。`:`${name} is located in ${location}.`):'',room?(zh?`住下来，可以看看${room.replace(/[。.]$/,'')}。`:`For your stay, consider ${room.replace(/[。.]$/,'')}.`):'',notes].filter(Boolean).join('\n');
 const dates=brief.start===brief.end?brief.start:`${brief.start} — ${brief.end}`;
 const cta=zh?`计划在 ${dates} 来小住？私信告诉我们入住日期和人数，一起确认适合的房型与价格。`:`Planning a stay during ${dates}? Message us with your dates and group size to check suitable rooms and rates.`;
 return [opening||[title,lead].filter(Boolean).join('\n\n'),anchor,propertyDetail,cta].filter(Boolean).join('\n\n');
}
