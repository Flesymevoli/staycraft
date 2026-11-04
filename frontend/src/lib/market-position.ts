export type MarketAnalysis={start:string;end:string;low:number;high:number;ownLow:number;ownHigh:number;count:number;checkedAt:string;location:string};
export type PricingContext={start:string;end:string;bookedPct:number|null;available:number|null;capacity:number|null};
export function marketAnalysis(data:{start:string;end:string;hotels:{id:number;price:number|null;currency:string;conditions:string}[];ownRates?:{min:number;max:number}|null;checkedAt:string;location:string;locationPrecision?:string}):MarketAnalysis|null{
 if(data.locationPrecision&&data.locationPrecision!=='property'||Date.parse(data.end)-Date.parse(data.start)!==86400000||!data.ownRates)return null;
 const quotes=[...new Map(data.hotels.filter(h=>h.currency==='CNY'&&typeof h.price==='number'&&Number.isFinite(h.price)&&h.price>0&&/1\s*晚.*总价|total/i.test(h.conditions)).map(h=>[h.id,h.price!])).values()];
 const {min,max}=data.ownRates;
 if(quotes.length<2||!Number.isFinite(min)||!Number.isFinite(max)||min<=0||max<min)return null;
 return {start:data.start,end:data.end,low:Math.min(...quotes),high:Math.max(...quotes),ownLow:min,ownHigh:max,count:quotes.length,checkedAt:data.checkedAt,location:data.location};
}
// Combines the returned nearby starting-price range with the recorded occupancy
// for the same one-night stay. Every branch states the data it relied on; the
// single-quote comparison never claims a price trend or a matched room category.
export function marketPriceAdvice(m:MarketAnalysis,zh:boolean,context?:PricingContext|null){
 const above=m.ownLow>m.high,below=m.ownHigh<m.low;
 const range=`¥${m.low}–${m.high}`,own=`¥${m.ownLow}–${m.ownHigh}`;
 const conclusion=zh?(above?'本店挂牌价高于本次周边起价范围':below?'本店挂牌价低于本次周边起价范围':'本店挂牌价与周边起价范围重叠'):(above?'Your list rates are above the returned range':below?'Your list rates are below the returned range':'Your list rates overlap the returned range');
 const valid=context&&context.start===m.start&&context.end===m.start&&typeof context.bookedPct==='number'&&Number.isFinite(context.bookedPct)&&context.bookedPct>=0&&context.bookedPct<=100&&typeof context.capacity==='number'&&context.capacity>0&&typeof context.available==='number'&&context.available>=0&&context.available<=context.capacity;
 const full=valid&&context.available===0,high=valid&&context.bookedPct!>=80,low=valid&&context.bookedPct!<50;
 const pct=valid?`${context.bookedPct}%`:'';
 const t=(cn:string,en:string)=>zh?cn:en;
 let recommendation:string,action:string;
 if(full){
  recommendation=t('已无空房，无需调价','No open capacity to reprice');
  action=t('所选入住夜已无空房，保留已订订单价格，把推广重点放到后续空房日期。','Keep existing booking prices and focus promotion on later open dates.');
 }else if(!valid){
  recommendation=above?t('按报价区间偏高，尚未取得占用情况','Above the quote range; occupancy not loaded'):below?t('按报价区间偏低，尚未取得占用情况','Below the quote range; occupancy not loaded'):t('与周边区间重叠，尚未取得占用情况','Overlaps the quote range; occupancy not loaded');
  action=t('本次只比较了同日期1晚供应商起价，缺少占用率；先补齐预订数据，再判断是否调整。','Only same-date one-night starting quotes were compared this time; occupancy is missing. Load booking data before changing rates.');
 }else if(above){
  recommendation=high?t('高于周边但余量有限（占用 '+pct+'），不急于降价','Above the range with limited capacity; no rush to discount'):low?t('高于周边且空房较多（占用 '+pct+'），优先核对后定向优惠','Above the range with open capacity; review then discount targeted dates'):t('高于周边（占用 '+pct+'），先核对同档再定向调整','Above the range; review comparable rooms then adjust targeted dates');
  action=high?t('预订已接近订满，剩余 '+context.available+' 间夜。挂牌价虽高于周边起价，不做整体调整；在核对房型、早餐与退改后，可仅对少量余房小范围试价，保留已订价格。','Bookings are near capacity with '+context.available+' room nights open. Do not adjust everything; after checking room, meal and cancellation terms, test only a few open rooms while keeping booked prices.'):t('先比较同日期的房型、早餐与退改条件；若同档次仍明显偏高，仅对未订空房测试优惠，观察新增预订后再决定是否扩大。剩余 '+context.available+' 间夜。','Compare room, meal and cancellation terms for the same dates. If equivalent rooms are still priced higher, test an offer only on unbooked capacity and review new bookings before expanding it. '+context.available+' room nights are open.');
 }else if(below){
  recommendation=high?t('低于周边且余量有限（占用 '+pct+'），可小范围试涨','Below the range with limited capacity; consider a limited test'):low?t('低于周边但预订偏少（占用 '+pct+'），先推广空房','Below the range but bookings are low; promote open capacity first'):t('低于周边（占用 '+pct+'），可小范围试涨','Below the range; consider a limited test');
  action=high?t('预订接近订满，剩余 '+context.available+' 间夜。先核对房型与服务是否与周边同档；条件接近时可仅对未订余房小范围试涨，保留已订订单价格。','Bookings are near capacity with '+context.available+' room nights open. Check whether rooms and service match the nearby set; if similar, test higher rates on unbooked rooms while keeping booked prices.'):t('先核对房型与服务档次；若条件接近，可仅对未订客房小范围试涨，保留已订订单价格。','Check room and service quality; if similar, test higher rates on a limited set of unbooked rooms while retaining existing booking prices.');
 }else{
  recommendation=high?t('与周边区间重叠、余量有限（占用 '+pct+'），不整体调价','Overlaps the range with limited capacity; avoid a blanket change'):low?t('与周边重叠但空房较多（占用 '+pct+'），优先定向优惠测试','Overlaps the range with open capacity; test targeted offers first'):t('与周边重叠（占用 '+pct+'），按日期差异化','Overlaps the range; price by date');
  action=high?t('挂牌价与本次周边起价重叠，剩余 '+context.available+' 间夜；优先推广仍有空房的日期与差异化卖点，不做整体调整。','Your rates overlap the returned range with '+context.available+' room nights open. Promote open dates and distinctive features; avoid a blanket change.'):low?t('挂牌价与周边重叠，但空房仍多；优先对空档日期做定向优惠测试，并核对同档条件，不建议全期降价。','Your rates overlap the range but vacancy remains high. Test targeted offers on open dates and check comparable rooms; avoid discounting every date.'):t('挂牌价与周边起价重叠；按日期区分空房与紧俏日，避免整体调价。','Your rates overlap the range. Differentiate busy and open dates instead of changing everything.');
 }
 const booking=valid?t(`预订占用率 ${context.bookedPct}%，剩余 ${context.available} 间夜。`,`Recorded occupancy ${context.bookedPct}%, ${context.available} room nights available. `):'';
 return {conclusion,recommendation,content:[zh?'建议调价':'Suggested pricing',recommendation,conclusion,zh?`本店 ${own} / 晚 · 周边起价 ${range}`:`Your rates ${own} / night · Nearby starts ${range}`,zh?`${m.start}，${m.count} 家酒店的1晚供应商起价为 ${range}。${booking}${action}酒店起价与本店房型未做同档匹配；单次报价不能判断涨价趋势。`:`On ${m.start}, ${m.count} hotel starting quotes span ${range} for one night. ${booking}${action} Room categories are not matched; one snapshot does not establish a price trend.`].join('\n')};
}
