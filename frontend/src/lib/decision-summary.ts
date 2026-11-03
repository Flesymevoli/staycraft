import type {BookingMetrics} from '@/components/booking-metrics';
import type {Insight} from './business-assistant';

export function decisionSummary(data:BookingMetrics,zh:boolean){
 const t=(en:string,cn:string)=>zh?cn:en;
 const valid=typeof data.rate_min==='number'&&Number.isFinite(data.rate_min)&&data.rate_min>0&&typeof data.rate_max==='number'&&Number.isFinite(data.rate_max)&&data.rate_max>=data.rate_min;
 const range=()=>data.rate_min===data.rate_max?`¥${data.rate_min}`:`¥${data.rate_min}–${data.rate_max}`;
 const price=[t('Suggested pricing','建议调价'),t('Hold current rates','暂维持现价'),t('No verified market-price basis yet','尚无已核验的周边同类房价依据'),valid?t(`Current list prices ${range()} / night`,`当前挂牌价 ${range()} / 晚`):t('Room-type list prices unavailable','暂无有效房型挂牌价'),t('Occupancy alone does not establish a price increase or discount. Comparable quotes, booking pace and cost floors are needed before suggesting a new rate.','仅凭预订占用率不能确定涨跌幅度。需结合同日期同房型报价、预订变化及成本底价，再给出建议价格。')].join('\n');
 const items:Insight[]=[];
 const add=(id:string,title:string,action:string)=>items.push({id,title,action,evidence:'',href:'/app/analysis'});
 if(data.historical_inventory_unknown){
  add('coverage',t('Historical capacity is unknown','历史房量未知，不能判断订满程度'),t(`${data.booked_order_room_nights||0} recorded order nights; current room capacity cannot reconstruct historical occupancy.`, `已记录 ${data.booked_order_room_nights||0} 个订单间夜；不能用当前客房数量倒推历史占用率。`));
 }else if(!data.capacity_room_nights){
  add('coverage',t('No available capacity basis','暂无可用房量口径'),t('No active room capacity in this period; no occupancy or pricing conclusion is available.','所选期间没有启用客房容量，暂不能计算占用率或试价。'));
 }else{
  const high=data.booked_pct!==null&&data.booked_pct>=80,empty=data.booked_room_nights===0;
  const conclusion=data.available_room_nights===0?t('No unbooked capacity to reprice','已无空余房量，无需对这段日期促销'):high?t('Limited remaining capacity; avoid a blanket discount','剩余房量不多，不建议整体降价促销'):empty?t('No bookings recorded; do not attribute this to price yet','尚无预订记录，不能直接归因于价格偏高'):t('Target open dates rather than changing all rates','空房仍有余量，先针对空档日期推广');
  add('coverage',conclusion,t(`${data.booked_room_nights} of ${data.capacity_room_nights} active-room nights are booked (${data.booked_pct}%), leaving ${data.available_room_nights}. ${high?'These records do not show a need for a blanket discount, nor prove that market prices are rising.':'There is no comparable price or booking-pace evidence establishing that a discount would add bookings.'}`,`启用客房容量 ${data.capacity_room_nights} 间夜，已订 ${data.booked_room_nights} 间夜（${data.booked_pct}%），剩余 ${data.available_room_nights} 间夜。${high?'从这批记录看，没有整体降价的充分理由，也不能据此认定周边正在涨价。':'目前缺少同类报价与预订速度对比，不能认定降价就能增加订单。'}`));
  const open=data.daily.filter(d=>d.available>0);
  if(open.length&&data.daily.length>1){const max=Math.max(...open.map(d=>d.available)),peak=open.filter(d=>d.available===max),dates=peak.slice(0,3).map(d=>d.date.slice(5)).join('、');
   add('gaps',t('Unbooked capacity is concentrated here','空房最多的日期'),t(`${dates}${peak.length>3?` and ${peak.length-3} more dates`:''}: ${max} open rooms each. ${open.length} of ${data.daily.length} dates have unbooked capacity.`,`${dates}${peak.length>3?` 等 ${peak.length} 天`:''}，每天剩余 ${max} 间；所选 ${data.daily.length} 天中，${open.length} 天仍有空房。`));
  }
 }
 if(data.inactive_booked_room_nights>0)add('inactive',t('Bookings reference inactive rooms','有订单占用停用客房'),t(`${data.inactive_booked_room_nights} order nights reference currently inactive rooms and are excluded from active-room occupancy.`,`${data.inactive_booked_room_nights} 个订单间夜关联当前停用客房，未计入启用房占用率，需要处理房间安排。`));
 return {price,items};
}
