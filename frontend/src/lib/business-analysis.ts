import type {BookingMetrics} from "../components/booking-metrics";

// Interpret the current booking distribution, without inferring demand or causality.
export function businessAnalysis(data: BookingMetrics, zh: boolean) {
 const t=(cn:string,en:string)=>zh?cn:en;
 if(data.historical_inventory_unknown)return {title:t('先看已记录订单，历史占用率暂不判断','Review recorded orders; historical occupancy is unknown'),evidence:t(`所选期间记录了 ${data.booked_order_room_nights||0} 个订单间夜。缺少历史房量，不能用当前房量倒推历史占用率；导入渠道也可能不完整。`,`The period contains ${data.booked_order_room_nights||0} recorded order nights. Historical inventory and full channel coverage are not established.`),action:t('核对渠道覆盖、完成与取消状态，再查看订单金额和间夜；不据此推断需求或调价。','Check channel coverage and completed/cancelled statuses before interpreting amounts; do not infer demand or change prices.')};
 const days=data.daily.filter(day=>day.capacity>0);
 const empty=days.filter(day=>day.booked===0);
 const full=days.filter(day=>day.available===0);
 let title:string, evidence:string, action:string;
 if(!data.capacity_room_nights){
  title=t("先补齐可售客房，才能判断经营状况","Set up sellable rooms before assessing performance");
  evidence=t("当前没有启用客房，无法区分尚未配置库存与没有预订；此时占用率不能用来评价经营好坏。","There is no active inventory. An unconfigured property cannot be distinguished from one without bookings, so occupancy cannot assess performance yet.");
  action=t("先核对房型、房号和启用状态，再观察预订分布。","Check room types, room numbers and availability before reviewing booking patterns.");
 }else if(!data.booked_room_nights){
  title=t("所选期间暂无订单，先核对数据覆盖","No orders recorded; check data coverage first");
  evidence=t("当前可售间夜均未被预订覆盖，但仅凭零订单，无法判断是曝光不足、预订入口不畅还是价格原因。","None of the available room nights are booked. This alone cannot identify low exposure, booking friction or pricing as the cause.");
  action=t("先核对导入渠道、文件覆盖和更新时间，再检查房型展示与可订日期；数据完整后再评估推广，暂不直接降价。","Check imported channels, file coverage and update time before reviewing listings or planning promotion. Avoid a price cut without further evidence.");
 }else if(!data.available_room_nights){
  title=t("所选期间已订满，重点转向履约准备","This period is fully booked; focus on stay preparation");
  evidence=t("当前启用客房已无可订间夜，继续为这些日期引流也无法增加现有库存的预订。","No active room nights remain available, so attracting more bookings for these dates cannot fill additional existing capacity.");
  action=t("优先核对到离店安排，将推广日期转向仍有空房的其他期间。","Prioritise arrivals and departures; direct promotion toward other periods with availability.");
 }else{
  const lastBooked=days.findLastIndex(day=>day.booked>0);
  const trailing=lastBooked>=0?days.length-lastBooked-1:0;
  if(trailing>=2){
   title=t("预订集中在前段，后续日期仍有空档","Bookings are concentrated earlier; later dates remain open");
   evidence=t(`从 ${days[lastBooked+1].date} 起，连续 ${trailing} 天尚无预订。近期订单尚未覆盖后续日期，需要分别关注，而不能只看期间平均占用率。`,`From ${days[lastBooked+1].date}, ${trailing} consecutive days have no bookings. Earlier bookings do not cover these later dates; the period average masks this gap.`);
  }else if(empty.length){
   title=t("有订单的日期与空档并存，优先关注空档","Bookings coexist with open dates; focus on the gaps");
   evidence=t(`${days.length} 天中有 ${empty.length} 天尚无预订${full.length?`，同时有 ${full.length} 天已订满`:""}。不同日期的承接情况不一致，统一促销可能把优惠用在本已有预订的日期上。`,`${empty.length} of ${days.length} days have no bookings${full.length?`, while ${full.length} are full`:""}. A blanket promotion may discount dates that already have bookings rather than target the gaps.`);
  }else{
   title=t("每天已有预订基础，仍有房量可承接","Every day has bookings, with capacity still available");
   evidence=t(`所选期间每天都有预订，但仍有 ${data.available_room_nights} 间夜空余。增长空间在剩余房量，不能把已有预订覆盖误认为已经订满。`,`Every date has bookings, but ${data.available_room_nights} room nights remain open. There is room for more bookings despite coverage across all dates.`);
  }
  action=t("优先查看空余最多的日期，检查对应房型展示与可订状态，再决定是否定向推广。缺少历史同期、浏览量和转化数据，暂不能归因于价格或需求下降。","Review the date with the most availability, check room presentation and bookability, then consider targeted promotion. Without comparable history, views and conversion data, pricing or weaker demand cannot be identified as the cause.");
 }
 return {title,evidence,action,risk:data.inactive_booked_room_nights>0?t(`另有 ${data.inactive_booked_room_nights} 间夜预订落在停用客房上，存在安排冲突；应优先核对这些订单的房间分配。`,`${data.inactive_booked_room_nights} booked room nights belong to inactive rooms, creating an allocation risk. Check those assignments first.`):null};
}
