export type MarketAnalysis={start:string;end:string;low:number;high:number;ownLow:number;ownHigh:number;count:number;checkedAt:string;location:string};
export function marketAnalysis(data:{start:string;end:string;hotels:{id:number;price:number|null;currency:string;conditions:string}[];ownRates?:{min:number;max:number}|null;checkedAt:string;location:string;locationPrecision?:string}):MarketAnalysis|null{
  if(data.locationPrecision&&data.locationPrecision!=='property'||Date.parse(data.end)-Date.parse(data.start)!==86400000||!data.ownRates)return null;
  const quotes=[...new Map(data.hotels.filter(h=>h.currency==='CNY'&&typeof h.price==='number'&&Number.isFinite(h.price)&&h.price>0&&/1\s*晚.*总价|total/i.test(h.conditions)).map(h=>[h.id,h.price!])).values()];
  const {min,max}=data.ownRates;
  if(quotes.length<2||!Number.isFinite(min)||!Number.isFinite(max)||min<=0||max<min)return null;
  return {start:data.start,end:data.end,low:Math.min(...quotes),high:Math.max(...quotes),ownLow:min,ownHigh:max,count:quotes.length,checkedAt:data.checkedAt,location:data.location};
}
export function marketPriceAdvice(m:MarketAnalysis,zh:boolean){
  const above=m.ownLow>m.high,below=m.ownHigh<m.low;
  const range=`¥${m.low}–${m.high}`,own=`¥${m.ownLow}–${m.ownHigh}`;
  const conclusion=zh?(above?'本店挂牌价高于本次周边起价范围':below?'本店挂牌价低于本次周边起价范围':'本店挂牌价与周边起价范围重叠'):(above?'Your list rates are above the returned range':below?'Your list rates are below the returned range':'Your list rates overlap the returned range');
  const action=zh?(above?'优先向空房日期推广房型特色与服务；若同档次房型也偏高，再考虑定向优惠。':below?'先核对房型与服务档次；若条件接近，可在空房日期小范围测试提价。':'暂维持现价，优先推广空房日期和差异化卖点。'):(above?'Promote room features on open dates; consider a targeted offer after checking equivalent room terms.':below?'Check room and service quality; if similar, test higher rates on a limited set of open dates.':'Hold current rates and promote open dates and distinctive features.');
  return {conclusion,content:[zh?'建议调价':'Suggested pricing',zh?'暂维持现价':'Hold current rates',conclusion,zh?`本店 ${own} / 晚 · 周边起价 ${range}`:`Your rates ${own} / night · Nearby starts ${range}`,zh?`${m.start}，${m.count} 家酒店的1晚供应商起价为 ${range}。${action}酒店起价与本店房型未做同档匹配；单次报价不能判断涨价趋势。`:`On ${m.start}, ${m.count} hotel starting quotes span ${range} for one night. ${action} Room categories are not matched; one snapshot does not establish a price trend.`].join('\n')};
}
