import {bookingPeriod} from "./booking-period";

// Curated from the State Council notice, not an inferred calendar or demand feed.
// Coverage is intentionally limited to the verified notice year.
export const holidayNotice={year:2026,published:"2025-11-04",checkedOn:"2026-10-30",url:"https://www.beijing.gov.cn/cs/gncs/zcwj/202603/t20260327_4568275.html"};
const holidays=[
 ["元旦","New Year","2026-01-01","2026-01-03"],
 ["春节","Spring Festival","2026-02-15","2026-02-23"],
 ["清明节","Qingming","2026-04-04","2026-04-06"],
 ["劳动节","Labour Day","2026-05-01","2026-05-05"],
 ["端午节","Dragon Boat Festival","2026-06-19","2026-06-21"],
 ["中秋节","Mid-Autumn Festival","2026-09-25","2026-09-27"],
 ["国庆节","National Day","2026-10-01","2026-10-07"],
] as const;
export function officialHolidayReferences(start:string,end:string,zh:boolean){
 if(!bookingPeriod({start,end}))return [];
 return holidays.filter(([, ,from,through])=>from<=end&&through>=start).map(([cn,en,from,through])=>({
  title:zh?`中国大陆公众假期：${cn}`:`Mainland China public holiday: ${en}`,
  summary:zh?`${holidayNotice.year}年${cn}放假安排为${from}至${through}。仅表示公众假期，不代表本地活动、交通安排或住宿需求。`:`The ${holidayNotice.year} ${en} public holiday runs from ${from} through ${through}. This does not establish local events, transport arrangements or accommodation demand.`,
  start:from,end:through,url:holidayNotice.url,
 }));
}
