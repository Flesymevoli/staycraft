export type MarketAnalysis={start:string;end:string;low:number;high:number;ownLow:number;ownHigh:number;count:number;checkedAt:string;location:string};
export type PricingContext={start:string;end:string;bookedPct:number|null;available:number|null;capacity:number|null};
export function marketAnalysis(data:{start:string;end:string;hotels:{id:number;price:number|null;currency:string;conditions:string}[];ownRates?:{min:number;max:number}|null;checkedAt:string;location:string;locationPrecision?:string}):MarketAnalysis|null{
  if(data.locationPrecision&&data.locationPrecision!=='property'||Date.parse(data.end)-Date.parse(data.start)!==86400000||!data.ownRates)return null;
  const quotes=[...new Map(data.hotels.filter(h=>h.currency==='CNY'&&typeof h.price==='number'&&Number.isFinite(h.price)&&h.price>0&&/1\s*晚.*总价|total/i.test(h.conditions)).map(h=>[h.id,h.price!])).values()];
  const {min,max}=data.ownRates;
  if(quotes.length<2||!Number.isFinite(min)||!Number.isFinite(max)||min<=0||max<min)return null;
  return {start:data.start,end:data.end,low:Math.min(...quotes),high:Math.max(...quotes),ownLow:min,ownHigh:max,count:quotes.length,checkedAt:data.checkedAt,location:data.location};
}
export function marketPriceAdvice(m:MarketAnalysis,zh:boolean,context?:PricingContext|null){
  const above=m.ownLow>m.high,below=m.ownHigh<m.low;
  const range=`¥${m.low}–${m.high}`,own=`¥${m.ownLow}–${m.ownHigh}`;
  const conclusion=zh?(above?'本店挂牌价高于本次周边起价范围':below?'本店挂牌价低于本次周边起价范围':'本店挂牌价与周边起价范围重叠'):(above?'Your list rates are above the returned range':below?'Your list rates are below the returned range':'Your list rates overlap the returned range');
  const valid=context&&context.start===m.start&&context.end===m.start&&typeof context.bookedPct==='number'&&Number.isFinite(context.bookedPct)&&context.bookedPct>=0&&context.bookedPct<=100&&typeof context.capacity==='number'&&context.capacity>0&&typeof context.available==='number'&&context.available>=0&&context.available<=context.capacity;
  const full=valid&&context.available===0,high=valid&&context.bookedPct!>=80,low=valid&&context.bookedPct!<50;
  const t=(cn:string,en:string)=>zh?cn:en;
  let recommendation:string,action:string;
  if(full){recommendation=t('已无空房，无需调价','No open capacity to reprice');action=t('所选入住夜已无空房，保留已订订单价格，把推广重点放到后续空房日期。','Keep existing booking prices and focus promotion on later open dates.');}
  else if(high&&!below){recommendation=t('剩余房量少，暂不降价','Limited capacity; avoid discounting');action=t('预订已接近订满，周边起价较低不足以支持整体降价；剩余客房优先突出房型和服务差异。','Bookings are near capacity. Lower hotel starting quotes alone do not justify discounting; highlight room and service differences for the remaining capacity.');}
  else if(above){recommendation=low?t('空房较多，优先测试优惠','Open capacity; test a targeted offer'):t('挂牌价偏高，核对后定向调整','Rates above range; review targeted changes');action=t('先比较同日期的房型、早餐与退改条件；若同档次仍明显偏高，仅对未订空房测试优惠，观察新增预订后再决定是否扩大。','Compare rooms, meals and cancellation terms for the same dates. If equivalent rooms are still priced higher, test an offer only on unbooked capacity and review new bookings before expanding it.');}
  else if(below&&low){recommendation=t('先推广空房，暂不提价','Promote open capacity before raising rates');action=t('挂牌价已低于本次周边起价，但预订仍偏少；先推广空房日期与特色，观察预订变化，避免仅因周边起价较高就提价。','Your rates are below the returned range but bookings remain low. Promote open dates and distinctive features, then review booking changes before raising rates.');}
  else if(below){recommendation=t('挂牌价偏低，可小范围试涨','Rates below range; consider a limited test');action=t('先核对房型与服务档次；若条件接近，可仅对未订客房小范围试涨，保留已订订单价格。','Check room and service quality; if similar, test higher rates on a limited set of unbooked rooms while retaining existing booking prices.');}
  else{recommendation=t('处于周边区间，维持现价','Within the range; hold current rates');action=t('挂牌价与本次周边起价重叠，暂不整体调整；优先推广仍有空房的日期与差异化卖点。','Your rates overlap the returned range. Avoid a blanket adjustment and promote open dates and distinctive features.');}
  const booking=valid?t(`预订占用率 ${context.bookedPct}%，剩余 ${context.available} 间夜。`,`Recorded occupancy ${context.bookedPct}%, ${context.available} room nights available. `):'';
  return {conclusion,recommendation,content:[zh?'建议调价':'Suggested pricing',recommendation,conclusion,zh?`本店 ${own} / 晚 · 周边起价 ${range}`:`Your rates ${own} / night · Nearby starts ${range}`,zh?`${m.start}，${m.count} 家酒店的1晚供应商起价为 ${range}。${booking}${action}酒店起价与本店房型未做同档匹配；单次报价不能判断涨价趋势。`:`On ${m.start}, ${m.count} hotel starting quotes span ${range} for one night. ${booking}${action} Room categories are not matched; one snapshot does not establish a price trend.`].join('\n')};
}
