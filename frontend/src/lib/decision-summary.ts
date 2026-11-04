import type {AdviceFacts,OperatingSuggestion} from './business-assistant';

// Rule-based fallback with concrete operating steps. It only uses dates from the
// selected period and is clearly labelled as rules in the UI when AI is absent.
export function ruleSuggestions(facts:AdviceFacts,zh:boolean):OperatingSuggestion[]{
 const t=(en:string,cn:string)=>zh?cn:en,o=facts.occupancy,p=facts.period;
 const out:OperatingSuggestion[]=[];
 const open=[...facts.daily].filter(d=>d.available>0).sort((a,b)=>b.available-a.available);
 if(o.historicalInventoryUnknown||!o.capacity||o.bookedPct===null){
  out.push({
   title:t('Complete data coverage first','先补齐数据覆盖'),
   problem:t(`Only ${o.booked} order nights are recorded for ${p.start} — ${p.end}.`,`所选周期 ${p.start}—${p.end} 仅记录 ${o.booked} 个订单间夜。`),
   action:t('Check that the CSV imports cover this period and that active rooms and rates are up to date.','核对 CSV 导入是否覆盖该周期，并确认启用房量与挂牌价已更新。'),
   reason:t('Without capacity and channel coverage, vacancy cannot be judged.','缺少房量与渠道覆盖，无法判断空房分布。'),
   check:t('Import records and room count for this period.','该周期的导入记录与房量。')
  });
 }else if(open.length){
  const top=open.slice(0,3),dates=top.map(d=>d.date).join('、'),max=top[0].available;
  out.push({
   title:t('Promote the most open dates first','先推广空房最多的日期'),
   problem:t(`${dates} have up to ${max} open rooms each; ${o.available} room nights are open in this period.`,`${dates} 每天最多 ${max} 间空房；本期共 ${o.available} 个空余间夜。`),
   action:t('Put a short-stay offer for these dates on the channels you already use, and confirm the room status is published.','把这几天的短住方案放到现有渠道，并确认房态已发布。'),
   reason:t('These are the dates with the most recorded vacancy inside the selected period.','这些是所选周期内记录空房最多的日期。'),
   check:t('Room status and channel prices for these dates.','这几天的房态与渠道价格。')
  });
 }else{
  out.push({
   title:t('No open capacity in this period','本期已订满'),
   problem:t(`${o.booked} of ${o.capacity} room nights are booked.`,`${o.booked}/${o.capacity} 间夜已订满。`),
   action:t('Check arrival and cleaning handovers and avoid overselling.','核对到店与清洁安排，避免超卖。'),
   reason:t('There is no open capacity to promote in this period.','本期没有可推广的空余间夜。'),
   check:t('Booking status and arrival times.','订单状态与到店时间。')
  });
 }
 if(o.capacity&&o.booked===0){
  out.push({
   title:t('Check why no bookings were recorded','排查本期无订单'),
   problem:t('No order nights are recorded for this period.','本期没有记录到订单间夜。'),
   action:t('Check channel exposure, published prices and whether imports are complete.','检查渠道曝光、价格是否已发布，以及导入是否完整。'),
   reason:t('Zero booked nights may come from missing imports or unpublished listings, not only price.','零间夜可能来自导入缺失或房源未上架，不一定只是价格。'),
   check:t('Channel listings, import coverage and room status.','渠道上架情况、导入范围与房态。')
  });
 }else if(o.bookedPct!==null&&o.bookedPct>=80){
  out.push({
   title:t('Keep remaining rooms for fulfilment','余房优先保障履约'),
   problem:t(`${o.bookedPct}% booked with ${o.available} room nights open.`,`已订 ${o.bookedPct}%，剩余 ${o.available} 间夜。`),
   action:t('Prioritise arrival handovers and cleaning, and avoid broad discounting for the remaining rooms.','优先安排到店与清洁，剩余房量不做整体降价。'),
   reason:t('Most of this period is already booked.','本期大部分房量已订出。'),
   check:t('Pending tasks, arrival times and room readiness.','待办任务、到店时间与房态。')
  });
 }else if(o.booked>0){
  out.push({
   title:t('Check channel coverage before promoting','推广前核对渠道覆盖'),
   problem:t(`${o.booked} of ${o.capacity} room nights are booked (${o.bookedPct}%), ${o.available} open.`,`已订 ${o.booked}/${o.capacity} 间夜（${o.bookedPct}%），剩余 ${o.available} 间夜。`),
   action:t('Confirm that every channel you use is imported before choosing which open dates to promote.','在决定推广日期前，先确认所有在用的渠道订单都已导入。'),
   reason:t('Incomplete imports can make vacancy look larger than it is.','导入不完整会高估空房。'),
   check:t('Imported channel list for this period.','该周期已导入的渠道列表。')
  });
 }
 if(facts.market){
  const m=facts.market;
  const above=m.ownLow>m.high,below=m.ownHigh<m.low,high=o.bookedPct!==null&&o.bookedPct>=80;
  out.push({
   title:above?t('Your rates sit above nearby starting quotes','本店挂牌高于周边起价'):below?t('Your rates sit below nearby starting quotes','本店挂牌低于周边起价'):t('Your rates overlap nearby starting quotes','本店挂牌与周边起价重叠'),
   problem:t(`Nearby one-night starting quotes are ¥${m.low}–¥${m.high} from ${m.count} hotels; your listed rates are ¥${m.ownLow}–¥${m.ownHigh}.`,`同日期周边 1 晚起价 ¥${m.low}–¥${m.high}（${m.count} 家）；本店挂牌价 ¥${m.ownLow}–¥${m.ownHigh}。`),
   action:high?t('With limited remaining capacity, avoid broad discounting; compare room and service differences for the remaining rooms.','余房已经不多，先不整体降价；对照剩余客房与周边的房型、早餐和退改差异，突出本店卖点。'):above?t('Compare equivalent rooms and terms. If the difference remains, test a targeted offer only on open dates.','先对照同档房型与条件；若价差仍明显，仅针对空房日期测试优惠，不改已订订单。'):below?t('Review listing exposure and room features before raising prices; compare equivalent room conditions first.','先核对房源展示与房型特色，再比较同档条件，避免仅因周边起价高就整体提价。'):t('Keep the current price position and promote the dates with the most open capacity.','价格区间已有重叠，优先推广空房最多的日期与房型特色。'),
   reason:t('This is the verified same-date market information for the period.','这是本期已核实的同日期市场信息。'),
   check:t('Supplier starting quotes are not matched room-type prices.','供应商起价为未匹配房型的起价。')
  });
 }
 if(o.inactiveBooked>0)out.push({
  title:t('Review bookings in inactive rooms','核对停用房订单'),
  problem:t(`${o.inactiveBooked} order nights reference inactive rooms.`,`${o.inactiveBooked} 个订单间夜占用停用客房。`),
  action:t('Move those stays to active rooms or confirm the room plan before new arrivals.','在新客人到店前，把这些住宿换到启用客房或确认房间安排。'),
  reason:t('Bookings on inactive rooms will not be counted in active-room availability.','停用房上的订单不会计入启用房量。'),
  check:t('Room allocations and arrival dates.','房间安排与到店日期。')
 });
 const unique=out.filter((item,index,all)=>all.findIndex(v=>v.title===item.title)===index);
 while(unique.length<2)unique.push({
  title:t('Review the period once more','再核对一次本期数据'),
  problem:t('The recorded data does not support a more specific suggestion.','当前记录不足以支持更具体的建议。'),
  action:t('Re-import the latest order CSV, then review this period again.','重新导入最新订单 CSV 后，再看一次本期数据。'),
  reason:t('Fewer than two data-based suggestions were produced.','数据只支持少于两条可执行建议。'),
  check:t('Import time and channel coverage.','导入时间与渠道覆盖。')
 });
 return unique.slice(0,3);
}
